<div dir="rtl">

# ۰۸. ماتریس‌های ردیابی

**English:** [08. Traceability Matrices](08-Traceability.md)

---

## ماتریس الف: نیازمندی عملکردی → شواهد کد

| شناسه | قابلیت | کنترلر | متد سرویس | موجودیت |
|:------|:-------|:-------|:----------|:--------|
| FR-01 | Register | `AuthController` | `register` | `User` |
| FR-02 | Login | `AuthController` | `login` | `User` |
| FR-05 | Search | `MoviesController` | `searchMovies` | `TmdbMovie` (کش) |
| FR-09 | AI Recs | `RecsController` | `getRecommendations` | — |
| FR-12 | Watchlist | `ListsController` | `addMovieToList` | `MovieList`, `ListItem` |
| FR-13 | Rating | `MoviesController` | `setUserRating` | `MovieRating` |

## ماتریس ب: NFR → مکانیزم

| شناسه NFR | نیازمندی | مکانیزم | محل شواهد |
|:----------|:---------|:--------|:----------|
| NFR-01 | Performance | کش Redis | `MoviesService` خطوط ۳۴–۳۹ (پیکربندی TTL) |
| NFR-03 | Offline | کش DB | `MoviesService.getMovieDetails` (خطوط ۱۶۷–۱۷۰) |
| NFR-05 | Security | چرخش توکن | `AuthService.refresh` (خطوط ۱۲۸–۱۳۱) |
| NFR-06 | Security | هدرها | `main.ts` (Helmet) |

</div>
