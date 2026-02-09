import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

export interface CustomerSummary {
  id: number;
  name: string;
  phone: string;
  balance: number;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(currentUser: JwtPayload, payload: CreateCustomerDto): Promise<CustomerSummary> {
    const businessId = Number(currentUser.businessId);
    const createdByUserId = Number(currentUser.userId);
    const balance = payload.balance !== undefined ? Number(payload.balance) : 0;

    const customer = await this.prisma.customer.create({
      data: {
        businessId,
        createdByUserId,
        name: payload.name,
        phone: payload.phone,
        balance,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
      },
    });

    return customer;
  }

  async findAll(currentUser: JwtPayload): Promise<CustomerSummary[]> {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    const where =
      currentUser.role === 'ADMIN'
        ? { businessId }
        : { businessId, createdByUserId: userId };

    return this.prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
      },
    });
  }

  private async findAccessibleCustomer(currentUser: JwtPayload, id: number) {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        businessId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (currentUser.role === 'STAFF' && customer.createdByUserId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return customer;
  }

  async findOne(currentUser: JwtPayload, id: number): Promise<CustomerSummary> {
    const customer = await this.findAccessibleCustomer(currentUser, id);
    const { id: customerId, name, phone, balance } = customer;
    return { id: customerId, name, phone, balance };
  }

  async update(
    currentUser: JwtPayload,
    id: number,
    payload: UpdateCustomerDto,
  ): Promise<CustomerSummary> {
    await this.findAccessibleCustomer(currentUser, id);

    const data: { name?: string; phone?: string; balance?: number } = {};
    if (payload.name) data.name = payload.name;
    if (payload.phone) data.phone = payload.phone;
    if (payload.balance !== undefined) {
      data.balance = Number(payload.balance);
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
      },
    });

    return updated;
  }

  async remove(currentUser: JwtPayload, id: number): Promise<CustomerSummary> {
    await this.findAccessibleCustomer(currentUser, id);

    const removed = await this.prisma.customer.delete({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
      },
    });

    return removed;
  }
}
