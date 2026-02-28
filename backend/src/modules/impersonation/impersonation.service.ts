import {
    Injectable, ForbiddenException, NotFoundException, UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';

const IMPERSONATION_TTL_MS = 30 * 60 * 1000; // 30 dakika

@Injectable()
export class ImpersonationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    /**
     * Impersonation başlat — yeni JWT üret, audit log yaz
     */
    async startImpersonation(adminUserId: number, targetUserId: number) {
        // Admin bilgilerini al
        const admin = await this.prisma.user.findUnique({
            where: { id: adminUserId },
            select: { id: true, role: true, businessId: true, name: true },
        });
        if (!admin) throw new UnauthorizedException('Yetkisiz erişim.');

        // Hedef kullanıcıyı al
        const target = await this.prisma.user.findUnique({
            where: { id: targetUserId },
            select: { id: true, name: true, phone: true, role: true, businessId: true, isActive: true },
        });
        if (!target) throw new NotFoundException('Kullanıcı bulunamadı.');
        if (!target.isActive) throw new BadRequestException('Pasif kullanıcı taklit edilemez.');

        // Kendini taklit edemezsin
        if (adminUserId === targetUserId) {
            throw new BadRequestException('Kendinizi taklit edemezsiniz.');
        }

        // SUPER_ADMIN sadece SUPER_ADMIN tarafından taklit edilebilir (ama bu pratikte yok)
        if (target.role === 'SUPER_ADMIN') {
            throw new ForbiddenException('SUPER_ADMIN taklit edilemez.');
        }

        // Impersonation JWT üret
        const payload = {
            userId: String(target.id),
            phone: target.phone ?? undefined,
            role: target.role,
            businessId: String(target.businessId),
            impersonatedBy: String(admin.id),
            impersonationExpiresAt: Date.now() + IMPERSONATION_TTL_MS,
        };

        const accessToken = this.jwtService.sign(payload, { expiresIn: '30m' });

        // Audit log yaz
        await this.prisma.auditLog.create({
            data: {
                userId: adminUserId,
                action: 'IMPERSONATION_START',
                targetType: 'User',
                targetId: targetUserId,
                details: {
                    adminName: admin.name,
                    targetName: target.name,
                    targetRole: target.role,
                    expiresAt: new Date(Date.now() + IMPERSONATION_TTL_MS).toISOString(),
                },
                businessId: admin.businessId,
            } as any,
        }).catch(() => { /* audit log yoksa geç */ });

        return {
            accessToken,
            impersonating: {
                id: target.id,
                name: target.name,
                role: target.role,
            },
            expiresAt: new Date(Date.now() + IMPERSONATION_TTL_MS).toISOString(),
        };
    }

    /**
     * Impersonation bitir — orijinal oturuma dönüş
     */
    async endImpersonation(currentToken: any) {
        const impersonatedBy = currentToken.impersonatedBy;
        if (!impersonatedBy) {
            throw new BadRequestException('Aktif impersonation oturumu yok.');
        }

        const originalUserId = Number(impersonatedBy);
        const admin = await this.prisma.user.findUnique({
            where: { id: originalUserId },
            select: { id: true, phone: true, role: true, businessId: true },
        });
        if (!admin) throw new UnauthorizedException('Orijinal kullanıcı bulunamadı.');

        // Orijinal JWT
        const payload = {
            userId: String(admin.id),
            phone: admin.phone ?? undefined,
            role: admin.role,
            businessId: String(admin.businessId),
        };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

        // Audit log
        await this.prisma.auditLog.create({
            data: {
                userId: originalUserId,
                action: 'IMPERSONATION_END',
                targetType: 'User',
                targetId: Number(currentToken.userId),
                details: { endedBy: 'user_action' },
                businessId: admin.businessId,
            } as any,
        }).catch(() => { });

        return { accessToken };
    }
}
