import { Controller, ForbiddenException, Get, Headers, Query } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProductType, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

@Controller('dev')
export class DevController {
  constructor(private readonly prisma: PrismaService) {}

  private assertSeedAccess(apiKey?: string) {
    const isProduction = (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
    const allowInProduction = process.env.ALLOW_DEV_SEED_IN_PROD === 'true';

    if (isProduction && !allowInProduction) {
      throw new ForbiddenException('Dev seed endpoint is disabled in production');
    }

    const expectedKey = process.env.DEV_SEED_KEY?.trim();
    if (expectedKey && apiKey !== expectedKey) {
      throw new ForbiddenException('Invalid dev seed key');
    }
  }

  @Get('seed')
  async seed(@Headers('x-dev-seed-key') headerKey?: string, @Query('key') queryKey?: string) {
    this.assertSeedAccess(headerKey ?? queryKey);

    // 1) Business
    let business = await this.prisma.business.findFirst();

    if (!business) {
      business = await this.prisma.business.create({
        data: {
          name: 'Nutopiano Demo Business',
        },
      });
    }

    const businessId = business.id;

    // 2) Demo users for login
    const demoPassword = 'password123';
    const passwordHash = await bcrypt.hash(demoPassword, 12);

    const demoUsers = [
      {
        role: Role.SUPER_ADMIN,
        phone: '5550000001',
        name: 'Demo Super Admin',
      },
      {
        role: Role.ADMIN,
        phone: '5551112233',
        name: 'Demo Admin',
      },
      {
        role: Role.SELLER,
        phone: '5550000002',
        name: 'Demo Seller',
      },
      {
        role: Role.STAFF,
        phone: '5550000003',
        name: 'Demo Staff',
      },
      {
        role: Role.CUSTOMER,
        phone: '5550000004',
        name: 'Demo Customer',
      },
    ] as const;

    const createdOrUpdatedUsers = [] as Array<{
      role: Role;
      phone: string;
      password: string;
    }>;

    for (const u of demoUsers) {
      const existing = await this.prisma.user.findUnique({ where: { phone: u.phone } });
      if (!existing) {
        await this.prisma.user.create({
          data: {
            businessId,
            name: u.name,
            phone: u.phone,
            passwordHash,
            role: u.role,
            isActive: true,
          },
        });
      } else {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            businessId,
            name: u.name,
            role: u.role,
            isActive: true,
            passwordHash,
          },
        });
      }

      createdOrUpdatedUsers.push({ role: u.role, phone: u.phone, password: demoPassword });
    }

    const adminPhone = demoUsers.find((u) => u.role === Role.ADMIN)?.phone ?? '5551112233';
    const admin = await this.prisma.user.findUnique({ where: { phone: adminPhone } });
    if (!admin) {
      throw new Error('Seed failed: admin user could not be created');
    }

    // 3) Default order status + settings for orders
    const defaultStatusKey = 'CREATED';

    let status = await this.prisma.orderStatus.findFirst({
      where: { businessId, key: defaultStatusKey },
    });

    if (!status) {
      status = await this.prisma.orderStatus.create({
        data: {
          businessId,
          key: defaultStatusKey,
          label: 'Oluşturuldu',
          orderIndex: 1,
          isDefault: true,
          isFinal: false,
        },
      });
    }

    const settingsKey = 'order.defaultStatusKey';

    const existingSetting = await this.prisma.settings.findUnique({
      where: {
        businessId_key: {
          businessId,
          key: settingsKey,
        },
      },
    });

    if (!existingSetting) {
      await this.prisma.settings.create({
        data: {
          businessId,
          key: settingsKey,
          value: defaultStatusKey,
        },
      });
    }

    const commissionRateKey = 'global_commission_rate';
    const existingCommissionRate = await this.prisma.settings.findUnique({
      where: {
        businessId_key: {
          businessId,
          key: commissionRateKey,
        },
      },
    });

    if (!existingCommissionRate) {
      await this.prisma.settings.create({
        data: {
          businessId,
          key: commissionRateKey,
          value: 0.05,
        },
      });
    }

    const moderationKey = 'moderation_enabled';
    const existingModeration = await this.prisma.settings.findUnique({
      where: {
        businessId_key: {
          businessId,
          key: moderationKey,
        },
      },
    });

    if (!existingModeration) {
      await this.prisma.settings.create({
        data: {
          businessId,
          key: moderationKey,
          value: false,
        },
      });
    }

    // 4) Demo customer for checkout
    let customer = await this.prisma.customer.findFirst({
      where: { businessId, deletedAt: null },
    });

    if (!customer) {
      const deletedCustomer = await this.prisma.customer.findFirst({
        where: {
          businessId,
          phone: '5550000000',
          deletedAt: { not: null },
        },
        select: { id: true },
      });

      customer = deletedCustomer
        ? await this.prisma.customer.update({
            where: { id: deletedCustomer.id },
            data: {
              name: 'Demo Müşteri',
              balance: 0,
              deletedAt: null,
            },
          })
        : await this.prisma.customer.create({
            data: {
              businessId,
              createdByUserId: admin.id,
              name: 'Demo Müşteri',
              phone: '5550000000',
              balance: 0,
            },
          });
    }

    // 5) Default category (required for Product.categoryId)
    let defaultCategory = await this.prisma.category.findFirst({
      where: {
        businessId,
        slug: 'genel',
      },
    });

    if (!defaultCategory) {
      defaultCategory = await this.prisma.category.create({
        data: {
          businessId,
          createdByUserId: admin.id,
          name: 'Genel',
          slug: 'genel',
          isActive: true,
          orderIndex: 0,
        },
      });
    }

    // 6) Demo products (update existing by SKU, create if missing)
    const seedProducts = [
      {
        name: 'Nutopiano Premium Hizmet',
        sku: 'NUTO-PRM-001',
        type: ProductType.SERVICE,
        priceCents: 19900,
        description: 'VIP destek, özel danışmanlık ve öncelikli hizmet paketi.',
        imageUrl: '/nutopiano-logo.png',
        stock: 120,
        tags: ['premium', 'destek'],
        seoTitle: 'Nutopiano Premium Hizmet',
        seoDescription: 'VIP destek ve özel danışmanlık içeren premium paket.',
        isActive: true,
      },
      {
        name: 'Nutopiano Standart Hizmet',
        sku: 'NUTO-STD-001',
        type: ProductType.SERVICE,
        priceCents: 9900,
        description: 'Günlük işletme ihtiyaçları için standart hizmet paketi.',
        imageUrl: '/nutopiano-logo.png',
        stock: 260,
        tags: ['standart', 'hizmet'],
        seoTitle: 'Nutopiano Standart Hizmet',
        seoDescription: 'Günlük kullanım için pratik ve güvenilir paket.',
        isActive: true,
      },
      {
        name: 'Nutopiano Starter Kit',
        sku: 'NUTO-KIT-002',
        type: ProductType.PHYSICAL,
        priceCents: 24900,
        description: 'Fiziksel ürün başlangıç kiti, hızlı kurulum desteğiyle.',
        imageUrl: '/nutopiano-logo.png',
        stock: 18,
        tags: ['fiziksel', 'kit'],
        seoTitle: 'Nutopiano Starter Kit',
        seoDescription: 'Fiziksel başlangıç kiti ile hızlı kurulum.',
        isActive: true,
      },
      {
        name: 'Nutopiano Kilo Bazlı Ürün',
        sku: 'NUTO-WGT-003',
        type: ProductType.WEIGHT,
        priceCents: 4500,
        description: 'Kilo bazlı satılan ürünler için demo paket.',
        imageUrl: '/nutopiano-logo.png',
        stock: 420,
        tags: ['kilo', 'tartı'],
        seoTitle: 'Nutopiano Kilo Bazlı Ürün',
        seoDescription: 'Kilo bazlı satılan ürünler için demo paket.',
        isActive: true,
      },
      {
        name: 'Nutopiano Özel Üretim',
        sku: 'NUTO-CSTM-004',
        type: ProductType.CUSTOM,
        priceCents: 39900,
        description: 'Özel müşteri taleplerine göre kişiselleştirilen ürün.',
        imageUrl: '/nutopiano-logo.png',
        stock: 5,
        tags: ['özel', 'kişisel'],
        seoTitle: 'Nutopiano Özel Üretim',
        seoDescription: 'Müşteriye özel kişiselleştirilen ürün paketi.',
        isActive: true,
      },
    ];

    let createdProductsCount = 0;
    let updatedProductsCount = 0;

    for (const seedProduct of seedProducts) {
      const existingProduct = await this.prisma.product.findFirst({
        where: seedProduct.sku
          ? { businessId, sku: seedProduct.sku }
          : { businessId, name: seedProduct.name },
      });

      if (existingProduct) {
        await this.prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            ...seedProduct,
            isActive: true,
            archivedAt: null,
          },
        });
        updatedProductsCount += 1;
      } else {
        await this.prisma.product.create({
          data: {
            ...seedProduct,
            categoryId: defaultCategory.id,
            businessId,
            createdByUserId: admin.id,
          },
        });
        createdProductsCount += 1;
      }
    }

    const totalProducts = await this.prisma.product.count({
      where: { businessId, isActive: true },
    });

    return {
      message: 'Seed completed',
      businessId,
      demoUsers: createdOrUpdatedUsers,
      customerId: customer.id,
      defaultStatusKey,
      totalProducts,
      createdProductsCount,
      updatedProductsCount,
      note: 'Giriş için demo kullanıcılar demoUsers alanında. Hepsinin şifresi: password123. Checkout için müşteri ID: customerId.',
    };
  }
}
