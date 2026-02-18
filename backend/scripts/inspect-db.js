require('dotenv/config');

const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // eslint-disable-next-line no-console
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const businesses = await prisma.business.findMany({
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });

  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      businessId: true,
      parentId: true,
      orderIndex: true,
      isActive: true,
    },
    orderBy: [{ businessId: 'asc' }, { orderIndex: 'asc' }, { id: 'asc' }],
  });

  const productsCount = await prisma.product.count();

  // eslint-disable-next-line no-console
  console.log('PUBLIC_BUSINESS_ID=', process.env.PUBLIC_BUSINESS_ID || '(empty)');
  // eslint-disable-next-line no-console
  console.log('BUSINESSES=', businesses);
  // eslint-disable-next-line no-console
  console.log('CATEGORIES_COUNT=', categories.length);
  // eslint-disable-next-line no-console
  console.log('CATEGORIES=', categories);
  // eslint-disable-next-line no-console
  console.log('PRODUCTS_COUNT=', productsCount);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
