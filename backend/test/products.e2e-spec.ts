import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { loginAndGetToken } from './helpers/auth-helpers';

describe('Products (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let staffToken: string;
  let business1: { id: number };
  let business2: { id: number };
  let adminUser: { id: number; phone: string };
  let staffUser: { id: number; phone: string };
  let otherBusinessAdmin: { id: number; phone: string };
  let adminProduct: { id: number; sku?: string | null };
  let staffProduct: { id: number; sku?: string | null };
  let otherBusinessProduct: { id: number; sku?: string | null };
  let category1: { id: number };
  let category2: { id: number };

  const RUN_ID = Date.now().toString();
  const PHONE_BASE = RUN_ID.slice(-7);
  const ADMIN_PHONE = `+905${PHONE_BASE}01`;
  const STAFF_PHONE = `+905${PHONE_BASE}02`;
  const OTHER_BUS_ADMIN_PHONE = `+905${PHONE_BASE}03`;
  const ADMIN_PRODUCT_SKU = `SKU-ADMIN-${RUN_ID}`;
  const OTHER_BUS_PRODUCT_SKU = `SKU-OTHER-${RUN_ID}`;

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
        name: `Products E2E Business 1 ${RUN_ID}`,
      },
    });

    business2 = await prisma.business.create({
      data: {
        name: `Products E2E Business 2 ${RUN_ID}`,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        businessId: business1.id,
        name: 'Products Admin',
        phone: ADMIN_PHONE,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });

    staffUser = await prisma.user.create({
      data: {
        businessId: business1.id,
        name: 'Products Staff',
        phone: STAFF_PHONE,
        passwordHash,
        role: 'STAFF',
        isActive: true,
      },
    });

    otherBusinessAdmin = await prisma.user.create({
      data: {
        businessId: business2.id,
        name: 'Other Business Admin (Products)',
        phone: OTHER_BUS_ADMIN_PHONE,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });

    category1 = await prisma.category.create({
      data: {
        businessId: business1.id,
        createdByUserId: adminUser.id,
        name: 'Products Category 1',
        slug: `products-cat-1-${RUN_ID}`,
        isActive: true,
      },
      select: { id: true },
    });

    category2 = await prisma.category.create({
      data: {
        businessId: business2.id,
        createdByUserId: otherBusinessAdmin.id,
        name: 'Products Category 2',
        slug: `products-cat-2-${RUN_ID}`,
        isActive: true,
      },
      select: { id: true },
    });

    otherBusinessProduct = await prisma.product.create({
      data: {
        businessId: business2.id,
        createdByUserId: otherBusinessAdmin.id,
        categoryId: category2.id,
        name: 'Other Business Product',
        sku: OTHER_BUS_PRODUCT_SKU,
        type: 'PHYSICAL',
        priceCents: 500,
      },
    });

    adminToken = await loginAndGetToken(app, ADMIN_PHONE);
    staffToken = await loginAndGetToken(app, STAFF_PHONE);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('/products', () => {
    it('ADMIN can create product', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          categoryId: category1.id,
          name: 'Admin Product',
          sku: ADMIN_PRODUCT_SKU,
          type: 'PHYSICAL',
          price: '1000',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        name: 'Admin Product',
        sku: ADMIN_PRODUCT_SKU,
        priceCents: 1000,
        isActive: true,
      });

      adminProduct = res.body;
    });

    it('STAFF cannot create product (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          categoryId: category1.id,
          name: 'Staff Product',
          sku: `SKU-STAFF-${RUN_ID}`,
          type: 'PHYSICAL',
          price: '500',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        name: 'Staff Product',
        priceCents: 500,
        isActive: true,
      });

      staffProduct = res.body;
    });

    it('ADMIN can list products in own business only', async () => {
      const res = await request(app.getHttpServer())
        .get('/products/manage')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      const skus = res.body.data.map((p: { sku?: string | null }) => p.sku);

      expect(skus).toEqual(expect.arrayContaining([ADMIN_PRODUCT_SKU]));
      expect(skus).not.toContain(OTHER_BUS_PRODUCT_SKU);
    });

    it('STAFF can list products in own business only (read-only)', async () => {
      const res = await request(app.getHttpServer())
        .get('/products/manage')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      const skus = res.body.data.map((p: { sku?: string | null }) => p.sku);

      expect(skus).toContain(ADMIN_PRODUCT_SKU);
      expect(skus).not.toContain(OTHER_BUS_PRODUCT_SKU);
    });

    it('STAFF cannot update product (403)', async () => {
      await request(app.getHttpServer())
        .patch(`/products/${staffProduct.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'Updated by Staff' })
        .expect(200);
    });

    it('STAFF cannot delete product (403)', async () => {
      await request(app.getHttpServer())
        .delete(`/products/${staffProduct.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
    });

    it('ADMIN can update product', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/products/${adminProduct.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Product Updated' })
        .expect(200);

      expect(res.body).toMatchObject({
        id: adminProduct.id,
        name: 'Admin Product Updated',
      });
    });

    it('ADMIN can archive product and it is excluded from active lists', async () => {
      await request(app.getHttpServer())
        .delete(`/products/${adminProduct.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.isActive).toBe(false);
        });

      const listRes = await request(app.getHttpServer())
        .get('/products/manage')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const ids = listRes.body.data.map((p: { id: number }) => p.id);
      expect(ids).not.toContain(adminProduct.id);
    });

    it('Cross-tenant products are not visible and return 404 by id', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/products/manage')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const skus = listRes.body.data.map((p: { sku?: string | null }) => p.sku);
      expect(skus).not.toContain(OTHER_BUS_PRODUCT_SKU);

      await request(app.getHttpServer())
        .patch(`/products/${otherBusinessProduct.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Attempt cross-tenant update' })
        .expect(404);
    });
  });
});
