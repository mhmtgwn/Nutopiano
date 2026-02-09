import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { loginAndGetToken } from './helpers/auth-helpers';

describe('Customers (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let staffToken: string;
  let business1: { id: number };
  let business2: { id: number };
  let adminUser: { id: number; phone: string };
  let staffUser: { id: number; phone: string };
  let otherBusinessAdmin: { id: number };
  let adminCustomer: { id: number; phone: string };
  let staffCustomer: { id: number; phone: string };
  let otherBusinessCustomer: { id: number; phone: string };

  const RUN_ID = Date.now().toString();
  const ADMIN_PHONE = `+9100000${RUN_ID}1`;
  const STAFF_PHONE = `+9100000${RUN_ID}2`;
  const OTHER_BUS_ADMIN_PHONE = `+9100000${RUN_ID}3`;
  const ADMIN_CUSTOMER_PHONE = `+9200000${RUN_ID}1`;
  const STAFF_CUSTOMER_PHONE = `+9200000${RUN_ID}2`;
  const OTHER_BUS_CUSTOMER_PHONE = `+9300000${RUN_ID}1`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    business1 = await prisma.business.create({
      data: {
        name: `Customers E2E Business 1 ${RUN_ID}`,
      },
    });

    business2 = await prisma.business.create({
      data: {
        name: `Customers E2E Business 2 ${RUN_ID}`,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        businessId: business1.id,
        name: 'Customers Admin',
        phone: ADMIN_PHONE,
        role: 'ADMIN',
        isActive: true,
      },
    });

    staffUser = await prisma.user.create({
      data: {
        businessId: business1.id,
        name: 'Customers Staff',
        phone: STAFF_PHONE,
        role: 'STAFF',
        isActive: true,
      },
    });

    otherBusinessAdmin = await prisma.user.create({
      data: {
        businessId: business2.id,
        name: 'Other Business Admin',
        phone: OTHER_BUS_ADMIN_PHONE,
        role: 'ADMIN',
        isActive: true,
      },
    });

    otherBusinessCustomer = await prisma.customer.create({
      data: {
        businessId: business2.id,
        createdByUserId: otherBusinessAdmin.id,
        name: 'Other Business Customer',
        phone: OTHER_BUS_CUSTOMER_PHONE,
        balance: 0,
      },
    });

    adminToken = await loginAndGetToken(app, ADMIN_PHONE);
    staffToken = await loginAndGetToken(app, STAFF_PHONE);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('/customers', () => {
    it('ADMIN and STAFF can create customers', async () => {
      const adminRes = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Customer',
          phone: ADMIN_CUSTOMER_PHONE,
          balance: '100',
        })
        .expect(201);

      expect(adminRes.body).toMatchObject({
        name: 'Admin Customer',
        phone: ADMIN_CUSTOMER_PHONE,
        balance: 100,
      });
      adminCustomer = adminRes.body;

      const staffRes = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Staff Customer',
          phone: STAFF_CUSTOMER_PHONE,
        })
        .expect(201);

      expect(staffRes.body).toMatchObject({
        name: 'Staff Customer',
        phone: STAFF_CUSTOMER_PHONE,
        balance: 0,
      });
      staffCustomer = staffRes.body;
    });

    it('ADMIN can list all customers in own business only', async () => {
      const res = await request(app.getHttpServer())
        .get('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const phones = res.body.map((c: { phone: string }) => c.phone);

      expect(phones).toEqual(
        expect.arrayContaining([ADMIN_CUSTOMER_PHONE, STAFF_CUSTOMER_PHONE]),
      );
      expect(phones).not.toContain(OTHER_BUS_CUSTOMER_PHONE);
    });

    it('STAFF can only list own customers', async () => {
      const res = await request(app.getHttpServer())
        .get('/customers')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const phones = res.body.map((c: { phone: string }) => c.phone);

      expect(phones).toContain(STAFF_CUSTOMER_PHONE);
      expect(phones).not.toContain(ADMIN_CUSTOMER_PHONE);
      expect(phones).not.toContain(OTHER_BUS_CUSTOMER_PHONE);
    });

    it('STAFF cannot get other user customer by id (403)', async () => {
      await request(app.getHttpServer())
        .get(`/customers/${adminCustomer.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('ADMIN gets 404 when customer id does not exist', async () => {
      const nonExistingId = 999999;
      await request(app.getHttpServer())
        .get(`/customers/${nonExistingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
