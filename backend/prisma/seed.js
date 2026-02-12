require('dotenv/config');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const configuredPhone = process.env.ADMIN_DEFAULT_PHONE;
  const adminPhones = [configuredPhone, '5551112233', '05550000000'].filter(Boolean);
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || '123456';
  const businessName = 'Default Business';

  let business = await prisma.business.findFirst({
    orderBy: { id: 'asc' },
  });

  if (!business) {
    business = await prisma.business.create({
      data: {
        name: businessName,
      },
    });
  }

  let adminUser = await prisma.user.findFirst({
    where: {
      businessId: business.id,
      role: 'ADMIN',
      isActive: true,
    },
    select: {
      id: true,
      phone: true,
      passwordHash: true,
    },
  });

  if (adminUser) {
    if (!adminUser.passwordHash) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { passwordHash },
      });
      console.log('✅ Mevcut admin için passwordHash güncellendi:', adminUser.phone);
    } else {
      console.log('✅ Admin zaten mevcut:', adminUser.phone);
    }
  } else {
    const adminPhone = adminPhones[0];
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    adminUser = await prisma.user.create({
      data: {
        name: 'Admin',
        phone: adminPhone,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
        businessId: business.id,
      },
      select: {
        id: true,
        phone: true,
        passwordHash: true,
      },
    });

    console.log('✅ Admin kullanıcı oluşturuldu');
  }

  const createdByUserId = adminUser.id;

  const existingProductCount = await prisma.product.count({
    where: { businessId: business.id },
  });

  if (existingProductCount > 0) {
    console.log('ℹ️ Mevcut ürün sayısı:', existingProductCount);
  }

  const heroImages = [
    'IMG_3958.JPG',
    'IMG_3959.JPG',
    'IMG_3962.JPG',
    'IMG_3965.JPG',
    'IMG_3966.JPG',
    'IMG_3968.JPG',
    'IMG_3969.JPG',
    'IMG_3972.JPG',
    'IMG_3973.JPG',
    'IMG_3975.JPG',
  ];

  const now = Date.now();

  const existingHeroSkus = new Set(
    (
      await prisma.product.findMany({
        where: {
          businessId: business.id,
          sku: {
            startsWith: 'HERO-',
          },
        },
        select: { sku: true },
      })
    )
      .map((row) => row.sku)
      .filter(Boolean),
  );

  const heroProductsToCreate = heroImages
    .map((filename, index) => {
      const sku = `HERO-${filename}`;
      if (existingHeroSkus.has(sku)) return null;

      const images = heroImages
        .slice(index, index + 4)
        .concat(heroImages.slice(0, Math.max(0, index + 4 - heroImages.length)))
        .slice(0, 4)
        .map((entry) => `/hero/${entry}`);

      const basePrice = 14900 + index * 2500;
      return {
        businessId: business.id,
        createdByUserId,
        categoryId: null,
        name: `Nutopiano Ürün ${index + 1}`,
        subtitle: 'Alt başlık örneği (ürün detayda görünür).',
        sku,
        type: 'PHYSICAL',
        priceCents: basePrice,
        description:
          'Bu ürün açıklaması seed tarafından oluşturuldu. Admin panelinden düzenleyebilirsiniz.',
        features: ['El yapımı', 'Kaliteli malzeme', 'Hızlı teslimat'],
        imageUrl: images[0],
        images,
        stock: 12 - index,
        tags: [],
        seoTitle: null,
        seoDescription: null,
        isActive: true,
      };
    })
    .filter(Boolean)
    .slice(0, 10);

  if (heroProductsToCreate.length === 0) {
    console.log('✅ Hero ürünleri zaten mevcut.');
  } else {
    await prisma.product.createMany({
      data: heroProductsToCreate,
    });
  }

  await prisma.product.updateMany({
    where: {
      businessId: business.id,
      sku: {
        startsWith: 'HERO-',
      },
      images: {
        equals: [],
      },
    },
    data: {
      images: heroImages.slice(0, 4).map((entry) => `/hero/${entry}`),
    },
  });

  const allProducts = await prisma.product.findMany({
    where: {
      businessId: business.id,
    },
    select: {
      id: true,
      images: true,
      imageUrl: true,
    },
    orderBy: {
      id: 'asc',
    },
  });

  const heroImagePaths = heroImages.map((entry) => `/hero/${entry}`);

  for (let i = 0; i < allProducts.length; i += 1) {
    const product = allProducts[i];
    const existingImages = Array.isArray(product.images) ? product.images.filter(Boolean) : [];

    if (existingImages.length >= 2 && product.imageUrl && product.imageUrl.startsWith('/hero/')) {
      continue;
    }

    const startIndex = (i * 2) % heroImagePaths.length;
    const rotated = heroImagePaths
      .slice(startIndex, startIndex + 4)
      .concat(heroImagePaths.slice(0, Math.max(0, startIndex + 4 - heroImagePaths.length)))
      .slice(0, 4);

    const nextImages = existingImages.length > 0
      ? Array.from(new Set(existingImages.concat(rotated))).slice(0, 6)
      : rotated;

    // eslint-disable-next-line no-await-in-loop
    await prisma.product.update({
      where: { id: product.id },
      data: {
        images: nextImages,
        imageUrl: nextImages[0],
      },
    });
  }

  if (heroProductsToCreate.length > 0) {
    console.log(
      `✅ ${heroProductsToCreate.length} adet hero görseli ile örnek ürün oluşturuldu.`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
