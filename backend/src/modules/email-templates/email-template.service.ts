import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class EmailTemplateService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async findAll(businessId: number) {
        return this.prisma.emailTemplate.findMany({
            where: { businessId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(businessId: number, id: number) {
        const template = await this.prisma.emailTemplate.findFirst({
            where: { id, businessId },
        });
        if (!template) throw new NotFoundException('Email template not found');
        return template;
    }

    async create(businessId: number, data: {
        key: string;
        name: string;
        subject: string;
        bodyHtml: string;
        variables?: any;
    }) {
        return this.prisma.emailTemplate.create({
            data: {
                businessId,
                key: data.key,
                name: data.name,
                subject: data.subject,
                bodyHtml: data.bodyHtml,
                variables: data.variables ?? [],
            },
        });
    }

    async update(businessId: number, id: number, data: {
        name?: string;
        subject?: string;
        bodyHtml?: string;
        variables?: any;
        isActive?: boolean;
    }) {
        await this.findOne(businessId, id);
        return this.prisma.emailTemplate.update({
            where: { id },
            data,
        });
    }

    async sendTest(businessId: number, id: number, email: string) {
        const template = await this.findOne(businessId, id);
        // Note: actual sending requires SMTP integration via EmailService.
        // For now we validate and return preview info
        return { success: true, sentTo: email, subject: template.subject, preview: true };
    }
}
