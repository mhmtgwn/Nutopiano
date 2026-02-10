import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  private createResetToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, tokenHash };
  }

  private buildResetUrl(token: string) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? 'http://localhost:3002';
    return `${siteUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
  }

  private async getOrCreateDefaultBusiness() {
    const first = await this.prisma.business.findFirst({ orderBy: { id: 'asc' } });
    if (first) return first;

    const name = process.env.BUSINESS_NAME ?? process.env.SITE_NAME ?? 'Nutopiano';
    return this.prisma.business.create({ data: { name } });
  }

  async login(credentials: LoginDto) {
    const identifier = credentials.phone.trim();
    const isEmailLogin = identifier.includes('@');

    const user = await this.prisma.user.findUnique({
      where: isEmailLogin
        ? { email: identifier.toLowerCase() }
        : { phone: identifier },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      userId: user.id.toString(),
      phone: user.phone ?? undefined,
      role: user.role,
      businessId: user.businessId.toString(),
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async register(payload: RegisterDto) {
    const trimmedEmail = payload.email.trim().toLowerCase();
    const trimmedPhone = payload.phone.trim();
    const trimmedName = payload.name.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone) {
      throw new BadRequestException('Eksik alanlar var.');
    }

    const businessIdFromEnv = Number(process.env.PUBLIC_BUSINESS_ID);
    const requestedBusinessId = payload.businessId ? Number(payload.businessId) : NaN;
    const businessId = Number.isFinite(requestedBusinessId) && requestedBusinessId > 0
      ? requestedBusinessId
      : Number.isFinite(businessIdFromEnv) && businessIdFromEnv > 0
        ? businessIdFromEnv
        : NaN;

    const business = Number.isFinite(businessId)
      ? await this.prisma.business.findUnique({ where: { id: businessId } })
      : await this.getOrCreateDefaultBusiness();

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const [emailExists, phoneExists] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: trimmedEmail } }),
      this.prisma.user.findUnique({ where: { phone: trimmedPhone } }),
    ]);

    if (emailExists) {
      throw new BadRequestException('Bu email zaten kayıtlı.');
    }
    if (phoneExists) {
      throw new BadRequestException('Bu telefon numarası zaten kayıtlı.');
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await this.prisma.user.create({
      data: {
        businessId: business.id,
        name: trimmedName,
        phone: trimmedPhone,
        email: trimmedEmail,
        passwordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        businessId: true,
      },
    });

    const jwtPayload: JwtPayload = {
      userId: String(user.id),
      phone: user.phone ?? undefined,
      role: user.role,
      businessId: String(user.businessId),
    };

    return { accessToken: this.jwtService.sign(jwtPayload) };
  }

  async forgotPassword(payload: ForgotPasswordDto) {
    const email = payload.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Do not leak whether the email exists.
    if (!user || !user.isActive) {
      return { ok: true };
    }

    const { token, tokenHash } = this.createResetToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 min

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpiresAt: expiresAt,
      },
    });

    const resetUrl = this.buildResetUrl(token);
    const siteName = process.env.SITE_NAME ?? 'Nutopiano';

    await this.email.sendPasswordResetEmail({
      to: email,
      resetUrl,
      siteName,
    });

    return { ok: true };
  }

  async resetPassword(payload: ResetPasswordDto) {
    const tokenHash = crypto.createHash('sha256').update(payload.token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Geçersiz veya süresi dolmuş token.');
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordTokenHash: null,
        resetPasswordExpiresAt: null,
      },
    });

    return { ok: true };
  }

  async updateProfile(current: JwtPayload, payload: UpdateProfileDto) {
    const userId = Number(current.userId);
    if (!Number.isFinite(userId)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const data: { name?: string; phone?: string; email?: string } = {};

    if (payload.name !== undefined) data.name = payload.name.trim();
    if (payload.phone !== undefined) data.phone = payload.phone.trim();
    if (payload.email !== undefined) data.email = payload.email.trim().toLowerCase();

    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          businessId: true,
        },
      });

      return {
        userId: String(updated.id),
        name: updated.name,
        phone: updated.phone ?? undefined,
        email: updated.email ?? undefined,
        role: updated.role,
        businessId: String(updated.businessId),
      };
    } catch {
      throw new BadRequestException('Profil güncellenemedi.');
    }
  }

  async changePassword(current: JwtPayload, payload: ChangePasswordDto) {
    const userId = Number(current.userId);
    if (!Number.isFinite(userId)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(payload.currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException('Mevcut şifre yanlış.');
    }

    const passwordHash = await bcrypt.hash(payload.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { ok: true };
  }

  async profile(payload: JwtPayload) {
    const userId = Number(payload.userId);
    if (!Number.isFinite(userId)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        businessId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      userId: String(user.id),
      name: user.name,
      phone: user.phone ?? undefined,
      email: user.email ?? undefined,
      role: user.role,
      businessId: String(user.businessId),
    };
  }
}
