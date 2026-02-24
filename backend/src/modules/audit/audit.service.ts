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
        payloadJson: (input.payloadJson ?? {}) as Prisma.InputJsonValue,
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
}
