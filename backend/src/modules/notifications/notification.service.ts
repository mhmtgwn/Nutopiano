import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(businessId: number, filters?: {
        type?: string;
        isRead?: boolean;
        page?: number;
        pageSize?: number;
    }) {
        const page = filters?.page ?? 1;
        const pageSize = filters?.pageSize ?? 20;
        const where: any = { businessId };
        if (filters?.type) where.type = filters.type;
        if (filters?.isRead !== undefined) where.isRead = filters.isRead;

        const [items, total] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.notification.count({ where }),
        ]);

        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }

    async getUnreadCount(businessId: number) {
        const count = await this.prisma.notification.count({
            where: { businessId, isRead: false },
        });
        return { unreadCount: count };
    }

    async create(businessId: number, data: {
        type: string;
        title: string;
        message: string;
        source: string;
        metadata?: any;
    }) {
        return this.prisma.notification.create({
            data: {
                businessId,
                type: data.type,
                title: data.title,
                message: data.message,
                source: data.source,
                metadata: data.metadata ?? null,
            },
        });
    }

    async markAsRead(businessId: number, id: number) {
        const notification = await this.prisma.notification.findFirst({
            where: { id, businessId },
        });
        if (!notification) throw new NotFoundException('Notification not found');
        return this.prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });
    }

    async dismiss(businessId: number, id: number) {
        const notification = await this.prisma.notification.findFirst({
            where: { id, businessId },
        });
        if (!notification) throw new NotFoundException('Notification not found');
        return this.prisma.notification.update({
            where: { id },
            data: { isRead: true, dismissedAt: new Date() },
        });
    }

    async markAllAsRead(businessId: number) {
        const result = await this.prisma.notification.updateMany({
            where: { businessId, isRead: false },
            data: { isRead: true },
        });
        return { updated: result.count };
    }

    async remove(businessId: number, id: number) {
        const notification = await this.prisma.notification.findFirst({
            where: { id, businessId },
        });
        if (!notification) throw new NotFoundException('Notification not found');
        await this.prisma.notification.delete({ where: { id } });
        return { success: true };
    }
}
