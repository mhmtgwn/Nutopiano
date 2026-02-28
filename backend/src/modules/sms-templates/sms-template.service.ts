import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SmsTemplateService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(businessId: number) {
        return this.prisma.smsTemplate.findMany({
            where: { businessId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(businessId: number, id: number) {
        const template = await this.prisma.smsTemplate.findFirst({
            where: { id, businessId },
        });
        if (!template) throw new NotFoundException('SMS template not found');
        return template;
    }

    async create(businessId: number, data: {
        key: string;
        name: string;
        bodyText: string;
        variables?: any;
    }) {
        return this.prisma.smsTemplate.create({
            data: {
                businessId,
                key: data.key,
                name: data.name,
                bodyText: data.bodyText,
                variables: data.variables ?? [],
            },
        });
    }

    async update(businessId: number, id: number, data: {
        name?: string;
        bodyText?: string;
        variables?: any;
        isActive?: boolean;
    }) {
        await this.findOne(businessId, id);
        return this.prisma.smsTemplate.update({
            where: { id },
            data,
        });
    }

    async sendTest(businessId: number, id: number, phone: string) {
        const template = await this.findOne(businessId, id);
        return { success: true, sentTo: phone, content: template.bodyText, preview: true };
    }
}
