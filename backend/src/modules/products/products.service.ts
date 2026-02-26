import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, ProductType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ImportProductsCsvDto } from './dto/import-products-csv.dto';
import {
  buildPaginationMeta,
  clampPage,
  clampPageSize,
  paginationToSkipTake,
  type PaginationMeta,
} from '../../common/utils/pagination';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTION_TYPES } from '../audit/audit.constants';
import { OUTBOX_EVENT_TYPES } from '../outbox/outbox.constants';
import { OutboxService } from '../outbox/outbox.service';

export interface ProductSummary {
  id: number;
  categoryId?: number | null;
  ownerSellerId?: number | null;
  name: string;
  subtitle?: string | null;
  sku?: string | null;
  type: string;
  priceCents: number;
  costPriceCents?: number;
  description?: string | null;
  features?: string[];
  imageUrl?: string | null;
  images?: string[];
  stock?: number | null;
  isPublished?: boolean;
  publishedAt?: Date | null;
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  isActive: boolean;
  variants?: ProductVariantSummary[];
}

export interface ProductVariantSummary {
  id: number;
  productId: number;
  name: string;
  sku?: string | null;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  priceCents: number;
  stock?: number | null;
  isActive: boolean;
}

export interface PublicProductReviewSummary {
  id: number;
  rating: number;
  comment?: string | null;
  customerName: string;
  createdAt: Date;
  updatedAt: Date;
}

type CsvImportError = {
  line: number;
  message: string;
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
  ) {}

  private csvEscape(value: unknown): string {
    if (value === null || value === undefined) return '';
    const text = String(value);
    if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  private parseCsvRows(csvText: string): Array<Record<string, string>> {
    const input = String(csvText ?? '').replace(/^\uFEFF/, '');
    const rows: string[][] = [];
    let currentField = '';
    let currentRow: string[] = [];
    let inQuotes = false;

    for (let i = 0; i < input.length; i += 1) {
      const char = input[i];

      if (inQuotes) {
        if (char === '"') {
          if (input[i + 1] === '"') {
            currentField += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          currentField += char;
        }
        continue;
      }

      if (char === '"') {
        inQuotes = true;
        continue;
      }

      if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        continue;
      }

      if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        continue;
      }

      if (char === '\r') {
        continue;
      }

      currentField += char;
    }

    currentRow.push(currentField);
    rows.push(currentRow);

    if (!rows.length) {
      return [];
    }

    const headerRow = rows[0].map((value) => value.trim().toLowerCase());
    if (!headerRow.length || headerRow.every((h) => !h)) {
      return [];
    }

    const output: Array<Record<string, string>> = [];
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const raw = rows[rowIndex];
      const record: Record<string, string> = {};
      for (let col = 0; col < headerRow.length; col += 1) {
        const key = headerRow[col];
        if (!key) continue;
        record[key] = (raw[col] ?? '').trim();
      }
      output.push(record);
    }

    return output;
  }

  private parseOptionalInt(value?: string): number | null {
    const normalized = String(value ?? '').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return null;
    return Math.trunc(parsed);
  }

  private parsePipeList(value?: string): string[] {
    const normalized = String(value ?? '').trim();
    if (!normalized) return [];
    return normalized
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private parseOptionalBoolean(value?: string): boolean | null {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return null;
    if (['1', 'true', 'yes', 'evet'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'hayir', 'hayır'].includes(normalized)) return false;
    return null;
  }

  private normalizeImageUrls(images?: string[], imageUrl?: string) {
    const seen = new Set<string>();
    const normalized: string[] = [];

    for (const raw of images ?? []) {
      const value = String(raw ?? '').trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      normalized.push(value);
    }

    const primary = String(imageUrl ?? '').trim();
    if (primary && !seen.has(primary)) {
      normalized.unshift(primary);
    }

    return { images: normalized, primary: primary || normalized[0] || null };
  }

  private async syncProductImages(params: {
    businessId: number;
    productId: number;
    images: string[];
    primaryUrl?: string | null;
  }) {
    const productImage = (this.prisma as any).productImage;
    await productImage.deleteMany({
      where: {
        businessId: params.businessId,
        productId: params.productId,
      },
    });

    if (!params.images.length) {
      return;
    }

    await productImage.createMany({
      data: params.images.map((url, index) => ({
        businessId: params.businessId,
        productId: params.productId,
        url,
        orderIndex: index,
        isPrimary: params.primaryUrl ? params.primaryUrl === url : index === 0,
      })),
    });
  }

  private async resolveSellerProfileId(
    businessId: number,
    userId: number,
  ): Promise<number | null> {
    const seller = await this.prisma.seller.findFirst({
      where: { businessId, userId, isActive: true },
      select: { id: true },
    });
    return seller?.id ?? null;
  }

  private async resolveUserTeamSellerIds(
    businessId: number,
    userId: number,
  ): Promise<number[]> {
    const rows = await this.prisma.sellerTeamMember.findMany({
      where: {
        businessId,
        userId,
        isActive: true,
      },
      select: { sellerId: true },
    });

    return Array.from(new Set(rows.map((row) => row.sellerId)));
  }

  private async resolveAllowedSellerIdsForActor(
    currentUser: JwtPayload,
  ): Promise<number[]> {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    if (currentUser.role === 'SELLER') {
      const sellerId = await this.resolveSellerProfileId(businessId, userId);
      if (!sellerId) {
        throw new ForbiddenException('Seller profili bulunamadi');
      }
      return [sellerId];
    }

    if (currentUser.role === 'USER') {
      const sellerIds = await this.resolveUserTeamSellerIds(businessId, userId);
      if (!sellerIds.length) {
        throw new ForbiddenException('Aktif seller yetkisi bulunamadi');
      }
      return sellerIds;
    }

    return [];
  }

  private async resolveOwnerSellerIdForWrite(
    currentUser: JwtPayload,
    payloadOwnerSellerId?: number,
  ): Promise<number | null> {
    const requested =
      typeof payloadOwnerSellerId === 'number' && payloadOwnerSellerId > 0
        ? Math.trunc(payloadOwnerSellerId)
        : null;

    if (currentUser.role === 'SELLER') {
      const sellerIds = await this.resolveAllowedSellerIdsForActor(currentUser);
      const ownSellerId = sellerIds[0];
      if (requested && requested !== ownSellerId) {
        throw new ForbiddenException('Sadece kendi magazaniz icin urun yazabilirsiniz');
      }
      return ownSellerId;
    }

    if (currentUser.role === 'USER') {
      const sellerIds = await this.resolveAllowedSellerIdsForActor(currentUser);
      if (requested) {
        if (!sellerIds.includes(requested)) {
          throw new ForbiddenException('Bu seller icin urun yazma yetkiniz yok');
        }
        return requested;
      }
      if (sellerIds.length === 1) {
        return sellerIds[0];
      }
      throw new BadRequestException(
        'Birden fazla seller yetkisi var. ownerSellerId belirtin',
      );
    }

    return requested;
  }

  private async applyManageScopeWhere(
    currentUser: JwtPayload,
    baseWhere: Prisma.ProductWhereInput,
  ): Promise<Prisma.ProductWhereInput> {
    const userId = Number(currentUser.userId);

    if (currentUser.role === 'SELLER') {
      const [sellerId] = await this.resolveAllowedSellerIdsForActor(currentUser);
      return {
        AND: [
          baseWhere,
          {
            OR: [
              { ownerSellerId: sellerId },
              { ownerSellerId: null, createdByUserId: userId },
            ],
          },
        ],
      };
    }

    if (currentUser.role === 'USER') {
      const sellerIds = await this.resolveAllowedSellerIdsForActor(currentUser);
      return {
        AND: [baseWhere, { ownerSellerId: { in: sellerIds } }],
      };
    }

    return baseWhere;
  }

  private validatePublishState(
    data: { stock?: number | null; isPublished?: boolean },
    nextIsPublished?: boolean,
  ) {
    const publish = typeof nextIsPublished === 'boolean' ? nextIsPublished : data.isPublished;
    if (!publish) return;
    const stock = typeof data.stock === 'number' ? data.stock : null;
    if (stock === null || stock <= 0) {
      throw new UnprocessableEntityException(
        'Stok 0 veya daha az oldugu icin urun yayina acilamaz',
      );
    }
  }

  async exportProductsCsv(currentUser: JwtPayload): Promise<string> {
    const businessId = Number(currentUser.businessId);

    const rows = await this.prisma.product.findMany({
      where: { businessId },
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
      orderBy: { id: 'asc' },
    });

    const headers = [
      'id',
      'categoryId',
      'name',
      'subtitle',
      'sku',
      'type',
      'priceCents',
      'description',
      'features',
      'imageUrl',
      'images',
      'stock',
      'tags',
      'seoTitle',
      'seoDescription',
      'isActive',
    ];

    const lines = [headers.join(',')];

    for (const row of rows) {
      const lineValues = [
        row.id,
        row.categoryId,
        row.name,
        row.subtitle ?? '',
        row.sku ?? '',
        row.type,
        row.priceCents,
        row.description ?? '',
        (row.features ?? []).join('|'),
        row.imageUrl ?? '',
        (row.images ?? []).join('|'),
        row.stock ?? '',
        (row.tags ?? []).join('|'),
        row.seoTitle ?? '',
        row.seoDescription ?? '',
        row.isActive ? 'true' : 'false',
      ];
      lines.push(lineValues.map((value) => this.csvEscape(value)).join(','));
    }

    return lines.join('\n');
  }

  async importProductsCsv(
    currentUser: JwtPayload,
    payload: ImportProductsCsvDto,
  ): Promise<{
    totalRows: number;
    created: number;
    updated: number;
    skipped: number;
    errors: CsvImportError[];
  }> {
    const businessId = Number(currentUser.businessId);
    const createdByUserId = Number(currentUser.userId);

    if (!payload?.csv || !String(payload.csv).trim()) {
      throw new BadRequestException('CSV icerigi zorunludur.');
    }

    const upsertBy = payload.upsertBy ?? 'sku';
    const rows = this.parseCsvRows(payload.csv);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: CsvImportError[] = [];

    for (let index = 0; index < rows.length; index += 1) {
      const line = index + 2;
      const row = rows[index];

      const hasData = Object.values(row).some((value) => String(value).trim().length > 0);
      if (!hasData) {
        skipped += 1;
        continue;
      }

      try {
        const rowId = this.parseOptionalInt(row.id);
        const rowSku = String(row.sku ?? '').trim();

        let existing: { id: number } | null = null;
        if (upsertBy === 'id' && rowId && rowId > 0) {
          existing = await this.prisma.product.findFirst({
            where: {
              id: rowId,
              businessId,
            },
            select: { id: true },
          });
        } else if (upsertBy === 'sku' && rowSku) {
          existing = await this.prisma.product.findFirst({
            where: {
              businessId,
              sku: rowSku,
            },
            select: { id: true },
          });
        }

        const rawCategoryId = this.parseOptionalInt(row.categoryid ?? row.category_id);
        const rawName = String(row.name ?? '').trim();
        const rawType = String(row.type ?? '')
          .trim()
          .toUpperCase();
        const rawPrice = this.parseOptionalInt(row.pricecents ?? row.price);
        const rawStock = this.parseOptionalInt(row.stock);
        const rawIsActive = this.parseOptionalBoolean(row.isactive ?? row.active);

        const categoryId =
          rawCategoryId && rawCategoryId > 0 ? Math.trunc(rawCategoryId) : null;
        const priceCents =
          rawPrice !== null && rawPrice >= 0 ? Math.trunc(rawPrice) : null;
        const stock =
          rawStock !== null && rawStock >= 0 ? Math.trunc(rawStock) : null;
        const productType = rawType
          ? (rawType as ProductType)
          : null;

        if (productType && !Object.values(ProductType).includes(productType)) {
          throw new BadRequestException(`Gecersiz type degeri: ${rawType}`);
        }

        if (categoryId) {
          const category = await this.prisma.category.findFirst({
            where: {
              id: categoryId,
              businessId,
            },
            select: { id: true },
          });
          if (!category) {
            throw new NotFoundException(`Kategori bulunamadi: ${categoryId}`);
          }
        }

        if (existing) {
          const data: Prisma.ProductUncheckedUpdateInput = {};

          if (categoryId) data.categoryId = categoryId;
          if (Object.prototype.hasOwnProperty.call(row, 'name') && rawName) {
            data.name = rawName;
          }
          if (Object.prototype.hasOwnProperty.call(row, 'subtitle')) {
            data.subtitle = String(row.subtitle ?? '').trim() || null;
          }
          if (Object.prototype.hasOwnProperty.call(row, 'sku')) {
            data.sku = rowSku || null;
          }
          if (productType) data.type = productType;
          if (priceCents !== null) data.priceCents = priceCents;
          if (Object.prototype.hasOwnProperty.call(row, 'description')) {
            data.description = String(row.description ?? '').trim() || null;
          }
          if (Object.prototype.hasOwnProperty.call(row, 'features')) {
            data.features = this.parsePipeList(row.features);
          }
          if (Object.prototype.hasOwnProperty.call(row, 'imageurl')) {
            data.imageUrl = String(row.imageurl ?? '').trim() || null;
          }
          if (Object.prototype.hasOwnProperty.call(row, 'images')) {
            data.images = this.parsePipeList(row.images);
          }
          if (Object.prototype.hasOwnProperty.call(row, 'stock')) {
            data.stock = stock;
          }
          if (Object.prototype.hasOwnProperty.call(row, 'tags')) {
            data.tags = this.parsePipeList(row.tags);
          }
          if (Object.prototype.hasOwnProperty.call(row, 'seotitle')) {
            data.seoTitle = String(row.seotitle ?? '').trim() || null;
          }
          if (Object.prototype.hasOwnProperty.call(row, 'seodescription')) {
            data.seoDescription = String(row.seodescription ?? '').trim() || null;
          }
          if (rawIsActive !== null) {
            data.isActive = rawIsActive;
          }

          await this.prisma.product.update({
            where: { id: existing.id },
            data,
          });
          updated += 1;
          continue;
        }

        if (!categoryId) {
          throw new BadRequestException('Yeni urun icin categoryId zorunludur.');
        }
        if (!rawName) {
          throw new BadRequestException('Yeni urun icin name zorunludur.');
        }
        if (!productType) {
          throw new BadRequestException('Yeni urun icin type zorunludur.');
        }
        if (priceCents === null) {
          throw new BadRequestException('Yeni urun icin priceCents zorunludur.');
        }

        await this.prisma.product.create({
          data: {
            businessId,
            createdByUserId,
            categoryId,
            name: rawName,
            subtitle: String(row.subtitle ?? '').trim() || undefined,
            sku: rowSku || undefined,
            type: productType,
            priceCents,
            description: String(row.description ?? '').trim() || undefined,
            features: this.parsePipeList(row.features),
            imageUrl: String(row.imageurl ?? '').trim() || undefined,
            images: this.parsePipeList(row.images),
            stock,
            tags: this.parsePipeList(row.tags),
            seoTitle: String(row.seotitle ?? '').trim() || undefined,
            seoDescription: String(row.seodescription ?? '').trim() || undefined,
            isActive: rawIsActive ?? true,
          },
        });

        created += 1;
      } catch (error) {
        errors.push({
          line,
          message:
            error instanceof Error
              ? error.message
              : 'Bilinmeyen import hatasi',
        });
      }
    }

    return {
      totalRows: rows.length,
      created,
      updated,
      skipped,
      errors,
    };
  }

  private async assertCategoryScoped(
    currentUser: JwtPayload,
    categoryId: number,
    ownerSellerId?: number | null,
  ) {
    const businessId = Number(currentUser.businessId);

    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        businessId,
        isActive: true,
        ...(typeof ownerSellerId === 'number'
          ? {
              OR: [
                { scopeType: 'GLOBAL' as const },
                { sellerId: ownerSellerId, scopeType: 'SELLER_STORE' as const },
              ],
            }
          : {}),
      },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }

  async create(
    currentUser: JwtPayload,
    payload: CreateProductDto,
  ): Promise<ProductSummary> {
    const businessId = Number(currentUser.businessId);
    const createdByUserId = Number(currentUser.userId);
    const priceCents = Number(payload.price);
    const ownerSellerId = await this.resolveOwnerSellerIdForWrite(
      currentUser,
      payload.ownerSellerId,
    );

    this.validatePublishState(
      { stock: payload.stock, isPublished: payload.isPublished },
      payload.isPublished,
    );

    // categoryId is now required
    await this.assertCategoryScoped(currentUser, payload.categoryId, ownerSellerId);

    const normalizedImages = this.normalizeImageUrls(payload.images, payload.imageUrl);
    const images =
      normalizedImages.images.length > 0 ? normalizedImages.images : undefined;
    const imageUrl = normalizedImages.primary ?? undefined;

    const product = await this.prisma.product.create({
      data: {
        businessId,
        createdByUserId,
        categoryId: payload.categoryId,
        ownerSellerId: ownerSellerId ?? undefined,
        name: payload.name,
        subtitle: payload.subtitle,
        sku: payload.sku,
        type: payload.type,
        priceCents,
        costPriceCents: Math.max(Math.trunc(Number(payload.costPriceCents ?? 0)), 0),
        description: payload.description,
        features: payload.features,
        imageUrl,
        images,
        stock: payload.stock,
        isPublished: Boolean(payload.isPublished),
        publishedAt: payload.isPublished ? new Date() : null,
        tags: payload.tags,
        seoTitle: payload.seoTitle,
        seoDescription: payload.seoDescription,
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

    await this.syncProductImages({
      businessId,
      productId: product.id,
      images: normalizedImages.images,
      primaryUrl: normalizedImages.primary,
    });

    return product;
  }

  async listReviewsPublic(
    productId: number,
  ): Promise<PublicProductReviewSummary[]> {
    const publicBusinessId = Number(process.env.PUBLIC_BUSINESS_ID);

    const business =
      Number.isFinite(publicBusinessId) && publicBusinessId > 0
        ? await this.prisma.business.findUnique({
            where: { id: publicBusinessId },
          })
        : await this.prisma.business.findFirst({
            orderBy: {
              id: 'asc',
            },
          });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        businessId: business.id,
        isActive: true,
      },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.productReview
      .findMany({
        where: {
          businessId: business.id,
          productId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              name: true,
            },
          },
        },
      })
      .then((rows) =>
        rows.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          customerName: r.customer.name,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
      );
  }

  async findAll(
    currentUser: JwtPayload,
    params?: { page?: number; pageSize?: number },
  ): Promise<{ data: ProductSummary[]; meta: PaginationMeta }> {
    const businessId = Number(currentUser.businessId);

    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));
    const whereBase: Prisma.ProductWhereInput = {
      businessId,
      isActive: true,
    };
    const where = await this.applyManageScopeWhere(currentUser, whereBase);

    const total = await this.prisma.product.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const data = await this.prisma.product.findMany({
      where,
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
      orderBy: {
        name: 'asc',
      },
      skip,
      take,
    });

    return { data, meta };
  }

  async findAllPublic(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{ data: ProductSummary[]; meta: PaginationMeta }> {
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
          orderBy: {
            id: 'asc',
          },
        });

    if (!business) {
      const meta = buildPaginationMeta(0, 1, 20);
      return { data: [], meta };
    }

    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));
    const where = {
      businessId: business.id,
      isActive: true,
      isPublished: true,
    };

    const total = await this.prisma.product.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const data = await this.prisma.product.findMany({
      where,
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
      orderBy: {
        name: 'asc',
      },
      skip,
      take,
    });

    return { data, meta };
  }

  private async findByIdScoped(currentUser: JwtPayload, id: number) {
    const businessId = Number(currentUser.businessId);
    const scopedWhere = await this.applyManageScopeWhere(currentUser, {
      id,
      businessId,
    });

    const product = await this.prisma.product.findFirst({ where: scopedWhere });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private async findVariantByIdScoped(
    currentUser: JwtPayload,
    productId: number,
    variantId: number,
  ) {
    const businessId = Number(currentUser.businessId);

    const variant = await (this.prisma as any).productVariant.findFirst({
      where: {
        id: variantId,
        businessId,
        productId,
      },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    return variant;
  }

  async createVariant(
    currentUser: JwtPayload,
    productId: number,
    payload: CreateProductVariantDto,
  ): Promise<ProductVariantSummary> {
    const businessId = Number(currentUser.businessId);
    await this.findByIdScoped(currentUser, productId);

    return (this.prisma as any).productVariant.create({
      data: {
        businessId,
        productId,
        name: payload.name,
        sku: payload.sku,
        color: payload.color,
        size: payload.size,
        material: payload.material,
        priceCents: payload.priceCents,
        stock: payload.stock,
      },
      select: {
        id: true,
        productId: true,
        name: true,
        sku: true,
        color: true,
        size: true,
        material: true,
        priceCents: true,
        stock: true,
        isActive: true,
      },
    });
  }

  async updateVariant(
    currentUser: JwtPayload,
    productId: number,
    variantId: number,
    payload: UpdateProductVariantDto,
  ): Promise<ProductVariantSummary> {
    await this.findByIdScoped(currentUser, productId);
    await this.findVariantByIdScoped(currentUser, productId, variantId);

    const data: Record<string, unknown> = {};
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.sku !== undefined) data.sku = payload.sku;
    if (payload.color !== undefined) data.color = payload.color;
    if (payload.size !== undefined) data.size = payload.size;
    if (payload.material !== undefined) data.material = payload.material;
    if (payload.priceCents !== undefined) data.priceCents = payload.priceCents;
    if (payload.stock !== undefined) data.stock = payload.stock;
    if (payload.isActive !== undefined) data.isActive = payload.isActive;

    return (this.prisma as any).productVariant.update({
      where: { id: variantId },
      data,
      select: {
        id: true,
        productId: true,
        name: true,
        sku: true,
        color: true,
        size: true,
        material: true,
        priceCents: true,
        stock: true,
        isActive: true,
      },
    });
  }

  async removeVariant(
    currentUser: JwtPayload,
    productId: number,
    variantId: number,
  ): Promise<ProductVariantSummary> {
    await this.findByIdScoped(currentUser, productId);
    await this.findVariantByIdScoped(currentUser, productId, variantId);

    return (this.prisma as any).productVariant.update({
      where: { id: variantId },
      data: { isActive: false },
      select: {
        id: true,
        productId: true,
        name: true,
        sku: true,
        color: true,
        size: true,
        material: true,
        priceCents: true,
        stock: true,
        isActive: true,
      },
    });
  }

  async listVariants(
    currentUser: JwtPayload,
    productId: number,
    params?: { includeInactive?: boolean },
  ): Promise<ProductVariantSummary[]> {
    await this.findByIdScoped(currentUser, productId);
    const businessId = Number(currentUser.businessId);

    return (this.prisma as any).productVariant.findMany({
      where: {
        businessId,
        productId,
        ...(params?.includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        productId: true,
        name: true,
        sku: true,
        color: true,
        size: true,
        material: true,
        priceCents: true,
        stock: true,
        isActive: true,
      },
    });
  }

  async listVariantsPublic(productId: number): Promise<ProductVariantSummary[]> {
    const publicBusinessId = Number(process.env.PUBLIC_BUSINESS_ID);
    const business =
      Number.isFinite(publicBusinessId) && publicBusinessId > 0
        ? await this.prisma.business.findUnique({
            where: { id: publicBusinessId },
          })
        : await this.prisma.business.findFirst({
            orderBy: { id: 'asc' },
          });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        businessId: business.id,
        isActive: true,
      },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return (this.prisma as any).productVariant.findMany({
      where: {
        businessId: business.id,
        productId: product.id,
        isActive: true,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        productId: true,
        name: true,
        sku: true,
        color: true,
        size: true,
        material: true,
        priceCents: true,
        stock: true,
        isActive: true,
      },
    });
  }

  async findOne(currentUser: JwtPayload, id: number): Promise<ProductSummary> {
    const product = await this.findByIdScoped(currentUser, id);
    const variants = await (this.prisma as any).productVariant.findMany({
      where: {
        businessId: Number(currentUser.businessId),
        productId: id,
        isActive: true,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        productId: true,
        name: true,
        sku: true,
        color: true,
        size: true,
        material: true,
        priceCents: true,
        stock: true,
        isActive: true,
      },
    });
    const {
      id: productId,
      categoryId,
      ownerSellerId,
      name,
      subtitle,
      sku,
      type,
      priceCents,
      costPriceCents,
      description,
      features,
      imageUrl,
      images,
      stock,
      isPublished,
      publishedAt,
      tags,
      seoTitle,
      seoDescription,
      isActive,
    } = product;
    return {
      id: productId,
      categoryId,
      ownerSellerId,
      name,
      subtitle,
      sku,
      type,
      priceCents,
      costPriceCents,
      description,
      features,
      imageUrl,
      images,
      stock,
      isPublished,
      publishedAt,
      tags,
      seoTitle,
      seoDescription,
      isActive,
      variants,
    };
  }

  async findOnePublic(id: number): Promise<ProductSummary> {
    const publicBusinessId = Number(process.env.PUBLIC_BUSINESS_ID);

    const business =
      Number.isFinite(publicBusinessId) && publicBusinessId > 0
        ? await this.prisma.business.findUnique({
            where: { id: publicBusinessId },
          })
        : await this.prisma.business.findFirst({
            orderBy: {
              id: 'asc',
            },
          });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        id,
        businessId: business.id,
        isPublished: true,
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

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    currentUser: JwtPayload,
    id: number,
    payload: UpdateProductDto,
  ): Promise<ProductSummary> {
    const existing = await this.findByIdScoped(currentUser, id);
    const isCriticalPublishChange = payload.isPublished !== undefined;
    const isCriticalStockChange = payload.stock !== undefined;

    if (
      currentUser.role === 'ADMIN' &&
      (isCriticalPublishChange || isCriticalStockChange)
    ) {
      throw new ForbiddenException(
        'ADMIN varsayilan read-only. publish-force veya stock-adjust-force override endpointini kullanin.',
      );
    }

    const data: Prisma.ProductUncheckedUpdateInput = {};
    const nextOwnerSellerId =
      payload.ownerSellerId !== undefined
        ? await this.resolveOwnerSellerIdForWrite(currentUser, payload.ownerSellerId)
        : existing.ownerSellerId ?? null;

    if (payload.categoryId !== undefined) {
      if (payload.categoryId === null) {
        // categoryId is required; do not allow clearing
        throw new NotFoundException('Category not found');
      }

      await this.assertCategoryScoped(
        currentUser,
        payload.categoryId,
        nextOwnerSellerId,
      );
      data.categoryId = payload.categoryId;
    }
    if (payload.ownerSellerId !== undefined) {
      data.ownerSellerId = nextOwnerSellerId ?? null;
    }
    if (payload.name) data.name = payload.name;
    if (payload.subtitle !== undefined) data.subtitle = payload.subtitle;
    if (payload.sku) data.sku = payload.sku;
    if (payload.type) data.type = payload.type;
    if (payload.price !== undefined) {
      data.priceCents = Number(payload.price);
    }
    if (payload.costPriceCents !== undefined) {
      data.costPriceCents = Math.max(Math.trunc(Number(payload.costPriceCents)), 0);
    }
    if (payload.description !== undefined)
      data.description = payload.description;
    if (payload.features !== undefined) data.features = payload.features;
    if (payload.imageUrl !== undefined) data.imageUrl = payload.imageUrl;
    if (payload.images !== undefined) {
      data.images = payload.images;
      if (
        payload.imageUrl === undefined &&
        payload.images &&
        payload.images.length > 0
      ) {
        data.imageUrl = payload.images[0];
      }
    }
    if (payload.stock !== undefined) data.stock = payload.stock;
    if (payload.tags !== undefined) data.tags = payload.tags;
    if (payload.seoTitle !== undefined) data.seoTitle = payload.seoTitle;
    if (payload.seoDescription !== undefined) {
      data.seoDescription = payload.seoDescription;
    }

    const nextStock =
      payload.stock !== undefined
        ? payload.stock
        : typeof existing.stock === 'number'
          ? existing.stock
          : null;
    const requestedPublish =
      payload.isPublished !== undefined ? payload.isPublished : existing.isPublished;
    const effectivePublish =
      payload.isPublished === undefined &&
      payload.stock !== undefined &&
      (payload.stock === null || payload.stock <= 0)
        ? false
        : requestedPublish;

    this.validatePublishState(
      {
        stock: nextStock,
        isPublished: effectivePublish,
      },
      effectivePublish,
    );

    if (payload.isPublished !== undefined) {
      data.isPublished = payload.isPublished;
      data.publishedAt =
        payload.isPublished && !existing.isPublished ? new Date() : payload.isPublished ? existing.publishedAt : null;
    }

    if (
      payload.stock !== undefined &&
      (payload.stock === null || payload.stock <= 0) &&
      requestedPublish
    ) {
      data.isPublished = false;
      data.publishedAt = null;
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data,
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

    const normalizedImages = this.normalizeImageUrls(
      updated.images ?? [],
      updated.imageUrl ?? undefined,
    );
    await this.syncProductImages({
      businessId: Number(currentUser.businessId),
      productId: id,
      images: normalizedImages.images,
      primaryUrl: normalizedImages.primary,
    });

    if (isCriticalPublishChange && updated.isPublished !== existing.isPublished) {
      await this.outboxService.enqueueEvent({
        businessId: Number(currentUser.businessId),
        aggregateType: 'PRODUCT',
        aggregateId: updated.id,
        eventType: OUTBOX_EVENT_TYPES.PRODUCT_PUBLISH_CHANGED,
        idempotencyKey: `product:${updated.id}:publish:${updated.isPublished ? 1 : 0}`,
        payloadJson: {
          productId: updated.id,
          isPublished: updated.isPublished,
          previousIsPublished: existing.isPublished,
          actorUserId: Number(currentUser.userId),
        },
      });
    }

    if (currentUser.role === 'SUPER_ADMIN') {
      if (isCriticalPublishChange && updated.isPublished !== existing.isPublished) {
        await this.auditService.logFromActor(currentUser, {
          actionType: AUDIT_ACTION_TYPES.PUBLISH_FORCE,
          targetType: 'PRODUCT',
          targetId: updated.id,
          payloadJson: {
            source: 'products.update',
            reason: 'super-admin-normal-endpoint',
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
      }

      if (isCriticalStockChange && updated.stock !== existing.stock) {
        await this.auditService.logFromActor(currentUser, {
          actionType: AUDIT_ACTION_TYPES.STOCK_ADJUST_FORCE,
          targetType: 'PRODUCT',
          targetId: updated.id,
          payloadJson: {
            source: 'products.update',
            reason: 'super-admin-normal-endpoint',
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
      }
    }

    return updated;
  }

  async remove(currentUser: JwtPayload, id: number): Promise<ProductSummary> {
    await this.findByIdScoped(currentUser, id);

    const removed = await this.prisma.product.update({
      where: { id },
      data: {
        isActive: false,
        isPublished: false,
        publishedAt: null,
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

    return removed;
  }

  async searchProducts(params: {
    query?: string;
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    skip?: number;
    take?: number;
  }): Promise<{
    data: ProductSummary[];
    total: number;
    skip: number;
    take: number;
  }> {
    const publicBusinessId = Number(process.env.PUBLIC_BUSINESS_ID);

    const business =
      Number.isFinite(publicBusinessId) && publicBusinessId > 0
        ? await this.prisma.business.findUnique({
            where: { id: publicBusinessId },
          })
        : await this.prisma.business.findFirst({
            orderBy: { id: 'asc' },
          });

    if (!business) {
      return {
        data: [],
        total: 0,
        skip: params.skip ?? 0,
        take: params.take ?? 20,
      };
    }

    // Build where clause
    const whereConditions: Prisma.ProductWhereInput = {
      businessId: business.id,
      isActive: true,
      isPublished: true,
    };

    // Text search
    if (params.query) {
      const searchTerm = params.query.toLowerCase();
      whereConditions.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { subtitle: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { tags: { hasSome: [searchTerm] } },
      ];
    }

    // Category filter
    if (params.categoryId) {
      whereConditions.categoryId = params.categoryId;
    }

    // Price range filter
    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      whereConditions.priceCents = {};
      if (params.minPrice !== undefined) {
        whereConditions.priceCents.gte = params.minPrice;
      }
      if (params.maxPrice !== undefined) {
        whereConditions.priceCents.lte = params.maxPrice;
      }
    }

    // Get total count
    const total = await this.prisma.product.count({ where: whereConditions });

    // Build order by
    let orderBy: Prisma.ProductOrderByWithRelationInput = { name: 'asc' };
    switch (params.sort) {
      case 'price-asc':
        orderBy = { priceCents: 'asc' };
        break;
      case 'price-desc':
        orderBy = { priceCents: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'name':
        orderBy = { name: 'asc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Fetch products
    const products = await this.prisma.product.findMany({
      where: whereConditions,
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
      orderBy,
      skip: params.skip ?? 0,
      take: params.take ?? 20,
    });

    return {
      data: products,
      total,
      skip: params.skip ?? 0,
      take: params.take ?? 20,
    };
  }
}
