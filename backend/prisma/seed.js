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

  const publicBusinessId = Number(process.env.PUBLIC_BUSINESS_ID);
  const businessCandidate = Number.isFinite(publicBusinessId) && publicBusinessId > 0
    ? await prisma.business.findUnique({ where: { id: publicBusinessId } })
    : null;

  let business = businessCandidate
    ? businessCandidate
    : await prisma.business.findFirst({
        orderBy: { id: 'asc' },
      });

  if (!business) {
    business = await prisma.business.create({
      data: {
        name: businessName,
      },
    });
  }

  console.log('ℹ️ Seed business:', { id: business.id, name: business.name });

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

  const categoriesToSeed = [
    { name: 'Piyano', slug: 'piyano', orderIndex: 0 },
    { name: 'Aksesuar', slug: 'aksesuar', orderIndex: 1 },
    { name: 'Bakım', slug: 'bakim', orderIndex: 2 },
    { name: 'Hizmet', slug: 'hizmet', orderIndex: 3 },
    { name: 'Gıda', slug: 'gida', orderIndex: 4 },
    { name: 'Atıştırmalık', slug: 'atistirmalik', orderIndex: 5 },
    { name: 'Kahvaltılık', slug: 'kahvaltilik', orderIndex: 6 },
    { name: 'İçecek', slug: 'icecek', orderIndex: 7 },
  ];

  const seededCategories = await Promise.all(
    categoriesToSeed.map((entry) =>
      prisma.category.upsert({
        where: {
          businessId_slug: {
            businessId: business.id,
            slug: entry.slug,
          },
        },
        update: {
          name: entry.name,
          orderIndex: entry.orderIndex,
          isActive: true,
          archivedAt: null,
        },
        create: {
          businessId: business.id,
          createdByUserId,
          name: entry.name,
          slug: entry.slug,
          orderIndex: entry.orderIndex,
          isActive: true,
        },
        select: { id: true, name: true, slug: true },
      }),
    ),
  );

  console.log('✅ Seeded categories:', seededCategories.map((c) => `${c.slug}:${c.id}`));

  const categoryIdBySlug = new Map(seededCategories.map((c) => [c.slug, c.id]));

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
        categoryId: categoryIdBySlug.get('piyano') ?? seededCategories[0].id,
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

  const perCategoryProductCount = 4;
  const seededProductSkus = new Set(
    (
      await prisma.product.findMany({
        where: {
          businessId: business.id,
          sku: {
            startsWith: 'CAT-',
          },
        },
        select: { sku: true },
      })
    )
      .map((row) => row.sku)
      .filter(Boolean),
  );

  const categoryProductRows = [];
  const heroImagePathsForSeed = heroImages.map((entry) => `/hero/${entry}`);

  const foodTemplates = {
    gida: [
      { name: 'Organik Zeytinyağı 1L', subtitle: 'Soğuk sıkım', tags: ['gida', 'organik'] },
      { name: 'Bal (Çiçek Balı) 850g', subtitle: 'Doğal', tags: ['gida'] },
      { name: 'Yer fıstığı ezmesi 330g', subtitle: 'Şekersiz', tags: ['gida', 'protein'] },
      { name: 'Ev yapımı granola 400g', subtitle: 'Yulaf + kuruyemiş', tags: ['gida'] },
    ],
    atistirmalik: [
      { name: 'Kuru meyve karışımı 250g', subtitle: 'Kayısı + incir', tags: ['atistirmalik'] },
      { name: 'Fındık içi 200g', subtitle: 'Kavrulmuş', tags: ['atistirmalik'] },
      { name: 'Badem 200g', subtitle: 'Çiğ', tags: ['atistirmalik'] },
      { name: 'Bitter çikolata 80g', subtitle: '%70 kakao', tags: ['atistirmalik'] },
    ],
    kahvaltilik: [
      { name: 'Tahin 500g', subtitle: 'Doğal', tags: ['kahvalti'] },
      { name: 'Pekmez 800g', subtitle: 'Üzüm pekmezi', tags: ['kahvalti'] },
      { name: 'Reçel 380g', subtitle: 'Çilek', tags: ['kahvalti'] },
      { name: 'Zeytin 500g', subtitle: 'Sele', tags: ['kahvalti'] },
    ],
    icecek: [
      { name: 'Türk kahvesi 250g', subtitle: 'Taze çekim', tags: ['icecek'] },
      { name: 'Siyah çay 500g', subtitle: 'Rize', tags: ['icecek'] },
      { name: 'Bitki çayı 20li', subtitle: 'Papatya', tags: ['icecek'] },
      { name: 'Soğuk kahve 250ml', subtitle: 'Şekersiz', tags: ['icecek'] },
    ],
  };

  for (let cIndex = 0; cIndex < seededCategories.length; cIndex += 1) {
    const category = seededCategories[cIndex];
    const categoryId = category.id;

    const isFoodCategory = Object.prototype.hasOwnProperty.call(foodTemplates, category.slug);
    const templateList = isFoodCategory ? foodTemplates[category.slug] : null;
    const loopCount = templateList ? templateList.length : perCategoryProductCount;

    for (let pIndex = 0; pIndex < loopCount; pIndex += 1) {
      const seedIndex = cIndex * perCategoryProductCount + pIndex;
      const sku = `CAT-${category.slug}-${pIndex + 1}`;
      if (seededProductSkus.has(sku)) continue;

      const startIndex = (seedIndex * 2) % heroImagePathsForSeed.length;
      const images = heroImagePathsForSeed
        .slice(startIndex, startIndex + 4)
        .concat(
          heroImagePathsForSeed.slice(
            0,
            Math.max(0, startIndex + 4 - heroImagePathsForSeed.length),
          ),
        )
        .slice(0, 4);

      const priceCents = isFoodCategory ? 8900 + seedIndex * 700 : 9900 + seedIndex * 1500;

      const template = templateList ? templateList[pIndex] : null;
      const name = template ? template.name : `${category.name} Örnek Ürün ${pIndex + 1}`;
      const subtitle = template
        ? template.subtitle
        : 'Seed örneği - admin panelinden düzenleyebilirsiniz.';
      const tags = template ? template.tags : [];

      categoryProductRows.push({
        businessId: business.id,
        createdByUserId,
        categoryId,
        name,
        subtitle,
        sku,
        type: category.slug === 'hizmet' ? 'SERVICE' : 'PHYSICAL',
        priceCents,
        description: 'Bu ürün seed tarafından oluşturuldu. Fotoğraf/isim/fiyatı admin panelinden güncelleyebilirsiniz.',
        features: ['El yapımı', 'Kaliteli malzeme', 'Hızlı teslimat'],
        imageUrl: images[0],
        images,
        stock: category.slug === 'hizmet' ? null : 10 - pIndex,
        tags,
        seoTitle: null,
        seoDescription: null,
        isActive: true,
      });
    }
  }

  if (categoryProductRows.length > 0) {
    await prisma.product.createMany({
      data: categoryProductRows,
    });
    console.log(`✅ ${categoryProductRows.length} adet kategori ürünü oluşturuldu.`);
  } else {
    console.log('✅ Kategori ürünleri zaten mevcut.');
  }

  const finalCategoryCount = await prisma.category.count({ where: { businessId: business.id } });
  const finalProductCount = await prisma.product.count({ where: { businessId: business.id } });
  console.log('ℹ️ Final counts:', {
    businessId: business.id,
    categories: finalCategoryCount,
    products: finalProductCount,
  });

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
      },
    });
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
