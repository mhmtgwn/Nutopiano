import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface SettingSummary {
  id: number;
  key: string;
  value: unknown;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(businessId: number): Promise<SettingSummary[]> {
    const settings = await this.prisma.settings.findMany({
      where: { businessId },
      orderBy: { key: 'asc' },
    });

    return settings.map((s) => ({ id: s.id, key: s.key, value: s.value }));
  }

  async get(businessId: number, key: string): Promise<SettingSummary | null> {
    const setting = await this.prisma.settings.findUnique({
      where: {
        businessId_key: {
          businessId,
          key,
        },
      },
    });

    if (!setting) {
      return null;
    }

    return { id: setting.id, key: setting.key, value: setting.value };
  }

  async set(
    businessId: number,
    key: string,
    value: Prisma.InputJsonValue,
  ): Promise<SettingSummary> {
    const setting = await this.prisma.settings.upsert({
      where: {
        businessId_key: {
          businessId,
          key,
        },
      },
      update: {
        value,
      },
      create: {
        businessId,
        key,
        value,
      },
    });

    return { id: setting.id, key: setting.key, value: setting.value };
  }

  async getJson<T>(businessId: number, key: string): Promise<T | null> {
    const setting = await this.get(businessId, key);
    return (setting?.value as T) ?? null;
  }

  async setJson<T>(businessId: number, key: string, value: T): Promise<SettingSummary> {
    return this.set(businessId, key, value as Prisma.InputJsonValue);
  }
}
