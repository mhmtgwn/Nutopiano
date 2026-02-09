import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OrderSource, ProductType, Role } from '@prisma/client';

@Controller('dev')
export class DevController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('seed')
  async seed() {
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

    // 2) Admin user for login
    const adminPhone = '5551112233';

    let admin = await this.prisma.user.findUnique({
      where: { phone: adminPhone },
    });

    if (!admin) {
      admin = await this.prisma.user.create({
        data: {
          businessId,
          name: 'Demo Admin',
          phone: adminPhone,
          role: Role.ADMIN,
          isActive: true,
        },
      });
    } else if (!admin.isActive) {
      admin = await this.prisma.user.update({
        where: { id: admin.id },
        data: { isActive: true },
      });
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

    // 4) Demo customer for checkout
    let customer = await this.prisma.customer.findFirst({
      where: { businessId },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          businessId,
          createdByUserId: admin.id,
          name: 'Demo Müşteri',
          phone: '5550000000',
          balance: 0,
        },
      });
    }

    // 5) Demo products (update existing by SKU, create if missing)
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
      adminPhone,
      customerId: customer.id,
      defaultStatusKey,
      totalProducts,
      createdProductsCount,
      updatedProductsCount,
      note:
        'Giriş için bu telefonu kullanın: 5551112233 (şifre yok, sadece telefon). Checkout için müşteri ID: customerId.',
    };
  }
}
