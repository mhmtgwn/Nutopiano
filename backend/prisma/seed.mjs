import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminPhone = '05550000000';
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

  const existingAdmin = await prisma.user.findUnique({
    where: { phone: adminPhone },
  });

  if (existingAdmin) {
    console.log('✅ Admin zaten mevcut');
    return;
  }

  await prisma.user.create({
    data: {
      name: 'Admin',
      phone: adminPhone,
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
