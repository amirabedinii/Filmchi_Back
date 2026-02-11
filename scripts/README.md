# Scripts

**فارسی (Persian):** [README.fa.md](README.fa.md)

---

## benchmark-cache.sh

Benchmarks the impact of cache on response time.

### Prerequisites
- Filmchi server running (e.g. `npm run start:dev` or `yarn start:dev`)
- For a real comparison: run the server once with `CACHE_ENABLED=false` and once with `CACHE_ENABLED=true`

### Run
```bash
chmod +x scripts/benchmark-cache.sh
./scripts/benchmark-cache.sh
# Or with another base URL:
./scripts/benchmark-cache.sh http://localhost:4000
```

### Output
- Response time for the first request (cold)
- Response time for repeated requests (warm)
- With cache enabled, warm requests should be noticeably faster.

Evaluation method details in **docs/09-Evaluation.md** or **docs/09-Evaluation.fa.md** (cache evaluation section).
