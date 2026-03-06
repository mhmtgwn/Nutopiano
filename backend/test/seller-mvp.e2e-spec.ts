import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { loginAndGetToken } from './helpers/auth-helpers';

describe('Seller MVP (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let business: { id: number };
  let sellerOwnerUser: { id: number; phone: string };
  let sellerProfile: { id: number };
  let invitedUser: { id: number; phone: string };
  let invitedUserToken: string;
  let sellerToken: string;
  let sellerTeamMemberId: number;

  let customerForCredit: { id: number };
  let category: { id: number };
  let sellerProductId: number;
  let creditOrderId: number;

  const RUN_ID = Date.now().toString();
  const PHONE_BASE = RUN_ID.slice(-7);
  const SELLER_PHONE = `+905${PHONE_BASE}81`;
  const INVITED_USER_PHONE = `+905${PHONE_BASE}82`;
  const CREDIT_CUSTOMER_PHONE = `+905${PHONE_BASE}83`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    const passwordHash = await bcrypt.hash('password123', 10);

    business = await prisma.business.create({
      data: {
        name: `Seller MVP E2E Business ${RUN_ID}`,
      },
    });

    sellerOwnerUser = await prisma.user.create({
      data: {
        businessId: business.id,
        name: 'Seller Owner',
        phone: SELLER_PHONE,
        passwordHash,
        role: 'SELLER',
        isActive: true,
      },
      select: { id: true, phone: true },
    });

    sellerProfile = await prisma.seller.create({
      data: {
        businessId: business.id,
        userId: sellerOwnerUser.id,
        slug: `seller-mvp-${RUN_ID}`,
        displayName: 'Seller MVP',
        isActive: true,
      },
      select: { id: true },
    });

    invitedUser = await prisma.user.create({
      data: {
        businessId: business.id,
        name: 'Invited User',
        phone: INVITED_USER_PHONE,
        passwordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
      select: { id: true, phone: true },
    });

    customerForCredit = await prisma.customer.create({
      data: {
        businessId: business.id,
        createdByUserId: sellerOwnerUser.id,
        name: 'Credit Customer',
        phone: CREDIT_CUSTOMER_PHONE,
        balance: 0,
        creditLimitCents: 500,
        creditBlockPolicy: 'WARN',
      },
      select: { id: true },
    });

    category = await prisma.category.create({
      data: {
        businessId: business.id,
        createdByUserId: sellerOwnerUser.id,
        name: 'Seller MVP Category',
        slug: `seller-mvp-category-${RUN_ID}`,
        scopeType: 'GLOBAL',
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
        {
          businessId: business.id,
          key: 'COMPLETED',
          label: 'Completed',
          orderIndex: 2,
          isFinal: true,
          isDefault: false,
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

    sellerToken = await loginAndGetToken(app, SELLER_PHONE);
    invitedUserToken = await loginAndGetToken(app, INVITED_USER_PHONE);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('seller can invite a user and invited user can accept', async () => {
    const inviteRes = await request(app.getHttpServer())
      .post('/seller/team/invites')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        targetUserId: invitedUser.id,
      })
      .expect(201);

    expect(inviteRes.body.status).toBe('PENDING');
    expect(typeof inviteRes.body.id).toBe('number');

    await request(app.getHttpServer())
      .post(`/seller/team/invites/${inviteRes.body.id}/accept`)
      .set('Authorization', `Bearer ${invitedUserToken}`)
      .expect(201);

    const [member, refreshedUser] = await Promise.all([
      prisma.sellerTeamMember.findFirst({
        where: {
          businessId: business.id,
          sellerId: sellerProfile.id,
          userId: invitedUser.id,
          isActive: true,
        },
        select: {
          id: true,
          permissionsJson: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: invitedUser.id },
        select: { role: true },
      }),
    ]);

    expect(member).toBeTruthy();
    expect(refreshedUser?.role).toBe('SELLER_STAFF');
    sellerTeamMemberId = Number(member?.id);

    invitedUserToken = await loginAndGetToken(app, INVITED_USER_PHONE);
  });

  it('seller can list team members', async () => {
    const res = await request(app.getHttpServer())
      .get('/seller/team/members')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((row: { userId: number }) => row.userId === invitedUser.id)).toBe(
      true,
    );
  });

  it('seller product publish flow enforces stock rules', async () => {
    const created = await request(app.getHttpServer())
      .post('/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        categoryId: category.id,
        name: 'Seller MVP Product',
        sku: `SELLER-MVP-${RUN_ID}`,
        type: 'PHYSICAL',
        price: '1000',
        costPriceCents: 600,
        stock: 0,
        isPublished: false,
      })
      .expect(201);

    sellerProductId = Number(created.body.id);
    expect(created.body.ownerSellerId).toBe(sellerProfile.id);
    expect(created.body.isPublished).toBe(false);

    await request(app.getHttpServer())
      .patch(`/seller/products/${sellerProductId}/publish`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ isPublished: true })
      .expect(422);

    const withStock = await request(app.getHttpServer())
      .patch(`/seller/products/${sellerProductId}/stock`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ stock: 7 })
      .expect(200);

    expect(withStock.body.stock).toBe(7);
    expect(withStock.body.isPublished).toBe(false);

    const published = await request(app.getHttpServer())
      .patch(`/seller/products/${sellerProductId}/publish`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ isPublished: true })
      .expect(200);

    expect(published.body.isPublished).toBe(true);

    const stockZero = await request(app.getHttpServer())
      .patch(`/seller/products/${sellerProductId}/stock`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ stock: 0 })
      .expect(200);

    expect(stockZero.body.isPublished).toBe(false);
  });

  it('invited SELLER_STAFF can create credit POS order and ledger entry is created', async () => {
    await request(app.getHttpServer())
      .patch(`/seller/products/${sellerProductId}/stock`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ stock: 10 })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/seller/products/${sellerProductId}/publish`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ isPublished: true })
      .expect(200);

    const orderRes = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${invitedUserToken}`)
      .send({
        sellerId: sellerProfile.id,
        customerId: customerForCredit.id,
        source: 'POS',
        paymentMode: 'CREDIT',
        items: [{ productId: sellerProductId, quantity: 1 }],
      })
      .expect(201);

    expect(orderRes.body.totalAmountCents).toBe(1000);
    expect(orderRes.body.creditLimitWarned).toBe(true);
    creditOrderId = Number(orderRes.body.id);

    const ledger = await prisma.customerLedgerEntry.findFirst({
      where: {
        businessId: business.id,
        sellerId: sellerProfile.id,
        customerId: customerForCredit.id,
        orderId: creditOrderId,
        type: 'DEBIT',
      },
      select: { amountCents: true, sourceType: true },
    });

    expect(ledger?.amountCents).toBe(1000);
    expect(ledger?.sourceType).toBe('SALE_DEBIT');
  });

  it('seller customer ledger and finance reports reflect debit-credit flow', async () => {
    const customersRes = await request(app.getHttpServer())
      .get('/seller/customers')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(Array.isArray(customersRes.body.data)).toBe(true);
    const ledgerCustomer = customersRes.body.data.find(
      (row: { id: number }) => row.id === customerForCredit.id,
    );
    expect(ledgerCustomer).toBeTruthy();
    expect(ledgerCustomer.outstandingDebtCents).toBe(1000);

    const ledgerBefore = await request(app.getHttpServer())
      .get(`/seller/customers/${customerForCredit.id}/ledger`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(ledgerBefore.body.summary.outstandingDebtCents).toBe(1000);

    await request(app.getHttpServer())
      .post(`/orders/${creditOrderId}/payments`)
      .set('Authorization', `Bearer ${invitedUserToken}`)
      .send({
        amount: '400',
        method: 'CASH',
      })
      .expect(201);

    const ledgerAfter = await request(app.getHttpServer())
      .get(`/seller/customers/${customerForCredit.id}/ledger`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(ledgerAfter.body.summary.totalDebitCents).toBe(1000);
    expect(ledgerAfter.body.summary.totalCreditCents).toBe(400);
    expect(ledgerAfter.body.summary.outstandingDebtCents).toBe(600);

    const overviewRes = await request(app.getHttpServer())
      .get('/seller/finance/overview')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(overviewRes.body.orderCount).toBeGreaterThanOrEqual(1);
    expect(overviewRes.body.grossRevenueCents).toBeGreaterThanOrEqual(1000);
    expect(overviewRes.body.openCreditCents).toBeGreaterThanOrEqual(600);
    expect(overviewRes.body.warnCount).toBeGreaterThanOrEqual(1);

    const usersReportRes = await request(app.getHttpServer())
      .get('/seller/finance/reports/users')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(Array.isArray(usersReportRes.body.rows)).toBe(true);
    const invitedUserRow = usersReportRes.body.rows.find(
      (row: { userId: number }) => row.userId === invitedUser.id,
    );
    expect(invitedUserRow).toBeTruthy();
    expect(invitedUserRow.orderCount).toBeGreaterThanOrEqual(1);
    expect(invitedUserRow.salesTotalCents).toBeGreaterThanOrEqual(1000);

    const productsReportRes = await request(app.getHttpServer())
      .get('/seller/finance/reports/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(Array.isArray(productsReportRes.body.rows)).toBe(true);
    const productRow = productsReportRes.body.rows.find(
      (row: { productId: number }) => row.productId === sellerProductId,
    );
    expect(productRow).toBeTruthy();
    expect(productRow.quantity).toBeGreaterThanOrEqual(1);
    expect(productRow.salesCents).toBeGreaterThanOrEqual(1000);
  });

  it('seller can update customer credit policy in seller scope', async () => {
    const updated = await request(app.getHttpServer())
      .patch(`/seller/customers/${customerForCredit.id}/credit-policy`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        creditLimitCents: 2000,
        creditBlockPolicy: 'BLOCK',
      })
      .expect(200);

    expect(updated.body.id).toBe(customerForCredit.id);
    expect(updated.body.creditLimitCents).toBe(2000);
    expect(updated.body.creditBlockPolicy).toBe('BLOCK');
  });

  it('seller can restrict SELLER_STAFF permissions and order actions are blocked', async () => {
    const updatedMember = await request(app.getHttpServer())
      .patch(`/seller/team/members/${sellerTeamMemberId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        permissions: ['tab.sales'],
      })
      .expect(200);

    expect(updatedMember.body.permissionsJson).toBeTruthy();

    await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${invitedUserToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${invitedUserToken}`)
      .send({
        sellerId: sellerProfile.id,
        customerId: customerForCredit.id,
        source: 'POS',
        paymentMode: 'CASH',
        items: [{ productId: sellerProductId, quantity: 1 }],
      })
      .expect(403);

    await request(app.getHttpServer())
      .get(`/pos/orders/${creditOrderId}/invoice`)
      .set('Authorization', `Bearer ${invitedUserToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/pos/orders/${creditOrderId}/split-payment`)
      .set('Authorization', `Bearer ${invitedUserToken}`)
      .send({
        payments: [
          {
            method: 'CASH',
            amountCents: 100,
          },
        ],
      })
      .expect(201);
  });

  it('SELLER_STAFF cannot access finance/customers tabs endpoints', async () => {
    await request(app.getHttpServer())
      .get('/seller/finance/overview')
      .set('Authorization', `Bearer ${invitedUserToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/seller/finance/reports/users')
      .set('Authorization', `Bearer ${invitedUserToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/seller/customers')
      .set('Authorization', `Bearer ${invitedUserToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/seller/customers/${customerForCredit.id}/ledger`)
      .set('Authorization', `Bearer ${invitedUserToken}`)
      .expect(403);
  });

  it('seller can deactivate team member and role falls back to CUSTOMER when no active membership remains', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/seller/team/members/${sellerTeamMemberId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ isActive: false })
      .expect(200);

    expect(res.body.isActive).toBe(false);

    const refreshedUser = await prisma.user.findUnique({
      where: { id: invitedUser.id },
      select: { role: true },
    });
    expect(refreshedUser?.role).toBe('CUSTOMER');
  });
});
