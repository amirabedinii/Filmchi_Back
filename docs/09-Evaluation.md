# 09. Evaluation Documentation

**فارسی (Persian):** [۰۹. مستند ارزیابی](09-Evaluation.fa.md)

---

This document describes the **engineering evaluation** methods: measuring cache impact, how we arrived at the right prompt, and reportable metrics.

---

## 1. Cache Evaluation (Caching Impact)

### 1.1 Goal
Demonstrate how much positive impact caching has on **response time** and **reducing TMDB calls**.

### 1.2 Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| **Latency (average)** | Server response time for one request (e.g. GET /movies/search?q=...) | Noticeable reduction with cache enabled |
| **Cache hit rate** | Ratio of requests served from Redis/DB to total requests | Increase with repeated usage |
| **TMDB call count** | Number of TMDB calls in a scenario | Decrease with cache |

### 1.3 How to Run

**Prerequisites:** Server running, Redis up, cache empty once.

1. **Scenario A — Without cache**
   ```bash
   CACHE_ENABLED=false npm run start:dev
   ```
   Then send repeated requests to an endpoint (e.g. search or movie details) via tool (e.g. `scripts/benchmark-cache.sh`) or manually, and record response time.

2. **Scenario B — With cache**
   ```bash
   CACHE_ENABLED=true npm run start:dev
   ```
   Run the same requests again:
   - First time: cache miss → similar or slightly better time.
   - Second and later: cache hit → response time should be noticeably lower.

3. **Comparison**
   - Average response time (ms) without cache vs with cache (after warm).
   - Number of TMDB requests in each case (from logs or by disabling cache and counting).

### 1.4 Benchmark Script

Use the script below for a quick comparison (details in `scripts/README.md`):

```bash
./scripts/benchmark-cache.sh
```

Sample output:
- Time per request (with/without cache).
- Average and comparison.

### 1.5 Sample Report (Template)

| Mode | Requests | Avg (ms) | Notes |
|------|----------|---------|-------|
| No cache | 10× same search | ~800 | Every time TMDB |
| With cache (cold) | 1× search | ~750 | Once TMDB + set cache |
| With cache (warm) | 9× same search | ~15 | All from Redis |

**Conclusion:** Cache shows a clear reduction in response time and TMDB load for repeated requests.

---

## 2. Prompt Evaluation (Prompt Engineering)

### 2.1 Goal
Record **how we arrived at the right prompt** and what quality metrics we use for recommendations.

### 2.2 Prompt Quality Metrics

| Metric | Definition | How to evaluate |
|--------|-------------|------------------|
| **Match to request** | Recommendations align with user “mood” (e.g. sad/happy) | Manual review on sample queries |
| **Recommendations with poster** | After TMDB enrichment, how many have poster | Count in API response |
| **Reason language** | For language `fa`, reason in Persian | Manual review |
| **Diversity (Iranian + international)** | For Persian queries, mix of Iranian and non-Iranian films | Manual review of output list |

### 2.3 How We Reached the Current Prompt

1. **Initial version:** Simple prompt “recommend a few movies for this query”.
2. **Problem:** For “sad movies” we sometimes got happy films → **explicit “respect user request”** rules added (CRITICAL GUIDELINES).
3. **Persian:** Request for reasons in Persian and 2–3 Iranian films → added `languageInstruction` and Iranian cinema rules in `llm.service.ts`.
4. **Response uniqueness:** To reduce model-side caching, `Request ID` added to prompt.
5. **Schema:** JSON output with `title`, `year`, `reason` for parsing and TMDB enrichment.

**Code reference:** `src/llm/services/llm.service.ts` — method `buildMovieRecommendationPrompt`.

### 2.4 Sample Queries for Evaluation

Use these for manual or semi-automated evaluation:

| ID | Query (sample) | Lang | Expectation |
|----|----------------|------|-------------|
| Q1 | فیلم غمگین دهه ۹۰ | fa | Only sad films, reason in Persian, at least 1–2 Iranian films |
| Q2 | Sad movies from the 80s | en | Sad 80s films, reason in English |
| Q3 | کمدی رمانتیک ایرانی | fa | Iranian + international mix, reason in Persian |
| Q4 | Scary movies for Halloween | en | Horror, year variety |

### 2.5 How to Run Prompt Evaluation

1. Start server and LLM service (Ollama/OpenRouter).
2. For each query in the table above:
   - Send once `POST /api/v1/recommendations` with body `{ "query": "..." }`.
   - Save the response (file or log).
3. Evaluation checklist:
   - [ ] Number of recommendations (min 3, max 7).
   - [ ] Do reasons match the request (sad/happy/scary/...)?
   - [ ] For `fa`, is reason in Persian?
   - [ ] For `fa`, at least one Iranian film in the list?
   - [ ] After enrichment, how many have poster?

Results can be recorded in a table or text file (e.g. `scripts/prompt-evaluation-results.md`).

### 2.6 Iteration and Improvement

- If a metric is not met, update the prompt in `buildMovieRecommendationPrompt`.
- After changes, re-run the same sample queries and compare.
- Record prompt version and date in comments or changelog.

---

## 3. Summary and References

- **Cache:** Metrics = response time, hit rate, TMDB call count. Method = compare with/without cache and use `scripts/benchmark-cache.sh`.
- **Prompt:** Metrics = match to request, language, Iranian/international diversity, count with poster. Method = sample queries + manual checklist and iteration.

For unit and E2E test details see [06-Testing.md](06-Testing.md).
