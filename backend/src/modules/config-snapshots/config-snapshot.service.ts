import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ConfigSnapshotService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(businessId: number, filters?: {
        configType?: string;
        page?: number;
        pageSize?: number;
    }) {
        const page = filters?.page ?? 1;
        const pageSize = filters?.pageSize ?? 20;
        const where: any = { businessId };
        if (filters?.configType) where.configType = filters.configType;

        const [items, total] = await Promise.all([
            this.prisma.configSnapshot.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.configSnapshot.count({ where }),
        ]);

        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }

    async findOne(businessId: number, id: number) {
        const snapshot = await this.prisma.configSnapshot.findFirst({
            where: { id, businessId },
        });
        if (!snapshot) throw new NotFoundException('Config snapshot not found');
        return snapshot;
    }

    async create(businessId: number, data: {
        configType: string;
        configKey: string;
        snapshot: any;
    }) {
        // Get the next version number
        const latestSnapshot = await this.prisma.configSnapshot.findFirst({
            where: { businessId, configType: data.configType, configKey: data.configKey },
            orderBy: { version: 'desc' },
        });
        const version = (latestSnapshot?.version ?? 0) + 1;

        return this.prisma.configSnapshot.create({
            data: {
                businessId,
                configType: data.configType,
                configKey: data.configKey,
                snapshot: data.snapshot,
                version,
            },
        });
    }

    async restore(businessId: number, id: number) {
        const snapshot = await this.findOne(businessId, id);
        // Create a new snapshot as the "restored" version
        return this.create(businessId, {
            configType: snapshot.configType,
            configKey: snapshot.configKey,
            snapshot: snapshot.snapshot,
        });
    }
}
