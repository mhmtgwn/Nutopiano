import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { loginAndGetToken } from './helpers/auth-helpers';

describe('Outbox Activation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let business: { id: number };
  let sellerUser: { id: number; phone: string };
  let adminUser: { id: number; phone: string };
  let customerUser: { id: number; phone: string };
  let sellerProfile: { id: number };
  let customerRow: { id: number };
  let productRow: { id: number };

  let sellerToken: string;
  let adminToken: string;

  const envBackup = {
    pollMs: process.env.OUTBOX_POLL_INTERVAL_MS,
    retryMs: process.env.OUTBOX_RETRY_DELAY_MS,
    maxAttempts: process.env.OUTBOX_MAX_ATTEMPTS,
    workerEnabled: process.env.OUTBOX_WORKER_ENABLED,
  };

  const RUN_ID = Date.now().toString();
  const PHONE_BASE = RUN_ID.slice(-7);
  const SELLER_PHONE = `+905${PHONE_BASE}51`;
  const ADMIN_PHONE = `+905${PHONE_BASE}52`;
  const CUSTOMER_PHONE = `+905${PHONE_BASE}53`;

  async function waitForCondition(
    fn: () => Promise<boolean>,
    timeoutMs = 12000,
    intervalMs = 100,
  ) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (await fn()) return;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error('Condition wait timeout');
  }

  beforeAll(async () => {
    process.env.OUTBOX_WORKER_ENABLED = 'true';
    process.env.OUTBOX_POLL_INTERVAL_MS = '120';
    process.env.OUTBOX_RETRY_DELAY_MS = '120';
    process.env.OUTBOX_MAX_ATTEMPTS = '3';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    const passwordHash = await bcrypt.hash('password123', 10);

    business = await prisma.business.create({
      data: { name: `Outbox Activation ${RUN_ID}` },
      select: { id: true },
    });

    sellerUser = await prisma.user.create({
      data: {
        businessId: business.id,
        name: 'Outbox Seller',
        phone: SELLER_PHONE,
        passwordHash,
        role: 'SELLER',
        isActive: true,
      },
      select: { id: true, phone: true },
    });

    adminUser = await prisma.user.create({
      data: {
        businessId: business.id,
        name: 'Outbox Admin',
        phone: ADMIN_PHONE,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
      select: { id: true, phone: true },
    });

    customerUser = await prisma.user.create({
      data: {
        businessId: business.id,
        name: 'Outbox Customer',
        phone: CUSTOMER_PHONE,
        passwordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
      select: { id: true, phone: true },
    });

    sellerProfile = await prisma.seller.create({
      data: {
        businessId: business.id,
        userId: sellerUser.id,
        slug: `outbox-seller-${RUN_ID}`,
        displayName: 'Outbox Seller',
        isActive: true,
      },
      select: { id: true },
    });

    await prisma.orderStatus.createMany({
      data: [
        {
          businessId: business.id,
          key: 'CREATED',
          label: 'Created',
          orderIndex: 1,
          isFinal: false,
          isDefault: true,
        },
      ],
    });

    await prisma.settings.create({
      data: {
        businessId: business.id,
        key: 'order.defaultStatusKey',
        value: 'CREATED',
      },
    });

    const category = await prisma.category.create({
      data: {
        businessId: business.id,
        createdByUserId: sellerUser.id,
        name: `Outbox Category ${RUN_ID}`,
        slug: `outbox-category-${RUN_ID}`,
        scopeType: 'GLOBAL',
        isActive: true,
      },
      select: { id: true },
    });

    productRow = await prisma.product.create({
      data: {
        businessId: business.id,
        createdByUserId: sellerUser.id,
        ownerSellerId: sellerProfile.id,
        categoryId: category.id,
        name: `Outbox Product ${RUN_ID}`,
        sku: `OUTBOX-PRODUCT-${RUN_ID}`,
        type: 'PHYSICAL',
        priceCents: 1500,
        costPriceCents: 900,
        stock: 20,
        isPublished: false,
        isActive: true,
      },
      select: { id: true },
    });

    customerRow = await prisma.customer.create({
      data: {
        businessId: business.id,
        createdByUserId: sellerUser.id,
        userId: customerUser.id,
        name: 'Outbox Customer Row',
        phone: CUSTOMER_PHONE,
        balance: 0,
      },
      select: { id: true },
    });

    sellerToken = await loginAndGetToken(app, SELLER_PHONE);
    adminToken = await loginAndGetToken(app, ADMIN_PHONE);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();

    process.env.OUTBOX_POLL_INTERVAL_MS = envBackup.pollMs;
    process.env.OUTBOX_RETRY_DELAY_MS = envBackup.retryMs;
    process.env.OUTBOX_MAX_ATTEMPTS = envBackup.maxAttempts;
    process.env.OUTBOX_WORKER_ENABLED = envBackup.workerEnabled;
  });

  it('processes producer events, enforces idempotency, and dead-letters poison events', async () => {
    const inviteRes = await request(app.getHttpServer())
      .post('/seller/team/invites')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ targetUserId: customerUser.id })
      .expect(201);
    expect(inviteRes.body.id).toBeDefined();

    await request(app.getHttpServer())
      .patch(`/seller/products/${productRow.id}/publish`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ isPublished: true })
      .expect(200);

    const orderRes = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        sellerId: sellerProfile.id,
        customerId: customerRow.id,
        source: 'POS',
        paymentMode: 'CASH',
        items: [{ productId: productRow.id, quantity: 1 }],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/orders/${orderRes.body.id}/payments`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        amount: '500',
        method: 'CASH',
      })
      .expect(201);

    await waitForCondition(async () => {
      const rows = await prisma.outboxEvent.findMany({
        where: {
          businessId: business.id,
          eventType: {
            in: [
              'seller.invite.created',
              'product.publish.changed',
              'order.created',
              'payment.created',
            ],
          },
          processedAt: { not: null },
        },
        select: { id: true },
      });
      return rows.length >= 4;
    });

    const firstIdempotent = await request(app.getHttpServer())
      .post('/platform/outbox/events/test')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        eventType: 'test.idempotent',
        aggregateType: 'TEST',
        aggregateId: 'idempotent-1',
        idempotencyKey: 'idem-1',
        payloadJson: { marker: 'first' },
      })
      .expect(201);

    const secondIdempotent = await request(app.getHttpServer())
      .post('/platform/outbox/events/test')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        eventType: 'test.idempotent',
        aggregateType: 'TEST',
        aggregateId: 'idempotent-1',
        idempotencyKey: 'idem-1',
        payloadJson: { marker: 'second' },
      })
      .expect(201);

    expect(secondIdempotent.body.id).toBe(firstIdempotent.body.id);

    await request(app.getHttpServer())
      .post('/platform/outbox/events/test')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        eventType: 'test.force-fail',
        aggregateType: 'TEST',
        aggregateId: 'poison-1',
        idempotencyKey: 'poison-1',
        forceFail: true,
      })
      .expect(201);

    await waitForCondition(async () => {
      const poison = await prisma.outboxEvent.findFirst({
        where: {
          businessId: business.id,
          eventType: 'test.force-fail',
          aggregateType: 'TEST',
          aggregateId: 'poison-1',
          idempotencyKey: 'poison-1',
        },
        select: {
          deadLetteredAt: true,
          attemptCount: true,
        },
      });
      return Boolean(poison?.deadLetteredAt) && Number(poison?.attemptCount ?? 0) >= 3;
    });

    const metricsRes = await request(app.getHttpServer())
      .get('/platform/outbox/metrics')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(metricsRes.body.processedCount).toBeGreaterThanOrEqual(4);
    expect(metricsRes.body.deadLetterCount).toBeGreaterThanOrEqual(1);
    expect(metricsRes.body.failedCount).toBeGreaterThanOrEqual(1);
  });
});
