import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // eslint-disable-next-line no-console
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const take = Number(process.env.TAKE ?? 20);

try {
  const rows = await prisma.paymentWebhookEvent.findMany({
    orderBy: { receivedAt: 'desc' },
    take,
    select: {
      id: true,
      businessId: true,
      provider: true,
      eventId: true,
      eventType: true,
      status: true,
      receivedAt: true,
      processedAt: true,
      error: true,
    },
  });

  // eslint-disable-next-line no-console
  console.log(rows);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
