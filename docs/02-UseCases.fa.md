<div dir="rtl">

# ۰۲. موارد استفاده

**English:** [02. Use Cases](02-UseCases.md)

---

## ۱. احراز هویت

### UC-01: ورود کاربر
- **پیش‌شرط:** کاربر ثبت‌نام کرده است.
- **جریان اصلی:**
  ۱. کاربر ایمیل + پسورد ارسال می‌کند.
  ۲. سیستم تطابق هش با DB را بررسی می‌کند.
  ۳. سیستم توکن دسترسی (کوتاه‌عمر) و توکن رفرش (بلندعمر) تولید می‌کند.
  ۴. سیستم `refreshTokenHash` کاربر را در DB به‌روز می‌کند.
- **پس‌شرط:** کاربر توکن معتبر دارد.

```mermaid
sequenceDiagram
    participant C as Client
    participant A as AuthController
    participant S as AuthService
    participant DB as Postgres

    C->>A: POST /auth/login {email, pass}
    A->>S: login(dto)
    S->>DB: findOne(email)
    DB-->>S: User entity (with hash)
    S->>S: bcrypt.compare(pass, hash)
    S->>S: generate tokens
    S->>DB: save(refreshTokenHash)
    S-->>A: tokens
    A-->>C: 200 OK {accessToken, refreshToken}
```

### UC-02: تمدید توکن
- **پیش‌شرط:** توکن دسترسی منقضی شده، توکن رفرش معتبر.
- **جریان اصلی:**
  ۱. کلاینت توکن رفرش می‌فرستد.
  ۲. سیستم امضا و `tokenVersion` را بررسی می‌کند.
  ۳. سیستم توکن را می‌چرخاند: توکن رفرش جدید تولید، `tokenVersion` افزایش.
- **جایگزین:** در صورت استفادهٔ مجدد از توکن قدیمی، باطل‌سازی (با بررسی نسخه).

## ۲. پیشنهادها

### UC-03: دریافت پیشنهاد هوشمند
- **پیش‌شرط:** کاربر وارد شده، Ollama در حال اجرا.
- **جریان اصلی:**
  ۱. کاربر کوئری می‌فرستد مثلاً «فیلم ترسناک دهه ۸۰».
  ۲. سیستم واچ‌لیست + تاریخچهٔ تماشاشده را می‌گیرد.
  ۳. سیستم با کوئری + تاریخچه به LLM پرامپت می‌دهد.
  ۴. LLM لیست عنوان برمی‌گرداند.
  ۵. سیستم عنوان‌ها را با دادهٔ TMDB (پوستر، ID) به‌صورت موازی غنی می‌کند.
  ۶. JSON غنی‌شده برمی‌گردد.

```mermaid
sequenceDiagram
    participant U as User
    participant C as RecController
    participant S as RecService
    participant L as LLMService
    participant T as TmdbService

    U->>C: POST /recommendations {query: "..."}
    C->>S: getRecommendations(userId, query)
    S->>S: Fetch User History (Lists)
    S->>L: generate({query, history})
    L->>L: Build Prompt
    L-->>S: [{title: "The Thing", year: 1982}, ...]
    
    loop Parallel Batch Enrichment
        S->>T: findOnTmdb("The Thing")
        T-->>S: fullDetails (Poster, Overview)
    end
    
    S-->>C: Enriched List
    C-->>U: JSON Response
```

## ۳. مدیریت لیست

### UC-04: افزودن فیلم به لیست
- **پیش‌شرط:** کاربر وارد شده.
- **جریان اصلی:**
  ۱. کاربر یک فیلم (TMDB ID) انتخاب می‌کند.
  ۲. کاربر لیست هدف (مثلاً «واچ‌لیست») را انتخاب می‌کند.
  ۳. سیستم وجود لیست را بررسی می‌کند (ساخت lazy).
  ۴. سیستم آیتم را به لیست اضافه می‌کند.

```mermaid
sequenceDiagram
    participant C as Client
    participant LC as ListController
    participant LS as ListService
    participant R as Repository

    C->>LC: POST /lists/watchlist {tmdbId: 123, title: "Dune"}
    LC->>LS: addMovieToList(...)
    LS->>R: findOne(MovieList)
    alt List does not exist
        LS->>R: create(MovieList)
    end
    LS->>R: save(ListItem)
    R-->>LS: Saved Item
    LS-->>LC: Item DTO
    LC-->>C: 201 Created
```

## ۴. سایر موارد استفاده
- **UC-05: مشاهده جزئیات فیلم** (مسیر کش: Redis → DB → TMDB).
- **UC-06: امتیاز به فیلم** (Upsert `MovieRating`).
- **UC-07: جستجوی فیلم** (فیلتر ژانر/سال → کش → TMDB).
- **UC-08: خروجی داده** (JSON تجمیعی از کل فعالیت کاربر).

</div>
