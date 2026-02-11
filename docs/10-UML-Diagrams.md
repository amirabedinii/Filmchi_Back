# 10. UML Diagrams

**فارسی (Persian):** [۱۰. نمودارهای UML](10-UML-Diagrams.fa.md)

---

This document collects the UML diagrams used to show the system’s engineered design.

---

## 1. Use Case Diagram

Use case view for main actors and use cases.

```mermaid
flowchart LR
    subgraph Actors["Actors"]
        Guest[Guest]
        User[Registered User]
        Admin[Admin]
        TMDB[TMDB API]
        LLM[LLM Service]
    end

    subgraph GuestCases["Guest Use Cases"]
        UC_Search[Search Movies]
        UC_Trending[Trending / Popular]
        UC_Genres[Genres]
    end

    subgraph UserCases["User Use Cases"]
        UC_Login[Login]
        UC_Register[Register]
        UC_Refresh[Refresh Token]
        UC_Profile[Profile]
        UC_Lists[Lists: Watchlist / Watched]
        UC_Rate[Rate]
        UC_Recs[AI Recommendations]
        UC_Export[Export Data]
    end

    Guest --> GuestCases
    User --> UserCases
    User --> UC_Login
    User --> UC_Register
    User --> UC_Refresh
    Admin -.->|Manage| User
    UC_Recs --> LLM
    UC_Search --> TMDB
```

**Use Case table (summary):**

| ID | Title | Main Actor | Prerequisite |
|----|-------|------------|--------------|
| UC-01 | Login | User | Registered |
| UC-02 | Refresh token | User | Expired token |
| UC-03 | Get AI recommendations | User | Logged in, Ollama/LLM |
| UC-04 | Add movie to list | User | Logged in |
| UC-05 | View movie details | Guest/User | - |
| UC-06 | Rate movie | User | Logged in |
| UC-07 | Search movies | Guest/User | - |
| UC-08 | Export data | User | Logged in |

---

## 2. Class Diagram (Domain / Application Layer)

Main classes in the service and controller layer (no TypeORM/DB detail).

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

**Note:** DB access is via TypeORM Repository in each service and is omitted from the diagram for simplicity.

---

## 3. Sequence Diagram — Get AI Recommendations

Same as UC-03, emphasizing service call order.

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
    loop For each recommendation (batch 3)
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

## 4. Activity Diagram — Cache-Aside Flow for Movies

Decision steps and flow for a movie request (search or details).

```mermaid
flowchart TD
    Start([Movie Request]) --> BuildKey[Build cache key]
    BuildKey --> CheckRedis{Redis available?}
    CheckRedis -->|No| FetchSource
    CheckRedis -->|Yes| GetRedis[get from Redis]
    GetRedis --> HasValue{Value exists?}
    HasValue -->|Yes| ReturnCached[Return cached data]
    HasValue -->|No| CheckDB{Data in DB?}
    CheckDB -->|Yes| LoadDB[Read from PostgreSQL]
    LoadDB --> SetRedis1[set in Redis with TTL]
    SetRedis1 --> ReturnDB[Return data]
    CheckDB -->|No| FetchSource[Request TMDB]
    FetchSource --> TMDBResp{Success?}
    TMDBResp -->|No| ReturnEmpty[Return error / empty]
    TMDBResp -->|Yes| SaveDB[Save to DB]
    SaveDB --> SetRedis2[set in Redis with TTL]
    SetRedis2 --> ReturnNew[Return new data]
    ReturnCached --> End([End])
    ReturnDB --> End
    ReturnNew --> End
    ReturnEmpty --> End
```

---

## 5. Related Documentation

| Diagram | More detail |
|---------|-------------|
| Use case text + login/list sequence | [02-UseCases.md](02-UseCases.md) |
| ERD and database model | [05-Database-ERD.md](05-Database-ERD.md) |
| Cache and recommendations flow | [03-Architecture.md](03-Architecture.md) |
| API design | [04-API-Spec.md](04-API-Spec.md) |
