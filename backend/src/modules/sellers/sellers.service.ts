import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  buildPaginationMeta,
  clampPage,
  clampPageSize,
  paginationToSkipTake,
  type PaginationMeta,
} from '@common/utils/pagination';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../auth/types/jwt-payload';

export interface PublicSellerSummary {
  id: number;
  slug: string;
  displayName: string;
  description?: string | null;
  logoUrl?: string | null;
}

export interface PublicSellerProfileResponse {
  seller: PublicSellerSummary;
  products: {
    data: any[];
    meta: PaginationMeta;
  };
}

@Injectable()
export class SellersService {
  constructor(private readonly prisma: PrismaService) {}

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
        createdByUserId: seller.userId,
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

  async findOnePublicBySlug(
    slug: string,
    params?: { page?: number; pageSize?: number },
  ): Promise<PublicSellerProfileResponse> {
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
    const where = {
      businessId: business.id,
      isActive: true,
      createdByUserId: seller.userId,
    };

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

    return {
      seller: {
        id: seller.id,
        slug: seller.slug,
        displayName: seller.displayName,
        description: seller.description,
        logoUrl: seller.logoUrl,
      },
      products: {
        data: products,
        meta,
      },
    };
  }
}
