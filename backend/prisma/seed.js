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
    where: { name: businessName },
  });

  if (!business) {
    business = await prisma.business.create({
      data: {
        name: businessName,
      },
    });
  }

  let existingAdmin = null;
  for (const phone of adminPhones) {
    // eslint-disable-next-line no-await-in-loop
    const found = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, phone: true, passwordHash: true },
    });
    if (found) {
      existingAdmin = found;
      break;
    }
  }

  if (existingAdmin) {
    if (!existingAdmin.passwordHash) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { passwordHash },
      });
      console.log('✅ Mevcut admin için passwordHash güncellendi:', existingAdmin.phone);
    } else {
      console.log('✅ Admin zaten mevcut:', existingAdmin.phone);
    }

    return;
  }

  const adminPhone = adminPhones[0];
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.create({
    data: {
      name: 'Admin',
      phone: adminPhone,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      businessId: business.id,
    },
  });

  console.log('✅ Admin kullanıcı oluşturuldu');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
