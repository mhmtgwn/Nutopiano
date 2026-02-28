import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FeatureFlagService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(businessId: number) {
        return this.prisma.featureFlag.findMany({
            where: { OR: [{ businessId }, { scope: 'GLOBAL', businessId: null }] },
            orderBy: { createdAt: 'desc' },
        });
    }

    async isEnabled(key: string, businessId?: number): Promise<boolean> {
        const flag = await this.prisma.featureFlag.findFirst({
            where: {
                key,
                isActive: true,
                OR: [
                    { scope: 'GLOBAL', businessId: null },
                    ...(businessId ? [{ businessId }] : []),
                ],
            },
        });
        return !!flag;
    }

    async create(data: { businessId?: number; key: string; description?: string; scope: string; isActive?: boolean }) {
        return this.prisma.featureFlag.create({ data });
    }

    async update(id: number, data: { description?: string; isActive?: boolean; scope?: string }) {
        return this.prisma.featureFlag.update({ where: { id }, data });
    }

    async toggle(id: number) {
        const flag = await this.prisma.featureFlag.findUniqueOrThrow({ where: { id } });
        return this.prisma.featureFlag.update({ where: { id }, data: { isActive: !flag.isActive } });
    }

    async remove(id: number) {
        return this.prisma.featureFlag.delete({ where: { id } });
    }
}
