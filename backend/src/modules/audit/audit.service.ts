import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { PrismaService } from '../../database/prisma.service';
import { AuditActionType } from './audit.constants';

type CreateAuditLogInput = {
  actionType: AuditActionType;
  targetType: string;
  targetId: string | number;
  payloadJson?: Prisma.InputJsonValue;
  businessId?: number;
  actorUserId?: number;
  actorRole?: Role;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logFromActor(currentUser: JwtPayload, input: CreateAuditLogInput) {
    const businessId = Number(input.businessId ?? currentUser.businessId);
    const actorUserId = Number(input.actorUserId ?? currentUser.userId);
    const actorRole = (input.actorRole ?? currentUser.role) as Role;

    if (!Number.isFinite(businessId) || businessId <= 0) {
      throw new BadRequestException('Audit businessId gecersiz');
    }
    if (!Number.isFinite(actorUserId) || actorUserId <= 0) {
      throw new BadRequestException('Audit actorUserId gecersiz');
    }

    return this.prisma.auditLog.create({
      data: {
        businessId,
        actorRole,
        actorUserId,
        actionType: input.actionType,
        targetType: String(input.targetType),
        targetId: String(input.targetId),
        payloadJson: input.payloadJson ?? {},
      },
      select: {
        id: true,
        businessId: true,
        actorRole: true,
        actorUserId: true,
        actionType: true,
        targetType: true,
        targetId: true,
        createdAt: true,
      },
    });
  }

  async listLogs(
    businessId: number,
    params?: {
      page?: number;
      pageSize?: number;
      actionType?: string;
      targetType?: string;
    },
  ) {
    const normalizedBusinessId = Number(businessId);
    if (!Number.isFinite(normalizedBusinessId) || normalizedBusinessId <= 0) {
      throw new BadRequestException('Audit businessId gecersiz');
    }

    const page = Math.max(1, Math.trunc(Number(params?.page ?? 1)));
    const pageSize = Math.min(
      200,
      Math.max(1, Math.trunc(Number(params?.pageSize ?? 30))),
    );
    const skip = (page - 1) * pageSize;

    const actionType = params?.actionType?.trim();
    const targetType = params?.targetType?.trim();

    const where: Prisma.AuditLogWhereInput = {
      businessId: normalizedBusinessId,
    };
    if (actionType) where.actionType = actionType;
    if (targetType) where.targetType = targetType;

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
        select: {
          id: true,
          actorRole: true,
          actorUserId: true,
          actionType: true,
          targetType: true,
          targetId: true,
          payloadJson: true,
          createdAt: true,
          actorUser: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }
}
