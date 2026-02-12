# 08. Traceability Matrices

**فارسی (Persian):** [۰۸. ماتریس‌های ردیابی](08-Traceability.fa.md)

---

## Matrix A: Functional Requirement -> Code Evidence

| Req ID | Feature | Controller | Service Method | Entity |
|--------|---------|------------|----------------|--------|
| FR-01 | Register | `AuthController` | `register` | `User` |
| FR-02 | Login | `AuthController` | `login` | `User` |
| FR-05 | Search | `MoviesController` | `searchMovies` | `TmdbMovie` (cache) |
| FR-09 | AI Recs | `RecsController` | `getRecommendations` | - |
| FR-12 | Watchlist | `ListsController` | `addMovieToList` | `MovieList`, `ListItem` |
| FR-13 | Rating | `MoviesController` | `setUserRating` | `MovieRating` |

## Matrix B: NFR -> Mechanism

| NFR ID | Requirement | Mechanism | Evidence Location |
|--------|-------------|-----------|-------------------|
| NFR-01 | Performance | Redis Caching | `MoviesService` lines 34-39 (TTL config) |
| NFR-03 | Offline | DB Caching | `MoviesService.getMovieDetails` (lines 167-170) |
| NFR-05 | Security | Token Rotation | `AuthService.refresh` (lines 128-131) |
| NFR-06 | Security | Headers | `main.ts` (Helmet) |
