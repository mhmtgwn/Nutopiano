import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../src/database/prisma.service';

type ColumnRow = { column_name: string };
type TableRow = { table_name: string };
type MigrationRow = { migration_name: string };
type CountRow = {
  active_users: bigint | number | string;
  active_missing_password_hash: bigint | number | string;
};
type MissingUserRow = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: Date;
};

const REQUIRED_COLUMNS = ['deletedAt', 'lastLoginAt'] as const;
const REQUIRED_TABLES = [
  '_prisma_migrations',
  'RefreshToken',
  'PermissionGroup',
  'UserPermissionGroup',
] as const;
const REQUIRED_MIGRATIONS = [
  '20260302100500_add_user_deleted_at',
  '20260302101500_add_user_last_login_at',
  '20260305153000_migrate_user_role_to_seller_staff',
] as const;

const toNumber = (value: bigint | number | string | null | undefined) => {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const stripQuotes = (value: string) => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
};

const loadEnvFiles = () => {
  const candidates = [
    '.env',
    '.env.local',
    '.env.production',
    '.env.development',
  ];

  for (const candidate of candidates) {
    const filePath = path.join(process.cwd(), candidate);
    if (!existsSync(filePath)) continue;

    const content = readFileSync(filePath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const separatorIndex = line.indexOf('=');
      if (separatorIndex <= 0) continue;

      const key = line.slice(0, separatorIndex).trim();
      if (!key || process.env[key]) continue;

      const rawValue = line.slice(separatorIndex + 1).trim();
      process.env[key] = stripQuotes(rawValue);
    }
  }
};

async function main() {
  loadEnvFiles();
  const prisma = new PrismaService();
  try {
    const [columnRows, tableRows] = await Promise.all([
      prisma.$queryRaw<ColumnRow[]>(Prisma.sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'User'
          AND column_name IN (${Prisma.join(REQUIRED_COLUMNS.map((value) => Prisma.sql`${value}`))})
      `),
      prisma.$queryRaw<TableRow[]>(Prisma.sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (${Prisma.join(REQUIRED_TABLES.map((value) => Prisma.sql`${value}`))})
      `),
    ]);

    const availableTables = new Set(tableRows.map((row) => row.table_name));
    const availableColumns = new Set(columnRows.map((row) => row.column_name));

    const appliedMigrations = availableTables.has('_prisma_migrations')
      ? await prisma.$queryRaw<MigrationRow[]>(Prisma.sql`
          SELECT migration_name
          FROM "_prisma_migrations"
          WHERE migration_name IN (${Prisma.join(REQUIRED_MIGRATIONS.map((value) => Prisma.sql`${value}`))})
        `)
      : [];

    const countRows = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE "isActive" = true) AS active_users,
        COUNT(*) FILTER (
          WHERE "isActive" = true
            AND COALESCE("passwordHash", '') = ''
        ) AS active_missing_password_hash
      FROM "User"
    `);

    const missingUsers = await prisma.$queryRaw<MissingUserRow[]>(Prisma.sql`
      SELECT
        "id",
        "name",
        "phone",
        "email",
        "isActive",
        "createdAt"
      FROM "User"
      WHERE "isActive" = true
        AND COALESCE("passwordHash", '') = ''
      ORDER BY "id" ASC
    `);

    const counts = countRows[0] ?? {
      active_users: 0,
      active_missing_password_hash: 0,
    };

    const summary = {
      checkedAt: new Date().toISOString(),
      columns: Object.fromEntries(
        REQUIRED_COLUMNS.map((column) => [
          column,
          availableColumns.has(column),
        ]),
      ),
      tables: Object.fromEntries(
        REQUIRED_TABLES.map((table) => [table, availableTables.has(table)]),
      ),
      migrations: Object.fromEntries(
        REQUIRED_MIGRATIONS.map((migration) => [
          migration,
          appliedMigrations.some((row) => row.migration_name === migration),
        ]),
      ),
      activeUsers: toNumber(counts.active_users),
      activeUsersMissingPasswordHash: toNumber(
        counts.active_missing_password_hash,
      ),
    };

    console.log(JSON.stringify(summary, null, 2));

    if (missingUsers.length > 0) {
      console.log('');
      console.log('Active users without passwordHash:');
      for (const row of missingUsers) {
        console.log(
          [
            `id=${row.id}`,
            `name=${row.name}`,
            `phone=${row.phone ?? '-'}`,
            `email=${row.email ?? '-'}`,
            `createdAt=${new Date(row.createdAt).toISOString()}`,
          ].join(' | '),
        );
      }
    }
  } finally {
    await prisma.onModuleDestroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
