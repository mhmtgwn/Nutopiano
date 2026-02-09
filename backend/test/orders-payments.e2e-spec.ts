import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { loginAndGetToken } from './helpers/auth-helpers';

describe('Orders & Payments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let staffToken: string;
  let business1: { id: number };
  let business2: { id: number };
  let adminUser: { id: number; phone: string };
  let staffUser: { id: number; phone: string };
  let otherBusinessAdmin: { id: number; phone: string };
  let customer1: { id: number };
  let product1: { id: number };
  let product2: { id: number };
  let adminOrder: { id: number };
  let staffOrder: { id: number };
  let otherBusinessOrder: { id: number };

  const RUN_ID = Date.now().toString();
  const ADMIN_PHONE = `+9700000${RUN_ID}1`;
  const STAFF_PHONE = `+9700000${RUN_ID}2`;
  const OTHER_BUS_ADMIN_PHONE = `+9700000${RUN_ID}3`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    business1 = await prisma.business.create({
      data: {
        name: `Orders E2E Business 1 ${RUN_ID}`,
      },
    });

    business2 = await prisma.business.create({
      data: {
        name: `Orders E2E Business 2 ${RUN_ID}`,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        businessId: business1.id,
        name: 'Orders Admin',
        phone: ADMIN_PHONE,
        role: 'ADMIN',
        isActive: true,
      },
    });

    staffUser = await prisma.user.create({
      data: {
        businessId: business1.id,
        name: 'Orders Staff',
        phone: STAFF_PHONE,
        role: 'STAFF',
        isActive: true,
      },
    });

    otherBusinessAdmin = await prisma.user.create({
      data: {
        businessId: business2.id,
        name: 'Other Business Admin (Orders)',
        phone: OTHER_BUS_ADMIN_PHONE,
        role: 'ADMIN',
        isActive: true,
      },
    });

    customer1 = await prisma.customer.create({
      data: {
        businessId: business1.id,
        createdByUserId: adminUser.id,
        name: 'Orders Customer 1',
        phone: `+9800000${RUN_ID}1`,
        balance: 0,
      },
    });

    product1 = await prisma.product.create({
      data: {
        businessId: business1.id,
        createdByUserId: adminUser.id,
        name: 'Orders Product 1',
        sku: `ORD-P1-${RUN_ID}`,
        type: 'PHYSICAL',
        priceCents: 1000,
      },
    });

    product2 = await prisma.product.create({
      data: {
        businessId: business1.id,
        createdByUserId: adminUser.id,
        name: 'Orders Product 2',
        sku: `ORD-P2-${RUN_ID}`,
        type: 'PHYSICAL',
        priceCents: 500,
      },
    });

    // OrderStatuses for business1
    await prisma.orderStatus.createMany({
      data: [
        {
          businessId: business1.id,
          key: 'CREATED',
          label: 'Created',
          orderIndex: 1,
          isFinal: false,
          isDefault: true,
        },
        {
          businessId: business1.id,
          key: 'IN_PROGRESS',
          label: 'In progress',
          orderIndex: 2,
          isFinal: false,
          isDefault: false,
        },
        {
          businessId: business1.id,
          key: 'COMPLETED',
          label: 'Completed',
          orderIndex: 3,
          isFinal: true,
          isDefault: false,
        },
      ],
    });

    // Settings for default status
    await prisma.settings.create({
      data: {
        businessId: business1.id,
        key: 'order.defaultStatusKey',
        value: 'CREATED',
      },
    });

    // Seed order for other business for cross-tenant tests
    const otherCustomer = await prisma.customer.create({
      data: {
        businessId: business2.id,
        createdByUserId: otherBusinessAdmin.id,
        name: 'Other Orders Customer',
        phone: `+9800000${RUN_ID}9`,
        balance: 0,
      },
    });

    const otherProduct = await prisma.product.create({
      data: {
        businessId: business2.id,
        createdByUserId: otherBusinessAdmin.id,
        name: 'Other Orders Product',
        sku: `ORD-OP-${RUN_ID}`,
        type: 'PHYSICAL',
        priceCents: 2000,
      },
    });

    const otherStatus = await prisma.orderStatus.create({
      data: {
        businessId: business2.id,
        key: 'CREATED',
        label: 'Created',
        orderIndex: 1,
        isFinal: false,
        isDefault: true,
      },
    });

    otherBusinessOrder = await prisma.order.create({
      data: {
        businessId: business2.id,
        customerId: otherCustomer.id,
        createdByUserId: otherBusinessAdmin.id,
        statusId: otherStatus.id,
        totalAmountCents: 2000,
        source: 'POS',
      },
    });

    adminToken = await loginAndGetToken(app, ADMIN_PHONE);
    staffToken = await loginAndGetToken(app, STAFF_PHONE);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('/orders', () => {
    it('ADMIN can create order with default status and price snapshot', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customer1.id,
          items: [
            { productId: product1.id, quantity: 1 },
            { productId: product2.id, quantity: 2 },
          ],
        })
        .expect(201);

      expect(res.body.totalAmountCents).toBe(1000 + 2 * 500);
      expect(res.body.statusKey).toBe('CREATED');
      adminOrder = res.body;
    });

    it('STAFF can create own order', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          customerId: customer1.id,
          items: [{ productId: product1.id, quantity: 1 }],
        })
        .expect(201);

      expect(res.body.totalAmountCents).toBe(1000);
      expect(res.body.statusKey).toBe('CREATED');
      staffOrder = res.body;
    });

    it('ADMIN lists all orders in business, STAFF lists only own orders', async () => {
      const adminRes = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const adminOrderIds = adminRes.body.map((o: { id: number }) => o.id);
      expect(adminOrderIds).toEqual(expect.arrayContaining([adminOrder.id, staffOrder.id]));

      const staffRes = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const staffOrderIds = staffRes.body.map((o: { id: number }) => o.id);
      expect(staffOrderIds).toContain(staffOrder.id);
      expect(staffOrderIds).not.toContain(adminOrder.id);
    });

    it('STAFF cannot access other user order by id (403)', async () => {
      await request(app.getHttpServer())
        .get(`/orders/${adminOrder.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('Cross-tenant orders are isolated (404 for other business order id)', async () => {
      await request(app.getHttpServer())
        .get(`/orders/${otherBusinessOrder.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('ADMIN can update order status by statusKey', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/orders/${adminOrder.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ statusKey: 'COMPLETED' })
        .expect(200);

      expect(res.body.statusKey).toBe('COMPLETED');
    });
  });

  describe('/orders/:id/payments', () => {
    it('ADMIN can add and list payments for any order', async () => {
      await request(app.getHttpServer())
        .post(`/orders/${adminOrder.id}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: '1500',
          method: 'CASH',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/orders/${adminOrder.id}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].amountCents).toBe(1500);
    });

    it('STAFF can add and list payments only for own orders', async () => {
      await request(app.getHttpServer())
        .post(`/orders/${staffOrder.id}/payments`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          amount: '1000',
          method: 'CARD',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/orders/${staffOrder.id}/payments`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].amountCents).toBe(1000);

      // STAFF cannot touch other user's order payments
      await request(app.getHttpServer())
        .post(`/orders/${adminOrder.id}/payments`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          amount: '500',
          method: 'CASH',
        })
        .expect(403);

      await request(app.getHttpServer())
        .get(`/orders/${adminOrder.id}/payments`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });
  });
});
