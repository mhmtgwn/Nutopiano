import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import {
  buildPaginationMeta,
  clampPage,
  clampPageSize,
  paginationToSkipTake,
  type PaginationMeta,
} from '../../common/utils/pagination';

export interface CustomerSummary {
  id: number;
  name: string;
  phone: string;
  balance: number;
}

export interface CustomerPortalProfile {
  user: {
    id: string;
    name?: string;
    phone?: string;
    email?: string;
    role: string;
    businessId?: string | null;
  };
  customer: CustomerSummary;
}

export interface CustomerAddressSummary {
  id: number;
  title: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  district: string;
  postalCode?: string | null;
  country: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerFavoriteProductSummary {
  product: {
    id: number;
    name: string;
    subtitle?: string | null;
    priceCents: number;
    imageUrl?: string | null;
    stock?: number | null;
    tags?: string[];
    isActive: boolean;
  };
  createdAt: Date;
}

export interface CustomerProductReviewSummary {
  id: number;
  productId: number;
  rating: number;
  comment?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerPreferenceSummary {
  allowSms: boolean;
  allowEmail: boolean;
  allowMarketing: boolean;
  kvkkConsent: boolean;
  kvkkConsentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireCustomerPortalRecord(currentUser: JwtPayload) {
    if (currentUser.role !== 'CUSTOMER') {
      throw new ForbiddenException('Access denied');
    }

    const customer = await this.findOrCreateForUser(currentUser);
    return customer;
  }

  async listCustomerAddresses(
    currentUser: JwtPayload,
  ): Promise<CustomerAddressSummary[]> {
    const businessId = Number(currentUser.businessId);
    const customer = await this.requireCustomerPortalRecord(currentUser);

    return this.prisma.customerAddress.findMany({
      where: {
        businessId,
        customerId: customer.id,
      },
      orderBy: [
        { isDefaultShipping: 'desc' },
        { isDefaultBilling: 'desc' },
        { updatedAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        fullName: true,
        phone: true,
        line1: true,
        line2: true,
        city: true,
        district: true,
        postalCode: true,
        country: true,
        isDefaultShipping: true,
        isDefaultBilling: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createCustomerAddress(
    currentUser: JwtPayload,
    payload: {
      title: string;
      fullName: string;
      phone: string;
      line1: string;
      line2?: string;
      city: string;
      district: string;
      postalCode?: string;
      country?: string;
    },
  ): Promise<CustomerAddressSummary> {
    const businessId = Number(currentUser.businessId);
    const customer = await this.requireCustomerPortalRecord(currentUser);

    const created = await this.prisma.customerAddress.create({
      data: {
        businessId,
        customerId: customer.id,
        title: payload.title,
        fullName: payload.fullName,
        phone: payload.phone,
        line1: payload.line1,
        line2: payload.line2?.trim() || undefined,
        city: payload.city,
        district: payload.district,
        postalCode: payload.postalCode?.trim() || undefined,
        country: payload.country?.trim() || undefined,
      },
      select: {
        id: true,
        title: true,
        fullName: true,
        phone: true,
        line1: true,
        line2: true,
        city: true,
        district: true,
        postalCode: true,
        country: true,
        isDefaultShipping: true,
        isDefaultBilling: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return created;
  }

  private async requireAccessibleCustomerAddress(
    currentUser: JwtPayload,
    id: number,
  ) {
    const businessId = Number(currentUser.businessId);
    const customer = await this.requireCustomerPortalRecord(currentUser);

    const address = await this.prisma.customerAddress.findFirst({
      where: {
        id,
        businessId,
        customerId: customer.id,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return { address, customerId: customer.id, businessId };
  }

  async updateCustomerAddress(
    currentUser: JwtPayload,
    id: number,
    payload: Partial<{
      title: string;
      fullName: string;
      phone: string;
      line1: string;
      line2?: string | null;
      city: string;
      district: string;
      postalCode?: string | null;
      country: string;
    }>,
  ): Promise<CustomerAddressSummary> {
    await this.requireAccessibleCustomerAddress(currentUser, id);

    const updated = await this.prisma.customerAddress.update({
      where: { id },
      data: {
        title: payload.title,
        fullName: payload.fullName,
        phone: payload.phone,
        line1: payload.line1,
        line2: payload.line2 === undefined ? undefined : payload.line2,
        city: payload.city,
        district: payload.district,
        postalCode:
          payload.postalCode === undefined ? undefined : payload.postalCode,
        country: payload.country,
      },
      select: {
        id: true,
        title: true,
        fullName: true,
        phone: true,
        line1: true,
        line2: true,
        city: true,
        district: true,
        postalCode: true,
        country: true,
        isDefaultShipping: true,
        isDefaultBilling: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async listCustomerFavorites(
    currentUser: JwtPayload,
  ): Promise<CustomerFavoriteProductSummary[]> {
    const businessId = Number(currentUser.businessId);
    const customer = await this.requireCustomerPortalRecord(currentUser);

    const rows = await this.prisma.customerFavorite.findMany({
      where: {
        businessId,
        customerId: customer.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        createdAt: true,
        product: {
          select: {
            id: true,
            name: true,
            subtitle: true,
            priceCents: true,
            imageUrl: true,
            stock: true,
            tags: true,
            isActive: true,
          },
        },
      },
    });

    return rows;
  }

  async addCustomerFavorite(
    currentUser: JwtPayload,
    productId: number,
  ): Promise<{ productId: number }> {
    const businessId = Number(currentUser.businessId);
    const customer = await this.requireCustomerPortalRecord(currentUser);

    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        businessId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.customerFavorite.upsert({
      where: {
        businessId_customerId_productId: {
          businessId,
          customerId: customer.id,
          productId,
        },
      },
      create: {
        businessId,
        customerId: customer.id,
        productId,
      },
      update: {},
    });

    return { productId };
  }

  async listCustomerReviews(
    currentUser: JwtPayload,
  ): Promise<CustomerProductReviewSummary[]> {
    const businessId = Number(currentUser.businessId);
    const customer = await this.requireCustomerPortalRecord(currentUser);

    return this.prisma.productReview.findMany({
      where: {
        businessId,
        customerId: customer.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        productId: true,
        rating: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getCustomerPreferences(
    currentUser: JwtPayload,
  ): Promise<CustomerPreferenceSummary> {
    const businessId = Number(currentUser.businessId);
    const customer = await this.requireCustomerPortalRecord(currentUser);

    const existing = await this.prisma.customerPreference.findFirst({
      where: {
        businessId,
        customerId: customer.id,
      },
      select: {
        allowSms: true,
        allowEmail: true,
        allowMarketing: true,
        kvkkConsent: true,
        kvkkConsentAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (existing) return existing;

    return this.prisma.customerPreference.create({
      data: {
        businessId,
        customerId: customer.id,
      },
      select: {
        allowSms: true,
        allowEmail: true,
        allowMarketing: true,
        kvkkConsent: true,
        kvkkConsentAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateCustomerPreferences(
    currentUser: JwtPayload,
    payload: Partial<{
      allowSms: boolean;
      allowEmail: boolean;
      allowMarketing: boolean;
      kvkkConsent: boolean;
    }>,
  ): Promise<CustomerPreferenceSummary> {
    const businessId = Number(currentUser.businessId);
    const customer = await this.requireCustomerPortalRecord(currentUser);

    const existing = await this.prisma.customerPreference.findFirst({
      where: {
        businessId,
        customerId: customer.id,
      },
      select: {
        kvkkConsent: true,
      },
    });

    const nextKvkkConsent = payload.kvkkConsent;
    const shouldStampKvkkConsentAt =
      typeof nextKvkkConsent === 'boolean' &&
      nextKvkkConsent &&
      !existing?.kvkkConsent;

    return this.prisma.customerPreference.upsert({
      where: {
        customerId: customer.id,
      },
      create: {
        businessId,
        customerId: customer.id,
        allowSms: payload.allowSms ?? true,
        allowEmail: payload.allowEmail ?? true,
        allowMarketing: payload.allowMarketing ?? false,
        kvkkConsent: payload.kvkkConsent ?? false,
        kvkkConsentAt: payload.kvkkConsent ? new Date() : undefined,
      },
      update: {
        allowSms: payload.allowSms,
        allowEmail: payload.allowEmail,
        allowMarketing: payload.allowMarketing,
        kvkkConsent: payload.kvkkConsent,
        kvkkConsentAt: shouldStampKvkkConsentAt ? new Date() : undefined,
      },
      select: {
        allowSms: true,
        allowEmail: true,
        allowMarketing: true,
        kvkkConsent: true,
        kvkkConsentAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async upsertCustomerReview(
    currentUser: JwtPayload,
    payload: {
      productId: number;
      rating: number;
      comment?: string;
    },
  ): Promise<CustomerProductReviewSummary> {
    const businessId = Number(currentUser.businessId);
    const customer = await this.requireCustomerPortalRecord(currentUser);

    const product = await this.prisma.product.findFirst({
      where: {
        id: payload.productId,
        businessId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.productReview.upsert({
      where: {
        businessId_customerId_productId: {
          businessId,
          customerId: customer.id,
          productId: payload.productId,
        },
      },
      create: {
        businessId,
        customerId: customer.id,
        productId: payload.productId,
        rating: Number(payload.rating),
        comment: payload.comment?.trim() || undefined,
      },
      update: {
        rating: Number(payload.rating),
        comment: payload.comment?.trim() || undefined,
      },
      select: {
        id: true,
        productId: true,
        rating: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async removeCustomerFavorite(
    currentUser: JwtPayload,
    productId: number,
  ): Promise<{ productId: number }> {
    const businessId = Number(currentUser.businessId);
    const customer = await this.requireCustomerPortalRecord(currentUser);

    await this.prisma.customerFavorite.deleteMany({
      where: {
        businessId,
        customerId: customer.id,
        productId,
      },
    });

    return { productId };
  }

  async deleteCustomerAddress(
    currentUser: JwtPayload,
    id: number,
  ): Promise<{ id: number }> {
    await this.requireAccessibleCustomerAddress(currentUser, id);
    await this.prisma.customerAddress.delete({ where: { id } });
    return { id };
  }

  async setDefaultCustomerAddress(
    currentUser: JwtPayload,
    id: number,
    type: 'shipping' | 'billing',
  ): Promise<CustomerAddressSummary> {
    const { customerId, businessId } =
      await this.requireAccessibleCustomerAddress(currentUser, id);

    const flagField =
      type === 'shipping' ? 'isDefaultShipping' : 'isDefaultBilling';

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.customerAddress.updateMany({
        where: {
          businessId,
          customerId,
          [flagField]: true,
        },
        data: {
          [flagField]: false,
        },
      });

      return tx.customerAddress.update({
        where: { id },
        data: {
          [flagField]: true,
        },
        select: {
          id: true,
          title: true,
          fullName: true,
          phone: true,
          line1: true,
          line2: true,
          city: true,
          district: true,
          postalCode: true,
          country: true,
          isDefaultShipping: true,
          isDefaultBilling: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    return updated;
  }

  async findAllPaginated(
    currentUser: JwtPayload,
    params?: { page?: number; pageSize?: number },
  ): Promise<{ data: CustomerSummary[]; meta: PaginationMeta }> {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));

    const where =
      currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN'
        ? { businessId, deletedAt: null as null }
        : { businessId, createdByUserId: userId, deletedAt: null as null };

    const total = await this.prisma.customer.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const data = await this.prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
      },
      orderBy: {
        id: 'desc',
      },
      skip,
      take,
    });

    return { data, meta };
  }

  async listPlatformCustomers(
    currentUser: JwtPayload,
    params?: { q?: string; page?: number; pageSize?: number },
  ): Promise<{ data: CustomerSummary[]; meta: PaginationMeta }> {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    const businessId = Number(currentUser.businessId);
    const page = clampPage(Number(params?.page ?? 1));
    const pageSize = clampPageSize(Number(params?.pageSize ?? 20));

    const q = (params?.q ?? '').trim();
    const qNumber = q && /^[0-9]+$/.test(q) ? Number(q) : null;

    const where: Prisma.CustomerWhereInput = { businessId, deletedAt: null };
    if (q) {
      const or: Prisma.CustomerWhereInput[] = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
      if (qNumber) {
        or.push({ id: qNumber });
      }
      where.OR = or;
    }

    const total = await this.prisma.customer.count({ where });
    const meta = buildPaginationMeta(total, page, pageSize);
    const { skip, take } = paginationToSkipTake(meta);

    const data = await this.prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
      },
      orderBy: {
        id: 'desc',
      },
      skip,
      take,
    });

    return { data, meta };
  }

  async getCustomerPortalProfile(
    currentUser: JwtPayload,
  ): Promise<CustomerPortalProfile> {
    const userId = Number(currentUser.userId);
    if (!Number.isFinite(userId)) {
      throw new NotFoundException('User not found');
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
      throw new NotFoundException('User not found');
    }

    const customer = await this.findOrCreateForUser(currentUser);

    return {
      user: {
        id: String(user.id),
        name: user.name,
        phone: user.phone ?? undefined,
        email: user.email ?? undefined,
        role: user.role,
        businessId: String(user.businessId),
      },
      customer,
    };
  }

  async create(
    currentUser: JwtPayload,
    payload: CreateCustomerDto,
  ): Promise<CustomerSummary> {
    const businessId = Number(currentUser.businessId);
    const createdByUserId = Number(currentUser.userId);
    const balance = payload.balance !== undefined ? Number(payload.balance) : 0;

    const existingByPhone = await this.prisma.customer.findFirst({
      where: {
        businessId,
        phone: payload.phone,
        deletedAt: { not: null },
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    const customer = existingByPhone
      ? await this.prisma.customer.update({
          where: { id: existingByPhone.id },
          data: {
            name: payload.name,
            balance,
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            phone: true,
            balance: true,
          },
        })
      : await this.prisma.customer.create({
          data: {
            businessId,
            createdByUserId,
            name: payload.name,
            phone: payload.phone,
            balance,
          },
          select: {
            id: true,
            name: true,
            phone: true,
            balance: true,
          },
        });

    return customer;
  }

  async findAll(currentUser: JwtPayload): Promise<CustomerSummary[]> {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    const where =
      currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN'
        ? { businessId, deletedAt: null as null }
        : { businessId, createdByUserId: userId, deletedAt: null as null };

    return this.prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
      },
    });
  }

  private async findAccessibleCustomer(currentUser: JwtPayload, id: number) {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        businessId,
        deletedAt: null,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (currentUser.role === 'STAFF' && customer.createdByUserId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return customer;
  }

  async findOne(currentUser: JwtPayload, id: number): Promise<CustomerSummary> {
    const customer = await this.findAccessibleCustomer(currentUser, id);
    const { id: customerId, name, phone, balance } = customer;
    return { id: customerId, name, phone, balance };
  }

  async update(
    currentUser: JwtPayload,
    id: number,
    payload: UpdateCustomerDto,
  ): Promise<CustomerSummary> {
    await this.findAccessibleCustomer(currentUser, id);

    const data: { name?: string; phone?: string; balance?: number } = {};
    if (payload.name) data.name = payload.name;
    if (payload.phone) data.phone = payload.phone;
    if (payload.balance !== undefined) {
      data.balance = Number(payload.balance);
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
      },
    });

    return updated;
  }

  async remove(currentUser: JwtPayload, id: number): Promise<CustomerSummary> {
    const customer = await this.findAccessibleCustomer(currentUser, id);
    const deletedAt = new Date();
    const anonymizedName = `Silinmis Musteri #${customer.id}`;
    // Keep value unique under (businessId, phone) while removing personal data.
    const anonymizedPhone = `deleted-${customer.id}-${deletedAt.getTime()}`;

    const removed = await this.prisma.$transaction(async (tx) => {
      await tx.customerAddress.deleteMany({
        where: {
          businessId: customer.businessId,
          customerId: customer.id,
        },
      });

      await tx.customerPreference.deleteMany({
        where: {
          businessId: customer.businessId,
          customerId: customer.id,
        },
      });

      return tx.customer.update({
        where: { id },
        data: {
          deletedAt,
          userId: null,
          name: anonymizedName,
          phone: anonymizedPhone,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          balance: true,
        },
      });
    });

    return removed;
  }

  async findOrCreateForUser(currentUser: JwtPayload): Promise<CustomerSummary> {
    const businessId = Number(currentUser.businessId);
    const userId = Number(currentUser.userId);

    return await this.prisma.$transaction(async (tx) => {
      // First, check if user already has a linked customer record
      let customer = await tx.customer.findFirst({
        where: { businessId, userId, deletedAt: null },
        select: {
          id: true,
          name: true,
          phone: true,
          balance: true,
        },
      });

      if (customer) {
        return customer;
      }

      // If not found, get user data
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Use upsert to handle race condition:
      // - If customer with (businessId, phone) exists: update with userId
      // - If not exists: create new customer
      // This prevents duplicate creation even if multiple requests arrive simultaneously
      const upsertedCustomer = await tx.customer.upsert({
        where: {
          businessId_phone: {
            businessId,
            phone: user.phone,
          },
        },
        update: {
          userId: userId, // Link to user if not already linked
          deletedAt: null,
        },
        create: {
          businessId,
          createdByUserId: userId,
          userId,
          name: user.name,
          phone: user.phone,
          balance: 0,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          balance: true,
          userId: true,
        },
      });

      // Check if customer was already linked to a different user
      if (upsertedCustomer.userId && upsertedCustomer.userId !== userId) {
        throw new ForbiddenException(
          'Customer record already linked to another user',
        );
      }

      const { userId: _, ...result } = upsertedCustomer;
      return result;
    });
  }
}
