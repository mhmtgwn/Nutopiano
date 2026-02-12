import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

export interface ProductSummary {
  id: number;
  categoryId?: number | null;
  name: string;
  subtitle?: string | null;
  sku?: string | null;
  type: string;
  priceCents: number;
  description?: string | null;
  features?: string[];
  imageUrl?: string | null;
  images?: string[];
  stock?: number | null;
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  isActive: boolean;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertCategoryScoped(currentUser: JwtPayload, categoryId: number) {
    const businessId = Number(currentUser.businessId);

    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        businessId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }

  async create(currentUser: JwtPayload, payload: CreateProductDto): Promise<ProductSummary> {
    const businessId = Number(currentUser.businessId);
    const createdByUserId = Number(currentUser.userId);
    const priceCents = Number(payload.price);

    if (payload.categoryId) {
      await this.assertCategoryScoped(currentUser, payload.categoryId);
    }

    const images = payload.images ?? undefined;
    const imageUrl =
      payload.imageUrl ?? (images && images.length > 0 ? images[0] : undefined);

    const product = await this.prisma.product.create({
      data: {
        businessId,
        createdByUserId,
        categoryId: payload.categoryId,
        name: payload.name,
        subtitle: payload.subtitle,
        sku: payload.sku,
        type: payload.type,
        priceCents,
        description: payload.description,
        features: payload.features,
        imageUrl,
        images,
        stock: payload.stock,
        tags: payload.tags,
        seoTitle: payload.seoTitle,
        seoDescription: payload.seoDescription,
      },
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

    return product;
  }

  async findAll(currentUser: JwtPayload): Promise<ProductSummary[]> {
    const businessId = Number(currentUser.businessId);

    return this.prisma.product.findMany({
      where: {
        businessId,
        isActive: true,
      },
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
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findAllPublic(): Promise<ProductSummary[]> {
    const publicBusinessId = Number(process.env.PUBLIC_BUSINESS_ID);

    const business = Number.isFinite(publicBusinessId) && publicBusinessId > 0
      ? await this.prisma.business.findUnique({ where: { id: publicBusinessId } })
      : await this.prisma.business.findFirst({
          orderBy: {
            id: 'asc',
          },
        });

    if (!business) {
      return [];
    }

    return this.prisma.product.findMany({
      where: {
        businessId: business.id,
        isActive: true,
      },
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
      orderBy: {
        name: 'asc',
      },
    });
  }

  private async findByIdScoped(currentUser: JwtPayload, id: number) {
    const businessId = Number(currentUser.businessId);

    const product = await this.prisma.product.findFirst({
      where: {
        id,
        businessId,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findOne(currentUser: JwtPayload, id: number): Promise<ProductSummary> {
    const product = await this.findByIdScoped(currentUser, id);
    const {
      id: productId,
      categoryId,
      name,
      subtitle,
      sku,
      type,
      priceCents,
      description,
      features,
      imageUrl,
      images,
      stock,
      tags,
      seoTitle,
      seoDescription,
      isActive,
    } = product;
    return {
      id: productId,
      categoryId,
      name,
      subtitle,
      sku,
      type,
      priceCents,
      description,
      features,
      imageUrl,
      images,
      stock,
      tags,
      seoTitle,
      seoDescription,
      isActive,
    };
  }

  async findOnePublic(id: number): Promise<ProductSummary> {
    const publicBusinessId = Number(process.env.PUBLIC_BUSINESS_ID);

    const business = Number.isFinite(publicBusinessId) && publicBusinessId > 0
      ? await this.prisma.business.findUnique({ where: { id: publicBusinessId } })
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
      },
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

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(currentUser: JwtPayload, id: number, payload: UpdateProductDto): Promise<ProductSummary> {
    await this.findByIdScoped(currentUser, id);

    const data: Prisma.ProductUncheckedUpdateInput & { categoryId?: number | null } = {};

    if (payload.categoryId !== undefined) {
      if (payload.categoryId !== null) {
        await this.assertCategoryScoped(currentUser, payload.categoryId);
      }

      data.categoryId = payload.categoryId;
    }
    if (payload.name) data.name = payload.name;
    if (payload.subtitle !== undefined) data.subtitle = payload.subtitle;
    if (payload.sku) data.sku = payload.sku;
    if (payload.type) data.type = payload.type;
    if (payload.price !== undefined) {
      data.priceCents = Number(payload.price);
    }
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.features !== undefined) data.features = payload.features;
    if (payload.imageUrl !== undefined) data.imageUrl = payload.imageUrl;
    if (payload.images !== undefined) {
      data.images = payload.images;
      if (payload.imageUrl === undefined && payload.images && payload.images.length > 0) {
        data.imageUrl = payload.images[0];
      }
    }
    if (payload.stock !== undefined) data.stock = payload.stock;
    if (payload.tags !== undefined) data.tags = payload.tags;
    if (payload.seoTitle !== undefined) data.seoTitle = payload.seoTitle;
    if (payload.seoDescription !== undefined) {
      data.seoDescription = payload.seoDescription;
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data,
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

    return updated;
  }

  async remove(currentUser: JwtPayload, id: number): Promise<ProductSummary> {
    await this.findByIdScoped(currentUser, id);

    const removed = await this.prisma.product.update({
      where: { id },
      data: {
        isActive: false,
      },
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

    return removed;
  }
}
