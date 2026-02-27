import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
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
import {
  isAdminRole,
  normalizePosPermissionsJson,
  permissionsFromPreset,
  toEffectiveRole,
} from '@common/authz';

type RefreshJwtPayload = {
  userId: string;
  type: 'refresh';
  jti: string;
};

/**
 * OWASP recommended bcrypt salt rounds for modern hardware (2024).
 * Using 12 instead of 10 for improved security.
 * Higher values increase computational cost, protecting against brute-force attacks.
 */
const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) { }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private createAccessToken(user: {
    id: number;
    phone: string | null;
    role: JwtPayload['role'];
    businessId: number;
  }) {
    const payload: JwtPayload = {
      userId: user.id.toString(),
      phone: user.phone ?? undefined,
      role: user.role,
      businessId: user.businessId.toString(),
    };

    return this.jwtService.sign(payload, { expiresIn: '15m' });
  }

  private async createAndStoreRefreshToken(user: { id: number; businessId: number }) {
    const jti = crypto.randomUUID();
    const refreshPayload: RefreshJwtPayload = {
      userId: user.id.toString(),
      type: 'refresh',
      jti,
    };

    const refreshToken = this.jwtService.sign(refreshPayload, { expiresIn: '7d' });
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    const record = await (this.prisma as any).refreshToken.create({
      data: {
        businessId: user.businessId,
        userId: user.id,
        jti,
        tokenHash,
        expiresAt,
      },
      select: { id: true },
    });

    return { refreshToken, refreshTokenId: record.id as number };
  }

  private async createAuthTokensForUser(user: {
    id: number;
    phone: string | null;
    role: JwtPayload['role'];
    businessId: number;
  }) {
    const accessToken = this.createAccessToken(user);
    const refresh = await this.createAndStoreRefreshToken({
      id: user.id,
      businessId: user.businessId,
    });
    return { accessToken, refreshToken: refresh.refreshToken };
  }

  private createResetToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, tokenHash };
  }

  private buildResetUrl(token: string) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? 'http://localhost:3002';
    return `${siteUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
  }

  private normalizePhoneDigits(value: string) {
    return String(value ?? '').replace(/\D+/g, '');
  }

  private buildPhoneLoginCandidates(identifier: string) {
    const trimmed = identifier.trim();
    const digits = this.normalizePhoneDigits(trimmed);
    const candidates = new Set<string>();

    const push = (value?: string | null) => {
      if (!value) return;
      const normalized = value.trim();
      if (!normalized) return;
      candidates.add(normalized);
    };

    push(trimmed);
    push(digits);

    let national10 = digits;
    if (digits.startsWith('0090') && digits.length >= 14) {
      national10 = digits.slice(4, 14);
    } else if (digits.startsWith('90') && digits.length >= 12) {
      national10 = digits.slice(2, 12);
    } else if (digits.startsWith('0') && digits.length >= 11) {
      national10 = digits.slice(1, 11);
    }

    if (national10.length === 10) {
      push(national10);
      push(`0${national10}`);
      push(`90${national10}`);
      push(`+90${national10}`);
      push(`+90 ${national10.slice(0, 3)} ${national10.slice(3, 6)} ${national10.slice(6, 8)} ${national10.slice(8)}`);
      push(`0${national10.slice(0, 3)} ${national10.slice(3, 6)} ${national10.slice(6, 8)} ${national10.slice(8)}`);
    }

    return Array.from(candidates);
  }

  private async findUserByLoginIdentifier(
    identifier: string,
    isEmailLogin: boolean,
  ) {
    if (isEmailLogin) {
      return this.prisma.user.findUnique({
        where: { email: identifier.toLowerCase() },
      });
    }

    const phoneCandidates = this.buildPhoneLoginCandidates(identifier);
    const directMatch = await this.prisma.user.findFirst({
      where: {
        phone: {
          in: phoneCandidates,
        },
      },
    });

    if (directMatch) {
      return directMatch;
    }

    const normalizedCandidates = Array.from(
      new Set(
        phoneCandidates
          .map((candidate) => this.normalizePhoneDigits(candidate))
          .filter((candidate) => candidate.length > 0),
      ),
    );

    if (!normalizedCandidates.length) {
      return null;
    }

    const matchedRows = await this.prisma.$queryRaw<Array<{ id: number }>>(
      Prisma.sql`
        SELECT "id"
        FROM "User"
        WHERE regexp_replace(COALESCE("phone", ''), '[^0-9]+', '', 'g') IN (${Prisma.join(normalizedCandidates)})
        LIMIT 1
      `,
    );

    const matchedId = matchedRows[0]?.id;
    if (!matchedId) {
      return null;
    }

    return this.prisma.user.findUnique({ where: { id: matchedId } });
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

    const user = await this.findUserByLoginIdentifier(identifier, isEmailLogin);

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

    return this.createAuthTokensForUser({
      id: user.id,
      phone: user.phone,
      role: user.role,
      businessId: user.businessId,
    });
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

    const passwordHash = await bcrypt.hash(payload.password, BCRYPT_SALT_ROUNDS);

    try {
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

      const accessToken = this.jwtService.sign(jwtPayload, { expiresIn: '15m' });
      const refresh = await this.createAndStoreRefreshToken({
        id: user.id,
        businessId: user.businessId,
      });

      return { accessToken, refreshToken: refresh.refreshToken };
    } catch (error: unknown) {
      const prismaError = error as { code?: string; meta?: { target?: string[] } } | null;
      // Handle Prisma unique constraint errors
      if (prismaError?.code === 'P2002') {
        const target = prismaError?.meta?.target?.[0];
        if (target === 'phone') {
          throw new BadRequestException('Bu telefon numarası zaten kayıtlı.');
        }
        if (target === 'email') {
          throw new BadRequestException('Bu email zaten kayıtlı.');
        }
      }
      throw new BadRequestException('Kayıt işlemi başarısız oldu.');
    }
  }

  async refresh(rawRefreshToken: string) {
    let decoded: RefreshJwtPayload;
    try {
      decoded = this.jwtService.verify<RefreshJwtPayload>(rawRefreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!decoded || decoded.type !== 'refresh' || !decoded.userId || !decoded.jti) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashToken(rawRefreshToken);

    const tokenRecord = await (this.prisma as any).refreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        businessId: true,
        jti: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRecord.revokedAt) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    if (tokenRecord.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (String(tokenRecord.userId) !== decoded.userId || tokenRecord.jti !== decoded.jti) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: tokenRecord.userId },
      select: {
        id: true,
        phone: true,
        role: true,
        businessId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const rotated = await this.createAndStoreRefreshToken({
      id: user.id,
      businessId: user.businessId,
    });

    await (this.prisma as any).refreshToken.update({
      where: { id: tokenRecord.id },
      data: {
        revokedAt: new Date(),
        replacedByTokenId: rotated.refreshTokenId,
      },
    });

    return {
      accessToken: this.createAccessToken({
        id: user.id,
        phone: user.phone,
        role: user.role,
        businessId: user.businessId,
      }),
      refreshToken: rotated.refreshToken,
    };
  }

  async revokeRefreshToken(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);

    await (this.prisma as any).refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return { ok: true };
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
      select: {
        id: true,
        resetPasswordTokenHash: true,
      },
    });

    if (!user || !user.resetPasswordTokenHash) {
      throw new BadRequestException('Geçersiz veya süresi dolmuş token.');
    }

    // Use timing-safe comparison to prevent timing attacks
    const isValidToken = crypto.timingSafeEqual(
      Buffer.from(tokenHash),
      Buffer.from(user.resetPasswordTokenHash),
    );

    if (!isValidToken) {
      throw new BadRequestException('Geçersiz veya süresi dolmuş token.');
    }

    const passwordHash = await bcrypt.hash(payload.password, BCRYPT_SALT_ROUNDS);

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

    const passwordHash = await bcrypt.hash(payload.newPassword, BCRYPT_SALT_ROUNDS);
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

  async mePermissions(payload: JwtPayload) {
    const userId = Number(payload.userId);
    const businessId = Number(payload.businessId);
    if (!Number.isFinite(userId) || !Number.isFinite(businessId)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        businessId,
        isActive: true,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const role = user.role;
    const effectiveRole = toEffectiveRole(role) ?? role;

    if (isAdminRole(role) || role === 'SELLER') {
      const permissions = permissionsFromPreset('full_pos');
      return {
        userId: String(user.id),
        role,
        effectiveRole,
        permissions,
      };
    }

    if (role === 'USER') {
      const memberships = await this.prisma.sellerTeamMember.findMany({
        where: {
          businessId,
          userId,
          isActive: true,
          seller: {
            isActive: true,
          },
        },
        select: {
          sellerId: true,
          permissionsJson: true,
        },
      });

      const permissions = Array.from(
        new Set(
          memberships.flatMap((membership) =>
            normalizePosPermissionsJson(membership.permissionsJson),
          ),
        ),
      );

      return {
        userId: String(user.id),
        role,
        effectiveRole: 'VIEWER',
        permissions,
      };
    }

    return {
      userId: String(user.id),
      role,
      effectiveRole,
      permissions: [] as string[],
    };
  }
}
