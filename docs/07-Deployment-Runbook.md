# 07. Deployment Runbook

**فارسی (Persian):** [۰۷. راهنمای استقرار](07-Deployment-Runbook.fa.md)

---

## 1. Environment Variables
The application relies on `dotenv` and `@nestjs/config` with Joi validation.

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `NODE_ENV` | Yes | development | `production`, `test`, or `development`. |
| `DATABASE_URL` | Yes | - | Postgres connection string. |
| `JWT_SECRET` | Yes | - | Signing key for Access tokens. |
| `REFRESH_JWT_SECRET` | Yes | - | Signing key for Refresh tokens. |
| `TMDB_API_KEY` | No* | - | Required for posters/metadata. |
| `TMDB_BEARER_TOKEN` | No | - | Alternative to API Key (Preferred). |
| `OLLAMA_URL` | Yes | http://localhost:11434 | URL to Ollama instance. |
| `OLLAMA_MODEL` | No | llama3.1 | Model tag to use. |
| `REDIS_HOST` | No | localhost | Redis Host. |
| `PORT` | No | 3001 | API Port. |

## 2. Local Setup Checklist
1. **System Deps**: Node.js 18+, Docker (for DB/Redis).
2. **Ollama**: Install Ollama and pull model: `ollama run llama3.1`.
3. **Env**: Copy `.env.example` (if exists) or create `.env` from table above.
4. **Install**: `yarn install`.
5. **Services**: Run `docker-compose up -d` (Postgres, Redis).
6. **Migrations**: `yarn migration:run` (if manual) or ensure `synchronize: true` in dev.
7. **Run**: `yarn start:dev`.

## 3. Production Checklist
- [ ] **Database**: running managed PostgreSQL.
- [ ] **Redis**: running managed Redis (Elasticache/etc).
- [ ] **Env**: `NODE_ENV=production`.
- [ ] **Migration**: `synchronize: false` in TypeORM config (enforced by code). RUN `yarn migration:run` before startup.
- [ ] **Ollama**: Ensure sidecar or GPU instance is reachable at `OLLAMA_URL`.
- [ ] **Logging**: Logs will output in JSON format (Pino) suitable for Datadog/Splunk.
- [ ] **Security**: `cors` is enabled but check `CORS_ORIGIN` matches frontend domain.

## 4. Observability
- **Logs**: JSON structured logs. Request ID tracking is automatic.
- **Redaction**: `req.headers.authorization` is redacted in logs to prevent leaking tokens.
  - Evidence: `src/app.module.ts` line 26.
