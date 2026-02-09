import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { SettingsService } from '../settings/settings.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

export interface AppointmentSummary {
  id: number;
  customerId: number;
  staffUserId?: number | null;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  serviceName: string;
  notes?: string | null;
  createdByUserId: number;
  createdAt: Date;
  updatedAt: Date;
}

const APPOINTMENT_DEFAULT_DURATION_KEY = 'appointment.defaultDurationMinutes';
const APPOINTMENT_ALLOW_STAFF_CREATE_KEY = 'appointment.allowStaffCreate';
const APPOINTMENT_AUTO_CONFIRM_KEY = 'appointment.autoConfirm';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  private mapToSummary(entity: {
    id: number;
    customerId: number;
    staffUserId: number | null;
    startAt: Date;
    endAt: Date;
    status: AppointmentStatus;
    serviceName: string;
    notes: string | null;
    createdByUserId: number;
    createdAt: Date;
    updatedAt: Date;
  }): AppointmentSummary {
    return {
      id: entity.id,
      customerId: entity.customerId,
      staffUserId: entity.staffUserId,
      startAt: entity.startAt,
      endAt: entity.endAt,
      status: entity.status,
      serviceName: entity.serviceName,
      notes: entity.notes ?? null,
      createdByUserId: entity.createdByUserId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async create(currentUser: JwtPayload, payload: CreateAppointmentDto): Promise<AppointmentSummary> {
    const businessId = Number(currentUser.businessId);
    const createdByUserId = Number(currentUser.userId);

    if (!businessId) {
      throw new ForbiddenException('Business context is required');
    }

    if (currentUser.role === 'STAFF') {
      const allowStaffCreate = await this.settingsService.getJson<boolean>(
        businessId,
        APPOINTMENT_ALLOW_STAFF_CREATE_KEY,
      );
      if (!allowStaffCreate) {
        throw new ForbiddenException('Staff cannot create appointments');
      }
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: payload.customerId, businessId },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    let staffUserId: number | null = null;

    if (payload.staffUserId !== undefined) {
      const staffUser = await this.prisma.user.findFirst({
        where: {
          id: payload.staffUserId,
          businessId,
          role: 'STAFF',
        },
        select: { id: true },
      });

      if (!staffUser) {
        throw new NotFoundException('Staff user not found');
      }

      if (currentUser.role === 'STAFF' && staffUser.id !== createdByUserId) {
        throw new ForbiddenException('Staff cannot create appointments for other staff');
      }

      staffUserId = staffUser.id;
    } else if (currentUser.role === 'STAFF') {
      // STAFF creating without explicit staffUserId is implicitly assigning to themselves
      staffUserId = createdByUserId;
    }

    const startAt = new Date(payload.startAt);
    if (Number.isNaN(startAt.getTime())) {
      throw new ForbiddenException('Invalid startAt date');
    }

    let endAt: Date;
    if (payload.endAt) {
      endAt = new Date(payload.endAt);
      if (Number.isNaN(endAt.getTime())) {
        throw new ForbiddenException('Invalid endAt date');
      }
    } else {
      let durationMinutes = await this.settingsService.getJson<number>(
        businessId,
        APPOINTMENT_DEFAULT_DURATION_KEY,
      );
      if (!durationMinutes || durationMinutes <= 0) {
        durationMinutes = 60;
      }
      endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
    }

    let status: AppointmentStatus;
    if (payload.status) {
      status = payload.status;
    } else {
      const autoConfirm = await this.settingsService.getJson<boolean>(
        businessId,
        APPOINTMENT_AUTO_CONFIRM_KEY,
      );
      status = autoConfirm ? AppointmentStatus.CONFIRMED : AppointmentStatus.SCHEDULED;
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        businessId,
        customerId: customer.id,
        staffUserId,
        startAt,
        endAt,
        status,
        serviceName: payload.serviceName,
        notes: payload.notes ?? null,
        createdByUserId,
      },
      select: {
        id: true,
        customerId: true,
        staffUserId: true,
        startAt: true,
        endAt: true,
        status: true,
        serviceName: true,
        notes: true,
        createdByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.mapToSummary(appointment);
  }

  async findAll(currentUser: JwtPayload): Promise<AppointmentSummary[]> {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    const where =
      currentUser.role === 'ADMIN'
        ? { businessId }
        : { businessId, staffUserId: userId };

    const appointments = await this.prisma.appointment.findMany({
      where,
      select: {
        id: true,
        customerId: true,
        staffUserId: true,
        startAt: true,
        endAt: true,
        status: true,
        serviceName: true,
        notes: true,
        createdByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        startAt: 'asc',
      },
    });

    return appointments.map((a) => this.mapToSummary(a));
  }

  private async findAccessibleAppointment(currentUser: JwtPayload, id: number) {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id,
        businessId,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (currentUser.role === 'STAFF' && appointment.staffUserId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return appointment;
  }

  async findOne(currentUser: JwtPayload, id: number): Promise<AppointmentSummary> {
    const appointment = await this.findAccessibleAppointment(currentUser, id);

    return this.mapToSummary(appointment as any);
  }

  async update(
    currentUser: JwtPayload,
    id: number,
    payload: UpdateAppointmentDto,
  ): Promise<AppointmentSummary> {
    const appointment = await this.findAccessibleAppointment(currentUser, id);

    const data: {
      status?: AppointmentStatus;
      notes?: string | null;
      staffUserId?: number | null;
    } = {};

    if (payload.status) {
      data.status = payload.status;
    }

    if (payload.notes !== undefined) {
      data.notes = payload.notes;
    }

    if (payload.staffUserId !== undefined) {
      if (currentUser.role !== 'ADMIN') {
        throw new ForbiddenException('Only admin can change staff assignment');
      }

      if (payload.staffUserId === null) {
        data.staffUserId = null;
      } else {
        const staffUser = await this.prisma.user.findFirst({
          where: {
            id: payload.staffUserId,
            businessId: appointment.businessId,
            role: 'STAFF',
          },
          select: { id: true },
        });

        if (!staffUser) {
          throw new NotFoundException('Staff user not found');
        }

        data.staffUserId = staffUser.id;
      }
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data,
      select: {
        id: true,
        customerId: true,
        staffUserId: true,
        startAt: true,
        endAt: true,
        status: true,
        serviceName: true,
        notes: true,
        createdByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.mapToSummary(updated);
  }
}
