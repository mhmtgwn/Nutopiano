import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { CreateOrderStatusDto } from './dto/create-order-status.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

export interface OrderStatusSummary {
  id: number;
  key: string;
  label: string;
  orderIndex: number;
  isFinal: boolean;
  isDefault: boolean;
}

@Injectable()
export class OrderStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async create(currentUser: JwtPayload, payload: CreateOrderStatusDto): Promise<OrderStatusSummary> {
    const businessId = Number(currentUser.businessId);

    let orderIndex = payload.orderIndex;
    if (orderIndex === undefined) {
      const max = await this.prisma.orderStatus.aggregate({
        where: { businessId },
        _max: { orderIndex: true },
      });
      orderIndex = (max._max.orderIndex ?? 0) + 1;
    }

    if (payload.isDefault) {
      await this.clearDefault(businessId);
    }

    const status = await this.prisma.orderStatus.create({
      data: {
        businessId,
        key: payload.key,
        label: payload.label,
        orderIndex,
        isFinal: payload.isFinal ?? false,
        isDefault: payload.isDefault ?? false,
      },
      select: {
        id: true,
        key: true,
        label: true,
        orderIndex: true,
        isFinal: true,
        isDefault: true,
      },
    });

    return status;
  }

  async findAll(currentUser: JwtPayload): Promise<OrderStatusSummary[]> {
    const businessId = Number(currentUser.businessId);
    return this.prisma.orderStatus.findMany({
      where: { businessId },
      select: {
        id: true,
        key: true,
        label: true,
        orderIndex: true,
        isFinal: true,
        isDefault: true,
      },
      orderBy: {
        orderIndex: 'asc',
      },
    });
  }

  private async findByIdScoped(currentUser: JwtPayload, id: number) {
    const businessId = Number(currentUser.businessId);

    const status = await this.prisma.orderStatus.findFirst({
      where: {
        id,
        businessId,
      },
    });

    if (!status) {
      throw new NotFoundException('Order status not found');
    }

    return status;
  }

  async findOne(currentUser: JwtPayload, id: number): Promise<OrderStatusSummary> {
    const status = await this.findByIdScoped(currentUser, id);
    const { id: statusId, key, label, orderIndex, isFinal, isDefault } = status;
    return { id: statusId, key, label, orderIndex, isFinal, isDefault };
  }

  async update(
    currentUser: JwtPayload,
    id: number,
    payload: UpdateOrderStatusDto,
  ): Promise<OrderStatusSummary> {
    await this.findByIdScoped(currentUser, id);
    const businessId = Number(currentUser.businessId);

    const data: Partial<{
      key: string;
      label: string;
      orderIndex: number;
      isFinal: boolean;
      isDefault: boolean;
    }> = {};

    if (payload.key !== undefined) data.key = payload.key;
    if (payload.label !== undefined) data.label = payload.label;
    if (payload.orderIndex !== undefined) data.orderIndex = payload.orderIndex;
    if (payload.isFinal !== undefined) data.isFinal = payload.isFinal;

    if (payload.isDefault !== undefined) {
      data.isDefault = payload.isDefault;
      if (payload.isDefault) {
        await this.clearDefault(businessId, id);
      }
    }

    const updated = await this.prisma.orderStatus.update({
      where: { id },
      data,
      select: {
        id: true,
        key: true,
        label: true,
        orderIndex: true,
        isFinal: true,
        isDefault: true,
      },
    });

    return updated;
  }

  async remove(currentUser: JwtPayload, id: number): Promise<OrderStatusSummary> {
    await this.findByIdScoped(currentUser, id);

    const removed = await this.prisma.orderStatus.delete({
      where: { id },
      select: {
        id: true,
        key: true,
        label: true,
        orderIndex: true,
        isFinal: true,
        isDefault: true,
      },
    });

    return removed;
  }

  async createDefaultStatusesForBusiness(businessId: number) {
    const existing = await this.prisma.orderStatus.count({ where: { businessId } });
    if (existing > 0) {
      return;
    }

    await this.prisma.orderStatus.createMany({
      data: [
        {
          businessId,
          key: 'CREATED',
          label: 'Created',
          orderIndex: 1,
          isFinal: false,
          isDefault: true,
        },
        {
          businessId,
          key: 'IN_PROGRESS',
          label: 'In progress',
          orderIndex: 2,
          isFinal: false,
          isDefault: false,
        },
        {
          businessId,
          key: 'COMPLETED',
          label: 'Completed',
          orderIndex: 3,
          isFinal: true,
          isDefault: false,
        },
      ],
    });
  }

  private async clearDefault(businessId: number, exceptId?: number) {
    await this.prisma.orderStatus.updateMany({
      where: {
        businessId,
        isDefault: true,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: {
        isDefault: false,
      },
    });
  }
}
