import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { requestContext } from '../common/context/request-context';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  private static readonly BUSINESS_SCOPED_MODELS = new Set<string>([
    'User',
    'Seller',
    'Category',
    'Customer',
    'CustomerPreference',
    'CustomerAddress',
    'Product',
    'OrderStatus',
    'Order',
    'OrderItem',
    'Payment',
    'PaymentWebhookEvent',
    'PaymentSession',
    'Settings',
    'Plan',
    'CustomerFavorite',
    'ProductReview',
    'Appointment',
    'ServiceType',
    'WorkingHours',
    'TimeSlot',
    'BlockedDate',
    'Commission',
    'Payout',
    'RefreshToken',
  ]);

  private static readonly SOFT_DELETE_MODELS = new Set<string>([
    'Customer',
    'Order',
  ]);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({ adapter });
    this.pool = pool;

    const extended = (this as any).$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }: any) {
            const ctx = requestContext.get();
            const businessId = ctx.businessId;

            const delegateKey =
              typeof model === 'string' && model.length > 0
                ? `${model.charAt(0).toLowerCase()}${model.slice(1)}`
                : null;

            const delegate =
              delegateKey && Object.prototype.hasOwnProperty.call(this, delegateKey)
                ? (this as any)[delegateKey]
                : null;

            if (!Number.isFinite(businessId) || !model) {
              return query(args);
            }

            if (!PrismaService.BUSINESS_SCOPED_MODELS.has(model)) {
              return query(args);
            }

            const ensureWhereBusinessId = (inputArgs: any) => {
              if (!inputArgs.where) {
                inputArgs.where = { businessId };
                return;
              }

              if (typeof inputArgs.where !== 'object') return;
              if ('businessId' in inputArgs.where) return;

              inputArgs.where = {
                AND: [inputArgs.where, { businessId }],
              };
            };

            const hasDeletedAtCondition = (where: any): boolean => {
              if (!where || typeof where !== 'object') return false;
              if ('deletedAt' in where) return true;

              const keys = Object.keys(where);
              for (const key of keys) {
                const value = where[key];
                if (Array.isArray(value)) {
                  for (const item of value) {
                    if (hasDeletedAtCondition(item)) return true;
                  }
                } else if (value && typeof value === 'object') {
                  if (hasDeletedAtCondition(value)) return true;
                }
              }
              return false;
            };

            const ensureWhereNotDeleted = (inputArgs: any) => {
              if (!PrismaService.SOFT_DELETE_MODELS.has(model)) return;
              if (!inputArgs.where) {
                inputArgs.where = { deletedAt: null };
                return;
              }

              if (typeof inputArgs.where !== 'object') return;
              if (hasDeletedAtCondition(inputArgs.where)) return;

              inputArgs.where = {
                AND: [inputArgs.where, { deletedAt: null }],
              };
            };

            if (operation === 'findUnique') {
              const nextArgs = { ...(args ?? {}) };
              ensureWhereBusinessId(nextArgs);
              ensureWhereNotDeleted(nextArgs);
              if (!delegate) {
                return query(args);
              }
              return delegate.findFirst(nextArgs);
            }

            if (operation === 'findUniqueOrThrow') {
              const nextArgs = { ...(args ?? {}) };
              ensureWhereBusinessId(nextArgs);
              ensureWhereNotDeleted(nextArgs);
              if (!delegate) {
                return query(args);
              }
              return delegate.findFirstOrThrow(nextArgs);
            }

            if (
              operation === 'findMany' ||
              operation === 'findFirst' ||
              operation === 'findFirstOrThrow' ||
              operation === 'count' ||
              operation === 'aggregate' ||
              operation === 'groupBy' ||
              operation === 'updateMany' ||
              operation === 'deleteMany'
            ) {
              ensureWhereBusinessId(args ?? (args = {}));
              ensureWhereNotDeleted(args);
            }

            if (operation === 'upsert') {
              const nextArgs = args ?? (args = {});
              if (
                nextArgs?.create &&
                typeof nextArgs.create === 'object' &&
                !('businessId' in nextArgs.create)
              ) {
                nextArgs.create.businessId = businessId;
              }
            }

            if (
              operation === 'create' &&
              args?.data &&
              typeof args.data === 'object'
            ) {
              if (!('businessId' in args.data)) {
                args.data.businessId = businessId;
              }
            }

            if (
              operation === 'createMany' &&
              Array.isArray(args?.data)
            ) {
              for (const row of args.data) {
                if (row && typeof row === 'object' && !('businessId' in row)) {
                  row.businessId = businessId;
                }
              }
            }

            return await query(args);
          },
        },
      },
    });

    Object.assign(this, extended);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
