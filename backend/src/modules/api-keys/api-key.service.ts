import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(businessId: number) {
        return this.prisma.apiKey.findMany({
            where: { businessId },
            select: {
                id: true,
                businessId: true,
                sellerId: true,
                name: true,
                keyPrefix: true,
                scopes: true,
                ipWhitelist: true,
                rateLimit: true,
                lastUsedAt: true,
                expiresAt: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async create(businessId: number, data: {
        name: string;
        sellerId?: number;
        scopes: string[];
        ipWhitelist?: string[];
        rateLimit?: number;
        expiresAt?: string;
    }) {
        // Generate a secure API key
        const rawKey = `ntk_${crypto.randomBytes(32).toString('hex')}`;
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        const keyPrefix = rawKey.substring(0, 12);

        const apiKey = await this.prisma.apiKey.create({
            data: {
                businessId,
                sellerId: data.sellerId || null,
                name: data.name,
                keyHash,
                keyPrefix,
                scopes: data.scopes,
                ipWhitelist: data.ipWhitelist ?? undefined,
                rateLimit: data.rateLimit ?? null,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
            },
        });

        // Return the raw key only once
        return {
            id: apiKey.id,
            name: apiKey.name,
            keyPrefix: apiKey.keyPrefix,
            key: rawKey, // Only shown once!
            scopes: apiKey.scopes,
            expiresAt: apiKey.expiresAt,
            createdAt: apiKey.createdAt,
        };
    }

    async update(businessId: number, id: number, data: {
        name?: string;
        scopes?: string[];
        ipWhitelist?: string[];
        rateLimit?: number;
        isActive?: boolean;
        expiresAt?: string;
    }) {
        const key = await this.prisma.apiKey.findFirst({ where: { id, businessId } });
        if (!key) throw new NotFoundException('API key not found');

        return this.prisma.apiKey.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.scopes !== undefined && { scopes: data.scopes }),
                ...(data.ipWhitelist !== undefined && { ipWhitelist: data.ipWhitelist }),
                ...(data.rateLimit !== undefined && { rateLimit: data.rateLimit }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
                ...(data.expiresAt !== undefined && { expiresAt: new Date(data.expiresAt) }),
            },
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                scopes: true,
                isActive: true,
                expiresAt: true,
                updatedAt: true,
            },
        });
    }

    async remove(businessId: number, id: number) {
        const key = await this.prisma.apiKey.findFirst({ where: { id, businessId } });
        if (!key) throw new NotFoundException('API key not found');
        await this.prisma.apiKey.delete({ where: { id } });
        return { success: true };
    }

    async toggle(businessId: number, id: number) {
        const key = await this.prisma.apiKey.findFirst({ where: { id, businessId } });
        if (!key) throw new NotFoundException('API key not found');
        return this.prisma.apiKey.update({
            where: { id },
            data: { isActive: !key.isActive },
        });
    }
}
