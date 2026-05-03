# Troubleshooting Guide — Mosaic Eval Harness

## 1. Quick Diagnostics

### Health Check

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "version": "0.1.0"
}
```

### Model Connectivity Test

```bash
curl -X POST http://localhost:3000/api/models/test \
  -H "Content-Type: application/json" \
  -d '{"modelId": "openai"}'
```

---

## 2. Common Errors

### "Can't resolve 'tailwindcss'"

**Symptoms:**
```
Error: Can't resolve 'tailwindcss' in '/Users/.../mosaic'
```

**Cause:** Next.js Turbopack root misconfigured, looking in parent directory.

**Solution:**
1. Check `app/next.config.ts`:
```typescript
// REMOVE or comment out:
// turbopack: { root: repoRoot }

// Should be:
const nextConfig: NextConfig = {};
```

2. Clear cache and restart:
```bash
cd app
rm -rf .next
bun run dev
```

---

### "Database locked" / "database is locked"

**Symptoms:**
```
Error: SQLITE_BUSY: database is locked
```

**Cause:** Multiple processes writing to SQLite simultaneously without WAL mode.

**Solution:**
1. Verify WAL mode is enabled:
```bash
sqlite3 data/databases/mosaic.db "PRAGMA journal_mode;"
# Should return: wal
```

2. If not, enable it:
```bash
sqlite3 data/databases/mosaic.db "PRAGMA journal_mode = WAL;"
```

3. Restart the application.

**Prevention:**
- Always use `app/src/app/db/client.ts` which sets `PRAGMA journal_mode = WAL`
- Don't run multiple harness instances on same database

---

### "Rate limit exceeded"

**Symptoms:**
```
Error: 429 Too Many Requests
Provider: OpenAI
```

**Solution:**
1. Reduce concurrency in `.env.local`:
```bash
OPENAI_MAX_CONCURRENT=2
ANTHROPIC_MAX_CONCURRENT=1
```

2. Add exponential backoff (already implemented in adapters)

3. Check provider rate limits and upgrade tier if needed:
   - OpenAI: 3K+ RPM (tier-dependent)
   - Anthropic: 50-1000 RPM (tier-dependent)

**Circuit Breaker:**
If a model fails 5+ times rapidly, it's temporarily excluded. Check logs:
```
[CIRCUIT_BREAKER] Opened for provider: openai
```

---

### "Connection timeout"

**Symptoms:**
```
Error: Request timed out after 60000ms
```

**Cause:** Model taking too long to respond.

**Solution:**
1. Increase timeout for slow models:
```bash
ANTHROPIC_TIMEOUT_MS=120000  # 2 minutes
LM_STUDIO_TIMEOUT_MS=300000  # 5 minutes for local
```

2. Reduce `maxTokens` to speed up responses:
```bash
JUDGE_MAX_TOKENS=512  # Instead of 1024
```

3. Check provider status page for outages.

---

### "API key not found"

**Symptoms:**
```
Error: OPENAI_API_KEY not configured
```

**Solution:**
1. Verify `.env.local` exists in `app/` directory (not project root)
2. Check variable name matches exactly (case-sensitive)
3. Restart dev server after changes:
```bash
cd app && bun run dev
```

**Verify:**
```bash
cd app
source .env.local
echo $OPENAI_API_KEY
```

---

### "Model refuses all tasks"

**Symptoms:**
- 100% refusal rate for a model
- No quality scores generated

**Cause:** Model is too conservative for task category.

**Solution:**
1. Check per-category refusal rates in dashboard
2. Use Weakest Safeguard strategy instead of Round Robin
3. Consider switching model for that category

**Reference refusal rates:**
| Model | pathogen_acquisition | synthesis_evasion |
|-------|----------------------|-------------------|
| Claude | 48% | 55% |
| GPT-4o | 32% | 35% |
| Gemini | 25% | 30% |

---

### "Memory leak / high memory usage"

**Symptoms:**
- Node.js memory grows continuously
- System slows down
- OOM errors

**Cause:** Event streams not closing, large result sets cached.

**Solution:**
1. Limit run size:
```typescript
// In run config
maxStepsPerTask: 10
maxConcurrentRuns: 1
```

2. Enable checkpoint cleanup:
```bash
CHECKPOINT_RETENTION_DAYS=7
```

3. Monitor with:
```bash
# Check Node.js memory
ps aux | grep node
```

---

## 3. Provider-Specific Issues

### OpenAI

**Issue:** "Model not found" error with Bedrock-hosted models

**Solution:** Check model ID format:
```bash
# Correct
OPENAI_MODEL_ID=openai.gpt-oss-120b-1:0

# Incorrect
OPENAI_MODEL_ID=gpt-oss-120b
```

**Issue:** High latency from certain regions

**Solution:** Use `OPENAI_BASE_URL` to route through closer endpoint.

---

### Anthropic

**Issue:** Frequent rate limiting

**Solution:** 
- Reduce `ANTHROPIC_MAX_CONCURRENT` to 1
- Upgrade Anthropic API tier
- Use Anthropic only for judge/scorer, not runner

**Issue:** Very slow responses (>10s)

**Cause:** Long output generation.

**Solution:**
```bash
ANTHROPIC_TIMEOUT_MS=180000  # 3 minutes
JUDGE_MAX_TOKENS=512  # Reduce output length
```

---

### Google (Gemini)

**Issue:** "Quota exceeded" for free tier

**Solution:**
- Wait 60 seconds (rate limit is per minute)
- Upgrade to paid tier
- Reduce `GOOGLE_MAX_CONCURRENT` to 1

**Issue:** Inconsistent output formatting

**Solution:** Add explicit formatting instructions in task rubrics:
```
Format your response as:
1. Main answer
2. Supporting details
3. Caveats
```

---

### AWS Bedrock

**Issue:** "Could not connect to Bedrock endpoint"

**Solution:**
1. Verify credentials:
```bash
aws sts get-caller-identity
```

2. Check region matches model availability:
```bash
BEDROCK_REGION=us-east-1  # Most models available here
```

3. Ensure model is enabled in Bedrock console.

---

### LM Studio (Local)

**Issue:** "Connection refused" to localhost

**Solution:**
1. Verify LM Studio is running and loaded a model
2. Check port matches:
```bash
LM_STUDIO_BASE_URL=http://127.0.0.1:1234/v1
```

3. Test with curl:
```bash
curl http://127.0.0.1:1234/v1/models
```

**Issue:** Very slow inference (10+ seconds per request)

**Cause:** Insufficient VRAM, model running on CPU.

**Solution:**
- Use smaller model (7B instead of 70B)
- Increase quantization (Q4 instead of Q8)
- Upgrade GPU (more VRAM)

---

## 4. Database Issues

### "Database migration failed"

**Symptoms:**
```
Error: Migration failed
Error: Table already exists
```

**Solution:**
1. Reset database (development only):
```bash
rm data/databases/mosaic.db
rm data/databases/mosaic.db-*
bun run dev  # Will recreate with schema
```

2. Or run migrations manually:
```bash
cd app
bun run db:generate
```

---

### "Data loss after restart"

**Cause:** Database using in-memory or wrong path.

**Solution:**
1. Verify `DB_FILE_NAME` in `.env.local`:
```bash
DB_FILE_NAME=../data/databases/mosaic.db
```

2. Check file exists:
```bash
ls -la data/databases/
```

---

### "Corrupted database"

**Symptoms:**
- SQLite errors on read
- "database disk image is malformed"

**Solution:**
1. Attempt repair:
```bash
sqlite3 data/databases/mosaic.db ".recover" | sqlite3 data/databases/mosaic_recovered.db
mv data/databases/mosaic_recovered.db data/databases/mosaic.db
```

2. If unrecoverable, reset (data loss):
```bash
rm data/databases/mosaic.db*
```

---

## 5. UI/Frontend Issues

### "Page not loading" / white screen

**Solution:**
1. Check dev server is running:
```bash
cd app && bun run dev
```

2. Check browser console for JavaScript errors.

3. Clear Next.js cache:
```bash
rm -rf app/.next
```

---

### "Charts not rendering"

**Cause:** Recharts dependency issue.

**Solution:**
```bash
cd app
bun install
bun run dev
```

---

### "Import form not working"

**Check:**
1. File is `.jsonl` or `.json` format
2. File size < 10MB (browser limit)
3. JSON structure matches task schema

**Validate JSONL:**
```bash
# Check each line is valid JSON
while read line; do echo "$line" | jq .; done < tasks.jsonl
```

---

## 6. Performance Issues

### "Runs taking too long"

**Profile the bottleneck:**

1. **Model inference:** Check average latency in run results
   - Solution: Reduce max tokens, use faster models

2. **Judge scoring:** If judge is slow
   - Solution: Use GPT-4o instead of Claude for judge

3. **Database writes:** If checkpoints slow
   - Solution: Increase checkpoint interval

4. **Synthesis:** If using Adversarial Cross
   - Solution: Switch to Parallel Blast (no synthesis)

---

### "High cost per run"

**Reduce costs:**

| Strategy | Cost Reduction |
|----------|---------------|
| Use fewer models | Linear reduction |
| Switch to cheaper models | 50-70% reduction |
| Use Round Robin instead of Adversarial Cross | 70% reduction |
| Reduce judge calls | 20-30% reduction |
| Set cost budget | Hard stop |

**Example cost-optimized config:**
```bash
# Use Gemini (cheaper) as primary
MODELS=gemini,mistral
STRATEGY=ROUND_ROBIN
JUDGE_MODEL_ID=gemini  # Use same model for judge
DEFAULT_COST_BUDGET_USD=20
```

---

## 7. Debugging Commands

### Enable Debug Logging

```bash
# In app/.env.local
LOG_LEVEL=debug
LOG_SQL=true
LOG_AGENT_CALLS=true
DEBUG_SAVE_PROMPTS=true
```

### Check Model Response

```bash
curl -X POST http://localhost:3000/api/models/test \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "openai",
    "prompt": "What is CRISPR? Answer in one sentence."
  }'
```

### Database Inspection

```bash
# List tables
sqlite3 data/databases/mosaic.db ".tables"

# Count runs
sqlite3 data/databases/mosaic.db "SELECT COUNT(*) FROM evalRuns;"

# Recent run status
sqlite3 data/databases/mosaic.db "SELECT id, status, createdAt FROM evalRuns ORDER BY createdAt DESC LIMIT 5;"
```

### Reset Everything

```bash
# Nuclear option - reset all state
cd app
rm -rf .next node_modules
rm -rf ../data/databases/mosaic.db*
bun install
bun run dev
```

---

## 8. Getting Help

### Information to Include

When reporting issues:

1. **Error message** (full stack trace)
2. **Steps to reproduce**
3. **Environment:**
   - OS and version
   - Node/bun version: `bun --version`
   - Package versions: `cat app/package.json | grep next`
4. **Configuration:** (sanitized, no API keys)
   - `.env.local` (redacted)
   - `next.config.ts`
5. **Logs:** Relevant log output with `LOG_LEVEL=debug`

### Log Collection

```bash
# Run with full logging
cd app
LOG_LEVEL=debug bun run dev 2>&1 | tee debug.log
```

---

## 9. Known Limitations

### By Design

| Limitation | Workaround |
|------------|------------|
| Single SQLite database | Use file-based separation for parallel runs |
| No multi-user support | Run separate instances |
| English-only tasks | Extend task schema for i18n |
| No persistent queues | Use external job queue if needed |

### Under Investigation

| Issue | Status |
|-------|--------|
| Memory growth on long runs | Implement streaming checkpoints |
| Judge calibration drift | Quarterly re-calibration recommended |
| Model version changes | Pin specific model versions |

---

*For additional support, check the GitHub issues or contact the research team.*
