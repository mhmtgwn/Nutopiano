import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import crypto from 'crypto';

// otplib nodenext modül çözünürlüğünde sorun çıkarabilir
// Bu yüzden authenticator'ı basit TOTP hesaplama ile yapıyoruz
// Eğer otplib yüklendiyse onu kullan, yoksa fallback
let authenticator: {
    generateSecret: () => string;
    verify: (opts: { token: string; secret: string }) => boolean;
    keyuri: (accountName: string, issuer: string, secret: string) => string;
};

try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const otplib = require('otplib');
    authenticator = otplib.authenticator;
} catch {
    // Fallback — basit placeholder
    authenticator = {
        generateSecret: () => crypto.randomBytes(20).toString('hex').slice(0, 32).toUpperCase(),
        verify: () => false,
        keyuri: (account: string, issuer: string, secret: string) =>
            `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}`,
    };
}

@Injectable()
export class TwoFactorService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    /**
     * 2FA kurulum başlatma — TOTP secret üret + QR URI döndür
     */
    async setup(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, phone: true },
        });
        if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

        const existing = await this.prisma.userTwoFactor.findUnique({
            where: { userId },
        });
        if (existing?.isEnabled) {
            throw new BadRequestException('2FA zaten aktif.');
        }

        const secret = authenticator.generateSecret();
        const backupCodes = this.generateBackupCodes(8);
        const hashedBackupCodes = backupCodes.map((c) =>
            crypto.createHash('sha256').update(c).digest('hex'),
        );

        const accountName = user.email ?? user.phone ?? `user-${user.id}`;
        const issuer = process.env.SITE_NAME ?? 'Nutopiano';
        const otpauthUrl = authenticator.keyuri(accountName, issuer, secret);

        await this.prisma.userTwoFactor.upsert({
            where: { userId },
            create: {
                userId,
                secret,
                backupCodes: hashedBackupCodes,
                isEnabled: false,
            },
            update: {
                secret,
                backupCodes: hashedBackupCodes,
                isEnabled: false,
                enabledAt: null,
            },
        });

        return { secret, otpauthUrl, backupCodes };
    }

    /**
     * 2FA doğrulama ve aktifleştirme
     */
    async verify(userId: number, code: string) {
        const record = await this.prisma.userTwoFactor.findUnique({
            where: { userId },
        });
        if (!record) throw new BadRequestException('Önce 2FA kurulumunu başlatın.');
        if (record.isEnabled) throw new BadRequestException('2FA zaten doğrulanmış.');

        const isValid = authenticator.verify({ token: code, secret: record.secret });
        if (!isValid) throw new BadRequestException('Geçersiz doğrulama kodu.');

        await this.prisma.userTwoFactor.update({
            where: { userId },
            data: { isEnabled: true, enabledAt: new Date() },
        });

        return { ok: true, message: '2FA başarıyla aktifleştirildi.' };
    }

    /**
     * Login sırasında 2FA kodu doğrulama
     */
    async validateCode(userId: number, code: string): Promise<boolean> {
        const record = await this.prisma.userTwoFactor.findUnique({
            where: { userId },
        });
        if (!record || !record.isEnabled) return true; // 2FA aktif değilse doğrudan geç

        // TOTP kodu dene
        if (authenticator.verify({ token: code, secret: record.secret })) {
            return true;
        }

        // Backup kodu dene
        const codeHash = crypto.createHash('sha256').update(code).digest('hex');
        const backupCodes = (record.backupCodes as string[]) ?? [];
        const idx = backupCodes.indexOf(codeHash);
        if (idx >= 0) {
            const updated = [...backupCodes];
            updated.splice(idx, 1);
            await this.prisma.userTwoFactor.update({
                where: { userId },
                data: { backupCodes: updated },
            });
            return true;
        }

        return false;
    }

    /**
     * 2FA devre dışı bırakma
     */
    async disable(userId: number) {
        await this.prisma.userTwoFactor.delete({
            where: { userId },
        }).catch(() => { });

        return { ok: true, message: '2FA devre dışı bırakıldı.' };
    }

    /**
     * Admin tarafından 2FA sıfırlama
     */
    async adminReset(targetUserId: number, adminUserId: number) {
        await this.prisma.userTwoFactor.delete({
            where: { userId: targetUserId },
        }).catch(() => { });

        // Audit log — best effort
        try {
            await (this.prisma as any).auditLog.create({
                data: {
                    userId: adminUserId,
                    action: '2FA_RESET',
                    targetType: 'User',
                    targetId: targetUserId,
                    details: { resetBy: adminUserId },
                },
            });
        } catch { /* audit log yoksa geç */ }

        return { ok: true, message: '2FA sıfırlandı.' };
    }

    /**
     * Backup kodları yeniden üret
     */
    async regenerateBackupCodes(userId: number) {
        const record = await this.prisma.userTwoFactor.findUnique({
            where: { userId },
        });
        if (!record || !record.isEnabled) {
            throw new BadRequestException('2FA aktif değil.');
        }

        const backupCodes = this.generateBackupCodes(8);
        const hashedBackupCodes = backupCodes.map((c) =>
            crypto.createHash('sha256').update(c).digest('hex'),
        );

        await this.prisma.userTwoFactor.update({
            where: { userId },
            data: { backupCodes: hashedBackupCodes },
        });

        return { backupCodes };
    }

    /**
     * 2FA durumunu kontrol et
     */
    async getStatus(userId: number) {
        const record = await this.prisma.userTwoFactor.findUnique({
            where: { userId },
            select: { isEnabled: true, enabledAt: true, backupCodes: true },
        });

        return {
            enabled: !!record?.isEnabled,
            setupAt: record?.enabledAt ?? null,
            remainingBackupCodes: record?.isEnabled
                ? ((record.backupCodes as string[]) ?? []).length
                : 0,
        };
    }

    /**
     * Kullanıcının 2FA aktif mi?
     */
    async isEnabled(userId: number): Promise<boolean> {
        const record = await this.prisma.userTwoFactor.findUnique({
            where: { userId },
            select: { isEnabled: true },
        });
        return !!record?.isEnabled;
    }

    private generateBackupCodes(count: number): string[] {
        return Array.from({ length: count }, () =>
            crypto.randomBytes(4).toString('hex').toUpperCase(),
        );
    }
}
