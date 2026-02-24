import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { loginAndGetToken } from './helpers/auth-helpers';

describe('Seller Invite Delivery (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let business: { id: number };
  let sellerUser: { id: number; phone: string };
  let successInviteTarget: { id: number; phone: string };
  let failInviteTarget: { id: number; phone: string };
  let sellerToken: string;

  const envBackup = {
    channels: process.env.SELLER_INVITE_DELIVERY_CHANNELS,
    maxAttempts: process.env.SELLER_INVITE_DELIVERY_MAX_ATTEMPTS,
    retryDelayMs: process.env.SELLER_INVITE_RETRY_DELAY_MS,
    failPhones: process.env.SELLER_INVITE_SMS_FAIL_PHONES,
  };

  const RUN_ID = Date.now().toString();
  const PHONE_BASE = RUN_ID.slice(-7);
  const SELLER_PHONE = `+905${PHONE_BASE}71`;
  const SUCCESS_PHONE = `+905${PHONE_BASE}72`;
  const FAIL_PHONE = `+905${PHONE_BASE}73`;

  async function waitForDeliveryState(
    inviteId: number,
    predicate: (row: {
      status: string;
      attemptCount: number;
      lastError: string | null;
    }) => boolean,
    timeoutMs = 8000,
  ) {
    const startedAt = Date.now();
    // Poll DB to keep test deterministic across async retries.
    while (Date.now() - startedAt < timeoutMs) {
      const row = await prisma.sellerInviteDelivery.findFirst({
        where: {
          inviteId,
          channel: 'SMS',
        },
        select: {
          status: true,
          attemptCount: true,
          lastError: true,
        },
      });

      if (row && predicate(row)) {
        return row;
      }

      await new Promise((resolve) => setTimeout(resolve, 75));
    }

    throw new Error(`Delivery state timeout for inviteId=${inviteId}`);
  }

  beforeAll(async () => {
    process.env.SELLER_INVITE_DELIVERY_CHANNELS = 'SMS';
    process.env.SELLER_INVITE_DELIVERY_MAX_ATTEMPTS = '3';
    process.env.SELLER_INVITE_RETRY_DELAY_MS = '75';
    process.env.SELLER_INVITE_SMS_FAIL_PHONES = FAIL_PHONE;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    const passwordHash = await bcrypt.hash('password123', 10);

    business = await prisma.business.create({
      data: { name: `Seller Invite Delivery ${RUN_ID}` },
      select: { id: true },
    });

    sellerUser = await prisma.user.create({
      data: {
        businessId: business.id,
        name: 'Invite Seller',
        phone: SELLER_PHONE,
        passwordHash,
        role: 'SELLER',
        isActive: true,
      },
      select: { id: true, phone: true },
    });

    await prisma.seller.create({
      data: {
        businessId: business.id,
        userId: sellerUser.id,
        slug: `invite-delivery-${RUN_ID}`,
        displayName: 'Invite Delivery Seller',
        isActive: true,
      },
    });

    successInviteTarget = await prisma.user.create({
      data: {
        businessId: business.id,
        name: 'Invite Success User',
        phone: SUCCESS_PHONE,
        passwordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
      select: { id: true, phone: true },
    });

    failInviteTarget = await prisma.user.create({
      data: {
        businessId: business.id,
        name: 'Invite Fail User',
        phone: FAIL_PHONE,
        passwordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
      select: { id: true, phone: true },
    });

    sellerToken = await loginAndGetToken(app, SELLER_PHONE);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();

    process.env.SELLER_INVITE_DELIVERY_CHANNELS = envBackup.channels;
    process.env.SELLER_INVITE_DELIVERY_MAX_ATTEMPTS = envBackup.maxAttempts;
    process.env.SELLER_INVITE_RETRY_DELAY_MS = envBackup.retryDelayMs;
    process.env.SELLER_INVITE_SMS_FAIL_PHONES = envBackup.failPhones;
  });

  it('creates invite and delivery row; successful delivery reaches SENT', async () => {
    const inviteRes = await request(app.getHttpServer())
      .post('/seller/team/invites')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        targetUserId: successInviteTarget.id,
      })
      .expect(201);

    expect(inviteRes.body.id).toBeDefined();

    const sentRow = await waitForDeliveryState(
      inviteRes.body.id,
      (row) => row.status === 'SENT',
    );

    expect(sentRow.attemptCount).toBeGreaterThanOrEqual(1);
    expect(sentRow.lastError).toBeNull();
  });

  it('failed delivery is retried and moves to DEAD_LETTER; invite list exposes status', async () => {
    const inviteRes = await request(app.getHttpServer())
      .post('/seller/team/invites')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        targetUserId: failInviteTarget.id,
      })
      .expect(201);

    const deadLetter = await waitForDeliveryState(
      inviteRes.body.id,
      (row) => row.status === 'DEAD_LETTER',
    );

    expect(deadLetter.attemptCount).toBe(3);
    expect(deadLetter.lastError).toContain('Simulated SMS failure');

    const listRes = await request(app.getHttpServer())
      .get('/seller/team/invites')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    const inviteRow = listRes.body.find(
      (row: { id: number }) => row.id === inviteRes.body.id,
    );
    expect(inviteRow).toBeTruthy();
    expect(Array.isArray(inviteRow.deliveries)).toBe(true);

    const smsDelivery = inviteRow.deliveries.find(
      (row: { channel: string }) => row.channel === 'SMS',
    );
    expect(smsDelivery).toBeTruthy();
    expect(smsDelivery.status).toBe('DEAD_LETTER');
    expect(smsDelivery.attemptCount).toBe(3);
  });
});
