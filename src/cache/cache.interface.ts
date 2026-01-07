/**
 * Cache provider interface
 * Provides abstraction over caching implementation (Redis, Memcached, etc.)
 */
export interface ICacheProvider {
  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache (will be JSON stringified)
   * @param ttl Time to live in seconds (optional)
   */
  set(key: string, value: any, ttl?: number): Promise<void>;

  /**
   * Delete a value from cache
   * @param key Cache key
   */
  del(key: string): Promise<void>;

  /**
   * Clear cache entries matching a pattern
   * @param pattern Key pattern (e.g., 'movie:*')
   */
  clear(pattern?: string): Promise<void>;

  /**
   * Check if cache is available/connected
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Token for dependency injection
 */
export const CACHE_PROVIDER = 'CACHE_PROVIDER';
