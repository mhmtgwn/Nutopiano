import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { loginAndGetToken } from './helpers/auth-helpers';

describe('POS Register Session (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let staffToken: string;
  let otherBusinessAdminToken: string;
  let business1: { id: number };
  let business2: { id: number };
  let adminUser: { id: number; phone: string };
  let staffUser: { id: number; phone: string };
  let otherBusinessAdmin: { id: number; phone: string };
  let customer1: { id: number };
  let customerWithBalance: { id: number };
  let statusCreated: { id: number };
  let statusReturned: { id: number };
  let category1: { id: number };
  let product1: { id: number };
  let product2: { id: number };

  const RUN_ID = Date.now().toString();
  const PHONE_BASE = RUN_ID.slice(-7);
  const ADMIN_PHONE = `+905${PHONE_BASE}41`;
  const STAFF_PHONE = `+905${PHONE_BASE}42`;
  const OTHER_BUS_ADMIN_PHONE = `+905${PHONE_BASE}43`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    const passwordHash = await bcrypt.hash('password123', 10);

    business1 = await prisma.business.create({
      data: { name: `POS E2E Business 1 ${RUN_ID}` },
    });
    business2 = await prisma.business.create({
      data: { name: `POS E2E Business 2 ${RUN_ID}` },
    });

    adminUser = await prisma.user.create({
      data: {
        businessId: business1.id,
        name: 'POS Admin',
        phone: ADMIN_PHONE,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });

    staffUser = await prisma.user.create({
      data: {
        businessId: business1.id,
        name: 'POS Staff',
        phone: STAFF_PHONE,
        passwordHash,
        role: 'STAFF',
        isActive: true,
      },
    });

    otherBusinessAdmin = await prisma.user.create({
      data: {
        businessId: business2.id,
        name: 'POS Other Admin',
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
        name: 'POS Report Customer',
        phone: `+905${PHONE_BASE}51`,
        balance: 0,
      },
    });
    customerWithBalance = await prisma.customer.create({
      data: {
        businessId: business1.id,
        createdByUserId: adminUser.id,
        name: 'POS Balance Customer',
        phone: `+905${PHONE_BASE}52`,
        balance: 12000,
      },
    });

    statusCreated = await prisma.orderStatus.create({
      data: {
        businessId: business1.id,
        key: 'CREATED',
        label: 'Created',
        orderIndex: 1,
        isFinal: false,
        isDefault: true,
      },
      select: { id: true },
    });
    statusReturned = await prisma.orderStatus.create({
      data: {
        businessId: business1.id,
        key: 'RETURNED',
        label: 'Returned',
        orderIndex: 99,
        isFinal: true,
        isDefault: false,
      },
      select: { id: true },
    });

    category1 = await prisma.category.create({
      data: {
        businessId: business1.id,
        createdByUserId: adminUser.id,
        name: `POS Category ${RUN_ID}`,
        slug: `pos-cat-${RUN_ID}`,
        isActive: true,
      },
      select: { id: true },
    });

    product1 = await prisma.product.create({
      data: {
        businessId: business1.id,
        createdByUserId: adminUser.id,
        categoryId: category1.id,
        name: 'POS Return Product',
        sku: `POS-RET-${RUN_ID}`,
        type: 'PHYSICAL',
        priceCents: 15000,
        stock: 10,
      },
      select: { id: true },
    });
    product2 = await prisma.product.create({
      data: {
        businessId: business1.id,
        createdByUserId: adminUser.id,
        categoryId: category1.id,
        name: 'POS Analytics Product',
        sku: `POS-ANL-${RUN_ID}`,
        type: 'PHYSICAL',
        priceCents: 22000,
        stock: 25,
      },
      select: { id: true },
    });

    adminToken = await loginAndGetToken(app, ADMIN_PHONE);
    staffToken = await loginAndGetToken(app, STAFF_PHONE);
    otherBusinessAdminToken = await loginAndGetToken(app, OTHER_BUS_ADMIN_PHONE);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('opens active register session and blocks second active open', async () => {
    const openRes = await request(app.getHttpServer())
      .post('/pos/register-session/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ openingCashCents: 50000, note: 'Sabah acilisi' })
      .expect(201);

    expect(openRes.body.openingCashCents).toBe(50000);
    expect(openRes.body.openedByUserId).toBe(adminUser.id);

    await request(app.getHttpServer())
      .post('/pos/register-session/open')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ openingCashCents: 25000 })
      .expect(409);
  });

  it('returns current active session', async () => {
    const res = await request(app.getHttpServer())
      .get('/pos/register-session/current')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    expect(res.body).toBeTruthy();
    expect(res.body.openingCashCents).toBe(50000);
    expect(res.body.closedAt).toBeNull();
  });

  it('prevents non-owner staff from closing active register', async () => {
    await request(app.getHttpServer())
      .post('/pos/register-session/close')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        registerCode: 'MAIN',
        closingCashCents: 62000,
        note: 'Kapatma denemesi',
      })
      .expect(403);
  });

  it('allows admin to close active register with variance', async () => {
    const closeRes = await request(app.getHttpServer())
      .post('/pos/register-session/close')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ closingCashCents: 62000, note: 'Gun sonu kapanisi' })
      .expect(201);

    expect(closeRes.body.closingCashCents).toBe(62000);
    expect(closeRes.body.closedByUserId).toBe(adminUser.id);
    expect(closeRes.body.varianceCents).toBe(12000);

    await request(app.getHttpServer())
      .get('/pos/register-session/current')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body === null || Object.keys(res.body).length === 0).toBe(
          true,
        );
      });
  });

  it('supports concurrent shifts by register and targeted close', async () => {
    const openMain = await request(app.getHttpServer())
      .post('/pos/register-session/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        registerCode: 'KASA-A',
        openingCashCents: 10000,
        note: 'Admin vardiyasi',
      })
      .expect(201);

    const openSecond = await request(app.getHttpServer())
      .post('/pos/register-session/open')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        registerCode: 'KASA-B',
        openingCashCents: 20000,
        note: 'Staff vardiyasi',
      })
      .expect(201);

    expect(openMain.body.registerCode).toBe('KASA-A');
    expect(openSecond.body.registerCode).toBe('KASA-B');
    expect(openSecond.body.openedByUserId).toBe(staffUser.id);

    await request(app.getHttpServer())
      .post('/pos/register-session/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        registerCode: 'KASA-B',
        openingCashCents: 30000,
      })
      .expect(409);

    const shiftList = await request(app.getHttpServer())
      .get('/pos/reports/shifts?registerCode=KASA-B&limit=5')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(shiftList.body)).toBe(true);
    expect(
      shiftList.body.some(
        (row: { registerCode: string; openedByUserId: number }) =>
          row.registerCode === 'KASA-B' && row.openedByUserId === staffUser.id,
      ),
    ).toBe(true);

    await request(app.getHttpServer())
      .post('/pos/register-session/close')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        registerCode: 'KASA-A',
        closingCashCents: 10100,
      })
      .expect(403);

    const closeSecond = await request(app.getHttpServer())
      .post('/pos/register-session/close')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        registerCode: 'KASA-B',
        closingCashCents: 22100,
      })
      .expect(201);
    expect(closeSecond.body.registerCode).toBe('KASA-B');
    expect(closeSecond.body.closedByUserId).toBe(staffUser.id);
    expect(closeSecond.body.varianceCents).toBe(2100);

    const closeMain = await request(app.getHttpServer())
      .post('/pos/register-session/close')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sessionId: openMain.body.id,
        closingCashCents: 10300,
      })
      .expect(201);
    expect(closeMain.body.registerCode).toBe('KASA-A');
    expect(closeMain.body.closedByUserId).toBe(adminUser.id);
  });

  it('isolates sessions by business and provides history', async () => {
    await request(app.getHttpServer())
      .post('/pos/register-session/open')
      .set('Authorization', `Bearer ${otherBusinessAdminToken}`)
      .send({ openingCashCents: 11000 })
      .expect(201);

    const business1History = await request(app.getHttpServer())
      .get('/pos/register-session/history?limit=5')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(business1History.body)).toBe(true);
    expect(business1History.body.length).toBeGreaterThan(0);
    expect(
      business1History.body.every(
        (session: { openedByUserId: number }) =>
          session.openedByUserId === adminUser.id ||
          session.openedByUserId === staffUser.id,
      ),
    ).toBe(true);
  });

  it('returns end-of-day report with order/payment/session totals', async () => {
    const order = await prisma.order.create({
      data: {
        businessId: business1.id,
        customerId: customer1.id,
        createdByUserId: adminUser.id,
        statusId: statusCreated.id,
        source: 'POS',
        subtotalAmountCents: 15000,
        taxAmountCents: 0,
        taxRateBps: 0,
        discountAmountCents: 0,
        totalAmountCents: 15000,
      },
      select: { id: true },
    });

    await prisma.payment.createMany({
      data: [
        {
          businessId: business1.id,
          orderId: order.id,
          amountCents: 10000,
          method: 'CASH',
        },
        {
          businessId: business1.id,
          orderId: order.id,
          amountCents: 5000,
          method: 'CARD',
        },
      ],
    });

    const today = new Date().toISOString().slice(0, 10);
    const reportRes = await request(app.getHttpServer())
      .get(`/pos/reports/end-of-day?date=${today}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(reportRes.body.date).toBe(today);
    expect(reportRes.body.orders.orderCount).toBeGreaterThanOrEqual(1);
    expect(reportRes.body.orders.totalSalesCents).toBeGreaterThanOrEqual(15000);
    expect(reportRes.body.payments.cashCents).toBeGreaterThanOrEqual(10000);
    expect(reportRes.body.payments.cardCents).toBeGreaterThanOrEqual(5000);
    expect(reportRes.body.payments.totalCents).toBeGreaterThanOrEqual(15000);
    expect(reportRes.body.sessions.sessionCount).toBeGreaterThanOrEqual(1);
  });

  it('finds product by barcode (sku) in POS scope', async () => {
    const lookupRes = await request(app.getHttpServer())
      .get(`/pos/products/barcode/${encodeURIComponent(`POS-RET-${RUN_ID}`)}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(lookupRes.body.type).toBe('PRODUCT');
    expect(lookupRes.body.productId).toBe(product1.id);
    expect(lookupRes.body.priceCents).toBe(15000);

    await request(app.getHttpServer())
      .get('/pos/products/barcode/UNKNOWN-BARCODE')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('searches/selects customer and applies customer balance to order', async () => {
    const searchRes = await request(app.getHttpServer())
      .get('/pos/customers/search?q=Balance')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(searchRes.body)).toBe(true);
    expect(searchRes.body.some((c: { id: number }) => c.id === customerWithBalance.id)).toBe(true);

    const customerRes = await request(app.getHttpServer())
      .get(`/pos/customers/${customerWithBalance.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(customerRes.body.balance).toBe(12000);

    const order = await prisma.order.create({
      data: {
        businessId: business1.id,
        customerId: customerWithBalance.id,
        createdByUserId: adminUser.id,
        statusId: statusCreated.id,
        source: 'POS',
        subtotalAmountCents: 15000,
        taxAmountCents: 0,
        taxRateBps: 0,
        discountAmountCents: 0,
        totalAmountCents: 15000,
      },
      select: { id: true },
    });

    const applyRes = await request(app.getHttpServer())
      .post(`/pos/orders/${order.id}/apply-balance`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amountCents: 5000 })
      .expect(201);

    expect(applyRes.body.appliedAmountCents).toBe(5000);
    expect(applyRes.body.remainingDueCents).toBe(10000);
    expect(applyRes.body.customerBalanceCents).toBe(7000);
    expect(applyRes.body.payment.amountCents).toBe(5000);
  });

  it('applies split payment to a POS order in one transaction', async () => {
    const order = await prisma.order.create({
      data: {
        businessId: business1.id,
        customerId: customer1.id,
        createdByUserId: adminUser.id,
        statusId: statusCreated.id,
        source: 'POS',
        subtotalAmountCents: 18000,
        taxAmountCents: 0,
        taxRateBps: 0,
        discountAmountCents: 0,
        totalAmountCents: 18000,
      },
      select: { id: true },
    });

    const splitRes = await request(app.getHttpServer())
      .post(`/pos/orders/${order.id}/split-payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        payments: [
          { method: 'CASH', amountCents: 10000, reference: 'KASA-A' },
          { method: 'CARD', amountCents: 8000, reference: 'POS-TERM-01' },
        ],
      })
      .expect(201);

    expect(splitRes.body.orderId).toBe(order.id);
    expect(splitRes.body.appliedAmountCents).toBe(18000);
    expect(splitRes.body.remainingDueCents).toBe(0);
    expect(Array.isArray(splitRes.body.payments)).toBe(true);
    expect(splitRes.body.payments.length).toBe(2);

    const paymentRows = await prisma.payment.findMany({
      where: { businessId: business1.id, orderId: order.id },
      orderBy: { createdAt: 'asc' },
      select: { amountCents: true, method: true },
    });
    expect(paymentRows.length).toBe(2);
    expect(paymentRows[0].amountCents + paymentRows[1].amountCents).toBe(18000);
  });

  it('executes POS return flow: restore stock + create negative refund payment', async () => {
    const posOrder = await prisma.order.create({
      data: {
        businessId: business1.id,
        customerId: customer1.id,
        createdByUserId: adminUser.id,
        statusId: statusCreated.id,
        source: 'POS',
        subtotalAmountCents: 30000,
        taxAmountCents: 0,
        taxRateBps: 0,
        discountAmountCents: 0,
        totalAmountCents: 30000,
        items: {
          create: {
            businessId: business1.id,
            productId: product1.id,
            productName: 'POS Return Product',
            quantity: 2,
            unitPriceCents: 15000,
            subtotalAmountCents: 30000,
            taxAmountCents: 0,
            taxRateBps: 0,
            totalAmountCents: 30000,
          },
        },
        payments: {
          create: {
            businessId: business1.id,
            amountCents: 30000,
            method: 'CASH',
          },
        },
      },
      select: { id: true },
    });

    await prisma.product.update({
      where: { id: product1.id },
      data: { stock: { decrement: 2 } },
    });

    const beforeStock = await prisma.product.findUnique({
      where: { id: product1.id },
      select: { stock: true },
    });
    expect(beforeStock?.stock).toBe(8);

    const returnRes = await request(app.getHttpServer())
      .post(`/pos/orders/${posOrder.id}/return`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        refundMethod: 'CASH',
        note: 'POS iade test',
      })
      .expect(201);

    expect(returnRes.body.orderId).toBe(posOrder.id);
    expect(returnRes.body.refundedAmountCents).toBe(30000);

    const afterStock = await prisma.product.findUnique({
      where: { id: product1.id },
      select: { stock: true },
    });
    expect(afterStock?.stock).toBe(10);

    const refundPayment = await prisma.payment.findFirst({
      where: {
        businessId: business1.id,
        orderId: posOrder.id,
        amountCents: -30000,
      },
      select: { id: true, method: true, reference: true },
    });
    expect(refundPayment).toBeTruthy();
    expect(refundPayment?.method).toBe('CASH');

    const returnedOrder = await prisma.order.findUnique({
      where: { id: posOrder.id },
      include: { status: { select: { key: true } } },
    });
    expect(returnedOrder?.status.key).toBe('RETURNED');

    await request(app.getHttpServer())
      .post(`/pos/orders/${posOrder.id}/return`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ refundMethod: 'CASH' })
      .expect(409);
  });

  it('returns staff sales report grouped by staff user', async () => {
    const reportDate = new Date().toISOString().slice(0, 10);

    await prisma.cashRegisterSession.createMany({
      data: [
        {
          businessId: business1.id,
          registerCode: 'RPT-A',
          openedByUserId: adminUser.id,
          closedByUserId: adminUser.id,
          openingCashCents: 1000,
          closingCashCents: 1400,
          openedAt: new Date(),
          closedAt: new Date(),
        },
        {
          businessId: business1.id,
          registerCode: 'RPT-B',
          openedByUserId: staffUser.id,
          closedByUserId: staffUser.id,
          openingCashCents: 2000,
          closingCashCents: 2500,
          openedAt: new Date(),
          closedAt: new Date(),
        },
      ],
    });

    const staffOrder = await prisma.order.create({
      data: {
        businessId: business1.id,
        customerId: customer1.id,
        createdByUserId: staffUser.id,
        statusId: statusCreated.id,
        source: 'POS',
        subtotalAmountCents: 9000,
        taxAmountCents: 0,
        taxRateBps: 0,
        discountAmountCents: 0,
        totalAmountCents: 9000,
      },
      select: { id: true },
    });

    await prisma.payment.create({
      data: {
        businessId: business1.id,
        orderId: staffOrder.id,
        amountCents: 9000,
        method: 'CARD',
      },
    });

    const reportRes = await request(app.getHttpServer())
      .get(`/pos/reports/staff-sales?dateFrom=${reportDate}&dateTo=${reportDate}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(reportRes.body.rows)).toBe(true);
    expect(reportRes.body.rows.length).toBeGreaterThan(0);

    const adminRow = reportRes.body.rows.find(
      (row: { userId: number }) => row.userId === adminUser.id,
    );
    const staffRow = reportRes.body.rows.find(
      (row: { userId: number }) => row.userId === staffUser.id,
    );

    expect(adminRow).toBeTruthy();
    expect(staffRow).toBeTruthy();

    expect(staffRow.orderCount).toBeGreaterThanOrEqual(1);
    expect(staffRow.salesTotalCents).toBeGreaterThanOrEqual(9000);
    expect(staffRow.paymentsTotalCents).toBeGreaterThanOrEqual(9000);
    expect(staffRow.shiftCount).toBeGreaterThanOrEqual(1);
    expect(reportRes.body.totals.orderCount).toBeGreaterThanOrEqual(1);
    expect(reportRes.body.totals.salesTotalCents).toBeGreaterThanOrEqual(9000);
  });

  it('returns POS sales analytics report and CSV export', async () => {
    const reportDate = new Date().toISOString().slice(0, 10);

    const order1 = await prisma.order.create({
      data: {
        businessId: business1.id,
        customerId: customer1.id,
        createdByUserId: adminUser.id,
        statusId: statusCreated.id,
        source: 'POS',
        subtotalAmountCents: 30000,
        taxAmountCents: 0,
        taxRateBps: 0,
        discountAmountCents: 0,
        totalAmountCents: 30000,
        items: {
          create: {
            businessId: business1.id,
            productId: product1.id,
            productName: 'POS Return Product',
            quantity: 2,
            unitPriceCents: 15000,
            subtotalAmountCents: 30000,
            taxAmountCents: 0,
            taxRateBps: 0,
            totalAmountCents: 30000,
          },
        },
      },
      select: { id: true },
    });

    const order2 = await prisma.order.create({
      data: {
        businessId: business1.id,
        customerId: customer1.id,
        createdByUserId: staffUser.id,
        statusId: statusCreated.id,
        source: 'POS',
        subtotalAmountCents: 22000,
        taxAmountCents: 0,
        taxRateBps: 0,
        discountAmountCents: 0,
        totalAmountCents: 22000,
        items: {
          create: {
            businessId: business1.id,
            productId: product2.id,
            productName: 'POS Analytics Product',
            quantity: 1,
            unitPriceCents: 22000,
            subtotalAmountCents: 22000,
            taxAmountCents: 0,
            taxRateBps: 0,
            totalAmountCents: 22000,
          },
        },
      },
      select: { id: true },
    });

    await prisma.payment.createMany({
      data: [
        {
          businessId: business1.id,
          orderId: order1.id,
          amountCents: 30000,
          method: 'CASH',
        },
        {
          businessId: business1.id,
          orderId: order2.id,
          amountCents: 22000,
          method: 'CARD',
        },
      ],
    });

    const reportRes = await request(app.getHttpServer())
      .get(
        `/pos/reports/sales?period=day&dateFrom=${reportDate}&dateTo=${reportDate}&topLimit=5`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(reportRes.body.range.period).toBe('day');
    expect(reportRes.body.summary.orderCount).toBeGreaterThanOrEqual(2);
    expect(reportRes.body.summary.salesTotalCents).toBeGreaterThanOrEqual(52000);
    expect(Array.isArray(reportRes.body.trend)).toBe(true);
    expect(reportRes.body.trend.length).toBeGreaterThan(0);
    expect(Array.isArray(reportRes.body.topProducts)).toBe(true);
    expect(
      reportRes.body.topProducts.some(
        (row: { productId: number }) =>
          row.productId === product1.id || row.productId === product2.id,
      ),
    ).toBe(true);

    const exportRes = await request(app.getHttpServer())
      .get(
        `/pos/reports/sales/export?period=day&dateFrom=${reportDate}&dateTo=${reportDate}&topLimit=5`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(String(exportRes.headers['content-type'] || '')).toContain('text/csv');
    expect(exportRes.text).toContain('POS Sales Report');
    expect(exportRes.text).toContain('TopProducts');
  });

  it('returns A4 invoice payload for POS order with tax breakdown', async () => {
    await prisma.settings.createMany({
      data: [
        {
          businessId: business1.id,
          key: 'invoice.companyName',
          value: 'Nutopiano Magaza',
        },
        {
          businessId: business1.id,
          key: 'invoice.taxNumber',
          value: '1234567890',
        },
        {
          businessId: business1.id,
          key: 'invoice.taxOffice',
          value: 'Kadikoy',
        },
      ],
      skipDuplicates: true,
    });

    await prisma.customerAddress.create({
      data: {
        businessId: business1.id,
        customerId: customer1.id,
        title: 'Fatura',
        fullName: 'POS Report Customer',
        phone: `+905${PHONE_BASE}51`,
        line1: 'Moda Cd. 10',
        city: 'Istanbul',
        district: 'Kadikoy',
        postalCode: '34710',
        country: 'TR',
        isDefaultBilling: true,
      },
    });

    const posOrder = await prisma.order.create({
      data: {
        businessId: business1.id,
        customerId: customer1.id,
        createdByUserId: adminUser.id,
        statusId: statusCreated.id,
        source: 'POS',
        subtotalAmountCents: 30000,
        taxAmountCents: 6000,
        taxRateBps: 2000,
        discountAmountCents: 0,
        totalAmountCents: 36000,
        items: {
          create: {
            businessId: business1.id,
            productId: product1.id,
            productName: 'POS Return Product',
            quantity: 2,
            unitPriceCents: 15000,
            subtotalAmountCents: 30000,
            taxAmountCents: 6000,
            taxRateBps: 2000,
            totalAmountCents: 36000,
          },
        },
        payments: {
          create: {
            businessId: business1.id,
            amountCents: 30000,
            method: 'CASH',
          },
        },
      },
      select: { id: true },
    });

    const invoiceRes = await request(app.getHttpServer())
      .get(`/pos/orders/${posOrder.id}/invoice`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(invoiceRes.body.order.id).toBe(posOrder.id);
    expect(invoiceRes.body.business.name).toBe('Nutopiano Magaza');
    expect(invoiceRes.body.business.taxNumber).toBe('1234567890');
    expect(invoiceRes.body.customer.billingAddress).toBeTruthy();
    expect(Array.isArray(invoiceRes.body.lines)).toBe(true);
    expect(invoiceRes.body.lines.length).toBe(1);
    expect(Array.isArray(invoiceRes.body.taxBreakdown)).toBe(true);
    expect(invoiceRes.body.taxBreakdown[0].taxRateBps).toBe(2000);
    expect(invoiceRes.body.totals.totalAmountCents).toBe(36000);
    expect(invoiceRes.body.totals.paidAmountCents).toBe(30000);
    expect(invoiceRes.body.totals.remainingAmountCents).toBe(6000);
  });
});
