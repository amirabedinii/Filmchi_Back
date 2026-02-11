<div dir="rtl">

# Filmchi API

**English:** [README.md](README.md)

---

Filmchi یک بک‌اند NestJS است که احراز هویت، لیست‌های شخصی فیلم و پیشنهاد فیلم مبتنی بر هوش مصنوعی (غنی‌شده با متادیتای TMDB) ارائه می‌دهد.

## راه‌اندازی پروژه

```bash
$ yarn install
```

## محیط

متغیرهای محیط را در `.env.development` (پیش‌فرض)، `.env.test` (تست) یا `.env` (تولید) تنظیم کنید.

```
NODE_ENV=development
DATABASE_URL=postgres://user:pass@localhost:5432/filmchi
JWT_SECRET=replace-with-16+chars
JWT_EXPIRES_IN=1d
REFRESH_JWT_SECRET=replace-with-16+chars
REFRESH_JWT_EXPIRES_IN=7d
TMDB_API_KEY=your_tmdb_key
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

نکات:
- در تست‌ها از دیتابیس sqlite در حافظه به‌صورت خودکار استفاده می‌شود.
- `TMDB_API_KEY` می‌تواند خالی باشد؛ در آن صورت غنی‌سازی پیشنهادها از TMDB انجام نمی‌شود.
- اختیاری: `TMDB_BEARER_TOKEN` برای احراز Bearer نسخه ۴ TMDB (ترجیحی).
- `OLLAMA_URL` برای تولید پیشنهاد لازم است.

## کامپایل و اجرا

```bash
# توسعه
$ yarn run start

# حالت تماشا
$ yarn run start:dev

# تولید
$ yarn run start:prod
```

مستندات API در `/docs` (Swagger).

## اجرای تست‌ها

```bash
$ yarn run test        # تست واحد
$ yarn run test:e2e    # تست e2e
$ yarn run test:cov    # پوشش
```

## مستندات (مهندسی و طراحی)

همهٔ مستندات در **دو نسخه** هستند: انگلیسی (`.md`) و فارسی (`.fa.md`، راست‌چین).

- **فهرست:** [docs/INDEX.md](docs/INDEX.md) — لیست همهٔ مستندات با لینک به هر دو زبان.

ارزیابی کش و پرامپت: [docs/09-Evaluation.fa.md](docs/09-Evaluation.fa.md) و اسکریپت `scripts/benchmark-cache.sh`.

## منابع

- مستندات NestJS: https://docs.nestjs.com

## مجوز

MIT

</div>
