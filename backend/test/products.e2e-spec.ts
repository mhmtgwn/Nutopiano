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
  let sellerToken: string;
  let staffToken: string;
  let business1: { id: number };
  let business2: { id: number };
  let adminUser: { id: number; phone: string };
  let sellerUser: { id: number; phone: string };
  let sellerProfile: { id: number };
  let staffUser: { id: number; phone: string };
  let otherBusinessAdmin: { id: number; phone: string };
  let adminProduct: { id: number; sku?: string | null };
  let otherBusinessProduct: { id: number; sku?: string | null };
  let category1: { id: number };
  let category2: { id: number };

  const RUN_ID = Date.now().toString();
  const PHONE_BASE = RUN_ID.slice(-7);
  const ADMIN_PHONE = `+905${PHONE_BASE}01`;
  const SELLER_PHONE = `+905${PHONE_BASE}09`;
  const STAFF_PHONE = `+905${PHONE_BASE}02`;
  const OTHER_BUS_ADMIN_PHONE = `+905${PHONE_BASE}03`;
  const ADMIN_PRODUCT_SKU = `SKU-ADMIN-${RUN_ID}`;
  const OTHER_BUS_PRODUCT_SKU = `SKU-OTHER-${RUN_ID}`;
  const IMPORT_NEW_SKU = `SKU-IMPORT-${RUN_ID}`;

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

    sellerUser = await prisma.user.create({
      data: {
        businessId: business1.id,
        name: 'Products Seller',
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
        displayName: 'Products Seller',
        slug: `products-seller-${RUN_ID}`,
        isActive: true,
      },
      select: { id: true },
    });

    staffUser = await prisma.user.create({
      data: {
        businessId: business1.id,
        name: 'Products Staff',
        phone: STAFF_PHONE,
        passwordHash,
        role: 'USER',
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
    sellerToken = await loginAndGetToken(app, SELLER_PHONE);
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
          ownerSellerId: sellerProfile.id,
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

    it('USER cannot create product (403)', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          categoryId: category1.id,
          name: 'Staff Product',
          sku: `SKU-USER-${RUN_ID}`,
          type: 'PHYSICAL',
          price: '500',
        })
        .expect(403);
    });

    it('ADMIN can list products in own business only', async () => {
      const res = await request(app.getHttpServer())
        .get('/products/manage')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      const skus = res.body.data.map((p: { sku?: string | null }) => p.sku);

      expect(skus).toEqual(expect.arrayContaining([ADMIN_PRODUCT_SKU]));
      expect(skus).not.toContain(OTHER_BUS_PRODUCT_SKU);
    });

    it('USER cannot list products manage view (403)', async () => {
      await request(app.getHttpServer())
        .get('/products/manage')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('can export products as CSV', async () => {
      const res = await request(app.getHttpServer())
        .get('/products/export/csv')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(String(res.header['content-type'] ?? '')).toContain('text/csv');
      expect(res.text).toContain('id,categoryId,name,subtitle,sku,type,priceCents');
      expect(res.text).toContain(ADMIN_PRODUCT_SKU);
    });

    it('can import products from CSV with sku upsert', async () => {
      const csv = [
        'id,categoryId,name,sku,type,priceCents,stock,isActive',
        `,${category1.id},Imported Product,${IMPORT_NEW_SKU},PHYSICAL,7777,4,true`,
        `,${category1.id},Admin Product CSV Updated,${ADMIN_PRODUCT_SKU},PHYSICAL,2222,6,true`,
      ].join('\n');

      const importRes = await request(app.getHttpServer())
        .post('/products/import/csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          csv,
          upsertBy: 'sku',
        })
        .expect(201);

      expect(importRes.body.created).toBe(1);
      expect(importRes.body.updated).toBe(1);
      expect(importRes.body.errors).toHaveLength(0);

      const listRes = await request(app.getHttpServer())
        .get('/products/manage')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      const skus = listRes.body.data.map((p: { sku?: string | null }) => p.sku);
      expect(skus).toContain(ADMIN_PRODUCT_SKU);
      expect(skus).not.toContain(IMPORT_NEW_SKU);

      const imported = await prisma.product.findFirst({
        where: {
          businessId: business1.id,
          sku: IMPORT_NEW_SKU,
        },
        select: {
          id: true,
          name: true,
          priceCents: true,
        },
      });
      expect(imported).toMatchObject({
        name: 'Imported Product',
        priceCents: 7777,
      });

      const updated = await prisma.product.findFirst({
        where: {
          id: adminProduct.id,
        },
        select: {
          name: true,
          priceCents: true,
        },
      });
      expect(updated).toMatchObject({
        name: 'Admin Product CSV Updated',
        priceCents: 2222,
      });
    });

    it('USER cannot update product (403)', async () => {
      await request(app.getHttpServer())
        .patch(`/products/${adminProduct.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'Updated by Staff' })
        .expect(403);
    });

    it('USER cannot delete product (403)', async () => {
      await request(app.getHttpServer())
        .delete(`/products/${adminProduct.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
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
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      const ids = listRes.body.data.map((p: { id: number }) => p.id);
      expect(ids).not.toContain(adminProduct.id);
    });

    it('Cross-tenant products are not visible and return 404 by id', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/products/manage')
        .set('Authorization', `Bearer ${sellerToken}`)
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

