## Filmchi API

Filmchi is a NestJS backend that provides authentication, personal movie lists, and AI‑powered movie recommendations enriched with TMDB metadata.

## Project setup

```bash
$ yarn install
```

## Environment

Set environment variables via `.env.development` (used by default), `.env.test` (tests), or `.env` (production):

```
NODE_ENV=development
DATABASE_URL=postgres://user:pass@localhost:5432/filmchi
JWT_SECRET=replace-with-16+chars
JWT_EXPIRES_IN=1d
REFRESH_JWT_SECRET=replace-with-16+chars
REFRESH_JWT_EXPIRES_IN=7d
TMDB_API_KEY=your_tmdb_key
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

Notes:
- In tests, an in-memory sqlite database is used automatically.
- `TMDB_API_KEY` can be empty; recommendations enrichment will then simply skip TMDB.
- `OLLAMA_URL` is required for recommendations generation.

## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

API docs are available at `/docs` (Swagger).

## Run tests

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Logging

This service uses structured logging via `nestjs-pino`:
- In development: pretty printing is enabled.
- In production: JSON logs at level `info`.

Sensitive headers like `Authorization` are redacted. You can adjust log level via `NODE_ENV`.

## API Overview

### Auth

Base path: `/auth`

- `POST /auth/register`: Register a user.
- `POST /auth/login`: Login with credentials. Returns access and refresh tokens.
- `POST /auth/refresh`: Exchange a refresh token for a new access token.
- `POST /auth/logout`: Invalidate a refresh token.

### Lists (JWT required)

Base path: `/lists`

- `GET /lists/:listName`: Get list items.
  - Query: `page?=1`, `limit?=50 (<=100)`, `sort?=addedAt:asc|desc`
- `POST /lists/:listName`: Add a movie to a list.
  - Body: `{ tmdbId: number, title: string, posterPath?: string, overview?: string, year?: number }`
- `DELETE /lists/:listName/:tmdbId`: Remove a movie from a list.

List names supported: `watchlist`, `watched` (extensible).

### Recommendations (JWT required)

Endpoint: `POST /recommendations`

Body:

```
{ "query": "smart sci-fi" }
```

Behavior:
- Generates 5–8 raw suggestions using Ollama at `OLLAMA_URL`.
- Enriches suggestions from TMDB in parallel using `Promise.all` for performance.
- Matching algorithm considers title similarity (Levenshtein), release year proximity, and popularity; single-result searches are accepted directly.
- Error handling: failed or empty TMDB lookups are filtered out; errors are logged but do not fail the request.

Returned items include: `title`, `year?`, `reason`, `tmdbId`, `posterPath?`, `overview?`.

## Architecture

- NestJS modular structure: `auth`, `lists`, `recommendations`, `llm`, `entities`.
- Persistence via TypeORM; migrations in `src/migrations`.
- Input validation via `class-validator` and global `ValidationPipe` (whitelist, forbid non-whitelisted, transform).
- Security: `helmet`, CORS (configurable via `CORS_ORIGIN`), JWT auth guard.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

Ensure environment variables are configured. Run `yarn build` then `yarn start:prod`.

## Troubleshooting

- 401 errors: ensure `Authorization: Bearer <accessToken>` header is present and valid.
- 403/404 on lists: verify `listName` is correct and the item exists.
- Recommendations empty: check `OLLAMA_URL`, `OLLAMA_MODEL`, and `TMDB_API_KEY`.

## Resources

- NestJS docs: https://docs.nestjs.com

## License

MIT
