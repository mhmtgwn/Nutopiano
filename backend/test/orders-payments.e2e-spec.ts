import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
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
  let sellerUser: { id: number; phone: string };
  let sellerProfile: { id: number };
  let staffUser: { id: number; phone: string };
  let otherBusinessAdmin: { id: number; phone: string };
  let customer1: { id: number };
  let category1: { id: number };
  let product1: { id: number };
  let product2: { id: number };
  let adminOrder: { id: number };
  let staffOrder: { id: number };
  let otherBusinessOrder: { id: number };

  const RUN_ID = Date.now().toString();
  const PHONE_BASE = RUN_ID.slice(-7);
  const ADMIN_PHONE = `+905${PHONE_BASE}01`;
  const SELLER_PHONE = `+905${PHONE_BASE}09`;
  const STAFF_PHONE = `+905${PHONE_BASE}02`;
  const OTHER_BUS_ADMIN_PHONE = `+905${PHONE_BASE}03`;
  const CUSTOMER_PHONE_1 = `+905${PHONE_BASE}11`;
  const OTHER_BUS_CUSTOMER_PHONE = `+905${PHONE_BASE}21`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    const passwordHash = await bcrypt.hash('password123', 10);

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
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });

    sellerUser = await prisma.user.create({
      data: {
        businessId: business1.id,
        name: 'Orders Seller',
        phone: SELLER_PHONE,
        passwordHash,
        role: 'SELLER',
        isActive: true,
      },
    });

    sellerProfile = await prisma.seller.create({
      data: {
        businessId: business1.id,
        userId: sellerUser.id,
        displayName: 'Orders Seller',
        slug: `orders-seller-${RUN_ID}`,
        isActive: true,
      },
      select: { id: true },
    });

    staffUser = await prisma.user.create({
      data: {
        businessId: business1.id,
        name: 'Orders Staff',
        phone: STAFF_PHONE,
        passwordHash,
        role: 'USER',
        isActive: true,
      },
    });

    await prisma.sellerTeamMember.create({
      data: {
        businessId: business1.id,
        sellerId: sellerProfile.id,
        userId: staffUser.id,
        invitedByUserId: sellerUser.id,
        isActive: true,
        permissionsJson: {
          permissions: [
            'tab.sales',
            'tab.orders',
            'pos.sale.create',
            'orders.read',
            'orders.updateStatus',
          ],
        },
      },
    });

    otherBusinessAdmin = await prisma.user.create({
      data: {
        businessId: business2.id,
        name: 'Other Business Admin (Orders)',
        phone: OTHER_BUS_ADMIN_PHONE,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });

    customer1 = await prisma.customer.create({
      data: {
        businessId: business1.id,
        createdByUserId: adminUser.id,
        name: 'Orders Customer 1',
        phone: CUSTOMER_PHONE_1,
        balance: 0,
      },
    });

    category1 = await prisma.category.create({
      data: {
        businessId: business1.id,
        createdByUserId: adminUser.id,
        name: 'Orders Category 1',
        slug: `orders-cat-1-${RUN_ID}`,
        isActive: true,
      },
      select: { id: true },
    });

    product1 = await prisma.product.create({
      data: {
        businessId: business1.id,
        createdByUserId: adminUser.id,
        ownerSellerId: sellerProfile.id,
        categoryId: category1.id,
        name: 'Orders Product 1',
        sku: `ORD-P1-${RUN_ID}`,
        type: 'PHYSICAL',
        priceCents: 1000,
        stock: 10,
      },
    });

    product2 = await prisma.product.create({
      data: {
        businessId: business1.id,
        createdByUserId: adminUser.id,
        ownerSellerId: sellerProfile.id,
        categoryId: category1.id,
        name: 'Orders Product 2',
        sku: `ORD-P2-${RUN_ID}`,
        type: 'PHYSICAL',
        priceCents: 500,
        stock: 20,
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
    const otherCategory = await prisma.category.create({
      data: {
        businessId: business2.id,
        createdByUserId: otherBusinessAdmin.id,
        name: 'Other Orders Category',
        slug: `orders-other-cat-${RUN_ID}`,
        isActive: true,
      },
      select: { id: true },
    });

    const otherCustomer = await prisma.customer.create({
      data: {
        businessId: business2.id,
        createdByUserId: otherBusinessAdmin.id,
        name: 'Other Orders Customer',
        phone: OTHER_BUS_CUSTOMER_PHONE,
        balance: 0,
      },
    });

    const otherProduct = await prisma.product.create({
      data: {
        businessId: business2.id,
        createdByUserId: otherBusinessAdmin.id,
        categoryId: otherCategory.id,
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
      const firstItem = res.body.items.find(
        (i: { productId: number }) => i.productId === product1.id,
      );
      const secondItem = res.body.items.find(
        (i: { productId: number }) => i.productId === product2.id,
      );
      expect(firstItem?.unitPriceCents).toBe(1000);
      expect(firstItem?.productName).toBe('Orders Product 1');
      expect(secondItem?.unitPriceCents).toBe(500);
      expect(secondItem?.productName).toBe('Orders Product 2');
      adminOrder = res.body;
    });

    it('decrements product stock when order is created', async () => {
      const [currentProduct1, currentProduct2] = await Promise.all([
        prisma.product.findUnique({
          where: { id: product1.id },
          select: { stock: true },
        }),
        prisma.product.findUnique({
          where: { id: product2.id },
          select: { stock: true },
        }),
      ]);

      expect(currentProduct1?.stock).toBe(9);
      expect(currentProduct2?.stock).toBe(18);
    });

    it('USER can create own order', async () => {
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

    it('supports Idempotency-Key and returns the same order on duplicate requests', async () => {
      const idemKey = `orders-idem-${RUN_ID}-1`;
      const stockBefore = await prisma.product.findUnique({
        where: { id: product2.id },
        select: { stock: true },
      });

      const first = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', idemKey)
        .send({
          customerId: customer1.id,
          items: [{ productId: product2.id, quantity: 1 }],
        })
        .expect(201);

      const second = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', idemKey)
        .send({
          customerId: customer1.id,
          items: [{ productId: product2.id, quantity: 1 }],
        })
        .expect(201);

      expect(second.body.id).toBe(first.body.id);

      const matchingOrders = await prisma.order.findMany({
        where: {
          businessId: business1.id,
          idempotencyKey: idemKey,
        },
        select: { id: true },
      });
      expect(matchingOrders).toHaveLength(1);

      const stockAfter = await prisma.product.findUnique({
        where: { id: product2.id },
        select: { stock: true },
      });
      expect(stockAfter?.stock).toBe((stockBefore?.stock ?? 0) - 1);
    });

    it('rejects reusing Idempotency-Key with a different payload', async () => {
      const idemKey = `orders-idem-${RUN_ID}-2`;

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', idemKey)
        .send({
          customerId: customer1.id,
          items: [{ productId: product1.id, quantity: 1 }],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', idemKey)
        .send({
          customerId: customer1.id,
          items: [{ productId: product1.id, quantity: 2 }],
        })
        .expect(400)
        .expect((res) => {
          expect(String(res.body?.message ?? '')).toContain('Idempotency-Key');
        });
    });

    it('rejects order creation when client cart price is stale', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customer1.id,
          items: [
            {
              productId: product1.id,
              quantity: 1,
              expectedUnitPriceCents: 999, // actual is 1000
            },
          ],
        })
        .expect(400)
        .expect((res) => {
          expect(String(res.body?.message ?? '')).toContain('fiyat');
        });
    });

    it('applies line and cart discounts in order totals', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customer1.id,
          cartDiscountAmountCents: 200,
          items: [
            {
              productId: product1.id,
              quantity: 2,
              discountAmountCents: 300,
            },
          ],
        })
        .expect(201);

      expect(res.body.totalAmountCents).toBe(1500);
      const discountedItem = res.body.items.find(
        (i: { productId: number }) => i.productId === product1.id,
      );
      expect(discountedItem?.totalAmountCents).toBe(1700);

      const storedOrder = await prisma.order.findUnique({
        where: { id: Number(res.body.id) },
        select: { discountAmountCents: true, subtotalAmountCents: true },
      });
      expect(storedOrder?.discountAmountCents).toBe(500);
      expect(storedOrder?.subtotalAmountCents).toBe(1700);
    });

    it('Order item keeps price and name snapshot after product changes', async () => {
      await prisma.product.update({
        where: { id: product1.id },
        data: { name: 'Orders Product 1 Updated', priceCents: 7777 },
      });
      await prisma.product.update({
        where: { id: product2.id },
        data: { name: 'Orders Product 2 Updated', priceCents: 8888 },
      });

      const res = await request(app.getHttpServer())
        .get(`/orders/${adminOrder.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const firstItem = res.body.items.find(
        (i: { productId: number }) => i.productId === product1.id,
      );
      const secondItem = res.body.items.find(
        (i: { productId: number }) => i.productId === product2.id,
      );
      expect(firstItem?.unitPriceCents).toBe(1000);
      expect(firstItem?.productName).toBe('Orders Product 1');
      expect(secondItem?.unitPriceCents).toBe(500);
      expect(secondItem?.productName).toBe('Orders Product 2');
    });

    it('ADMIN lists all orders in business, USER lists only own orders', async () => {
      const adminRes = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const adminOrderIds = adminRes.body.map((o: { id: number }) => o.id);
      expect(adminOrderIds).toEqual(
        expect.arrayContaining([adminOrder.id, staffOrder.id]),
      );

      const staffRes = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const staffOrderIds = staffRes.body.map((o: { id: number }) => o.id);
      expect(staffOrderIds).toContain(staffOrder.id);
      expect(staffOrderIds).not.toContain(adminOrder.id);
    });

    it('supports paginated order filters by source, creator and date range', async () => {
      const today = new Date().toISOString().slice(0, 10);

      const filtered = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          page: 1,
          pageSize: 50,
          source: 'POS',
          createdByUserId: adminUser.id,
          dateFrom: today,
          dateTo: today,
        })
        .expect(200);

      expect(Array.isArray(filtered.body.data)).toBe(true);
      expect(filtered.body.data.length).toBeGreaterThan(0);
      for (const row of filtered.body.data) {
        expect(row.source).toBe('POS');
        expect(row.createdByUserId).toBe(adminUser.id);
      }
    });

    it('USER cannot access other user order by id (403)', async () => {
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

    it('blocks invalid state transition from final status', async () => {
      await request(app.getHttpServer())
        .patch(`/orders/${adminOrder.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ statusKey: 'IN_PROGRESS' })
        .expect(400)
        .expect((res) => {
          expect(String(res.body?.message ?? '')).toContain('Final');
        });
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

    it('USER can add and list payments only for own orders', async () => {
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

      // USER cannot touch other user's order payments
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

