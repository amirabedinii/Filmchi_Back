<div dir="rtl">

# ۰۰. نمای کلی پروژه

**English:** [00. Project Overview](00-Overview.md)

---

## ۱. هدف و دامنه

**Filmchi Backend API** هستهٔ هوشمند یک پلتفرم کشف فیلم است. برخلاف اپلیکیشن‌های سنتی CRUD، به‌عنوان **موتور تجمیع و شخصی‌سازی هوشمند** عمل می‌کند. هدف اصلی آن پل زدن بین پایگاه‌های دادهٔ ثابت فیلم (TMDB) و قصد پویای کاربر (پرس‌وجوهای زبان طبیعی) است، در کنار ارائهٔ سیستم مدیریت کاربری مقاوم.

**اهداف کلیدی:**
- **کشف هوشمند:** تبدیل احساسات مبهم کاربر (مثلاً «فیلم غمگین دهه ۹۰») به پیشنهادهای مشخص فیلم با استفاده از LLMها.
- **کارایی:** کاهش تأخیر و هزینهٔ APIهای خارجی با معماری «Cache-Aside» (Redis + DB محلی).
- **شخصی‌سازی:** نگهداری تاریخچه، امتیازها و لیست‌های کاربر برای بهبود پیشنهادهای بعدی.
- **حریم خصوصی:** کنترل دقیق روی نمایش‌پذیری دادهٔ کاربر.

## ۲. ذینفعان و اکتورها

| اکتور | نقش | قابلیت‌ها |
|:------|:----|:----------|
| **کاربر مهمان** | بازدیدکنندهٔ بدون احراز هویت | جستجوی فیلم، مشاهدهٔ لیست‌های ترند/پرطرفدار، ژانرها. |
| **کاربر ثبت‌نام‌شده** | عضو احراز هویت‌شده | مدیریت لیست‌ها (واچ‌لیست/تماشاشده)، امتیازدهی، دریافت پیشنهاد هوشمند، سفارشی‌سازی پروفایل. |
| **مدیر** | مدیر سیستم | (ضمنی) مدیریت حساب‌های کاربری، فیلترهای محتوای تخصصی. |
| **سیستم خارجی** | TMDB API | منبع حقیقت برای متادیتای فیلم (عنوان، پوستر، تاریخ). |
| **ارائه‌دهندهٔ هوش مصنوعی** | Ollama / LLM | لایهٔ هوشمندی برای تفسیر پرس‌وجوهای زبان طبیعی. |

## ۳. معماری سطح بالا

سیستم از معماری **مونولیت ماژولار** روی NestJS پیروی می‌کند.

```mermaid
flowchart TD
    User[Client / User] -->|HTTP/REST| API[Filmchi API Gateway (NestJS)]
    
    subgraph "Filmchi Backend"
        API --> Auth[Auth Module]
        API --> Recs[Recommendations Module]
        API --> Movies[Movies Module]
        API --> Lists[Lists Module]
        
        Recs --> LLM[LLM Service]
        Movies --> Cache[Redis Cache]
        Movies --> DB[(PostgreSQL)]
        Lists --> DB
        Auth --> DB
    end
    
    LLM -->|Generate Options| Ollama[Ollama / External LLM]
    Movies -->|Enrich Data| TMDB[TMDB API]
```

## ۴. نقشهٔ مخزن و فهرست ماژول‌ها

کدبیس بر اساس ماژول‌های دامنه (feature-sliced) سازماندهی شده است.

| ماژول | مسیر | مسئولیت‌های کلیدی |
|:------|:-----|:------------------|
| **Auth** | `src/auth/` | صدور JWT، چرخش توکن رفرش، هش (`auth.service.ts`, `jwt.strategy.ts`). |
| **Users** | `src/users/` | مدیریت پروفایل، ترجیحات، خروجی دادهٔ کاربر. |
| **Movies** | `src/movies/` | یکپارچه‌سازی TMDB، کش آفلاین، جستجو، لیست‌های ترند. |
| **Lists** | `src/lists/` | لیست‌های کاربر (واچ‌لیست، تماشاشده)، آیتم لیست. |
| **Recommendations** | `src/recommendations/` | هماهنگی پیشنهادهای LLM + غنی‌سازی TMDB. |
| **LLM** | `src/llm/` | رابط مستقل از ارائه‌دهنده (Ollama پیاده‌سازی شده). |
| **Common/Core** | `src/cache/`, `src` | راه‌اندازی Redis، فیلترهای سراسری، لاگ، پیکربندی. |

**فایل‌های پیکربندی کلیدی:**
- `package.json`: اسکریپت‌های build، test، migration.
- `docker-compose.yml`: راه‌اندازی زیرساخت (Postgres، Redis).
- `src/app.module.ts`: اتصال ماژول ریشه و اعتبارسنجی Joi برای ENV.
- `src/main.ts`: نقطهٔ ورود، Swagger، Helmet، لوله‌های سراسری.

## ۵. نقشهٔ مستندات مهندسی

- **معماری و نمودار سیستم:** [03-Architecture.md](03-Architecture.md) · [فارسی](03-Architecture.fa.md)
- **UML (Use Case، Class، Sequence، Activity):** [10-UML-Diagrams.md](10-UML-Diagrams.md) · [فارسی](10-UML-Diagrams.fa.md)
- **طراحی API و دیتابیس:** [04-API-Spec.md](04-API-Spec.md) · [فارسی](04-API-Spec.fa.md)، [05-Database-ERD.md](05-Database-ERD.md) · [فارسی](05-Database-ERD.fa.md)
- **تست و ارزیابی:** [06-Testing.md](06-Testing.md) · [فارسی](06-Testing.fa.md)، [09-Evaluation.md](09-Evaluation.md) · [فارسی](09-Evaluation.fa.md) (تأثیر کش، ارزیابی پرامپت)

</div>
