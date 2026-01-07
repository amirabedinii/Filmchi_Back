import { Global, Module } from '@nestjs/common';
import { RedisCacheProvider } from './redis-cache.provider';
import { CACHE_PROVIDER } from './cache.interface';

/**
 * Global cache module
 * Provides caching functionality throughout the application
 */
@Global()
@Module({
  providers: [
    {
      provide: CACHE_PROVIDER,
      useClass: RedisCacheProvider,
    },
  ],
  exports: [CACHE_PROVIDER],
})
export class CacheModule {}
