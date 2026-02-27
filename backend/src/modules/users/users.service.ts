import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtPayload } from '../../auth/types/jwt-payload';
import { Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTION_TYPES } from '../audit/audit.constants';

export interface UserSummary {
  id: number;
  name: string;
  phone?: string;
  role: Role;
  isActive: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  findAll(currentUser: JwtPayload): Promise<UserSummary[]> {
    const businessId = Number(currentUser.businessId);
    if (!Number.isFinite(businessId)) {
      return Promise.resolve([]);
    }

    return this.prisma.user.findMany({
      where: {
        businessId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findById(currentUser: JwtPayload, id: number): Promise<UserSummary> {
    const businessId = Number(currentUser.businessId);
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        businessId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
      },
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
    const businessId = Number(currentUser.businessId);
    const user = await this.prisma.user.findFirst({
      where: {
        phone,
        businessId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
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
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

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
    const businessId = Number(currentUser.businessId);
    const currentUserId = Number(currentUser.userId);
    if (!Number.isFinite(businessId)) {
      throw new NotFoundException('User not found');
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
      Role.USER,
      Role.CUSTOMER,
    ]);
    if (!allowedRoles.has(role)) {
      throw new ForbiddenException('Gecersiz rol');
    }

    if (role === Role.SUPER_ADMIN && currentUser.role !== 'SUPER_ADMIN') {
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
        role: true,
        isActive: true,
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
    const isNextAdminRole = role === Role.ADMIN || role === Role.SUPER_ADMIN;
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
      target.role === role
        ? {
            id: target.id,
            name: target.name,
            phone: target.phone ?? undefined,
            role: target.role,
            isActive: target.isActive,
          }
        : await this.prisma.user.update({
            where: { id },
            data: { role },
            select: {
              id: true,
              name: true,
              phone: true,
              role: true,
              isActive: true,
            },
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
    const businessId = Number(currentUser.businessId);
    const currentUserId = Number(currentUser.userId);
    if (!Number.isFinite(businessId)) {
      throw new NotFoundException('User not found');
    }

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
      data: { isActive },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    return updated;
  }
}

