import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtPayload } from '../../auth/types/jwt-payload';
import { Prisma, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTION_TYPES } from '../audit/audit.constants';
import bcrypt from 'bcryptjs';
import { normalizeRole } from '@common/authz';
import { ROLES } from '@common/constants/roles';

const USER_SUMMARY_SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  lastLoginAt: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

export interface UserSummary {
  id: number;
  name: string;
  phone?: string;
  email?: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date | null;
  deletedAt?: Date | null;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private getBusinessId(currentUser: JwtPayload): number {
    const businessId = Number(currentUser.businessId);
    if (!Number.isFinite(businessId) || businessId <= 0) {
      throw new NotFoundException('User not found');
    }
    return businessId;
  }

  private mapRoleInput(roleInput?: string | Role | null): Role {
    const normalized = normalizeRole(roleInput);
    if (!normalized) {
      throw new ForbiddenException('Gecersiz rol');
    }

    if (normalized === ROLES.SELLER_STAFF || normalized === ROLES.USER) {
      return Role.SELLER_STAFF;
    }

    if (!Object.values(Role).includes(normalized as Role)) {
      throw new ForbiddenException('Gecersiz rol');
    }

    return normalized as Role;
  }

  private ensureAdminActor(currentUser: JwtPayload) {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }
  }

  findAll(currentUser: JwtPayload): Promise<UserSummary[]> {
    const businessId = this.getBusinessId(currentUser);

    return this.prisma.user.findMany({
      where: {
        businessId,
      },
      select: USER_SUMMARY_SELECT,
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findById(currentUser: JwtPayload, id: number): Promise<UserSummary> {
    const businessId = this.getBusinessId(currentUser);
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        businessId,
      },
      select: USER_SUMMARY_SELECT,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByPhone(
    currentUser: JwtPayload,
    phone: string,
  ): Promise<UserSummary> {
    const businessId = this.getBusinessId(currentUser);
    const user = await this.prisma.user.findFirst({
      where: {
        phone,
        businessId,
      },
      select: USER_SUMMARY_SELECT,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async create(
    currentUser: JwtPayload,
    payload: {
      name: string;
      phone: string;
      email?: string | null;
      role?: string | Role | null;
      password?: string;
    },
  ): Promise<UserSummary> {
    this.ensureAdminActor(currentUser);
    const businessId = this.getBusinessId(currentUser);
    const role = this.mapRoleInput(payload.role ?? Role.SELLER_STAFF);

    if (role === Role.SUPER_ADMIN && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'SUPER_ADMIN atamasi sadece SUPER_ADMIN tarafindan yapilabilir.',
      );
    }

    const name = String(payload.name ?? '').trim();
    const phone = String(payload.phone ?? '').trim();
    const email = payload.email ? String(payload.email).trim().toLowerCase() : null;
    const password = String(payload.password ?? '').trim();

    if (!name) {
      throw new BadRequestException('name zorunlu');
    }
    if (!phone) {
      throw new BadRequestException('phone zorunlu');
    }
    if (!password || password.length < 6) {
      throw new BadRequestException('password en az 6 karakter olmali');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    try {
      return await this.prisma.user.create({
        data: {
          businessId,
          name,
          phone,
          email,
          role,
          isActive: true,
          passwordHash,
        },
        select: USER_SUMMARY_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Telefon veya e-posta zaten kullanimda.');
      }
      throw error;
    }
  }

  async update(
    currentUser: JwtPayload,
    id: number,
    payload: { name?: string; phone?: string; email?: string | null },
  ): Promise<UserSummary> {
    this.ensureAdminActor(currentUser);
    const businessId = this.getBusinessId(currentUser);

    const target = await this.prisma.user.findFirst({
      where: { id, businessId },
      select: { id: true, role: true },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (target.role === Role.SUPER_ADMIN && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'SUPER_ADMIN kullanici sadece SUPER_ADMIN tarafindan guncellenebilir.',
      );
    }

    const data: Prisma.UserUpdateInput = {};
    if (payload.name !== undefined) {
      const name = String(payload.name).trim();
      if (!name) {
        throw new BadRequestException('name bos olamaz');
      }
      data.name = name;
    }
    if (payload.phone !== undefined) {
      const phone = String(payload.phone).trim();
      if (!phone) {
        throw new BadRequestException('phone bos olamaz');
      }
      data.phone = phone;
    }
    if (payload.email !== undefined) {
      const email = String(payload.email ?? '').trim().toLowerCase();
      data.email = email ? email : null;
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException('Guncellenecek alan bulunamadi');
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: USER_SUMMARY_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Telefon veya e-posta zaten kullanimda.');
      }
      throw error;
    }
  }

  async updateRole(
    currentUser: JwtPayload,
    id: number,
    role: Role,
  ): Promise<UserSummary> {
    return this.updateRoleInternal(currentUser, id, role, {
      isOverride: false,
    });
  }

  async updateRoleWithOverride(
    currentUser: JwtPayload,
    id: number,
    role: Role,
    reason: string,
  ): Promise<UserSummary> {
    this.ensureAdminActor(currentUser);

    const normalizedReason = String(reason ?? '').trim();
    if (normalizedReason.length < 3) {
      throw new BadRequestException('reason en az 3 karakter olmali');
    }

    return this.updateRoleInternal(currentUser, id, role, {
      isOverride: true,
      reason: normalizedReason,
    });
  }

  private async updateRoleInternal(
    currentUser: JwtPayload,
    id: number,
    role: Role,
    options: { isOverride: boolean; reason?: string },
  ): Promise<UserSummary> {
    const businessId = this.getBusinessId(currentUser);
    const currentUserId = Number(currentUser.userId);
    const nextRole = this.mapRoleInput(role);

    if (currentUser.role === Role.ADMIN && !options.isOverride) {
      throw new ForbiddenException(
        'ADMIN normal role degisikligi yapamaz. role/override endpointini kullanin.',
      );
    }

    if (Number.isFinite(currentUserId) && id === currentUserId) {
      throw new ForbiddenException(
        'Kendi rolünüzü bu ekrandan değiştiremezsiniz.',
      );
    }

    const allowedRoles = new Set<Role>([
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.SELLER,
      Role.SELLER_STAFF,
      Role.USER,
      Role.CUSTOMER,
    ]);
    if (!allowedRoles.has(nextRole)) {
      throw new ForbiddenException('Gecersiz rol');
    }

    if (nextRole === Role.SUPER_ADMIN && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'SUPER_ADMIN atamasi sadece SUPER_ADMIN tarafindan yapilabilir.',
      );
    }

    const target = await this.prisma.user.findFirst({
      where: {
        id,
        businessId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        deletedAt: true,
      },
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (target.role === Role.SUPER_ADMIN && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'SUPER_ADMIN kullanicinin rolunu sadece SUPER_ADMIN degistirebilir.',
      );
    }

    const isCurrentAdminRole =
      target.role === Role.ADMIN || target.role === Role.SUPER_ADMIN;
    const isNextAdminRole =
      nextRole === Role.ADMIN || nextRole === Role.SUPER_ADMIN;
    if (target.isActive && isCurrentAdminRole && !isNextAdminRole) {
      const activeAdminCount = await this.prisma.user.count({
        where: {
          businessId,
          isActive: true,
          role: {
            in: [Role.ADMIN, Role.SUPER_ADMIN],
          },
        },
      });
      if (activeAdminCount <= 1) {
        throw new ForbiddenException(
          'Son aktif admin rolunu dusuremezsiniz.',
        );
      }
    }

    const updated =
      target.role === nextRole
        ? {
            id: target.id,
            name: target.name,
            phone: target.phone ?? undefined,
            email: target.email,
            role: target.role,
            isActive: target.isActive,
            createdAt: target.createdAt,
            lastLoginAt: target.lastLoginAt,
            deletedAt: target.deletedAt,
          }
        : await this.prisma.user.update({
            where: { id },
            data: { role: nextRole },
            select: USER_SUMMARY_SELECT,
          });

    if (target.role !== updated.role || options.isOverride) {
      await this.auditService.logFromActor(currentUser, {
        actionType: AUDIT_ACTION_TYPES.ROLE_CHANGE,
        targetType: 'USER',
        targetId: id,
        payloadJson: {
          source: options.isOverride ? 'users.role.override' : 'users.role',
          reason: options.reason ?? 'super-admin-normal-endpoint',
          before: {
            role: target.role,
          },
          after: {
            role: updated.role,
          },
        },
      });
    }

    return updated;
  }

  async updateActive(
    currentUser: JwtPayload,
    id: number,
    isActive: boolean,
  ): Promise<UserSummary> {
    const businessId = this.getBusinessId(currentUser);
    const currentUserId = Number(currentUser.userId);

    if (Number.isFinite(currentUserId) && id === currentUserId) {
      throw new ForbiddenException(
        'Kendi hesabınızı bu ekrandan pasife alamazsınız.',
      );
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        businessId,
      },
      select: {
        id: true,
        role: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (
      isActive === false &&
      existing.isActive &&
      (existing.role === Role.ADMIN || existing.role === Role.SUPER_ADMIN)
    ) {
      const activeAdminCount = await this.prisma.user.count({
        where: {
          businessId,
          isActive: true,
          role: {
            in: [Role.ADMIN, Role.SUPER_ADMIN],
          },
        },
      });
      if (activeAdminCount <= 1) {
        throw new ForbiddenException('Son aktif admin pasife alinamaz.');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        isActive,
        deletedAt: isActive ? null : existing.deletedAt,
      },
      select: USER_SUMMARY_SELECT,
    });

    return updated;
  }

  async delete(currentUser: JwtPayload, id: number): Promise<UserSummary> {
    this.ensureAdminActor(currentUser);
    const businessId = this.getBusinessId(currentUser);
    const currentUserId = Number(currentUser.userId);
    if (Number.isFinite(currentUserId) && id === currentUserId) {
      throw new ForbiddenException('Kendi hesabinizi silemezsiniz.');
    }

    const target = await this.prisma.user.findFirst({
      where: { id, businessId },
      select: {
        id: true,
        role: true,
        isActive: true,
        deletedAt: true,
      },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (target.role === Role.SUPER_ADMIN && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'SUPER_ADMIN kullaniciyi sadece SUPER_ADMIN silebilir.',
      );
    }

    if (
      target.isActive &&
      (target.role === Role.ADMIN || target.role === Role.SUPER_ADMIN)
    ) {
      const activeAdminCount = await this.prisma.user.count({
        where: {
          businessId,
          isActive: true,
          role: { in: [Role.ADMIN, Role.SUPER_ADMIN] },
        },
      });
      if (activeAdminCount <= 1) {
        throw new ForbiddenException('Son aktif admin silinemez.');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: target.deletedAt ?? new Date(),
      },
      select: USER_SUMMARY_SELECT,
    });
  }
}

