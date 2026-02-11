# 03. Architecture & Design

## 1. Modular Structure (NestJS)
The application is structured as a **Modular Monolith**. Separation of concerns is enforced via Module boundaries.

| Module | Responsibility | Inter-module Dependencies |
|--------|----------------|---------------------------|
| `AppModule` | Root orchestration, Config, DB connection | Imports all others |
| `AuthModule` | JWT strategies, Login logic | Uses `UsersModule` |
| `MoviesModule` | TMDB interface, Caching, Movie Entities | Uses `CacheModule` |
| `ListsModule` | User Lists (Watchlist), List Items | - |
| `RecommendationsModule` | Business logic for AI suggestions | Uses `LLMModule`, `ListsModule`, `MoviesModule` |
| `LLMModule` | Provider abstraction (Ollama) | - |
| `UsersModule` | Profile and Ratings data | - |

## 2. Cross-Cutting Concerns
- **Validation**: Global `ValidationPipe` with `class-validator` ensures DTOs are strict (whitelisted).
  - Evidence: `src/main.ts` (lines 22-26).
- **Error Handling**: Standard NestJS HttpExceptions (`NotFoundException`, `UnauthorizedException`).
- **Logging**: `nestjs-pino` wraps every request with structured JSON logging (auto-redacting Authorization headers).
  - Evidence: `src/app.module.ts` (lines 19-28).
- **Security**:
  - `Helmet`: Applied globally in `main.ts`.
  - `Throttler`: Rate limiting (60 requests/min default) configured in `AppModule`.
  - `Guards`: `JwtAuthGuard` used on protected routes.

## 3. Data Flow: Caching Strategy
The system uses a **multi-layer cache** strategy for Movie Data to ensure resilience and performance.

```mermaid
flowchart LR
    Request --> CheckRedis{Redis Cache?}
    CheckRedis -- Yes --> Return[Return JSON]
    CheckRedis -- No --> CheckDB{Local DB?}
    
    CheckDB -- Yes --> UpdateRedis[Set Redis]
    UpdateRedis --> Return
    
    CheckDB -- No --> FetchTMDB[Fetch TMDB API]
    FetchTMDB --> PersistDB[Save to DB (jsonb)]
    PersistDB --> UpdateRedis
```
**Key Design Decision:**
- **Evidence:** `src/movies/movies.service.ts` -> `searchMovies` and `getMovieDetails` methods.
- **Why?** TMDB has rate limits and latency. Storing the "clean" JSON in Postgres (`TmdbMovie` entity) allows the app to function even if TMDB is down, effectively building a local mirror of popular content over time.

## 4. Data Flow: Recommendations Pipeline
Dependencies between modules to fulfill an AI request.

```mermaid
flowchart TD
    UserQuery --> RecService
    RecService -->|Get History| ListsModule
    ListsModule -->|Return Titles| RecService
    
    RecService -->|Prompt Engineering| LLMService
    LLMService -->|Generate| Ollama
    Ollama -->|Raw JSON| LLMService
    LLMService -->|Titles| RecService
    
    RecService -->|For Each Title| MoviesModule
    MoviesModule -->|Search/Details| TmdbService
    TmdbService -->|Enriched Data| RecService
    RecService -->|Filter Context/Posters| Response
```

## 5. Key Architecture Decisions
1. **Direct Ollama Integration**: Instead of generic AI wrappers, specific prompts are engineered for Ollama/Llama 3, including Persian language nuances.
   - Evidence: `src/llm/services/llm.service.ts` (Prompt Building).
2. **List Item Independence**: List items store a snapshot of the movie (`title`, `posterPath`) to avoid joining the `TmdbMovie` table for every list view. This optimizes the "View Watchlist" performance.
   - Evidence: `src/entities/list-item.entity.ts`.
3. **Environment Config Validation**: Joi validation schema ensures app fails at startup if Keys/URLs are missing.
   - Evidence: `src/app.module.ts`.
