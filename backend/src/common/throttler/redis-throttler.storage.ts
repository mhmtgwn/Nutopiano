import { Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { createClient, type RedisClientType } from 'redis';

type MemoryRecord = {
  hits: number;
  expiresAt: number;
  blockedUntil: number;
};

type ThrottlerStorageRecord = {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
};

export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly memory = new Map<string, MemoryRecord>();
  private readonly client: RedisClientType | null;
  private readonly connectPromise: Promise<void> | null;
  private redisAvailable = false;

  constructor(redisUrl?: string) {
    const trimmed = redisUrl?.trim();
    if (!trimmed) {
      this.client = null;
      this.connectPromise = null;
      this.logger.warn(
        'REDIS_URL is not set. Throttler storage will run in memory.',
      );
      return;
    }

    this.client = createClient({ url: trimmed });
    this.client.on('error', (error) => {
      this.redisAvailable = false;
      this.logger.warn(`Redis throttler unavailable: ${String(error)}`);
    });

    this.connectPromise = this.client
      .connect()
      .then(() => {
        this.redisAvailable = true;
        this.logger.log('Redis throttler storage connected.');
      })
      .catch((error) => {
        this.redisAvailable = false;
        this.logger.warn(
          `Redis throttler connection failed; using memory fallback. ${String(error)}`,
        );
      });
  }

  private async ensureRedis() {
    if (!this.client || !this.connectPromise) {
      return false;
    }
    await this.connectPromise;
    return this.redisAvailable && this.client.isReady;
  }

  private incrementMemory(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): ThrottlerStorageRecord {
    const now = Date.now();
    const existing = this.memory.get(key);
    const blockedUntil = existing?.blockedUntil ?? 0;

    if (blockedUntil > now) {
      return {
        totalHits: existing?.hits ?? limit,
        timeToExpire: Math.max(0, (existing?.expiresAt ?? now + ttl) - now),
        isBlocked: true,
        timeToBlockExpire: blockedUntil - now,
      };
    }

    const shouldReset = !existing || existing.expiresAt <= now;
    const next: MemoryRecord = shouldReset
      ? {
          hits: 1,
          expiresAt: now + ttl,
          blockedUntil: 0,
        }
      : {
          hits: existing.hits + 1,
          expiresAt: existing.expiresAt,
          blockedUntil: 0,
        };

    const isBlocked = next.hits > limit;
    if (isBlocked) {
      next.blockedUntil = now + (blockDuration > 0 ? blockDuration : ttl);
    }

    this.memory.set(key, next);

    return {
      totalHits: next.hits,
      timeToExpire: Math.max(0, next.expiresAt - now),
      isBlocked,
      timeToBlockExpire: isBlocked ? Math.max(0, next.blockedUntil - now) : 0,
    };
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const scopedKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `${scopedKey}:block`;

    if (!(await this.ensureRedis())) {
      return this.incrementMemory(scopedKey, ttl, limit, blockDuration);
    }

    try {
      const blockTtl = await this.client!.pTTL(blockKey);
      if (blockTtl > 0) {
        const totalHitsRaw = await this.client!.get(scopedKey);
        return {
          totalHits: Number(totalHitsRaw ?? limit),
          timeToExpire: ttl,
          isBlocked: true,
          timeToBlockExpire: blockTtl,
        };
      }

      const totalHits = await this.client!.incr(scopedKey);
      let timeToExpire = await this.client!.pTTL(scopedKey);

      if (timeToExpire < 0) {
        await this.client!.pExpire(scopedKey, ttl);
        timeToExpire = ttl;
      }

      const isBlocked = totalHits > limit;
      let timeToBlockExpire = 0;

      if (isBlocked) {
        const duration = blockDuration > 0 ? blockDuration : ttl;
        await this.client!.set(blockKey, '1', { PX: duration });
        timeToBlockExpire = duration;
      }

      return {
        totalHits,
        timeToExpire,
        isBlocked,
        timeToBlockExpire,
      };
    } catch (error) {
      this.redisAvailable = false;
      this.logger.warn(
        `Redis throttler runtime failed; using memory fallback. ${String(error)}`,
      );
      return this.incrementMemory(scopedKey, ttl, limit, blockDuration);
    }
  }
}
