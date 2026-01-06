import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ICacheProvider } from './cache.interface';

/**
 * Redis implementation of the cache provider
 * Uses ioredis library for Redis operations
 */
@Injectable()
export class RedisCacheProvider implements ICacheProvider, OnModuleDestroy {
    private readonly logger = new Logger(RedisCacheProvider.name);
    private readonly redis: Redis;
    private readonly enabled: boolean;

    constructor(private readonly config: ConfigService) {
        this.enabled = this.config.get<boolean>('CACHE_ENABLED', true);

        if (!this.enabled) {
            this.logger.warn('Cache is disabled via CACHE_ENABLED=false');
            // Create a dummy Redis instance that won't connect
            this.redis = null as any;
            return;
        }

        const host = this.config.get<string>('REDIS_HOST', 'localhost');
        const port = this.config.get<number>('REDIS_PORT', 6379);
        const password = this.config.get<string>('REDIS_PASSWORD');
        const db = this.config.get<number>('REDIS_DB', 0);

        this.redis = new Redis({
            host,
            port,
            password,
            db,
            retryStrategy: (times: number) => {
                const delay = Math.min(times * 50, 2000);
                this.logger.warn(`Redis connection failed, retrying in ${delay}ms...`);
                return delay;
            },
            maxRetriesPerRequest: 3,
        });

        this.redis.on('connect', () => {
            this.logger.log(`Connected to Redis at ${host}:${port}`);
        });

        this.redis.on('error', (error) => {
            this.logger.error(`Redis error: ${error.message}`, error.stack);
        });

        this.redis.on('close', () => {
            this.logger.warn('Redis connection closed');
        });
    }

    async get<T>(key: string): Promise<T | null> {
        if (!this.enabled) {
            return null;
        }

        try {
            const value = await this.redis.get(key);
            if (!value) {
                this.logger.debug(`Cache miss: ${key}`);
                return null;
            }

            this.logger.debug(`Cache hit: ${key}`);
            return JSON.parse(value) as T;
        } catch (error) {
            this.logger.error(`Error getting cache key ${key}: ${error.message}`);
            return null; // Gracefully degrade on cache errors
        }
    }

    async set(key: string, value: any, ttl?: number): Promise<void> {
        if (!this.enabled) {
            return;
        }

        try {
            const serialized = JSON.stringify(value);

            if (ttl) {
                await this.redis.setex(key, ttl, serialized);
                this.logger.debug(`Cached ${key} with TTL ${ttl}s`);
            } else {
                await this.redis.set(key, serialized);
                this.logger.debug(`Cached ${key} without TTL`);
            }
        } catch (error) {
            this.logger.error(`Error setting cache key ${key}: ${error.message}`);
            // Don't throw - caching failures shouldn't break the app
        }
    }

    async del(key: string): Promise<void> {
        if (!this.enabled) {
            return;
        }

        try {
            await this.redis.del(key);
            this.logger.debug(`Deleted cache key: ${key}`);
        } catch (error) {
            this.logger.error(`Error deleting cache key ${key}: ${error.message}`);
        }
    }

    async clear(pattern?: string): Promise<void> {
        if (!this.enabled) {
            return;
        }

        try {
            if (pattern) {
                // Use SCAN to find keys matching pattern
                const stream = this.redis.scanStream({
                    match: pattern,
                    count: 100,
                });

                let deletedCount = 0;
                stream.on('data', async (keys: string[]) => {
                    if (keys.length > 0) {
                        await this.redis.del(...keys);
                        deletedCount += keys.length;
                    }
                });

                await new Promise<void>((resolve, reject) => {
                    stream.on('end', () => {
                        this.logger.log(`Cleared ${deletedCount} cache keys matching: ${pattern}`);
                        resolve();
                    });
                    stream.on('error', reject);
                });
            } else {
                // Clear entire cache
                await this.redis.flushdb();
                this.logger.log('Cleared entire cache');
            }
        } catch (error) {
            this.logger.error(`Error clearing cache: ${error.message}`);
        }
    }

    async isAvailable(): Promise<boolean> {
        if (!this.enabled) {
            return false;
        }

        try {
            await this.redis.ping();
            return true;
        } catch (error) {
            this.logger.error(`Redis availability check failed: ${error.message}`);
            return false;
        }
    }

    async onModuleDestroy() {
        if (this.enabled && this.redis) {
            this.logger.log('Disconnecting from Redis...');
            await this.redis.quit();
        }
    }
}
