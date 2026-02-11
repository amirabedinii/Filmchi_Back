<div dir="rtl">

# ۱۰. نمودارهای UML

**English:** [10. UML Diagrams](10-UML-Diagrams.md)

---

این سند نمودارهای UML مورد نیاز برای نشان دادن طراحی مهندسی‌شده سیستم را گردآوری می‌کند.

---

## ۱. نمودار مورد استفاده (Use Case Diagram)

نمای Use Case برای اکتورهای اصلی و موارد استفاده.

```mermaid
flowchart LR
    subgraph Actors["اکتورها"]
        Guest[مهمان]
        User[کاربر ثبت‌نام‌شده]
        Admin[مدیر]
        TMDB[TMDB API]
        LLM[سرویس LLM]
    end

    subgraph GuestCases["استفاده‌های مهمان"]
        UC_Search[جستجوی فیلم]
        UC_Trending[ترند / پرطرفدار]
        UC_Genres[ژانرها]
    end

    subgraph UserCases["استفاده‌های کاربر"]
        UC_Login[ورود]
        UC_Register[ثبت‌نام]
        UC_Refresh[تمدید توکن]
        UC_Profile[پروفایل]
        UC_Lists[لیست‌ها: واچ‌لیست / تماشاشده]
        UC_Rate[امتیازدهی]
        UC_Recs[پیشنهاد هوشمند]
        UC_Export[خروجی داده]
    end

    Guest --> GuestCases
    User --> UserCases
    User --> UC_Login
    User --> UC_Register
    User --> UC_Refresh
    Admin -.->|مدیریت| User
    UC_Recs --> LLM
    UC_Search --> TMDB
```

**جدول Use Case (خلاصه):**

| شناسه | عنوان | اکتور اصلی | پیش‌نیاز |
|:------|:------|:-----------|:---------|
| UC-01 | ورود | کاربر | ثبت‌نام |
| UC-02 | تمدید توکن | کاربر | توکن منقضی‌شده |
| UC-03 | دریافت پیشنهاد هوشمند | کاربر | ورود، Ollama/LLM |
| UC-04 | افزودن فیلم به لیست | کاربر | ورود |
| UC-05 | مشاهده جزئیات فیلم | مهمان/کاربر | — |
| UC-06 | امتیازدهی به فیلم | کاربر | ورود |
| UC-07 | جستجوی فیلم | مهمان/کاربر | — |
| UC-08 | خروجی داده (Export) | کاربر | ورود |

---

## ۲. نمودار کلاس (لایه دامنه / اپلیکیشن)

نمای کلاس‌های اصلی در لایه سرویس و کنترلر (بدون جزئیات TypeORM/DB).

```mermaid
classDiagram
    class AuthController {
        +register(dto)
        +login(dto)
        +refresh(dto)
        +logout(dto)
    }
    class AuthService {
        +register(dto)
        +login(dto)
        +refresh(dto)
        -hashPassword()
        -generateTokens()
    }
    class UsersService {
        +getProfile(userId)
        +updateProfile(userId, dto)
        +exportData(userId)
    }
    class MoviesController {
        +search(query, filters)
        +getDetails(id)
        +getTrending()
        +rate(id, rating)
    }
    class MoviesService {
        -CACHE_TTL
        +searchMovies(options)
        +getMovieDetails(id)
        +getTrending()
        -getSearchCacheKey()
    }
    class ListsService {
        +getMoviesForList(userId, listName, opts)
        +addMovieToList(userId, listName, dto)
        +removeFromList(userId, listName, tmdbId)
    }
    class RecommendationsController {
        +getRecommendations(dto)
    }
    class RecommendationsService {
        +getRecommendations(userId, query, lang, filter)
        -findOnTmdb()
        -pickBestTmdbMatch()
    }
    class LLMService {
        +generateMovieRecommendations(request)
        -buildMovieRecommendationPrompt()
        -getMovieRecommendationSchema()
    }
    class TmdbService {
        +searchMovie(title, year, page, lang)
        +getMovieDetails(tmdbId, lang)
        +getTrending()
    }
    class ICacheProvider {
        <<interface>>
        +get(key)
        +set(key, value, ttl)
        +del(key)
        +isAvailable()
    }

    AuthController --> AuthService
    AuthService --> UsersService
    MoviesController --> MoviesService
    MoviesService --> TmdbService
    MoviesService --> ICacheProvider
    RecommendationsController --> RecommendationsService
    RecommendationsService --> ListsService
    RecommendationsService --> LLMService
    RecommendationsService --> TmdbService
    LLMService ..> ICacheProvider : optional
```

**توضیح:** ارتباط با دیتابیس از طریق TypeORM Repository در هر سرویس است و برای سادگی در نمودار نیامده است.

---

## ۳. نمودار توالی — دریافت پیشنهاد هوشمند

همان سناریوی UC-03 با تأکید بر ترتیب فراخوانی سرویس‌ها.

```mermaid
sequenceDiagram
    participant U as User
    participant RC as RecommendationsController
    participant RS as RecommendationsService
    participant LS as ListsService
    participant LLM as LLMService
    participant TMDB as TmdbService
    participant Cache as Cache/DB

    U->>RC: POST /recommendations { query }
    RC->>RS: getRecommendations(userId, query, ...)
    RS->>LS: getMoviesForList(userId, "watched")
    LS-->>RS: watched[]
    RS->>LS: getMoviesForList(userId, "watchlist")
    LS-->>RS: watchlist[]
    RS->>RS: historyTitles = watched + watchlist
    RS->>LLM: generateMovieRecommendations({ query, userHistory })
    LLM->>LLM: buildPrompt()
    LLM-->>RS: [{ title, year, reason }]
    loop برای هر پیشنهاد (batch 3)
        RS->>TMDB: searchMovie(title, year)
        TMDB->>Cache: get/set
        Cache-->>TMDB: hit or fetch
        TMDB-->>RS: result
        RS->>TMDB: getMovieDetails(id)
        TMDB-->>RS: details
    end
    RS->>RS: filter (poster, content)
    RS-->>RC: EnrichedRecommendation[]
    RC-->>U: 200 OK JSON
```

---

## ۴. نمودار فعالیت — جریان کش (Cache-Aside) برای فیلم

فعالیت‌های تصمیم‌گیری و مراحل در مسیر درخواست فیلم (جستجو یا جزئیات).

```mermaid
flowchart TD
    Start([درخواست فیلم]) --> BuildKey[ساخت cache key]
    BuildKey --> CheckRedis{Redis در دسترس؟}
    CheckRedis -->|خیر| FetchSource
    CheckRedis -->|بله| GetRedis[get از Redis]
    GetRedis --> HasValue{مقدار وجود دارد؟}
    HasValue -->|بله| ReturnCached[برگشت داده از کش]
    HasValue -->|خیر| CheckDB{داده در DB؟}
    CheckDB -->|بله| LoadDB[خواندن از PostgreSQL]
    LoadDB --> SetRedis1[set در Redis با TTL]
    SetRedis1 --> ReturnDB[برگشت داده]
    CheckDB -->|خیر| FetchSource[درخواست به TMDB]
    FetchSource --> TMDBResp{پاسخ موفق؟}
    TMDBResp -->|خیر| ReturnEmpty[برگشت خطا / خالی]
    TMDBResp -->|بله| SaveDB[ذخیره در DB]
    SaveDB --> SetRedis2[set در Redis با TTL]
    SetRedis2 --> ReturnNew[برگشت داده جدید]
    ReturnCached --> End([پایان])
    ReturnDB --> End
    ReturnNew --> End
    ReturnEmpty --> End
```

---

## ۵. ارجاع به مستندات مرتبط

| نمودار | جزئیات بیشتر |
|:-------|:-------------|
| Use Case متنی + توالی لاگین/لیست | `02-UseCases.md` · `02-UseCases.fa.md` |
| ERD و مدل دیتابیس | `05-Database-ERD.md` · `05-Database-ERD.fa.md` |
| جریان کش و توصیه | `03-Architecture.md` · `03-Architecture.fa.md` |
| طراحی API | `04-API-Spec.md` · `04-API-Spec.fa.md` |

</div>
