import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import type { JwtPayload } from '../../auth/types/jwt-payload';
import { Role } from '@prisma/client';

export interface UserSummary {
  id: number;
  name: string;
  phone?: string;
  role: Role;
  isActive: boolean;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
    role: string,
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

    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        businessId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: role as Role },
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
      },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
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
