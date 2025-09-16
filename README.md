<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Filmchi API

Filmchi is a NestJS backend that provides authentication, personal movie lists, and AI-powered movie recommendations enriched with TMDB metadata.

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

## Recommendations

Endpoint: `POST /recommendations` (JWT required)

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

## Auth and Lists

- Auth endpoints under `/auth` provide registration, login, and token-based auth.
- Lists under `/lists` support `watched` and `watchlist` with pagination.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

Ensure environment variables are configured. Run `yarn build` then `yarn start:prod`.

## Resources

- NestJS docs: https://docs.nestjs.com

## Support

Nest is an MIT-licensed open source project.

## License

MIT
