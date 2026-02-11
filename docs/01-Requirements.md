# 01. Requirements & Constraints

## 1. Functional Requirements (FR)

### **Authentication & Identity**
| ID | Requirement | Evidence |
|----|-------------|----------|
| **FR-01** | User must be able to register with email/password. | `src/auth/auth.controller.ts` (register) |
| **FR-02** | User must be able to login and receive Access + Refresh tokens. | `src/auth/auth.service.ts` (login) |
| **FR-03** | detailed Profile management (Avatar, Bio, Location). | `src/users/entities/user.entity.ts` |
| **FR-04** | Users can manage privacy settings and content filters. | `src/users/users.controller.ts` (updatePrivacy) |

### **Movie Discovery & Data**
| ID | Requirement | Evidence |
|----|-------------|----------|
| **FR-05** | System must provide standard lists: Trending, Popular, Top Rated, Upcoming. | `src/movies/movies.controller.ts` |
| **FR-06** | System must support text search with filters (Year, Genre). | `src/movies/movies.service.ts` (searchMovies) |
| **FR-07** | System must cache TMDB data for offline resilience. | `src/entities/tmdb-movie.entity.ts` |
| **FR-08** | System must support fetching similar movies. | `src/movies/tmdb.service.ts` (getSimilar) |

### **Recommendations (AI)**
| ID | Requirement | Evidence |
|----|-------------|----------|
| **FR-09** | User can ask for recommendations using natural language. | `src/recommendations/recommendations.controller.ts` |
| **FR-10** | Recommendations must be personalized based on Watchlist/History. | `src/recommendations/recommendations.service.ts` (lines 38-59) |
| **FR-11** | Persian queries must return Iranian movie suggestions explicitly. | `src/llm/services/llm.service.ts` (lines 140-144) |

### **User Lists & Interaction**
| ID | Requirement | Evidence |
|----|-------------|----------|
| **FR-12** | Users can create/manage standard lists (Watchlist, Watched). | `src/lists/lists.service.ts` |
| **FR-13** | Users can rate movies (1-10 scale). | `src/movies/movies.controller.ts` (rate) |
| **FR-14** | Users can export their data (GDPR compliance helper). | `src/users/users.service.ts` (exportData) |

## 2. Non-Functional Requirements (NFR)

### **Performance & Caching**
- **NFR-01 (Response Time):** Public lists (Trending/Popular) must be cached to ensure sub-50ms response times on cache hits.
  - *Evidence:* `src/movies/movies.service.ts` (CACHE_TTL logic, Redis usage).
- **NFR-02 (Concurrency):** Enrichment of AI recommendations must run in parallel batches (limit 3) to reduce total latency.
  - *Evidence:* `src/recommendations/recommendations.service.ts` (Promise.all in batches).

### **Reliability & Resilience**
- **NFR-03 (Offline Mode):** Movie details once fetched must be stored in DB (`tmdb_movies`) to survive API outages.
  - *Evidence:* `src/movies/movies.service.ts` (getMovieDetails: DB first, then API).
- **NFR-04 (Fallback):** If TMDB auth is missing, recommendations should still return raw text/titles.
  - *Evidence:* `src/recommendations/recommendations.service.ts` (blocks returning minimal data).

### **Security**
- **NFR-05 (Token Rotation):** Refresh tokens must be rotated on use to prevent replay attacks; old tokens are invalidated via versioning.
  - *Evidence:* `src/auth/auth.service.ts` (tokenVersion logic in refresh).
- **NFR-06 (Headers):** Application must use Helmet for security headers and CORS for origin control.
  - *Evidence:* `src/main.ts` (helmet(), enableCors()).

## 3. Assumptions & Constraints
- **Constraint 01:** TMDB API Key is required for rich metadata/posters. Without it, the app operates in text-only mode for recommendations.
- **Constraint 02:** The Local LLM (Ollama) requires significant RAM; `OLLAMA_URL` must point to a running instance.
- **Assumption 01:** The database schema uses UUIDs for internal logical IDs but preserves integer IDs for TMDB references.
- **Assumption 02:** Persian language support relies on specific prompt engineering (`llm.service.ts`) rather than a fine-tuned model.

## 4. Traceability Mini-Table
| Goal | Component | Status | Code Ref |
|------|-----------|--------|----------|
| **Smart Recs** | LLM Service | Implemented | `src/llm` |
| **Data Cache** | TMDB Entity | Implemented | `src/entities/tmdb-movie.entity.ts` |
| **Token Auth** | Passport-JWT | Implemented | `src/auth/jwt.strategy.ts` |
| **User Lists** | List Module | Implemented | `src/lists` |
