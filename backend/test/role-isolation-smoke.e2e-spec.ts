import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { loginAndGetToken } from './helpers/auth-helpers';

describe('Role Isolation Smoke (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let business: { id: number };
  let sellerUser: { id: number; phone: string };
  let adminUser: { id: number; phone: string };
  let superAdminUser: { id: number; phone: string };
  let teamUser: { id: number; phone: string };
  let freeUser: { id: number; phone: string };
  let customerUser: { id: number; phone: string };
  let roleTargetUser: { id: number; phone: string };
  let sellerProfile: { id: number };
  let customerRow: { id: number };
  let productRow: { id: number };

  let sellerToken: string;
  let adminToken: string;
  let superAdminToken: string;
  let teamUserToken: string;
  let freeUserToken: string;
  let customerToken: string;

  const RUN_ID = Date.now().toString();
  const PHONE_BASE = RUN_ID.slice(-7);
  const SELLER_PHONE = `+905${PHONE_BASE}91`;
  const ADMIN_PHONE = `+905${PHONE_BASE}92`;
  const SUPER_ADMIN_PHONE = `+905${PHONE_BASE}93`;
  const TEAM_USER_PHONE = `+905${PHONE_BASE}94`;
  const FREE_USER_PHONE = `+905${PHONE_BASE}95`;
  const CUSTOMER_PHONE = `+905${PHONE_BASE}96`;
  const ROLE_TARGET_PHONE = `+905${PHONE_BASE}97`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    const passwordHash = await bcrypt.hash('password123', 10);

    business = await prisma.business.create({
      data: { name: `Role Isolation Smoke ${RUN_ID}` },
      select: { id: true },
    });

    sellerUser = await prisma.user.create({
      data: {
        businessId: business.id,
        name: 'Smoke Seller',
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
        name: 'Smoke Admin',
        phone: ADMIN_PHONE,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
      select: { id: true, phone: true },
    });

    superAdminUser = await prisma.user.create({
      data: {
        businessId: business.id,
        name: 'Smoke Super Admin',
        phone: SUPER_ADMIN_PHONE,
        passwordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
      select: { id: true, phone: true },
    });

    teamUser = await prisma.user.create({
      data: {
        businessId: business.id,
        name: 'Smoke Team User',
        phone: TEAM_USER_PHONE,
        passwordHash,
        role: 'SELLER_STAFF',
        isActive: true,
      },
      select: { id: true, phone: true },
    });

    freeUser = await prisma.user.create({
      data: {
        businessId: business.id,
        name: 'Smoke Free User',
        phone: FREE_USER_PHONE,
        passwordHash,
        role: 'SELLER_STAFF',
        isActive: true,
      },
      select: { id: true, phone: true },
    });

    customerUser = await prisma.user.create({
      data: {
        businessId: business.id,
        name: 'Smoke Customer',
        phone: CUSTOMER_PHONE,
        passwordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
      select: { id: true, phone: true },
    });

    roleTargetUser = await prisma.user.create({
      data: {
        businessId: business.id,
        name: 'Smoke Role Target',
        phone: ROLE_TARGET_PHONE,
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
        slug: `smoke-seller-${RUN_ID}`,
        displayName: 'Smoke Seller',
        isActive: true,
      },
      select: { id: true },
    });

    await prisma.sellerTeamMember.create({
      data: {
        businessId: business.id,
        sellerId: sellerProfile.id,
        userId: teamUser.id,
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

    const category = await prisma.category.create({
      data: {
        businessId: business.id,
        createdByUserId: sellerUser.id,
        name: `Smoke Category ${RUN_ID}`,
        slug: `smoke-category-${RUN_ID}`,
        scopeType: 'GLOBAL',
        isActive: true,
      },
      select: { id: true },
    });

    productRow = await prisma.product.create({
      data: {
        businessId: business.id,
        createdByUserId: sellerUser.id,
        categoryId: category.id,
        ownerSellerId: sellerProfile.id,
        name: `Smoke Product ${RUN_ID}`,
        sku: `SMOKE-PRODUCT-${RUN_ID}`,
        type: 'PHYSICAL',
        priceCents: 1500,
        costPriceCents: 800,
        stock: 20,
        isPublished: true,
      },
      select: { id: true },
    });

    customerRow = await prisma.customer.create({
      data: {
        businessId: business.id,
        createdByUserId: sellerUser.id,
        userId: customerUser.id,
        name: 'Smoke Customer Row',
        phone: CUSTOMER_PHONE,
        balance: 0,
      },
      select: { id: true },
    });

    sellerToken = await loginAndGetToken(app, SELLER_PHONE);
    adminToken = await loginAndGetToken(app, ADMIN_PHONE);
    superAdminToken = await loginAndGetToken(app, SUPER_ADMIN_PHONE);
    teamUserToken = await loginAndGetToken(app, TEAM_USER_PHONE);
    freeUserToken = await loginAndGetToken(app, FREE_USER_PHONE);
    customerToken = await loginAndGetToken(app, CUSTOMER_PHONE);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('SELLER can access seller tabs APIs', async () => {
    await request(app.getHttpServer())
      .get('/seller/team/members')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/seller/customers')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/seller/finance/overview')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
  });

  it('SELLER_STAFF with membership can access sales/orders flows', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${teamUserToken}`)
      .send({
        sellerId: sellerProfile.id,
        customerId: customerRow.id,
        source: 'POS',
        paymentMode: 'CASH',
        items: [{ productId: productRow.id, quantity: 1 }],
      })
      .expect(201);

    expect(createRes.body.id).toBeDefined();
    expect(createRes.body.source).toBe('POS');

    await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${teamUserToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/pos/register-session/current')
      .set('Authorization', `Bearer ${teamUserToken}`)
      .expect(200);
  });

  it('SELLER_STAFF is blocked from finance/customers tabs APIs', async () => {
    await request(app.getHttpServer())
      .get('/seller/finance/overview')
      .set('Authorization', `Bearer ${teamUserToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/seller/customers')
      .set('Authorization', `Bearer ${teamUserToken}`)
      .expect(403);
  });

  it('CUSTOMER cannot access seller or pos APIs', async () => {
    await request(app.getHttpServer())
      .get('/seller/team/members')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/seller/finance/overview')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/pos/register-session/current')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('ADMIN and SUPER_ADMIN can access seller finance scope', async () => {
    await request(app.getHttpServer())
      .get(`/seller/finance/overview?sellerId=${sellerProfile.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/seller/finance/overview?sellerId=${sellerProfile.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
  });

  it('ADMIN can do normal writes but is blocked on super-admin force endpoints', async () => {
    const adminPublish = await request(app.getHttpServer())
      .patch(`/products/${productRow.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isPublished: false })
      .expect(200);
    expect(adminPublish.body.isPublished).toBe(false);

    await request(app.getHttpServer())
      .patch(`/platform/sellers/${sellerProfile.id}/products/${productRow.id}/publish-force`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        isPublished: false,
        reason: 'Admin moderation publish override',
      })
      .expect(403);

    const adminStock = await request(app.getHttpServer())
      .patch(`/products/${productRow.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stock: 17 })
      .expect(200);
    expect(adminStock.body.stock).toBe(17);

    await request(app.getHttpServer())
      .patch(`/platform/sellers/${sellerProfile.id}/products/${productRow.id}/stock-force`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        stock: 17,
        reason: 'Admin stock correction override',
      })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/users/${roleTargetUser.id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'SELLER_STAFF' })
      .expect(403);

    const roleOverride = await request(app.getHttpServer())
      .patch(`/users/${roleTargetUser.id}/role/override`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'SELLER_STAFF',
        reason: 'Seller team role assignment override',
      })
      .expect(200);

    expect(roleOverride.body.role).toBe('SELLER_STAFF');

    const roleAudit = await prisma.auditLog.findFirst({
      where: {
        businessId: business.id,
        actorUserId: adminUser.id,
        actionType: 'role-change',
        targetType: 'USER',
        targetId: String(roleTargetUser.id),
      },
    });

    expect(roleAudit).toBeTruthy();
  });

  it('SUPER_ADMIN has full critical-write access and actions are audited', async () => {
    const publishRes = await request(app.getHttpServer())
      .patch(`/products/${productRow.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ isPublished: true })
      .expect(200);
    expect(publishRes.body.isPublished).toBe(true);

    const stockRes = await request(app.getHttpServer())
      .patch(`/products/${productRow.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ stock: 19 })
      .expect(200);
    expect(stockRes.body.stock).toBe(19);

    const roleRes = await request(app.getHttpServer())
      .patch(`/users/${roleTargetUser.id}/role`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ role: 'CUSTOMER' })
      .expect(200);
    expect(roleRes.body.role).toBe('CUSTOMER');

    const [publishAudit, stockAudit, roleAudit] = await Promise.all([
      prisma.auditLog.findFirst({
        where: {
          businessId: business.id,
          actorUserId: superAdminUser.id,
          actionType: 'publish-force',
          targetType: 'PRODUCT',
          targetId: String(productRow.id),
        },
      }),
      prisma.auditLog.findFirst({
        where: {
          businessId: business.id,
          actorUserId: superAdminUser.id,
          actionType: 'stock-adjust-force',
          targetType: 'PRODUCT',
          targetId: String(productRow.id),
        },
      }),
      prisma.auditLog.findFirst({
        where: {
          businessId: business.id,
          actorUserId: superAdminUser.id,
          actionType: 'role-change',
          targetType: 'USER',
          targetId: String(roleTargetUser.id),
        },
      }),
    ]);

    expect(publishAudit).toBeTruthy();
    expect(stockAudit).toBeTruthy();
    expect(roleAudit).toBeTruthy();
  });

  it('SELLER_STAFF without membership is blocked from seller-scope APIs', async () => {
    await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${freeUserToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/pos/register-session/current')
      .set('Authorization', `Bearer ${freeUserToken}`)
      .expect(403);
  });
});
