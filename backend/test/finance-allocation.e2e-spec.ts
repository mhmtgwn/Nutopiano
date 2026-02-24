import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { loginAndGetToken } from './helpers/auth-helpers';

describe('Finance Allocation Metrics (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let business: { id: number };
  let sellerUser: { id: number; phone: string };
  let sellerProfile: { id: number };
  let sellerToken: string;

  const RUN_ID = Date.now().toString();
  const PHONE_BASE = RUN_ID.slice(-7);
  const SELLER_PHONE = `+905${PHONE_BASE}61`;
  const CUSTOMER_PHONE = `+905${PHONE_BASE}62`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    const passwordHash = await bcrypt.hash('password123', 10);

    business = await prisma.business.create({
      data: { name: `Finance Allocation ${RUN_ID}` },
      select: { id: true },
    });

    sellerUser = await prisma.user.create({
      data: {
        businessId: business.id,
        name: 'Allocation Seller',
        phone: SELLER_PHONE,
        passwordHash,
        role: 'SELLER',
        isActive: true,
      },
      select: { id: true, phone: true },
    });

    const customerUser = await prisma.user.create({
      data: {
        businessId: business.id,
        name: 'Allocation Customer User',
        phone: CUSTOMER_PHONE,
        passwordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
      select: { id: true },
    });

    sellerProfile = await prisma.seller.create({
      data: {
        businessId: business.id,
        userId: sellerUser.id,
        slug: `allocation-seller-${RUN_ID}`,
        displayName: 'Allocation Seller',
        isActive: true,
      },
      select: { id: true },
    });

    const customer = await prisma.customer.create({
      data: {
        businessId: business.id,
        createdByUserId: sellerUser.id,
        userId: customerUser.id,
        name: 'Allocation Customer',
        phone: CUSTOMER_PHONE,
        balance: 0,
      },
      select: { id: true },
    });

    const createdStatus = await prisma.orderStatus.create({
      data: {
        businessId: business.id,
        key: 'CREATED',
        label: 'Created',
        orderIndex: 1,
        isFinal: false,
        isDefault: true,
      },
      select: { id: true },
    });

    const category = await prisma.category.create({
      data: {
        businessId: business.id,
        createdByUserId: sellerUser.id,
        name: `Allocation Category ${RUN_ID}`,
        slug: `allocation-category-${RUN_ID}`,
        scopeType: 'GLOBAL',
        isActive: true,
      },
      select: { id: true },
    });

    const [productA, productB] = await Promise.all([
      prisma.product.create({
        data: {
          businessId: business.id,
          createdByUserId: sellerUser.id,
          ownerSellerId: sellerProfile.id,
          categoryId: category.id,
          name: 'Allocation Product A',
          sku: `ALLOC-A-${RUN_ID}`,
          type: 'PHYSICAL',
          priceCents: 500,
          costPriceCents: 300,
          stock: 10,
          isPublished: true,
          isActive: true,
        },
        select: { id: true },
      }),
      prisma.product.create({
        data: {
          businessId: business.id,
          createdByUserId: sellerUser.id,
          ownerSellerId: sellerProfile.id,
          categoryId: category.id,
          name: 'Allocation Product B',
          sku: `ALLOC-B-${RUN_ID}`,
          type: 'PHYSICAL',
          priceCents: 500,
          costPriceCents: 300,
          stock: 10,
          isPublished: true,
          isActive: true,
        },
        select: { id: true },
      }),
    ]);

    const order = await prisma.order.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        createdByUserId: sellerUser.id,
        sellerId: sellerProfile.id,
        statusId: createdStatus.id,
        subtotalAmountCents: 1000,
        taxAmountCents: 0,
        taxRateBps: 0,
        discountAmountCents: 0,
        totalAmountCents: 1000,
        shippingCostCents: 300,
        commissionSnapshotCents: 200,
        returnCostCents: 100,
        source: 'POS',
      },
      select: { id: true },
    });

    await prisma.orderItem.createMany({
      data: [
        {
          businessId: business.id,
          orderId: order.id,
          productId: productA.id,
          variantId: null,
          productName: 'Allocation Product A',
          quantity: 1,
          unitPriceCents: 500,
          subtotalAmountCents: 500,
          taxAmountCents: 0,
          taxRateBps: 0,
          totalAmountCents: 500,
          costSnapshotCents: 300,
        },
        {
          businessId: business.id,
          orderId: order.id,
          productId: productB.id,
          variantId: null,
          productName: 'Allocation Product B',
          quantity: 1,
          unitPriceCents: 500,
          subtotalAmountCents: 500,
          taxAmountCents: 0,
          taxRateBps: 0,
          totalAmountCents: 500,
          costSnapshotCents: 300,
        },
      ],
    });

    sellerToken = await loginAndGetToken(app, SELLER_PHONE);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('returns allocation-aware net profit metrics in overview and reports', async () => {
    const overview = await request(app.getHttpServer())
      .get('/seller/finance/overview')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(overview.body.orderCount).toBe(1);
    expect(overview.body.grossProfitCents).toBe(400);
    expect(overview.body.shippingCostCents).toBe(300);
    expect(overview.body.commissionCostCents).toBe(200);
    expect(overview.body.returnCostCents).toBe(100);
    expect(overview.body.netProfitV2Cents).toBe(-200);

    const usersReport = await request(app.getHttpServer())
      .get('/seller/finance/reports/users')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    const sellerRow = usersReport.body.rows.find(
      (row: { userId: number }) => row.userId === sellerUser.id,
    );
    expect(sellerRow).toBeTruthy();
    expect(sellerRow.profitCents).toBe(400);
    expect(sellerRow.netProfitV2Cents).toBe(-200);
    expect(usersReport.body.totals.netProfitV2Cents).toBe(-200);

    const productsReport = await request(app.getHttpServer())
      .get('/seller/finance/reports/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(productsReport.body.totals.profitCents).toBe(400);
    expect(productsReport.body.totals.netProfitV2Cents).toBe(-200);
    expect(productsReport.body.totals.shippingCostCents).toBe(300);
    expect(productsReport.body.totals.commissionCostCents).toBe(200);
    expect(productsReport.body.totals.returnCostCents).toBe(100);
  });
});
