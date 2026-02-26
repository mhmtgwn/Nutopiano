import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreditBlockPolicy,
  InviteDeliveryStatus,
  Prisma,
  SellerInviteStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  buildPaginationMeta,
  clampPage,
  clampPageSize,
  paginationToSkipTake,
  type PaginationMeta,
} from '@common/utils/pagination';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';
import { ProductsService } from '../products/products.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTION_TYPES } from '../audit/audit.constants';
import { OUTBOX_EVENT_TYPES } from '../outbox/outbox.constants';
import { OutboxService } from '../outbox/outbox.service';
import { SellerInviteDeliveryService } from './invite-delivery.service';
import { AdminProductPublishForceDto } from './dto/admin-product-publish-force.dto';
import { AdminProductStockForceDto } from './dto/admin-product-stock-force.dto';
import { CreateSellerApplicationDto } from './dto/create-seller-application.dto';
import { CreateSellerTeamInviteDto } from './dto/create-seller-team-invite.dto';
import { UpdateSellerTeamMemberDto } from './dto/update-seller-team-member.dto';

export interface PublicSellerSummary {
  id: number;
  slug: string;
  displayName: string;
  description?: string | null;
  logoUrl?: string | null;
}

export interface PublicSellerCategorySummary {
  id: number;
  name: string;
  slug: string;
  productCount: number;
}

export interface PublicSellerDirectoryItem extends PublicSellerSummary {
  productCount: number;
  categories: PublicSellerCategorySummary[];
}

export interface PublicSellerDirectoryResponse {
  data: PublicSellerDirectoryItem[];
  meta: PaginationMeta;
}

export interface PublicSellerProfileResponse {
  seller: PublicSellerSummary;
  categories: PublicSellerCategorySummary[];
  products: {
    data: any[];
    meta: PaginationMeta;
  };
}

@Injectable()
export class SellersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly auditService: AuditService,
    private readonly inviteDeliveryService: SellerInviteDeliveryService,
    private readonly outboxService: OutboxService,
  ) {}

  private readonly defaultTeamPermissions = [
    'tab.sales',
    'tab.orders',
    'pos.sale.create',
    'orders.read',
    'orders.updateStatus',
  ] as const;

  private slugifySeller(value: string): string {
    const normalized = String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 96);

    return normalized || 'seller';
  }

  private async resolveUniqueSellerSlug(
    businessId: number,
    rawBase: string,
    excludeSellerId?: number,
  ): Promise<string> {
    const base = this.slugifySeller(rawBase);
    const maxAttempts = 100;

    for (let i = 0; i < maxAttempts; i += 1) {
      const suffix = i === 0 ? '' : `-${i + 1}`;
      const candidate = `${base}${suffix}`.slice(0, 110);
      const existing = await this.prisma.seller.findFirst({
        where: {
          businessId,
          slug: candidate,
          ...(excludeSellerId ? { id: { not: excludeSellerId } } : {}),
        },
        select: { id: true },
      });
      if (!existing) {
        return candidate;
      }
    }

    throw new ConflictException('Unique seller slug üretilemedi');
  }

  private normalizePermissions(permissions?: string[]) {
    const base = Array.isArray(permissions)
      ? permissions
      : [...this.defaultTeamPermissions];
    return {
      permissions: Array.from(
        new Set(
          base
            .map((item) => String(item ?? '').trim())
            .filter((item) => item.length > 0),
        ),
      ),
    };
  }

  private async resolveSellerForActor(currentUser: JwtPayload) {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);
    if (!Number.isFinite(businessId) || !Number.isFinite(userId)) {
      throw new ForbiddenException('Access denied');
    }

    const seller = await this.prisma.seller.findFirst({
      where: {
        businessId,
        userId,
        isActive: true,
      },
      select: {
        id: true,
        businessId: true,
        userId: true,
      },
    });
    if (!seller) {
      throw new ForbiddenException('Aktif seller profili bulunamadi');
    }
    return seller;
  }

  private async resolveUserTeamSellerIds(businessId: number, userId: number) {
    const rows = await this.prisma.sellerTeamMember.findMany({
      where: {
        businessId,
        userId,
        isActive: true,
        seller: {
          isActive: true,
        },
      },
      select: { sellerId: true },
    });

    return Array.from(
      new Set(rows.map((row) => Number(row.sellerId)).filter((id) => id > 0)),
    );
  }

  private async resolveAllowedSellerIdsForActor(
    currentUser: JwtPayload,
    requestedSellerId?: number,
  ) {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    const normalizedRequestedSellerId =
      typeof requestedSellerId === 'number' && Number.isFinite(requestedSellerId)
        ? Math.trunc(requestedSellerId)
        : undefined;

    if (
      normalizedRequestedSellerId !== undefined &&
      normalizedRequestedSellerId <= 0
    ) {
      throw new BadRequestException('sellerId gecersiz');
    }

    if (
      currentUser.role === 'ADMIN' ||
      currentUser.role === 'SUPER_ADMIN'
    ) {
      if (normalizedRequestedSellerId !== undefined) {
        const seller = await this.prisma.seller.findFirst({
          where: { id: normalizedRequestedSellerId, businessId },
          select: { id: true },
        });
        if (!seller) {
          throw new NotFoundException('Seller bulunamadi');
        }
        return [normalizedRequestedSellerId];
      }

      const rows = await this.prisma.seller.findMany({
        where: { businessId },
        select: { id: true },
      });
      return rows.map((row) => row.id);
    }

    if (currentUser.role === 'SELLER') {
      const seller = await this.resolveSellerForActor(currentUser);
      if (
        normalizedRequestedSellerId !== undefined &&
        normalizedRequestedSellerId !== seller.id
      ) {
        throw new ForbiddenException('Access denied');
      }
      return [seller.id];
    }

    if (currentUser.role === 'USER') {
      const sellerIds = await this.resolveUserTeamSellerIds(businessId, userId);
      if (!sellerIds.length) {
        throw new ForbiddenException('Seller team yetkisi bulunamadi');
      }
      if (normalizedRequestedSellerId !== undefined) {
        if (!sellerIds.includes(normalizedRequestedSellerId)) {
          throw new ForbiddenException('Access denied');
        }
        return [normalizedRequestedSellerId];
      }
      return sellerIds;
    }

    throw new ForbiddenException('Access denied');
  }

  private assertPlatformOverrideActor(currentUser: JwtPayload) {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }
  }

  private async resolvePlatformSellerForOverride(
    currentUser: JwtPayload,
    sellerId: number,
  ) {
    this.assertPlatformOverrideActor(currentUser);
    const businessId = Number(currentUser.businessId);

    if (!Number.isFinite(sellerId) || sellerId <= 0) {
      throw new BadRequestException('sellerId gecersiz');
    }

    const seller = await this.prisma.seller.findFirst({
      where: {
        id: sellerId,
        businessId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!seller) {
      throw new NotFoundException('Seller bulunamadi');
    }

    return seller;
  }

  private async resolveSellerProductForOverride(
    businessId: number,
    sellerId: number,
    sellerUserId: number,
    productId: number,
  ) {
    if (!Number.isFinite(productId) || productId <= 0) {
      throw new BadRequestException('productId gecersiz');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        businessId,
        OR: [
          { ownerSellerId: sellerId },
          { ownerSellerId: null, createdByUserId: sellerUserId },
        ],
      },
      select: {
        id: true,
        stock: true,
        isPublished: true,
        publishedAt: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Seller urunu bulunamadi');
    }

    return product;
  }

  async createSellerTeamInvite(
    currentUser: JwtPayload,
    payload: CreateSellerTeamInviteDto,
  ) {
    const seller = await this.resolveSellerForActor(currentUser);
    const businessId = Number(currentUser.businessId);
    const invitedByUserId = Number(currentUser.userId);
    const targetUserId = Number(payload.targetUserId);

    if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
      throw new BadRequestException('targetUserId gecersiz');
    }
    if (targetUserId === invitedByUserId) {
      throw new BadRequestException('Kendinize davet gonderemezsiniz');
    }

    const targetUser = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        businessId,
        isActive: true,
      },
      select: {
        id: true,
        role: true,
      },
    });
    if (!targetUser) {
      throw new NotFoundException('Hedef kullanici bulunamadi');
    }
    if (targetUser.role !== 'CUSTOMER' && targetUser.role !== 'USER') {
      throw new BadRequestException(
        'Sadece CUSTOMER veya USER rolu olan kullanicilar davet edilebilir',
      );
    }

    const existingMember = await this.prisma.sellerTeamMember.findFirst({
      where: {
        businessId,
        sellerId: seller.id,
        userId: targetUserId,
        isActive: true,
      },
      select: { id: true },
    });
    if (existingMember) {
      throw new ConflictException('Kullanici zaten seller ekibinde aktif');
    }

    const now = new Date();
    const pendingInvite = await this.prisma.sellerInvite.findFirst({
      where: {
        businessId,
        sellerId: seller.id,
        targetUserId,
        status: 'PENDING',
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        status: true,
        expiresAt: true,
      },
    });
    if (pendingInvite) {
      await this.inviteDeliveryService.ensureDeliveriesForInvite(pendingInvite.id);
      await this.outboxService.enqueueEvent({
        businessId,
        aggregateType: 'SELLER_INVITE',
        aggregateId: pendingInvite.id,
        eventType: OUTBOX_EVENT_TYPES.SELLER_INVITE_CREATED,
        idempotencyKey: `invite:${pendingInvite.id}`,
        payloadJson: {
          inviteId: pendingInvite.id,
          sellerId: seller.id,
          targetUserId,
          status: pendingInvite.status,
          isExistingPending: true,
        },
      });
      return pendingInvite;
    }

    const expiresInHours = Math.max(1, Math.min(payload.expiresInHours ?? 72, 720));
    const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

    const createdInvite = await this.prisma.sellerInvite.create({
      data: {
        businessId,
        sellerId: seller.id,
        targetUserId,
        invitedByUserId,
        status: 'PENDING',
        token: randomUUID(),
        expiresAt,
      },
      select: {
        id: true,
        token: true,
        status: true,
        expiresAt: true,
      },
    });

    await this.inviteDeliveryService.ensureDeliveriesForInvite(createdInvite.id);
    await this.outboxService.enqueueEvent({
      businessId,
      aggregateType: 'SELLER_INVITE',
      aggregateId: createdInvite.id,
      eventType: OUTBOX_EVENT_TYPES.SELLER_INVITE_CREATED,
      idempotencyKey: `invite:${createdInvite.id}`,
      payloadJson: {
        inviteId: createdInvite.id,
        sellerId: seller.id,
        targetUserId,
        status: createdInvite.status,
        isExistingPending: false,
      },
    });

    return createdInvite;
  }

  async acceptSellerTeamInvite(currentUser: JwtPayload, inviteId: number) {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);
    if (!Number.isFinite(inviteId) || inviteId <= 0) {
      throw new BadRequestException('inviteId gecersiz');
    }

    const invite = await this.prisma.sellerInvite.findFirst({
      where: {
        id: inviteId,
        businessId,
      },
      select: {
        id: true,
        sellerId: true,
        targetUserId: true,
        status: true,
        expiresAt: true,
      },
    });
    if (!invite) {
      throw new NotFoundException('Davet bulunamadi');
    }
    if (invite.targetUserId !== userId) {
      throw new ForbiddenException('Bu daveti kabul etme yetkiniz yok');
    }
    if (invite.status !== 'PENDING') {
      throw new BadRequestException('Davet durumu kabul icin uygun degil');
    }

    const now = new Date();
    if (invite.expiresAt <= now) {
      await this.prisma.sellerInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Davet suresi dolmus');
    }

    const permissionsJson = this.normalizePermissions();

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.sellerInvite.update({
        where: { id: invite.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: now,
        },
      });

      const member = await tx.sellerTeamMember.upsert({
        where: {
          sellerId_userId: {
            sellerId: invite.sellerId,
            userId,
          },
        },
        update: {
          isActive: true,
          permissionsJson,
        },
        create: {
          businessId,
          sellerId: invite.sellerId,
          userId,
          invitedByUserId: null,
          isActive: true,
          permissionsJson,
        },
        select: {
          id: true,
          sellerId: true,
          userId: true,
          isActive: true,
          permissionsJson: true,
          createdAt: true,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { role: 'USER' },
      });

      return member;
    });

    return result;
  }

  async listSellerTeamMembers(currentUser: JwtPayload) {
    const seller = await this.resolveSellerForActor(currentUser);
    const businessId = Number(currentUser.businessId);

    return this.prisma.sellerTeamMember.findMany({
      where: {
        businessId,
        sellerId: seller.id,
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        sellerId: true,
        userId: true,
        isActive: true,
        permissionsJson: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
      },
    });
  }

  async listSellerTeamInvites(
    currentUser: JwtPayload,
    params?: {
      sellerId?: number;
      inviteStatus?: SellerInviteStatus;
      deliveryStatus?: InviteDeliveryStatus;
    },
  ) {
    const businessId = Number(currentUser.businessId);
    const sellerIds = await this.resolveAllowedSellerIdsForActor(
      currentUser,
      params?.sellerId,
    );

    const inviteStatus = params?.inviteStatus;
    if (
      inviteStatus &&
      !(['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED'] as const).includes(
        inviteStatus,
      )
    ) {
      throw new BadRequestException('inviteStatus gecersiz');
    }

    const deliveryStatus = params?.deliveryStatus;
    if (
      deliveryStatus &&
      !(['PENDING', 'SENT', 'RETRY', 'DEAD_LETTER'] as const).includes(
        deliveryStatus,
      )
    ) {
      throw new BadRequestException('deliveryStatus gecersiz');
    }

    return this.prisma.sellerInvite.findMany({
      where: {
        businessId,
        sellerId: { in: sellerIds },
        ...(inviteStatus ? { status: inviteStatus } : {}),
        ...(deliveryStatus
          ? {
              deliveries: {
                some: {
                  status: deliveryStatus,
                },
              },
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        sellerId: true,
        targetUserId: true,
        status: true,
        token: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
        targetUser: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        deliveries: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            channel: true,
            status: true,
            target: true,
            attemptCount: true,
            maxAttempts: true,
            nextRetryAt: true,
            lastAttemptAt: true,
            lastError: true,
            sentAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async updateSellerTeamMember(
    currentUser: JwtPayload,
    memberId: number,
    payload: UpdateSellerTeamMemberDto,
  ) {
    const seller = await this.resolveSellerForActor(currentUser);
    const businessId = Number(currentUser.businessId);

    const existing = await this.prisma.sellerTeamMember.findFirst({
      where: {
        id: memberId,
        businessId,
        sellerId: seller.id,
      },
      select: { id: true, userId: true },
    });
    if (!existing) {
      throw new NotFoundException('Seller team uyesi bulunamadi');
    }

    const data: Record<string, unknown> = {};
    if (payload.isActive !== undefined) {
      data.isActive = payload.isActive;
    }
    if (payload.permissions !== undefined) {
      data.permissionsJson = this.normalizePermissions(payload.permissions);
    }

    const updated = await this.prisma.sellerTeamMember.update({
      where: { id: existing.id },
      data,
      select: {
        id: true,
        sellerId: true,
        userId: true,
        isActive: true,
        permissionsJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (payload.isActive === false) {
      const hasAnyActiveMembership = await this.prisma.sellerTeamMember.findFirst({
        where: {
          businessId,
          userId: existing.userId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!hasAnyActiveMembership) {
        await this.prisma.user.update({
          where: { id: existing.userId },
          data: { role: 'CUSTOMER' },
        });
      }
    }

    return updated;
  }

  async createSellerProduct(currentUser: JwtPayload, payload: CreateProductDto) {
    await this.resolveSellerForActor(currentUser);
    return this.productsService.create(currentUser, payload);
  }

  async updateSellerProduct(
    currentUser: JwtPayload,
    productId: number,
    payload: UpdateProductDto,
  ) {
    await this.resolveSellerForActor(currentUser);
    return this.productsService.update(currentUser, productId, payload);
  }

  async updateSellerProductPublish(
    currentUser: JwtPayload,
    productId: number,
    isPublished: boolean,
  ) {
    await this.resolveSellerForActor(currentUser);
    return this.productsService.update(currentUser, productId, { isPublished });
  }

  async updateSellerProductStock(
    currentUser: JwtPayload,
    productId: number,
    stock: number | null | undefined,
  ) {
    await this.resolveSellerForActor(currentUser);
    if (typeof stock !== 'number' || Number.isNaN(stock)) {
      throw new BadRequestException('Stock must be a number');
    }
    return this.productsService.update(currentUser, productId, {
      stock: Math.max(Math.trunc(stock), 0),
    });
  }

  async overridePlatformSellerProductPublish(
    currentUser: JwtPayload,
    sellerId: number,
    productId: number,
    payload: AdminProductPublishForceDto,
  ) {
    const businessId = Number(currentUser.businessId);
    const reason = String(payload.reason ?? '').trim();
    if (reason.length < 3) {
      throw new BadRequestException('reason en az 3 karakter olmali');
    }

    const seller = await this.resolvePlatformSellerForOverride(currentUser, sellerId);
    const existing = await this.resolveSellerProductForOverride(
      businessId,
      seller.id,
      seller.userId,
      productId,
    );

    const updated = await this.prisma.product.update({
      where: { id: existing.id },
      data: {
        isPublished: payload.isPublished,
        publishedAt: payload.isPublished
          ? (existing.publishedAt ?? new Date())
          : null,
      },
      select: {
        id: true,
        categoryId: true,
        ownerSellerId: true,
        name: true,
        subtitle: true,
        sku: true,
        type: true,
        priceCents: true,
        costPriceCents: true,
        description: true,
        features: true,
        imageUrl: true,
        images: true,
        stock: true,
        isPublished: true,
        publishedAt: true,
        tags: true,
        seoTitle: true,
        seoDescription: true,
        isActive: true,
      },
    });

    await this.outboxService.enqueueEvent({
      businessId,
      aggregateType: 'PRODUCT',
      aggregateId: updated.id,
      eventType: OUTBOX_EVENT_TYPES.PRODUCT_PUBLISH_CHANGED,
      idempotencyKey: `product:${updated.id}:publish:${updated.isPublished ? 1 : 0}:override`,
      payloadJson: {
        productId: updated.id,
        sellerId: seller.id,
        isPublished: updated.isPublished,
        previousIsPublished: existing.isPublished,
        actorUserId: Number(currentUser.userId),
        override: true,
      },
    });

    await this.auditService.logFromActor(currentUser, {
      actionType: AUDIT_ACTION_TYPES.PUBLISH_FORCE,
      targetType: 'PRODUCT',
      targetId: updated.id,
      payloadJson: {
        source: 'platform.sellers.product.publish-force',
        reason,
        sellerId: seller.id,
        before: {
          isPublished: existing.isPublished,
          stock: existing.stock,
        },
        after: {
          isPublished: updated.isPublished,
          stock: updated.stock,
        },
      },
    });

    return updated;
  }

  async overridePlatformSellerProductStock(
    currentUser: JwtPayload,
    sellerId: number,
    productId: number,
    payload: AdminProductStockForceDto,
  ) {
    const businessId = Number(currentUser.businessId);
    const reason = String(payload.reason ?? '').trim();
    if (reason.length < 3) {
      throw new BadRequestException('reason en az 3 karakter olmali');
    }

    const seller = await this.resolvePlatformSellerForOverride(currentUser, sellerId);
    const existing = await this.resolveSellerProductForOverride(
      businessId,
      seller.id,
      seller.userId,
      productId,
    );

    const nextStock = Math.max(Math.trunc(Number(payload.stock)), 0);

    const updated = await this.prisma.product.update({
      where: { id: existing.id },
      data: {
        stock: nextStock,
        ...(nextStock <= 0
          ? {
              isPublished: false,
              publishedAt: null,
            }
          : {}),
      },
      select: {
        id: true,
        categoryId: true,
        ownerSellerId: true,
        name: true,
        subtitle: true,
        sku: true,
        type: true,
        priceCents: true,
        costPriceCents: true,
        description: true,
        features: true,
        imageUrl: true,
        images: true,
        stock: true,
        isPublished: true,
        publishedAt: true,
        tags: true,
        seoTitle: true,
        seoDescription: true,
        isActive: true,
      },
    });

    await this.auditService.logFromActor(currentUser, {
      actionType: AUDIT_ACTION_TYPES.STOCK_ADJUST_FORCE,
      targetType: 'PRODUCT',
      targetId: updated.id,
      payloadJson: {
        source: 'platform.sellers.product.stock-force',
        reason,
        sellerId: seller.id,
        before: {
          stock: existing.stock,
          isPublished: existing.isPublished,
        },
        after: {
          stock: updated.stock,
          isPublished: updated.isPublished,
        },
      },
    });

    return updated;
  }

  async listSellerCustomers(
    currentUser: JwtPayload,
    params?: {
      q?: string;
      page?: number;
      pageSize?: number;
      sellerId?: number;
    },
  ): Promise<{
    data: Array<{
      id: number;
      name: string;
      phone: string;
      balance: number;
      creditLimitCents: number | null;
      creditBlockPolicy: CreditBlockPolicy;
      outstandingDebtCents: number;
      lastLedgerAt: Date | null;
      createdAt: Date;
    }>;
    meta: PaginationMeta;
  }> {
    const businessId = Number(currentUser.businessId);
    const sellerIds = await this.resolveAllowedSellerIdsForActor(
      currentUser,
      params?.sellerId,
    );

    if (!sellerIds.length) {
      return {
        data: [],
        meta: buildPaginationMeta(0, 1, clampPageSize(Number(params?.pageSize ?? 20))),
      };
    }

    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));

    const q = (params?.q ?? '').trim();
    const qNumber = q && /^[0-9]+$/.test(q) ? Number(q) : null;

    const relationScope: Prisma.CustomerWhereInput = {
      OR: [
        {
          orders: {
            some: {
              businessId,
              deletedAt: null,
              sellerId: { in: sellerIds },
            },
          },
        },
        {
          ledgerEntries: {
            some: {
              businessId,
              sellerId: { in: sellerIds },
            },
          },
        },
      ],
    };

    const where: Prisma.CustomerWhereInput = {
      businessId,
      deletedAt: null,
      AND: [
        relationScope,
        ...(q
          ? [
              {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { phone: { contains: q, mode: 'insensitive' } },
                  ...(qNumber ? [{ id: qNumber }] : []),
                ],
              } as Prisma.CustomerWhereInput,
            ]
          : []),
      ],
    };

    const total = await this.prisma.customer.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const rows = await this.prisma.customer.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
        creditLimitCents: true,
        creditBlockPolicy: true,
        createdAt: true,
      },
    });

    const customerIds = rows.map((row) => row.id);
    if (!customerIds.length) {
      return { data: [], meta };
    }

    const [ledgerGroups, ledgerLatestGroups] = await Promise.all([
      this.prisma.customerLedgerEntry.groupBy({
        by: ['customerId', 'type'],
        where: {
          businessId,
          sellerId: { in: sellerIds },
          customerId: { in: customerIds },
        },
        _sum: { amountCents: true },
      }),
      this.prisma.customerLedgerEntry.groupBy({
        by: ['customerId'],
        where: {
          businessId,
          sellerId: { in: sellerIds },
          customerId: { in: customerIds },
        },
        _max: { createdAt: true },
      }),
    ]);

    const debtByCustomer = new Map<number, number>();
    for (const group of ledgerGroups) {
      const prev = debtByCustomer.get(group.customerId) ?? 0;
      const amount = Number(group._sum.amountCents ?? 0);
      debtByCustomer.set(
        group.customerId,
        group.type === 'DEBIT' ? prev + amount : prev - amount,
      );
    }

    const lastLedgerByCustomer = new Map(
      ledgerLatestGroups.map((group) => [
        group.customerId,
        group._max.createdAt ?? null,
      ] as const),
    );

    return {
      data: rows.map((row) => ({
        ...row,
        outstandingDebtCents: Math.max(debtByCustomer.get(row.id) ?? 0, 0),
        lastLedgerAt: lastLedgerByCustomer.get(row.id) ?? null,
      })),
      meta,
    };
  }

  async getSellerCustomerLedger(
    currentUser: JwtPayload,
    customerId: number,
    params?: { page?: number; pageSize?: number; sellerId?: number },
  ): Promise<{
    customer: {
      id: number;
      name: string;
      phone: string;
      creditLimitCents: number | null;
      creditBlockPolicy: CreditBlockPolicy;
    };
    data: Array<{
      id: number;
      sellerId: number;
      orderId: number | null;
      type: 'DEBIT' | 'CREDIT';
      sourceType: string;
      amountCents: number;
      balanceAfterCents: number;
      createdByUserId: number | null;
      createdAt: Date;
    }>;
    meta: PaginationMeta;
    summary: {
      totalDebitCents: number;
      totalCreditCents: number;
      outstandingDebtCents: number;
    };
  }> {
    const businessId = Number(currentUser.businessId);
    const sellerIds = await this.resolveAllowedSellerIdsForActor(
      currentUser,
      params?.sellerId,
    );

    if (!Number.isFinite(customerId) || customerId <= 0) {
      throw new BadRequestException('customerId gecersiz');
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        businessId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        creditLimitCents: true,
        creditBlockPolicy: true,
      },
    });
    if (!customer) {
      throw new NotFoundException('Musteri bulunamadi');
    }

    const hasScopeAccess = await this.prisma.customerLedgerEntry.findFirst({
      where: {
        businessId,
        customerId,
        sellerId: { in: sellerIds },
      },
      select: { id: true },
    });

    if (!hasScopeAccess) {
      const hasOrderScope = await this.prisma.order.findFirst({
        where: {
          businessId,
          customerId,
          deletedAt: null,
          sellerId: { in: sellerIds },
        },
        select: { id: true },
      });
      if (!hasOrderScope) {
        throw new ForbiddenException('Access denied');
      }
    }

    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 30));

    const where = {
      businessId,
      customerId,
      sellerId: { in: sellerIds },
    };

    const total = await this.prisma.customerLedgerEntry.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const [rows, debitAggregate, creditAggregate] = await Promise.all([
      this.prisma.customerLedgerEntry.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
        select: {
          id: true,
          sellerId: true,
          orderId: true,
          type: true,
          sourceType: true,
          amountCents: true,
          balanceAfterCents: true,
          createdByUserId: true,
          createdAt: true,
        },
      }),
      this.prisma.customerLedgerEntry.aggregate({
        where: { ...where, type: 'DEBIT' },
        _sum: { amountCents: true },
      }),
      this.prisma.customerLedgerEntry.aggregate({
        where: { ...where, type: 'CREDIT' },
        _sum: { amountCents: true },
      }),
    ]);

    const totalDebitCents = Number(debitAggregate._sum.amountCents ?? 0);
    const totalCreditCents = Number(creditAggregate._sum.amountCents ?? 0);

    return {
      customer,
      data: rows.map((row) => ({
        ...row,
        type: row.type as 'DEBIT' | 'CREDIT',
      })),
      meta,
      summary: {
        totalDebitCents,
        totalCreditCents,
        outstandingDebtCents: Math.max(totalDebitCents - totalCreditCents, 0),
      },
    };
  }

  async updateSellerCustomerCreditPolicy(
    currentUser: JwtPayload,
    customerId: number,
    payload: {
      creditLimitCents?: number | null;
      creditBlockPolicy?: CreditBlockPolicy;
      sellerId?: number;
    },
  ) {
    const businessId = Number(currentUser.businessId);
    const sellerIds = await this.resolveAllowedSellerIdsForActor(
      currentUser,
      payload.sellerId,
    );

    if (!Number.isFinite(customerId) || customerId <= 0) {
      throw new BadRequestException('customerId gecersiz');
    }

    const hasScope = await this.prisma.order.findFirst({
      where: {
        businessId,
        customerId,
        deletedAt: null,
        sellerId: { in: sellerIds },
      },
      select: { id: true },
    });

    if (!hasScope) {
      const hasLedgerScope = await this.prisma.customerLedgerEntry.findFirst({
        where: {
          businessId,
          customerId,
          sellerId: { in: sellerIds },
        },
        select: { id: true },
      });
      if (!hasLedgerScope) {
        throw new ForbiddenException('Access denied');
      }
    }

    const nextLimit =
      payload.creditLimitCents === undefined
        ? undefined
        : payload.creditLimitCents === null
          ? null
          : Math.max(Math.trunc(Number(payload.creditLimitCents)), 0);

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(payload.creditLimitCents !== undefined
          ? { creditLimitCents: nextLimit }
          : {}),
        ...(payload.creditBlockPolicy
          ? { creditBlockPolicy: payload.creditBlockPolicy }
          : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        creditLimitCents: true,
        creditBlockPolicy: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async createSellerApplication(
    currentUser: JwtPayload,
    payload: CreateSellerApplicationDto,
  ): Promise<{
    id: number;
    userId: number;
    slug: string;
    displayName: string;
    description?: string | null;
    logoUrl?: string | null;
    status: 'PENDING' | 'APPROVED';
    createdAt: Date;
    updatedAt: Date;
  }> {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    if (!Number.isFinite(businessId) || businessId <= 0) {
      throw new ForbiddenException('Access denied');
    }
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new ForbiddenException('Access denied');
    }

    const displayName = String(payload.displayName ?? '').trim();
    if (!displayName) {
      throw new BadRequestException('displayName zorunludur');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        businessId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi');
    }

    const existing = await this.prisma.seller.findFirst({
      where: {
        businessId,
        userId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    const targetSlug = await this.resolveUniqueSellerSlug(
      businessId,
      payload.slug?.trim() || displayName,
      existing?.id,
    );

    const saved = existing
      ? await this.prisma.seller.update({
          where: { id: existing.id },
          data: {
            slug: targetSlug,
            displayName,
            description: payload.description?.trim() || null,
            logoUrl: payload.logoUrl?.trim() || null,
            isActive: existing.isActive,
          },
          select: {
            id: true,
            userId: true,
            slug: true,
            displayName: true,
            description: true,
            logoUrl: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : await this.prisma.seller.create({
          data: {
            businessId,
            userId,
            slug: targetSlug,
            displayName,
            description: payload.description?.trim() || null,
            logoUrl: payload.logoUrl?.trim() || null,
            isActive: false,
          },
          select: {
            id: true,
            userId: true,
            slug: true,
            displayName: true,
            description: true,
            logoUrl: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        });

    return {
      ...saved,
      status: saved.isActive ? 'APPROVED' : 'PENDING',
    };
  }

  async getMySellerApplication(currentUser: JwtPayload): Promise<{
    id: number;
    userId: number;
    slug: string;
    displayName: string;
    description?: string | null;
    logoUrl?: string | null;
    isActive: boolean;
    status: 'PENDING' | 'APPROVED';
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    if (!Number.isFinite(businessId) || businessId <= 0) {
      throw new ForbiddenException('Access denied');
    }
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new ForbiddenException('Access denied');
    }

    const seller = await this.prisma.seller.findFirst({
      where: {
        businessId,
        userId,
      },
      select: {
        id: true,
        userId: true,
        slug: true,
        displayName: true,
        description: true,
        logoUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!seller) return null;

    return {
      ...seller,
      status: seller.isActive ? 'APPROVED' : 'PENDING',
    };
  }

  async listPlatformSellers(
    currentUser: JwtPayload,
    params?: { isActive?: boolean; page?: number; pageSize?: number },
  ): Promise<{
    data: Array<{
      id: number;
      userId: number;
      slug: string;
      displayName: string;
      description?: string | null;
      logoUrl?: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>;
    meta: PaginationMeta;
  }> {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);
    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));

    const where: { businessId: number; isActive?: boolean } = { businessId };
    if (typeof params?.isActive === 'boolean') {
      where.isActive = params.isActive;
    }

    const total = await this.prisma.seller.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const data = await this.prisma.seller.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      skip,
      take,
      select: {
        id: true,
        userId: true,
        slug: true,
        displayName: true,
        description: true,
        logoUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { data, meta };
  }

  async listPlatformSellerApplications(
    currentUser: JwtPayload,
    params?: { page?: number; pageSize?: number },
  ): Promise<{
    data: Array<{
      id: number;
      userId: number;
      slug: string;
      displayName: string;
      description?: string | null;
      logoUrl?: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>;
    meta: PaginationMeta;
  }> {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);
    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));

    const where = { businessId, isActive: false };
    const total = await this.prisma.seller.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const data = await this.prisma.seller.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
      select: {
        id: true,
        userId: true,
        slug: true,
        displayName: true,
        description: true,
        logoUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { data, meta };
  }

  async getPlatformSellerDetail(
    currentUser: JwtPayload,
    id: number,
  ): Promise<{
    seller: {
      id: number;
      userId: number;
      slug: string;
      displayName: string;
      description?: string | null;
      logoUrl?: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
    stats: {
      productCount: number;
    };
  }> {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);

    const seller = await this.prisma.seller.findFirst({
      where: { id, businessId },
      select: {
        id: true,
        userId: true,
        slug: true,
        displayName: true,
        description: true,
        logoUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const productCount = await this.prisma.product.count({
      where: {
        businessId,
        OR: [
          { ownerSellerId: seller.id },
          { ownerSellerId: null, createdByUserId: seller.userId },
        ],
      },
    });

    return { seller, stats: { productCount } };
  }

  async setPlatformSellerActive(
    currentUser: JwtPayload,
    id: number,
    isActive: boolean,
  ): Promise<{
    id: number;
    isActive: boolean;
    updatedAt: Date;
  }> {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);

    const existing = await this.prisma.seller.findFirst({
      where: { id, businessId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Seller not found');
    }

    const updated = await this.prisma.seller.update({
      where: { id },
      data: { isActive },
      select: { id: true, isActive: true, updatedAt: true },
    });

    return updated;
  }

  private async resolvePublicBusiness() {
    const publicBusinessId = Number(process.env.PUBLIC_BUSINESS_ID);

    const businessCandidate =
      Number.isFinite(publicBusinessId) && publicBusinessId > 0
        ? await this.prisma.business.findUnique({
            where: { id: publicBusinessId },
          })
        : null;

    const business = businessCandidate
      ? businessCandidate
      : await this.prisma.business.findFirst({
          orderBy: { id: 'asc' },
        });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return business;
  }

  async listPublicDirectory(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<PublicSellerDirectoryResponse> {
    const business = await this.resolvePublicBusiness();
    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));

    const total = await this.prisma.seller.count({
      where: {
        businessId: business.id,
        isActive: true,
      },
    });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const sellers = await this.prisma.seller.findMany({
      where: {
        businessId: business.id,
        isActive: true,
      },
      orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
      skip,
      take,
      select: {
        id: true,
        slug: true,
        displayName: true,
        description: true,
        logoUrl: true,
        userId: true,
      },
    });

    if (sellers.length === 0) {
      return { data: [], meta };
    }

    const sellerById = new Map<
      number,
      {
        id: number;
        slug: string;
        displayName: string;
        description?: string | null;
        logoUrl?: string | null;
        userId: number;
      }
    >();
    const sellerIdByUserId = new Map<number, number>();
    for (const seller of sellers) {
      sellerById.set(seller.id, seller);
      sellerIdByUserId.set(seller.userId, seller.id);
    }

    const products = await this.prisma.product.findMany({
      where: {
        businessId: business.id,
        isActive: true,
        isPublished: true,
        OR: [
          { ownerSellerId: { in: sellers.map((row) => row.id) } },
          {
            ownerSellerId: null,
            createdByUserId: { in: sellers.map((row) => row.userId) },
          },
        ],
      },
      select: {
        categoryId: true,
        ownerSellerId: true,
        createdByUserId: true,
      },
    });

    const categoryIds = Array.from(
      new Set(
        products
          .map((row) => row.categoryId)
          .filter((value): value is number => Number.isFinite(value as number)),
      ),
    );
    const categories =
      categoryIds.length > 0
        ? await this.prisma.category.findMany({
            where: {
              businessId: business.id,
              id: { in: categoryIds },
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              slug: true,
              orderIndex: true,
            },
          })
        : [];
    const categoryById = new Map<
      number,
      { id: number; name: string; slug: string; orderIndex: number }
    >();
    for (const category of categories) {
      categoryById.set(category.id, category);
    }

    const stats = new Map<
      number,
      {
        productCount: number;
        categoryCounts: Map<number, number>;
      }
    >();
    for (const seller of sellers) {
      stats.set(seller.id, {
        productCount: 0,
        categoryCounts: new Map<number, number>(),
      });
    }

    for (const row of products) {
      const ownerSellerId =
        typeof row.ownerSellerId === 'number' && row.ownerSellerId > 0
          ? row.ownerSellerId
          : null;
      const resolvedSellerId =
        ownerSellerId ??
        sellerIdByUserId.get(Number(row.createdByUserId)) ??
        null;
      if (!resolvedSellerId || !sellerById.has(resolvedSellerId)) continue;

      const sellerStats = stats.get(resolvedSellerId);
      if (!sellerStats) continue;

      sellerStats.productCount += 1;

      const categoryId =
        typeof row.categoryId === 'number' && row.categoryId > 0
          ? row.categoryId
          : null;
      if (!categoryId || !categoryById.has(categoryId)) continue;

      sellerStats.categoryCounts.set(
        categoryId,
        (sellerStats.categoryCounts.get(categoryId) ?? 0) + 1,
      );
    }

    const data: PublicSellerDirectoryItem[] = sellers.map((seller) => {
      const sellerStats = stats.get(seller.id) ?? {
        productCount: 0,
        categoryCounts: new Map<number, number>(),
      };

      const categoryRows = Array.from(sellerStats.categoryCounts.entries())
        .map(([categoryId, productCount]) => {
          const category = categoryById.get(categoryId);
          if (!category) return null;
          return {
            id: category.id,
            name: category.name,
            slug: category.slug,
            productCount,
            orderIndex: category.orderIndex,
          };
        })
        .filter(
          (
            row,
          ): row is {
            id: number;
            name: string;
            slug: string;
            productCount: number;
            orderIndex: number;
          } => Boolean(row),
        )
        .sort(
          (a, b) =>
            a.orderIndex - b.orderIndex ||
            a.name.localeCompare(b.name, 'tr'),
        )
        .map(({ orderIndex: _orderIndex, ...rest }) => rest);

      return {
        id: seller.id,
        slug: seller.slug,
        displayName: seller.displayName,
        description: seller.description,
        logoUrl: seller.logoUrl,
        productCount: sellerStats.productCount,
        categories: categoryRows,
      };
    });

    return { data, meta };
  }

  async findOnePublicBySlug(
    slug: string,
    params?: { page?: number; pageSize?: number; categoryId?: number },
  ): Promise<PublicSellerProfileResponse> {
    const business = await this.resolvePublicBusiness();

    const seller = await this.prisma.seller.findFirst({
      where: {
        businessId: business.id,
        slug,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        displayName: true,
        description: true,
        logoUrl: true,
        userId: true,
      },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));
    const selectedCategoryId =
      typeof params?.categoryId === 'number' && params.categoryId > 0
        ? Math.trunc(params.categoryId)
        : null;

    const baseWhere: Prisma.ProductWhereInput = {
      businessId: business.id,
      isActive: true,
      isPublished: true,
      OR: [
        { ownerSellerId: seller.id },
        { ownerSellerId: null, createdByUserId: seller.userId },
      ],
    };
    const where: Prisma.ProductWhereInput = selectedCategoryId
      ? {
          ...baseWhere,
          categoryId: selectedCategoryId,
        }
      : baseWhere;

    const total = await this.prisma.product.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        categoryId: true,
        name: true,
        subtitle: true,
        sku: true,
        type: true,
        priceCents: true,
        description: true,
        features: true,
        imageUrl: true,
        images: true,
        stock: true,
        tags: true,
        seoTitle: true,
        seoDescription: true,
        isActive: true,
      },
    });

    const availableCategoryRows = await this.prisma.product.groupBy({
      by: ['categoryId'],
      where: baseWhere,
      _count: {
        categoryId: true,
      },
    });
    const availableCategoryIds = availableCategoryRows
      .map((row) => row.categoryId)
      .filter((value): value is number => Number.isFinite(value as number));
    const availableCategories =
      availableCategoryIds.length > 0
        ? await this.prisma.category.findMany({
            where: {
              businessId: business.id,
              id: { in: availableCategoryIds },
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              slug: true,
              orderIndex: true,
            },
          })
        : [];
    const availableCategoryById = new Map<
      number,
      { id: number; name: string; slug: string; orderIndex: number }
    >();
    for (const row of availableCategories) {
      availableCategoryById.set(row.id, row);
    }
    const categories: PublicSellerCategorySummary[] = availableCategoryRows
      .map((row) => {
        const categoryId = row.categoryId;
        if (typeof categoryId !== 'number' || categoryId <= 0) return null;
        const category = availableCategoryById.get(categoryId);
        if (!category) return null;
        return {
          id: category.id,
          name: category.name,
          slug: category.slug,
          productCount: row._count.categoryId ?? 0,
          orderIndex: category.orderIndex,
        };
      })
      .filter(
        (
          row,
        ): row is {
          id: number;
          name: string;
          slug: string;
          productCount: number;
          orderIndex: number;
        } => Boolean(row),
      )
      .sort(
        (a, b) =>
          a.orderIndex - b.orderIndex || a.name.localeCompare(b.name, 'tr'),
      )
      .map(({ orderIndex: _orderIndex, ...rest }) => rest);

    return {
      seller: {
        id: seller.id,
        slug: seller.slug,
        displayName: seller.displayName,
        description: seller.description,
        logoUrl: seller.logoUrl,
      },
      categories,
      products: {
        data: products,
        meta,
      },
    };
  }
}
