import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { loginAndGetToken } from './helpers/auth-helpers';

describe('OrderStatus (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let staffToken: string;
  let business1: { id: number };
  let business2: { id: number };
  let adminUser: { id: number; phone: string };
  let staffUser: { id: number; phone: string };
  let otherBusinessAdmin: { id: number; phone: string };
  let createdStatus: { id: number; key: string; isDefault: boolean };
  let otherBusinessStatus: { id: number; key: string; isDefault: boolean };

  const RUN_ID = Date.now().toString();
  const ADMIN_PHONE = `+9500000${RUN_ID}1`;
  const STAFF_PHONE = `+9500000${RUN_ID}2`;
  const OTHER_BUS_ADMIN_PHONE = `+9500000${RUN_ID}3`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    business1 = await prisma.business.create({
      data: {
        name: `OrderStatus E2E Business 1 ${RUN_ID}`,
      },
    });

    business2 = await prisma.business.create({
      data: {
        name: `OrderStatus E2E Business 2 ${RUN_ID}`,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        businessId: business1.id,
        name: 'OrderStatus Admin',
        phone: ADMIN_PHONE,
        role: 'ADMIN',
        isActive: true,
      },
    });

    staffUser = await prisma.user.create({
      data: {
        businessId: business1.id,
        name: 'OrderStatus Staff',
        phone: STAFF_PHONE,
        role: 'STAFF',
        isActive: true,
      },
    });

    otherBusinessAdmin = await prisma.user.create({
      data: {
        businessId: business2.id,
        name: 'Other Business Admin (OrderStatus)',
        phone: OTHER_BUS_ADMIN_PHONE,
        role: 'ADMIN',
        isActive: true,
      },
    });

    otherBusinessStatus = await prisma.orderStatus.create({
      data: {
        businessId: business2.id,
        key: 'OTHER_CREATED',
        label: 'Other Created',
        orderIndex: 1,
        isFinal: false,
        isDefault: true,
      },
    });

    adminToken = await loginAndGetToken(app, ADMIN_PHONE);
    staffToken = await loginAndGetToken(app, STAFF_PHONE);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('/order-status', () => {
    it('ADMIN can create order status and set default', async () => {
      const res = await request(app.getHttpServer())
        .post('/order-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: 'CREATED',
          label: 'Created',
          isDefault: true,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        key: 'CREATED',
        label: 'Created',
        isDefault: true,
      });

      createdStatus = res.body;
    });

    it('ADMIN can create another non-default status', async () => {
      const res = await request(app.getHttpServer())
        .post('/order-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: 'IN_PROGRESS',
          label: 'In progress',
          isFinal: false,
          isDefault: false,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        key: 'IN_PROGRESS',
        label: 'In progress',
        isDefault: false,
      });
    });

    it('STAFF cannot create order status (403)', async () => {
      await request(app.getHttpServer())
        .post('/order-status')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          key: 'STAFF_STATUS',
          label: 'Staff Status',
        })
        .expect(403);
    });

    it('ADMIN and STAFF can list statuses only for their business', async () => {
      const adminRes = await request(app.getHttpServer())
        .get('/order-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const adminKeys = adminRes.body.map((s: { key: string }) => s.key);
      expect(adminKeys).toEqual(expect.arrayContaining(['CREATED', 'IN_PROGRESS']));
      expect(adminKeys).not.toContain('OTHER_CREATED');

      const staffRes = await request(app.getHttpServer())
        .get('/order-status')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const staffKeys = staffRes.body.map((s: { key: string }) => s.key);
      expect(staffKeys).toEqual(expect.arrayContaining(['CREATED', 'IN_PROGRESS']));
      expect(staffKeys).not.toContain('OTHER_CREATED');
    });

    it('STAFF cannot update or delete order status (403)', async () => {
      await request(app.getHttpServer())
        .patch(`/order-status/${createdStatus.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ label: 'Updated by Staff' })
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/order-status/${createdStatus.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('ADMIN can change default status and previous default is cleared', async () => {
      const res = await request(app.getHttpServer())
        .post('/order-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: 'COMPLETED',
          label: 'Completed',
          isFinal: true,
          isDefault: true,
        })
        .expect(201);

      const newDefaultId = res.body.id as number;
      expect(res.body.isDefault).toBe(true);

      const listRes = await request(app.getHttpServer())
        .get('/order-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const defaults = listRes.body.filter((s: { isDefault: boolean }) => s.isDefault);
      expect(defaults).toHaveLength(1);
      expect(defaults[0].id).toBe(newDefaultId);
    });

    it('Cross-tenant status is not visible and returns 404 by id', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/order-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const keys = listRes.body.map((s: { key: string }) => s.key);
      expect(keys).not.toContain('OTHER_CREATED');

      await request(app.getHttpServer())
        .get(`/order-status/${otherBusinessStatus.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
