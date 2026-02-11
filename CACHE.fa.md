<div dir="rtl">

# پیکربندی کش Redis

**English:** [CACHE.md](CACHE.md)

---

این سند سیستم کش پیاده‌سازی‌شده در بک‌اند Filmchi را توضیح می‌دهد.

## معماری

سیستم کش از **الگوی cache provider** استفاده می‌کند که پیاده‌سازی کش را انتزاع می‌دهد. این کار تعویض backendهای مختلف (Redis، Memcached، درون‌حافظه و غیره) را بدون تغییر منطق کسب‌وکار ممکن می‌کند.

### اجزا
۱. **اینترفیس ICacheProvider** (`src/cache/cache.interface.ts`) — قرارداد عملیات کش؛ متدها: `get()`, `set()`, `del()`, `clear()`, `isAvailable()`  
۲. **RedisCacheProvider** (`src/cache/redis-cache.provider.ts`) — پیاده‌سازی Redis با `ioredis`؛ مدیریت اتصال و بازیابی خطا؛ در صورت خطای کش به‌صورت نرم کاهش کارایی می‌دهد.  
۳. **CacheModule** (`src/cache/cache.module.ts`) — ماژول سراسری NestJS؛ توکن تزریق `CACHE_PROVIDER`.

## پیکربندی

### متغیرهای محیط
در `.env` اضافه کنید:

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_ENABLED=true
```

### راه‌اندازی توسعه
۱. نصب Redis (مثلاً `brew install redis` یا Docker).  
۲. بررسی: `redis-cli ping` → PONG.  
۳. اجرای اپ: `npm run start:dev`.

### راه‌اندازی تولید
از سرویس مدیریت‌شده Redis (مثلاً AWS ElastiCache) استفاده کنید و متغیرهای محیط را تنظیم کنید.

## استراتژی کش

الگوی **cache-aside (lazy loading)**:
۱. بررسی وجود داده در کش  
۲. در صورت وجود (hit) برگرداندن دادهٔ کش‌شده  
۳. در صورت نبود (miss) واکشی از TMDB  
۴. ذخیره در کش با TTL مناسب  
۵. برگرداندن داده  

### مقادیر TTL
| نوع داده | TTL | دلیل |
|:--------|:----|:-----|
| جزئیات فیلم | ۲۴ ساعت | متادیتای فیلم کم تغییر می‌کند |
| لیست‌های فیلم | ۱ ساعت | لیست‌ها بیشتر به‌روز می‌شوند |
| نتایج جستجو | ۳۰ دقیقه | کوئری‌های کاربری متنوع |
| ژانرها | ۷ روز | لیست ژانر پایدار است |

### کلیدهای کش
- جزئیات فیلم: `movie:details:{tmdbId}:{language}`
- لیست فیلم: `movie:list:{kind}:{page}:{language}:{filterJSON}`
- جستجو: `movie:search:{query}:{page}:...`
- ژانرها: `movie:genres:{language}`

دادهٔ وابسته به کاربر (امتیاز، بوکمارک) **کش نمی‌شود**.

## غیرفعال کردن کش
در `.env`: `CACHE_ENABLED=false` — همهٔ درخواست‌ها مستقیم به TMDB می‌روند.

## خطاها
در صورت در دسترس نبودن Redis، اپ بدون خطا به واکشی مستقیم از TMDB ادامه می‌دهد؛ خطاهای کش فقط لاگ می‌شوند.

</div>
