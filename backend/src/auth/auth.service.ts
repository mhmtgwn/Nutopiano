import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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
import { JsonLoggerService } from '../common/logger/json-logger.service';
import { EmailService } from '../email/email.service';
import {
  isAdminRole,
  isStaffRole,
  normalizeRole,
  normalizePosPermissionsJson,
  permissionsFromPreset,
  toEffectiveRole,
} from '@common/authz';
import { ROLES, type RoleType } from '@common/constants/roles';
import { PermissionGroupService } from '../modules/permission-groups/permission-group.service';

type RefreshJwtPayload = {
  userId: string;
  type: 'refresh';
  jti: string;
};

type FeatureStatusCode = 'ACTIVE' | 'PLANNED' | 'BLOCKED';
type AccessPanel = 'ADMIN' | 'SELLER' | 'POS' | 'CUSTOMER';

/**
 * OWASP recommended bcrypt salt rounds for modern hardware (2024).
 * Using 12 instead of 10 for improved security.
 * Higher values increase computational cost, protecting against brute-force attacks.
 */
const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new JsonLoggerService(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly permissionGroupService: PermissionGroupService,
  ) {}

  private logAuthStage(
    stage: string,
    data: Record<string, unknown>,
    level: 'log' | 'warn' | 'error' = 'log',
    trace?: string,
  ) {
    const payload = { stage, ...data };

    if (level === 'error') {
      this.logger.error(payload, trace, AuthService.name);
      return;
    }

    if (level === 'warn') {
      this.logger.warn(payload, AuthService.name);
      return;
    }

    this.logger.log(payload, AuthService.name);
  }

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

  private async createAndStoreRefreshToken(
    user: { id: number; businessId: number },
    context: string,
  ) {
    try {
      const jti = crypto.randomUUID();
      const refreshPayload: RefreshJwtPayload = {
        userId: user.id.toString(),
        type: 'refresh',
        jti,
      };

      const refreshToken = this.jwtService.sign(refreshPayload, {
        expiresIn: '7d',
      });
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
    } catch (error) {
      this.logAuthStage(
        `${context}.refresh_token_create`,
        {
          userId: user.id,
          businessId: user.businessId,
        },
        'error',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private async createAuthTokensForUser(
    user: {
      id: number;
      phone: string | null;
      role: JwtPayload['role'];
      businessId: number;
    },
    refreshTokenContext: string,
  ) {
    const accessToken = this.createAccessToken(user);
    const refresh = await this.createAndStoreRefreshToken(
      {
        id: user.id,
        businessId: user.businessId,
      },
      refreshTokenContext,
    );
    return { accessToken, refreshToken: refresh.refreshToken };
  }

  private async markSuccessfulLogin(userId: number) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() },
        select: { id: true },
      });
    } catch (error) {
      this.logAuthStage(
        'login.last_login_update',
        { userId },
        'error',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private createResetToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, tokenHash };
  }

  private buildResetUrl(token: string) {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.SITE_URL ??
      'http://localhost:3002';
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
      push(
        `+90 ${national10.slice(0, 3)} ${national10.slice(3, 6)} ${national10.slice(6, 8)} ${national10.slice(8)}`,
      );
      push(
        `0${national10.slice(0, 3)} ${national10.slice(3, 6)} ${national10.slice(6, 8)} ${national10.slice(8)}`,
      );
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
    const first = await this.prisma.business.findFirst({
      orderBy: { id: 'asc' },
    });
    if (first) return first;

    const name =
      process.env.BUSINESS_NAME ?? process.env.SITE_NAME ?? 'Nutopiano';
    return this.prisma.business.create({ data: { name } });
  }

  private getVisibleRole(role?: string | null): RoleType {
    return normalizeRole(role) ?? ROLES.CUSTOMER;
  }

  private hasAnyPermission(
    permissions: string[],
    candidates: readonly string[],
  ) {
    if (!permissions.length) return false;
    const set = new Set(permissions);
    return candidates.some((permission) => set.has(permission));
  }

  private resolveAllowedPanels(
    role: RoleType,
    permissions: string[],
  ): AccessPanel[] {
    if (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN) {
      return ['ADMIN', 'SELLER', 'POS', 'CUSTOMER'];
    }

    if (role === ROLES.SELLER) {
      return ['SELLER', 'POS'];
    }

    if (role === ROLES.SELLER_STAFF) {
      const panels: AccessPanel[] = [];
      const hasSellerPanelPerm = this.hasAnyPermission(permissions, [
        'orders.view',
        'products.view',
        'customers.view',
        'finance.view',
        'reports.view',
      ]);
      const hasPosPerm = this.hasAnyPermission(permissions, [
        'pos.sales',
        'pos.orders',
        'pos.reports',
      ]);

      if (hasSellerPanelPerm) panels.push('SELLER');
      if (hasPosPerm) panels.push('POS');
      return panels;
    }

    return ['CUSTOMER'];
  }

  private resolvePanelHome(
    role: RoleType,
    allowedPanels: AccessPanel[],
  ): string {
    if (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN) return '/admin';
    if (role === ROLES.SELLER) return '/dashboard';
    if (role === ROLES.CUSTOMER) return '/account/orders';
    if (allowedPanels.includes('SELLER')) return '/dashboard/orders';
    if (allowedPanels.includes('POS')) return '/pos';
    return '/account/profile';
  }

  private buildFeatureStatuses(
    role: RoleType,
    permissions: string[],
  ): Array<{ key: string; status: FeatureStatusCode; note?: string }> {
    if (role === ROLES.SUPER_ADMIN) {
      return [
        { key: 'platform.settings', status: 'ACTIVE' },
        { key: 'platform.feature_flags', status: 'ACTIVE' },
        { key: 'platform.api_keys', status: 'ACTIVE' },
        { key: 'platform.audit_outbox', status: 'ACTIVE' },
        { key: 'platform.finance_all', status: 'ACTIVE' },
        {
          key: 'platform.report_exports',
          status: 'PLANNED',
          note: 'Ek export modulleri faz-2.',
        },
      ];
    }

    if (role === ROLES.ADMIN) {
      return [
        { key: 'business.operations', status: 'ACTIVE' },
        { key: 'seller.management', status: 'ACTIVE' },
        { key: 'finance.payouts', status: 'ACTIVE' },
        { key: 'audit.read', status: 'ACTIVE' },
        {
          key: 'platform.superadmin_only',
          status: 'BLOCKED',
          note: 'Sadece SUPER_ADMIN.',
        },
      ];
    }

    if (role === ROLES.SELLER) {
      return [
        { key: 'seller.products', status: 'ACTIVE' },
        { key: 'seller.orders', status: 'ACTIVE' },
        { key: 'seller.customers', status: 'ACTIVE' },
        { key: 'seller.pos', status: 'ACTIVE' },
        { key: 'seller.finance_own', status: 'ACTIVE' },
        {
          key: 'seller.advanced_modules',
          status: 'PLANNED',
          note: 'Dokumanda olan ek moduller.',
        },
      ];
    }

    if (role === ROLES.SELLER_STAFF) {
      return [
        {
          key: 'staff.assigned_permissions',
          status: permissions.length > 0 ? 'ACTIVE' : 'BLOCKED',
          note:
            permissions.length > 0
              ? 'Atanan yetki gruplari aktif.'
              : 'Atanmamis yetki grubu bulunuyor.',
        },
        {
          key: 'staff.out_of_scope',
          status: 'BLOCKED',
          note: 'Yetki grubu disindaki islemler kapali.',
        },
      ];
    }

    return [
      { key: 'customer.profile', status: 'ACTIVE' },
      { key: 'customer.addresses', status: 'ACTIVE' },
      { key: 'customer.orders', status: 'ACTIVE' },
      { key: 'customer.favorites', status: 'ACTIVE' },
      { key: 'customer.reviews', status: 'ACTIVE' },
      {
        key: 'customer.backoffice',
        status: 'BLOCKED',
        note: 'Backoffice panellerine erisim yok.',
      },
    ];
  }

  async login(credentials: LoginDto) {
    const identifier = credentials.phone.trim();
    const isEmailLogin = identifier.includes('@');

    let user;
    try {
      user = await this.findUserByLoginIdentifier(identifier, isEmailLogin);
    } catch (error) {
      this.logAuthStage(
        'login.user_lookup',
        {
          identifierType: isEmailLogin ? 'email' : 'phone',
        },
        'error',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }

    if (!user || !user.isActive) {
      this.logAuthStage(
        'login.user_lookup',
        {
          identifierType: isEmailLogin ? 'email' : 'phone',
          reason: !user ? 'user_not_found' : 'inactive_user',
        },
        'warn',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
      this.logAuthStage(
        'login.password_verify',
        {
          userId: user.id,
          businessId: user.businessId,
          reason: 'password_hash_missing',
        },
        'warn',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(
      credentials.password,
      user.passwordHash,
    );
    if (!isValidPassword) {
      this.logAuthStage(
        'login.password_verify',
        {
          userId: user.id,
          businessId: user.businessId,
          reason: 'invalid_password',
        },
        'warn',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.createAuthTokensForUser(
      {
        id: user.id,
        phone: user.phone,
        role: user.role,
        businessId: user.businessId,
      },
      'login',
    );
    await this.markSuccessfulLogin(user.id);
    return tokens;
  }

  async register(payload: RegisterDto) {
    const trimmedEmail = payload.email.trim().toLowerCase();
    const trimmedPhone = payload.phone.trim();
    const trimmedName = payload.name.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone) {
      throw new BadRequestException('Eksik alanlar var.');
    }

    const businessIdFromEnv = Number(process.env.PUBLIC_BUSINESS_ID);
    const requestedBusinessId = payload.businessId
      ? Number(payload.businessId)
      : NaN;
    const businessId =
      Number.isFinite(requestedBusinessId) && requestedBusinessId > 0
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

    const passwordHash = await bcrypt.hash(
      payload.password,
      BCRYPT_SALT_ROUNDS,
    );

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

      const accessToken = this.jwtService.sign(jwtPayload, {
        expiresIn: '15m',
      });
      const refresh = await this.createAndStoreRefreshToken(
        {
          id: user.id,
          businessId: user.businessId,
        },
        'register',
      );

      return { accessToken, refreshToken: refresh.refreshToken };
    } catch (error: unknown) {
      const prismaError = error as {
        code?: string;
        meta?: { target?: string[] };
      } | null;
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

    if (
      !decoded ||
      decoded.type !== 'refresh' ||
      !decoded.userId ||
      !decoded.jti
    ) {
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

    if (
      String(tokenRecord.userId) !== decoded.userId ||
      tokenRecord.jti !== decoded.jti
    ) {
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

    const rotated = await this.createAndStoreRefreshToken(
      {
        id: user.id,
        businessId: user.businessId,
      },
      'refresh',
    );

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
    const tokenHash = crypto
      .createHash('sha256')
      .update(payload.token)
      .digest('hex');

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

    const passwordHash = await bcrypt.hash(
      payload.password,
      BCRYPT_SALT_ROUNDS,
    );

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
    if (payload.email !== undefined)
      data.email = payload.email.trim().toLowerCase();

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
        role: this.getVisibleRole(updated.role),
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

    const passwordHash = await bcrypt.hash(
      payload.newPassword,
      BCRYPT_SALT_ROUNDS,
    );
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

    const role = this.getVisibleRole(user.role);
    const effectiveRole = toEffectiveRole(role) ?? role;
    let permissions = Array.isArray(payload.resolvedPermissions)
      ? payload.resolvedPermissions
      : [];

    if (!permissions.length) {
      try {
        permissions = await this.permissionGroupService.resolveForUser(user.id);
      } catch (error) {
        this.logAuthStage(
          'profile.permission_resolve',
          {
            userId: user.id,
            businessId: user.businessId,
          },
          'error',
          error instanceof Error ? error.stack : undefined,
        );
        throw error;
      }
    }

    const allowedPanels = this.resolveAllowedPanels(role, permissions);
    const panelHome = this.resolvePanelHome(role, allowedPanels);
    const featureStatuses = this.buildFeatureStatuses(role, permissions);

    return {
      userId: String(user.id),
      name: user.name,
      phone: user.phone ?? undefined,
      email: user.email ?? undefined,
      role,
      effectiveRole,
      permissions,
      panelHome,
      allowedPanels,
      featureStatuses,
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

    const role = this.getVisibleRole(user.role);
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

    if (isStaffRole(role)) {
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
        effectiveRole,
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
