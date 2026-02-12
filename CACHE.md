# Redis Cache Configuration

**فارسی (Persian):** [CACHE.fa.md](CACHE.fa.md)

---

This document explains the caching system implemented in the Filmchi backend.

## Architecture

The caching system follows a **cache provider pattern** that abstracts the caching implementation. This allows for easy swapping between different cache backends (Redis, Memcached, in-memory, etc.) without changing the business logic.

### Components

1. **ICacheProvider Interface** (`src/cache/cache.interface.ts`)
   - Defines the contract for cache operations
   - Methods: `get()`, `set()`, `del()`, `clear()`, `isAvailable()`

2. **RedisCacheProvider** (`src/cache/redis-cache.provider.ts`)
   - Redis implementation using `ioredis` library
   - Handles connection management and error recovery
   - Gracefully degrades on cache failures (doesn't break the app)

3. **CacheModule** (`src/cache/cache.module.ts`)
   - Global NestJS module that provides the cache service
   - Uses dependency injection token `CACHE_PROVIDER`

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Redis Configuration
REDIS_HOST=localhost        # Redis server host (default: localhost)
REDIS_PORT=6379            # Redis server port (default: 6379)
REDIS_PASSWORD=            # Redis password (optional)
REDIS_DB=0                 # Redis database number (default: 0)
CACHE_ENABLED=true         # Enable/disable caching (default: true)
```

### Development Setup

1. **Install Redis**:
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Ubuntu/Debian
   sudo apt-get install redis-server
   sudo systemctl start redis
   
   # Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

2. **Verify Redis is running**:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

3. **Start the application**:
   ```bash
   npm run start:dev
   ```

### Production Setup

For production, use a managed Redis service (AWS ElastiCache, Redis Cloud, etc.) and set the environment variables accordingly:

```bash
REDIS_HOST=your-redis-host.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
REDIS_DB=0
CACHE_ENABLED=true
```

## Cache Strategy

The system uses a **cache-aside (lazy loading)** pattern:

1. Check if data exists in cache
2. If found (cache hit), return cached data
3. If not found (cache miss), fetch from TMDB API
4. Store the fetched data in cache with appropriate TTL
5. Return the data

### TTL (Time To Live) Values

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Movie Details | 24 hours | Movie metadata rarely changes |
| Movie Lists (popular, trending, etc.) | 1 hour | Lists update frequently |
| Search Results | 30 minutes | User-driven queries, may vary |
| Genres | 7 days | Genre list is very stable |

### Cache Keys

Cache keys follow a structured naming convention:

- Movie details: `movie:details:{tmdbId}:{language}`
- Movie lists: `movie:list:{kind}:{page}:{language}:{filterJSON}`
- Search results: `movie:search:{query}:{page}:{year}:{genres}:{sortBy}:{language}:{filterJSON}`
- Similar movies: `movie:similar:{tmdbId}:{page}:{language}:{filterJSON}`
- Genres: `movie:genres:{language}`

### User-Specific Data

User-specific data (ratings, bookmarks) is **not cached** to ensure data consistency and privacy.

## Cache Management

### Viewing Cache Contents

Use the Redis CLI to inspect cached data:

```bash
# Connect to Redis
redis-cli

# List all cache keys
KEYS movie:*

# View a specific cache entry
GET movie:details:550:en

# Check TTL of a key
TTL movie:details:550:en

# Count total keys
DBSIZE
```

### Clearing the Cache

#### Clear All Movie Cache
```bash
redis-cli
KEYS movie:* | xargs redis-cli DEL
```

#### Clear Specific Cache Pattern
```bash
# Clear all movie details cache
redis-cli --scan --pattern "movie:details:*" | xargs redis-cli DEL

# Clear all trending lists
redis-cli --scan --pattern "movie:list:trending:*" | xargs redis-cli DEL
```

#### Clear Entire Cache Database
```bash
redis-cli FLUSHDB
```

### Programmatic Cache Management

You can inject the cache provider in any service to manage cache:

```typescript
import { Inject } from '@nestjs/common';
import { CACHE_PROVIDER } from '../cache/cache.interface';
import type { ICacheProvider } from '../cache/cache.interface';

export class SomeService {
  constructor(
    @Inject(CACHE_PROVIDER)
    private readonly cache: ICacheProvider,
  ) {}

  async clearMovieCache() {
    await this.cache.clear('movie:*');
  }
}
```

## Disabling Cache

### For Development/Debugging

Set `CACHE_ENABLED=false` in your `.env` file:

```bash
CACHE_ENABLED=false
```

This will disable caching completely without requiring code changes. All requests will go directly to the TMDB API.

### Temporarily Disable for Testing

```bash
# Run with cache disabled
CACHE_ENABLED=false npm run start:dev
```

## Monitoring

### Cache Hit Rate

The cache provider logs all cache hits and misses at DEBUG level. To monitor:

1. Set log level to `debug` in development
2. Check logs for:
   - `Cache hit: {key}` - Data was found in cache
   - `Cache miss: {key}` - Data was fetched from TMDB

### Redis Connection Health

The cache provider monitors Redis connection status:

- `Connected to Redis at {host}:{port}` - Successful connection
- `Redis connection failed, retrying...` - Connection issues
- `Redis connection closed` - Disconnection event

### Availability Check

You can check if Redis is available:

```typescript
const isAvailable = await this.cache.isAvailable();
```

## Error Handling

The cache system is designed to **gracefully degrade** on failures:

- If Redis is unavailable, the app continues to work by fetching directly from TMDB
- Cache errors are logged but don't throw exceptions
- The application never breaks due to cache failures

## Performance Considerations

### Benefits
- **Reduced API calls** to TMDB (cost saving)
- **Faster response times** for cached data
- **Lower latency** for end users
- **API rate limit protection**

### Memory Usage
- Monitor Redis memory usage with: `INFO memory` in Redis CLI
- Set `maxmemory` policy in Redis config for production
- Recommended policy: `allkeys-lru` (evict least recently used keys)

## Troubleshooting

### Cache not working
1. Check if `CACHE_ENABLED=true`
2. Verify Redis is running: `redis-cli ping`
3. Check application logs for connection errors
4. Verify environment variables are set correctly

### Stale data in cache
1. Wait for TTL to expire, or
2. Clear specific cache keys manually
3. Adjust TTL values if needed

### Redis connection errors
1. Check Redis is running
2. Verify host and port configuration
3. Check firewall rules (production)
4. Verify credentials if using password authentication

## Future Enhancements

Potential improvements to consider:

1. **Cache warming** - Pre-populate cache with popular movies
2. **Cache invalidation API** - Endpoint to manually invalidate specific keys
3. **Metrics dashboard** - Track cache hit/miss rates
4. **Multi-level caching** - Add in-memory cache layer (Redis + Node cache)
5. **Conditional caching** - Cache based on request frequency
