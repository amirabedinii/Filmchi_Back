#!/usr/bin/env bash
# Benchmark cache impact: same request first (cold), then repeated (warm).
# Usage: ./scripts/benchmark-cache.sh [BASE_URL]
# Example: CACHE_ENABLED=false npm run start:dev  (in another terminal), then run this script.
# Then:    CACHE_ENABLED=true  npm run start:dev, run again and compare.

set -e
BASE_URL="${1:-http://localhost:3000}"
API="${BASE_URL}/api/v1"
ENDPOINT="${API}/movies/search"
QUERY="q=dune&page=1"
WARM_COUNT=5

echo "=========================================="
echo "Filmchi Cache Benchmark"
echo "=========================================="
echo "Endpoint: GET ${ENDPOINT}?${QUERY}"
echo "Warm-up requests: ${WARM_COUNT}"
echo ""

# Cold request (first hit)
echo "1. Cold request (first time):"
COLD_MS=$(curl -s -o /dev/null -w '%{time_total}' "${ENDPOINT}?${QUERY}" 2>/dev/null || echo "0")
COLD_MS_SEC="${COLD_MS}"
# Convert to ms if in seconds (curl returns seconds with decimal)
COLD_MS_NUM=$(echo "$COLD_MS" | sed 's/^0*//')
echo "   Time: ${COLD_MS}s"
echo ""

# Warm requests (cache hits if Redis is on)
echo "2. Warm requests (same query, ${WARM_COUNT} times):"
TOTAL=0
for i in $(seq 1 "$WARM_COUNT"); do
  T=$(curl -s -o /dev/null -w '%{time_total}' "${ENDPOINT}?${QUERY}" 2>/dev/null || echo "0")
  echo "   #${i}: ${T}s"
  TOTAL=$(echo "$TOTAL + $T" | bc 2>/dev/null || echo "0")
done

if command -v bc >/dev/null 2>&1 && [ -n "$TOTAL" ] && [ "$TOTAL" != "0" ]; then
  AVG=$(echo "scale=4; $TOTAL / $WARM_COUNT" | bc 2>/dev/null || true)
  [ -n "$AVG" ] && echo "" && echo "   Average (warm): ${AVG}s"
fi

echo ""
echo "=========================================="
echo "Interpretation:"
echo "  - With CACHE_ENABLED=true, warm requests should be much faster (Redis hit)."
echo "  - With CACHE_ENABLED=false, cold and warm times stay similar (TMDB every time)."
echo "  - Run server once with cache OFF and once with cache ON, then compare this output."
echo "  - See docs/09-Evaluation.md for full evaluation methodology."
echo "=========================================="
