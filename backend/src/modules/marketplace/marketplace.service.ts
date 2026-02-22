import {
  buildPaginationMeta,
  clampPage,
  clampPageSize,
  paginationToSkipTake,
  type PaginationMeta,
} from '@common/utils/pagination';
import { Injectable } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import {
  ProductsService,
  type ProductSummary,
} from '../products/products.service';

export interface MarketplaceSearchResult {
  data: ProductSummary[];
  meta: PaginationMeta;
}

@Injectable()
export class MarketplaceService {
  constructor(private readonly productsService: ProductsService) {}

  private redisClient?: RedisClientType;
  private redisReady = false;

  private getCacheTtlSeconds() {
    const raw = Number(process.env.MARKETPLACE_CACHE_TTL_SECONDS ?? 60);
    if (!Number.isFinite(raw) || raw <= 0) return 60;
    return Math.min(Math.floor(raw), 600);
  }

  private buildCacheKey(params: {
    query?: string;
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page: number;
    pageSize: number;
  }) {
    return `marketplace:v1:${JSON.stringify({
      q: params.query ?? '',
      c: params.categoryId ?? null,
      min: params.minPrice ?? null,
      max: params.maxPrice ?? null,
      sort: params.sort ?? '',
      page: params.page,
      pageSize: params.pageSize,
    })}`;
  }

  private async getRedisClient(): Promise<RedisClientType | null> {
    const redisUrl = (process.env.REDIS_URL ?? '').trim();
    if (!redisUrl) return null;

    if (this.redisClient && this.redisReady) return this.redisClient;

    try {
      this.redisClient ??= createClient({ url: redisUrl });
      if (!this.redisReady) {
        this.redisClient.on('error', () => {
          this.redisReady = false;
        });
        await this.redisClient.connect();
        this.redisReady = true;
      }
      return this.redisClient;
    } catch {
      this.redisReady = false;
      return null;
    }
  }

  async searchProducts(params: {
    query?: string;
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page?: number;
    pageSize?: number;
  }): Promise<MarketplaceSearchResult> {
    const page = clampPage(Number(params.page ?? 1));
    const pageSize = clampPageSize(Number(params.pageSize ?? 20));
    const cacheKey = this.buildCacheKey({
      query: params.query,
      categoryId: params.categoryId,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      sort: params.sort,
      page,
      pageSize,
    });
    const redis = await this.getRedisClient();

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as MarketplaceSearchResult;
          if (parsed && Array.isArray(parsed.data) && parsed.meta) {
            return parsed;
          }
        }
      } catch {
        // Best effort cache read.
      }
    }

    // We compute meta from total to guarantee PDF contract {data, meta}.
    // Use a 2-step approach: count first via existing searchProducts.
    const metaSeed = buildPaginationMeta(0, page, pageSize);
    const { skip, take } = paginationToSkipTake(metaSeed);

    const result = await this.productsService.searchProducts({
      query: params.query,
      categoryId: params.categoryId,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      sort: params.sort,
      skip,
      take,
    });

    const meta = buildPaginationMeta(result.total, page, pageSize);

    // If requested page was beyond totalPages, re-run query for the clamped page.
    if (meta.page !== page) {
      const { skip: correctedSkip, take: correctedTake } =
        paginationToSkipTake(meta);
      const corrected = await this.productsService.searchProducts({
        query: params.query,
        categoryId: params.categoryId,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        sort: params.sort,
        skip: correctedSkip,
        take: correctedTake,
      });

      const response = { data: corrected.data, meta };

      if (redis) {
        try {
          await redis.set(cacheKey, JSON.stringify(response), {
            EX: this.getCacheTtlSeconds(),
          });
        } catch {
          // Best effort cache write.
        }
      }

      return response;
    }

    const response = { data: result.data, meta };

    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(response), {
          EX: this.getCacheTtlSeconds(),
        });
      } catch {
        // Best effort cache write.
      }
    }

    return response;
  }
}
