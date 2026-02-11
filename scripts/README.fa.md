<div dir="rtl">

# اسکریپت‌ها

**English:** [README.md](README.md)

---

## benchmark-cache.sh

بنچمارک تأثیر کش روی زمان پاسخ.

### پیش‌نیاز
- سرور Filmchi در حال اجرا (مثلاً `npm run start:dev` یا `yarn start:dev`)
- برای مقایسهٔ واقعی: یک بار سرور با `CACHE_ENABLED=false` و یک بار با `CACHE_ENABLED=true`

### اجرا
```bash
chmod +x scripts/benchmark-cache.sh
./scripts/benchmark-cache.sh
# یا با آدرس دیگر:
./scripts/benchmark-cache.sh http://localhost:4000
```

### خروجی
- زمان پاسخ برای اولین درخواست (سرد)
- زمان پاسخ برای چند درخواست تکراری (گرم)
- با کش روشن، درخواست‌های گرم باید به‌طور محسوس سریع‌تر باشند.

جزئیات روش ارزیابی در **docs/09-Evaluation.fa.md** (بخش ارزیابی کش).

</div>
