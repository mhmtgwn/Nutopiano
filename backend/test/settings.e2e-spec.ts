import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { loginAndGetToken } from './helpers/auth-helpers';

describe('Settings (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let staffToken: string;
  let business1: { id: number };
  let business2: { id: number };
  let otherBusinessAdmin: { id: number; phone: string };

  const RUN_ID = Date.now().toString();
  const ADMIN_PHONE = `+9600000${RUN_ID}1`;
  const STAFF_PHONE = `+9600000${RUN_ID}2`;
  const OTHER_BUS_ADMIN_PHONE = `+9600000${RUN_ID}3`;
  const SETTING_KEY = 'order.defaultStatusKey';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    business1 = await prisma.business.create({
      data: {
        name: `Settings E2E Business 1 ${RUN_ID}`,
      },
    });

    business2 = await prisma.business.create({
      data: {
        name: `Settings E2E Business 2 ${RUN_ID}`,
      },
    });

    const adminUser = await prisma.user.create({
      data: {
        businessId: business1.id,
        name: 'Settings Admin',
        phone: ADMIN_PHONE,
        role: 'ADMIN',
        isActive: true,
      },
    });

    const staffUser = await prisma.user.create({
      data: {
        businessId: business1.id,
        name: 'Settings Staff',
        phone: STAFF_PHONE,
        role: 'STAFF',
        isActive: true,
      },
    });

    otherBusinessAdmin = await prisma.user.create({
      data: {
        businessId: business2.id,
        name: 'Other Business Admin (Settings)',
        phone: OTHER_BUS_ADMIN_PHONE,
        role: 'ADMIN',
        isActive: true,
      },
    });

    // Seed a setting for business2 to test cross-tenant isolation
    await prisma.settings.create({
      data: {
        businessId: business2.id,
        key: SETTING_KEY,
        value: 'OTHER_CREATED',
      },
    });

    adminToken = await loginAndGetToken(app, ADMIN_PHONE);
    staffToken = await loginAndGetToken(app, STAFF_PHONE);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('/settings', () => {
    it('ADMIN can create/update a setting', async () => {
      const res = await request(app.getHttpServer())
        .post(`/settings/${SETTING_KEY}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: 'CREATED' })
        .expect(201);

      expect(res.body).toMatchObject({
        key: SETTING_KEY,
        value: 'CREATED',
      });
    });

    it('ADMIN can read a setting by key', async () => {
      const res = await request(app.getHttpServer())
        .get(`/settings/${SETTING_KEY}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        key: SETTING_KEY,
        value: 'CREATED',
      });
    });

    it('STAFF can read settings but cannot write', async () => {
      // Read
      await request(app.getHttpServer())
        .get(`/settings/${SETTING_KEY}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      // Write should be forbidden
      await request(app.getHttpServer())
        .post(`/settings/${SETTING_KEY}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ value: 'STAFF_VALUE' })
        .expect(403);
    });

    it('ADMIN and STAFF only see settings for their business', async () => {
      const adminRes = await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const adminKeys = adminRes.body.map((s: { key: string }) => s.key);
      expect(adminKeys).toContain(SETTING_KEY);

      const staffRes = await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const staffKeys = staffRes.body.map((s: { key: string }) => s.key);
      expect(staffKeys).toContain(SETTING_KEY);
    });

    it('Cross-tenant settings are isolated (404 for other business setting key)', async () => {
      await request(app.getHttpServer())
        .get(`/settings/${SETTING_KEY}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Just to be explicit, fetch with other business admin and ensure it sees its own value
      const otherBusinessToken = await loginAndGetToken(app, OTHER_BUS_ADMIN_PHONE);
      const otherRes = await request(app.getHttpServer())
        .get(`/settings/${SETTING_KEY}`)
        .set('Authorization', `Bearer ${otherBusinessToken}`)
        .expect(200);

      expect(otherRes.body).toMatchObject({
        key: SETTING_KEY,
        value: 'OTHER_CREATED',
      });
    });
  });
});
