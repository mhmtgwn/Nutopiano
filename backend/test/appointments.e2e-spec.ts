import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { loginAndGetToken } from './helpers/auth-helpers';

describe('Appointments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let staffToken: string;
  let business1: { id: number };
  let business2: { id: number };
  let adminUser: { id: number; phone: string };
  let staffUser: { id: number; phone: string };
  let otherStaffUser: { id: number; phone: string };
  let otherBusinessAdmin: { id: number; phone: string };
  let customer1: { id: number };
  let adminAppointment: { id: number };
  let staffAppointment: { id: number };
  let otherBusinessAppointment: { id: number };

  const RUN_ID = Date.now().toString();
  const ADMIN_PHONE = `+9600000${RUN_ID}1`;
  const STAFF_PHONE = `+9600000${RUN_ID}2`;
  const OTHER_BUS_ADMIN_PHONE = `+9600000${RUN_ID}3`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    business1 = await prisma.business.create({
      data: {
        name: `Appointments E2E Business 1 ${RUN_ID}`,
      },
    });

    business2 = await prisma.business.create({
      data: {
        name: `Appointments E2E Business 2 ${RUN_ID}`,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        businessId: business1.id,
        name: 'Appointments Admin',
        phone: ADMIN_PHONE,
        role: 'ADMIN',
        isActive: true,
      },
    });

    staffUser = await prisma.user.create({
      data: {
        businessId: business1.id,
        name: 'Appointments Staff',
        phone: STAFF_PHONE,
        role: 'STAFF',
        isActive: true,
      },
    });

    otherStaffUser = await prisma.user.create({
      data: {
        businessId: business1.id,
        name: 'Appointments Other Staff',
        phone: `+9600000${RUN_ID}4`,
        role: 'STAFF',
        isActive: true,
      },
    });

    otherBusinessAdmin = await prisma.user.create({
      data: {
        businessId: business2.id,
        name: 'Other Business Admin (Appointments)',
        phone: OTHER_BUS_ADMIN_PHONE,
        role: 'ADMIN',
        isActive: true,
      },
    });

    customer1 = await prisma.customer.create({
      data: {
        businessId: business1.id,
        createdByUserId: adminUser.id,
        name: 'Appointments Customer 1',
        phone: `+9900000${RUN_ID}1`,
        balance: 0,
      },
    });

    // Settings: allow staff create and autoConfirm enabled, default duration 30 minutes
    await prisma.settings.createMany({
      data: [
        {
          businessId: business1.id,
          key: 'appointment.allowStaffCreate',
          value: true,
        },
        {
          businessId: business1.id,
          key: 'appointment.autoConfirm',
          value: true,
        },
        {
          businessId: business1.id,
          key: 'appointment.defaultDurationMinutes',
          value: 30,
        },
      ],
    });

    // Seed cross-tenant appointment
    const otherBusinessCustomer = await prisma.customer.create({
      data: {
        businessId: business2.id,
        createdByUserId: otherBusinessAdmin.id,
        name: 'Other Appointments Customer',
        phone: `+9900000${RUN_ID}9`,
        balance: 0,
      },
    });

    const otherAppointment = await prisma.appointment.create({
      data: {
        businessId: business2.id,
        customerId: otherBusinessCustomer.id,
        staffUserId: null,
        startAt: new Date(),
        endAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'SCHEDULED',
        serviceName: 'Other Business Service',
        notes: null,
        createdByUserId: otherBusinessAdmin.id,
      },
    });

    otherBusinessAppointment = { id: otherAppointment.id };

    adminToken = await loginAndGetToken(app, ADMIN_PHONE);
    staffToken = await loginAndGetToken(app, STAFF_PHONE);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('/appointments', () => {
    it('ADMIN can create appointment for any staff and status defaults to CONFIRMED via Settings', async () => {
      const startAt = new Date().toISOString();

      const res = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: customer1.id,
          staffUserId: otherStaffUser.id,
          startAt,
          serviceName: 'Admin Created Appointment',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        customerId: customer1.id,
        staffUserId: otherStaffUser.id,
        status: 'CONFIRMED',
        serviceName: 'Admin Created Appointment',
      });

      adminAppointment = res.body;
    });

    it('STAFF can create appointment for themselves when allowStaffCreate=true', async () => {
      const startAt = new Date().toISOString();

      const res = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          customerId: customer1.id,
          startAt,
          serviceName: 'Staff Created Appointment',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        customerId: customer1.id,
        staffUserId: staffUser.id,
        status: 'CONFIRMED',
        serviceName: 'Staff Created Appointment',
      });

      staffAppointment = res.body;
    });

    it('ADMIN lists all appointments in business, STAFF lists only own (assigned) appointments', async () => {
      const adminRes = await request(app.getHttpServer())
        .get('/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const adminIds = adminRes.body.map((a: { id: number }) => a.id);
      expect(adminIds).toEqual(expect.arrayContaining([adminAppointment.id, staffAppointment.id]));

      const staffRes = await request(app.getHttpServer())
        .get('/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const staffIds = staffRes.body.map((a: { id: number }) => a.id);
      expect(staffIds).toContain(staffAppointment.id);
      expect(staffIds).not.toContain(adminAppointment.id);
    });

    it('STAFF cannot access appointment assigned to another staff (403)', async () => {
      await request(app.getHttpServer())
        .get(`/appointments/${adminAppointment.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('Cross-tenant appointments are isolated (404 for other business appointment id)', async () => {
      await request(app.getHttpServer())
        .get(`/appointments/${otherBusinessAppointment.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('STAFF can update status and notes on their own appointment', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/appointments/${staffAppointment.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'COMPLETED', notes: 'Done' })
        .expect(200);

      expect(res.body).toMatchObject({
        id: staffAppointment.id,
        status: 'COMPLETED',
        notes: 'Done',
      });
    });

    it('ADMIN can reassign staffUserId on any appointment', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/appointments/${adminAppointment.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ staffUserId: staffUser.id, status: 'CANCELLED' })
        .expect(200);

      expect(res.body).toMatchObject({
        id: adminAppointment.id,
        staffUserId: staffUser.id,
        status: 'CANCELLED',
      });
    });
  });
});
