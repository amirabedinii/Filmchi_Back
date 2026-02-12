<div dir="rtl">

# ۰۷. راهنمای استقرار

**English:** [07. Deployment Runbook](07-Deployment-Runbook.md)

---

## ۱. متغیرهای محیط
اپ به `dotenv` و `@nestjs/config` با اعتبارسنجی Joi وابسته است.

| متغیر | اجباری | پیش‌فرض | منظور |
|:------|:-------|:--------|:------|
| `NODE_ENV` | بله | development | `production`, `test`, یا `development`. |
| `DATABASE_URL` | بله | — | رشتهٔ اتصال Postgres. |
| `JWT_SECRET` | بله | — | کلید امضای توکن دسترسی. |
| `REFRESH_JWT_SECRET` | بله | — | کلید امضای توکن رفرش. |
| `TMDB_API_KEY` | خیر* | — | برای پوستر/متادیتا لازم. |
| `TMDB_BEARER_TOKEN` | خیر | — | جایگزین API Key (ترجیحی). |
| `OLLAMA_URL` | بله | http://localhost:11434 | آدرس نمونه Ollama. |
| `OLLAMA_MODEL` | خیر | llama3.1 | تگ مدل. |
| `REDIS_HOST` | خیر | localhost | میز Redis. |
| `PORT` | خیر | 3001 | پورت API. |

## ۲. چک‌لیست راه‌اندازی محلی
۱. **وابستگی‌های سیستم:** Node.js 18+، Docker (برای DB/Redis).
۲. **Ollama:** نصب Ollama و دریافت مدل: `ollama run llama3.1`.
۳. **Env:** کپی `.env.example` (در صورت وجود) یا ساخت `.env` از جدول بالا.
۴. **نصب:** `yarn install`.
۵. **سرویس‌ها:** `docker-compose up -d` (Postgres، Redis).
۶. **مایگریشن:** `yarn migration:run` (در صورت دستی) یا اطمینان از `synchronize: true` در dev.
۷. **اجرا:** `yarn start:dev`.

## ۳. چک‌لیست تولید
- [ ] **دیتابیس:** PostgreSQL مدیریت‌شده در حال اجرا.
- [ ] **Redis:** Redis مدیریت‌شده (مثلاً Elasticache) در حال اجرا.
- [ ] **Env:** `NODE_ENV=production`.
- [ ] **مایگریشن:** `synchronize: false` در پیکربندی TypeORM. قبل از استارت `yarn migration:run` اجرا شود.
- [ ] **Ollama:** سایدکار یا نمونه GPU در `OLLAMA_URL` در دسترس باشد.
- [ ] **لاگ:** خروجی JSON (Pino) مناسب برای Datadog/Splunk.
- [ ] **امنیت:** CORS فعال است؛ `CORS_ORIGIN` با دامنهٔ فرانت مطابقت داشته باشد.

## ۴. مشاهده‌پذیری
- **لاگ‌ها:** JSON ساختاریافته. ردیابی Request ID خودکار است.
- **حذف حساس:** `req.headers.authorization` در لاگ حذف می‌شود.
  - شواهد: `src/app.module.ts` خط ۲۶.

</div>
