import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { loginAndGetToken } from './helpers/auth-helpers';

describe('Auth & Users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let staffToken: string;
  let adminUser: { id: number; phone: string };
  let staffUser: { id: number; phone: string };
  let business: { id: number };

  const RUN_ID = Date.now().toString();
  const ADMIN_PHONE = `+9000000${RUN_ID}1`;
  const STAFF_PHONE = `+9000000${RUN_ID}2`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    business = await prisma.business.create({
      data: {
        name: `Test Business ${RUN_ID}`,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        businessId: business.id,
        name: 'Admin User',
        phone: ADMIN_PHONE,
        role: 'ADMIN',
        isActive: true,
      },
    });

    staffUser = await prisma.user.create({
      data: {
        businessId: business.id,
        name: 'Staff User',
        phone: STAFF_PHONE,
        role: 'STAFF',
        isActive: true,
      },
    });

    adminToken = await loginAndGetToken(app, ADMIN_PHONE);
    staffToken = await loginAndGetToken(app, STAFF_PHONE);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('/auth/profile', () => {
    it('ADMIN can see own profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        role: 'ADMIN',
        phone: ADMIN_PHONE,
      });
    });

    it('STAFF can see own profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        role: 'STAFF',
        phone: STAFF_PHONE,
      });
    });
  });

  describe('/users', () => {
    it('ADMIN can list all users', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const phones = res.body.map((u: { phone: string }) => u.phone);
      expect(phones).toEqual(expect.arrayContaining([ADMIN_PHONE, STAFF_PHONE]));
    });

    it('STAFF cannot list all users (403)', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('ADMIN can get any user by id', async () => {
      await request(app.getHttpServer())
        .get(`/users/${staffUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(staffUser.id);
        });
    });

    it('STAFF can get own user by id', async () => {
      await request(app.getHttpServer())
        .get(`/users/${staffUser.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(staffUser.id);
        });
    });

    it("STAFF cannot get other user's id (403)", async () => {
      await request(app.getHttpServer())
        .get(`/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('ADMIN gets 404 when user id does not exist', async () => {
      const nonExistingId = 999999;
      await request(app.getHttpServer())
        .get(`/users/${nonExistingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('ADMIN can get any user by phone', async () => {
      await request(app.getHttpServer())
        .get(`/users/by-phone/${STAFF_PHONE}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.phone).toBe(STAFF_PHONE);
        });
    });

    it('STAFF can get own user by phone', async () => {
      await request(app.getHttpServer())
        .get(`/users/by-phone/${STAFF_PHONE}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.phone).toBe(STAFF_PHONE);
        });
    });

    it("STAFF cannot get other user's phone (403)", async () => {
      await request(app.getHttpServer())
        .get(`/users/by-phone/${ADMIN_PHONE}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('ADMIN gets 404 when user phone does not exist', async () => {
      await request(app.getHttpServer())
        .get('/users/by-phone/+900000099999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
