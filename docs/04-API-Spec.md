# 04. API Specification

## 1. Overview
- **Base URL**: `/api/v1` (configured in `main.ts`)
- **Documentation**: Swagger UI available at `/docs` (configured in `main.ts`, line 48).
- **Formats**: JSON bodies, JSON responses.

## 2. Authentication (`/auth`)
| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/register` | Public | `{email, password}` | `{accessToken, refreshToken}` |
| POST | `/login` | Public | `{email, password}` | `{accessToken, refreshToken}` |
| POST | `/refresh` | Public | `{refreshToken}` | `{accessToken, refreshToken}` |
| POST | `/logout` | Public | `{refreshToken}` | `{success: true}` |

## 3. Users (`/users`)
| Method | Path | Auth | Key Query Params | Description |
|--------|------|------|------------------|-------------|
| GET | `/profile` | JWT | - | Get current profile details. |
| PUT | `/profile` | JWT | - | Update `displayName`, `bio`, `avatarUrl`. |
| GET | `/stats` | JWT | - | Count of lists/ratings. |
| PUT | `/preferences` | JWT | - | Update JSON preferences. |
| GET | `/export` | JWT | - | Full JSON dump of user data. |
| DELETE | `/account` | JWT | - | Soft delete user. |

## 4. Movies (`/movies`)
| Method | Path | Auth | Query Params | Description |
|--------|------|------|--------------|-------------|
| GET | `/search` | - | `q`, `year`, `page`, `with_genres` | Search movies (cached). |
| GET | `/:id` | Opt | `lang` | Movie details (DB copy). |
| GET | `/trending` | - | `page`, `lang` | Weekly trending. |
| GET | `/popular` | - | `page`, `lang` | Popular movies. |
| POST | `/:id/rating` | JWT | - | Body: `{rating: 1-10}`. |
| POST | `/:id/bookmark` | JWT | - | Legacy bookmark support. |

## 5. Lists (`/lists`)
| Method | Path | Auth | Request/Query | Description |
|--------|------|------|---------------|-------------|
| GET | `/:listName` | JWT | `page`, `limit`, `sort` | Get items (e.g., 'watchlist'). |
| POST | `/:listName` | JWT | Body: `{tmdbId, title, posterPath}` | Add item to list. |
| DELETE | `/:listName/:id` | JWT | - | Remove movie (tmdbId) from list. |

## 6. Recommendations (`/recommendations`)
| Method | Path | Auth | Request Body | Description |
|--------|------|------|--------------|-------------|
| POST | `/` | JWT | `{query: "string", language?: "en", contentFilter?: {}}` | Get enriched AI suggestions. |

## 7. Pagination & Filtering
- **Pagination**: Standard `page` (1-indexed) and `limit` query params implemented in Controllers.
  - Evidence: `src/lists/lists.controller.ts` (lines 40-41).
- **Sorting**: Supported in Lists API via `sort=addedAt:asc|desc`.
