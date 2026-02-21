import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  buildPaginationMeta,
  clampPage,
  clampPageSize,
  paginationToSkipTake,
  type PaginationMeta,
} from '../../common/utils/pagination';

export interface CategorySummary {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
  isActive: boolean;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date | null;
}

export interface CategoryTree extends CategorySummary {
  children?: CategoryTree[];
}

export interface PublicCategorySummary {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
  orderIndex: number;
}

export interface PublicCategoryTree extends PublicCategorySummary {
  children?: PublicCategoryTree[];
}

type CategoryTreeRow = Omit<CategorySummary, 'archivedAt'> & {
  archivedAt: Date | null;
};
type PublicCategoryTreeRow = PublicCategorySummary & {
  parentId: number | null;
};

export interface PublicCategoryDetail extends PublicCategorySummary {
  products: Array<{
    id: number;
    categoryId?: number | null;
    name: string;
    sku?: string | null;
    type: string;
    priceCents: number;
    description?: string | null;
    imageUrl?: string | null;
    stock?: number | null;
    tags?: string[];
    seoTitle?: string | null;
    seoDescription?: string | null;
  }>;
}

const slugify = (input: string) => {
  const value = input
    .trim()
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return value;
};

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPaginated(
    currentUser: JwtPayload,
    params?: { page?: number; pageSize?: number },
  ): Promise<{ data: CategorySummary[]; meta: PaginationMeta }> {
    const businessId = Number(currentUser.businessId);
    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));

    const where = {
      businessId,
      isActive: true,
    };

    const total = await this.prisma.category.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const data = await this.prisma.category.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        isActive: true,
        orderIndex: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
      },
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
      skip,
      take,
    });

    return { data, meta };
  }

  async create(
    currentUser: JwtPayload,
    payload: CreateCategoryDto,
  ): Promise<CategorySummary> {
    const businessId = Number(currentUser.businessId);
    const createdByUserId = Number(currentUser.userId);

    const slug = payload.slug?.trim()
      ? slugify(payload.slug)
      : slugify(payload.name);

    const existing = await this.prisma.category.findFirst({
      where: {
        businessId,
        slug,
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        'Bu slug zaten kullanılıyor. Lütfen farklı bir slug seçin.',
      );
    }

    // Validate parent category exists if parentId is provided
    if (payload.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: {
          id: payload.parentId,
          businessId,
        },
        select: { id: true },
      });

      if (!parent) {
        throw new BadRequestException('Üst kategori bulunamadı.');
      }
    }

    return this.prisma.category.create({
      data: {
        businessId,
        createdByUserId: createdByUserId,
        name: payload.name,
        slug,
        parentId: payload.parentId ?? undefined,
        isActive: payload.isActive ?? true,
        orderIndex: payload.orderIndex ?? 0,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        isActive: true,
        orderIndex: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
      },
    });
  }

  async findAll(currentUser: JwtPayload): Promise<CategorySummary[]> {
    const businessId = Number(currentUser.businessId);

    return this.prisma.category.findMany({
      where: {
        businessId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        isActive: true,
        orderIndex: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
      },
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
    });
  }

  async getCategoryTree(currentUser: JwtPayload): Promise<CategoryTree[]> {
    const businessId = Number(currentUser.businessId);

    const categories = await this.prisma.category.findMany({
      where: {
        businessId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        isActive: true,
        orderIndex: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
      },
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
    });

    // Build tree structure
    const buildTree = (
      items: CategoryTreeRow[],
      parentId: number | null = null,
    ): CategoryTree[] => {
      return items
        .filter((item) => item.parentId === parentId)
        .map((item) => ({
          ...item,
          children: buildTree(items, item.id),
        }));
    };

    return buildTree(categories as CategoryTreeRow[]);
  }

  async findAllPublic(): Promise<PublicCategorySummary[]> {
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
      return [];
    }

    return this.prisma.category.findMany({
      where: {
        businessId: business.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        orderIndex: true,
      },
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
    });
  }

  async getCategoryTreePublic(): Promise<PublicCategoryTree[]> {
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
      return [];
    }

    const categories = await this.prisma.category.findMany({
      where: {
        businessId: business.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        orderIndex: true,
      },
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
    });

    // Build tree structure recursively
    const buildTree = (
      items: PublicCategoryTreeRow[],
      parentId: number | null = null,
    ): PublicCategoryTree[] => {
      return items
        .filter((item) => item.parentId === parentId)
        .map((item) => ({
          ...item,
          children: buildTree(items, item.id),
        }));
    };

    return buildTree(categories as PublicCategoryTreeRow[]);
  }

  async findOnePublicBySlug(slug: string): Promise<PublicCategoryDetail> {
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
      throw new NotFoundException('Business not found');
    }

    const category = await this.prisma.category.findFirst({
      where: {
        businessId: business.id,
        slug,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        orderIndex: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const products = await this.prisma.product.findMany({
      where: {
        businessId: business.id,
        isActive: true,
        categoryId: category.id,
      },
      select: {
        id: true,
        categoryId: true,
        name: true,
        sku: true,
        type: true,
        priceCents: true,
        description: true,
        imageUrl: true,
        stock: true,
        tags: true,
        seoTitle: true,
        seoDescription: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      ...category,
      products,
    };
  }

  private async findByIdScoped(currentUser: JwtPayload, id: number) {
    const businessId = Number(currentUser.businessId);

    const category = await this.prisma.category.findFirst({
      where: {
        id,
        businessId,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(
    currentUser: JwtPayload,
    id: number,
    payload: UpdateCategoryDto,
  ): Promise<CategorySummary> {
    await this.findByIdScoped(currentUser, id);

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.slug !== undefined ? { slug: slugify(payload.slug) } : {}),
        ...(payload.isActive !== undefined
          ? { isActive: payload.isActive }
          : {}),
        ...(payload.orderIndex !== undefined
          ? { orderIndex: payload.orderIndex }
          : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        orderIndex: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
      },
    });
  }

  async remove(currentUser: JwtPayload, id: number): Promise<CategorySummary> {
    const category = await this.findByIdScoped(currentUser, id);

    const linkedActiveProductsCount = await this.prisma.product.count({
      where: {
        businessId: category.businessId,
        categoryId: id,
        isActive: true,
      },
    });

    if (linkedActiveProductsCount > 0) {
      throw new BadRequestException(
        `Bu kategoriye bağlı aktif ürünler var (${linkedActiveProductsCount}). Önce ürünleri başka bir kategoriye taşıyın veya kategori bilgisini kaldırın.`,
      );
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        orderIndex: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
      },
    });
  }
}
