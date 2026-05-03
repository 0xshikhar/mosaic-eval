# Configuration Guide — Mosaic Eval Harness

## 1. Overview

This document details all configuration options for the Mosaic Eval Harness, including environment variables, model settings, and system parameters.

---

## 2. Environment Variables

### Core API Keys

| Variable | Provider | Required | Description |
|----------|----------|----------|-------------|
| `OPENAI_API_KEY` | OpenAI | Conditional | For GPT-4o, GPT-oss access |
| `ANTHROPIC_API_KEY` | Anthropic | Conditional | For Claude access |
| `GOOGLE_API_KEY` | Google | Conditional | For Gemini access |
| `MISTRAL_API_KEY` | Mistral | Conditional | For Mistral Large access |
| `BEDROCK_API_KEY` | AWS | Conditional | For Bedrock-hosted models |

**Note:** At least one provider key is required. The harness can run with a single model.

### AWS Bedrock Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BEDROCK_API_KEY` | For Bedrock | - | AWS access key |
| `BEDROCK_REGION` | No | `us-east-1` | AWS region for Bedrock |
| `BEDROCK_SECRET_KEY` | For Bedrock | - | AWS secret key |

### Model-Specific Settings

#### OpenAI

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_MODEL_ID` | No | `gpt-4o` | Model identifier |
| `OPENAI_BASE_URL` | No | OpenAI default | API endpoint (use for proxies/Bedrock) |
| `OPENAI_MAX_CONCURRENT` | No | `3` | Concurrent request limit |
| `OPENAI_TIMEOUT_MS` | No | `60000` | Request timeout (milliseconds) |

#### Anthropic

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_MODEL_ID` | No | `claude-3-5-sonnet-latest` | Model identifier |
| `ANTHROPIC_BASE_URL` | No | Anthropic default | API endpoint |
| `ANTHROPIC_MAX_CONCURRENT` | No | `2` | Concurrent request limit |
| `ANTHROPIC_TIMEOUT_MS` | No | `120000` | Request timeout (higher for longer outputs) |

#### Google (Gemini)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_MODEL_ID` | No | `gemini-2.5-pro` | Model identifier |
| `GOOGLE_BASE_URL` | No | Google default | API endpoint |
| `GOOGLE_MAX_CONCURRENT` | No | `3` | Concurrent request limit |

#### Mistral

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MISTRAL_MODEL_ID` | No | `mistral-large-latest` | Model identifier |
| `MISTRAL_API_KEY` | Yes* | - | API key |
| `MISTRAL_MAX_CONCURRENT` | No | `3` | Concurrent request limit |

*Required only if using Mistral

#### Moonshot (via Bedrock)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MOONSHOT_MODEL_ID` | No | `moonshotai.kimi-k2.5` | Model identifier |
| `MOONSHOT_BASE_URL` | Yes for Bedrock | Bedrock endpoint | Via AWS Bedrock |

#### MiniMax (via Bedrock)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MINIMAX_MODEL_ID` | No | `minimax.minimax-m2.5` | Model identifier |
| `MINIMAX_BASE_URL` | Yes for Bedrock | Bedrock endpoint | Via AWS Bedrock |

#### LM Studio (Local)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LM_STUDIO_MODEL_ID` | No | `local-model` | Model identifier |
| `LM_STUDIO_BASE_URL` | No | `http://127.0.0.1:1234/v1` | LM Studio endpoint |
| `LM_STUDIO_TIMEOUT_MS` | No | `300000` | Long timeout for local inference |

### Database Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_FILE_NAME` | No | `../data/databases/mosaic.db` | SQLite database path |
| `DB_JOURNAL_MODE` | No | `WAL` | SQLite journal mode (WAL recommended) |

**Path Resolution:**
- Relative paths resolved from `app/` directory
- Absolute paths used as-is
- Parent directory (`..`) refers to project root

### Application Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3000` | Server port (production) |
| `HOSTNAME` | No | `localhost` | Server hostname |
| `ADMIN_TOKEN` | No | - | Optional API authentication |

### Judge Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JUDGE_MODEL_ID` | No | `anthropic` | Default judge provider |
| `JUDGE_TEMPERATURE` | No | `0.2` | Judge temperature (low for consistency) |
| `JUDGE_MAX_TOKENS` | No | `1024` | Judge response limit |
| `JUDGE_TIMEOUT_MS` | No | `120000` | Judge request timeout |

### Cost & Budget Controls

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEFAULT_COST_BUDGET_USD` | No | `100.00` | Default run budget |
| `COST_ALERT_THRESHOLD` | No | `0.8` | Alert at 80% of budget |
| `COST_HARD_STOP` | No | `true` | Stop run at budget limit |

### Concurrency & Rate Limiting

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GLOBAL_MAX_CONCURRENT` | No | `10` | Total concurrent requests |
| `CIRCUIT_BREAKER_THRESHOLD` | No | `5` | Failures before opening circuit |
| `CIRCUIT_BREAKER_TIMEOUT` | No | `300` | Seconds before retry |

### Logging & Debugging

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOG_LEVEL` | No | `info` | debug, info, warn, error |
| `LOG_AGENT_CALLS` | No | `true` | Log all model invocations |
| `LOG_SQL` | No | `false` | Log SQL queries |
| `DEBUG_SAVE_PROMPTS` | No | `false` | Save all prompts to disk |

---

## 3. Configuration File

### `.env.local` Template

```bash
# ============================================
# Mosaic Eval Harness — Environment Configuration
# ============================================

# --- Provider API Keys (at least one required) ---
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
MISTRAL_API_KEY=...

# --- AWS Bedrock (optional, for Moonshot/MiniMax) ---
BEDROCK_API_KEY=AKIA...
BEDROCK_SECRET_KEY=...
BEDROCK_REGION=us-east-1

# --- Model Configuration ---
OPENAI_MODEL_ID=gpt-4o-2024-08-06
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MAX_CONCURRENT=3

ANTHROPIC_MODEL_ID=claude-3-5-sonnet-20241022
ANTHROPIC_MAX_CONCURRENT=2
ANTHROPIC_TIMEOUT_MS=120000

GOOGLE_MODEL_ID=gemini-2.5-pro-exp-03-25
GOOGLE_MAX_CONCURRENT=3

MISTRAL_MODEL_ID=mistral-large-latest

# Bedrock-hosted models
MOONSHOT_MODEL_ID=moonshotai.kimi-k2.5
MOONSHOT_BASE_URL=https://bedrock-runtime.us-east-1.amazonaws.com

MINIMAX_MODEL_ID=minimax.minimax-m2.5
MINIMAX_BASE_URL=https://bedrock-runtime.us-east-1.amazonaws.com

# Local models (LM Studio)
LM_STUDIO_MODEL_ID=local-model
LM_STUDIO_BASE_URL=http://127.0.0.1:1234/v1
LM_STUDIO_TIMEOUT_MS=300000

# --- Judge Configuration ---
JUDGE_MODEL_ID=anthropic
JUDGE_TEMPERATURE=0.2
JUDGE_MAX_TOKENS=1024

# --- Database ---
DB_FILE_NAME=../data/databases/mosaic.db

# --- Cost Controls ---
DEFAULT_COST_BUDGET_USD=50.00
COST_ALERT_THRESHOLD=0.8
COST_HARD_STOP=true

# --- Concurrency ---
GLOBAL_MAX_CONCURRENT=10

# --- Logging ---
LOG_LEVEL=info
LOG_AGENT_CALLS=true
```

---

## 4. Model Adapter Configuration

### Custom Model Registration

Add custom models in `app/orchestrator/adapters.ts`:

```typescript
const customModels: Record<string, ModelConfig> = {
  'custom-openai': {
    provider: 'openai',
    modelId: 'gpt-4-custom',
    baseUrl: 'https://custom-endpoint.example.com/v1',
    apiKey: process.env.CUSTOM_API_KEY,
    maxConcurrent: 2,
    timeout: 60000,
  },
}
```

### Adapter Configuration Interface

```typescript
interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'mistral' | 'bedrock' | 'openai-compatible'
  modelId: string
  baseUrl?: string
  apiKey?: string
  maxConcurrent: number
  timeout: number
  temperature?: number
  maxTokens?: number
  costPer1kInput?: number
  costPer1kOutput?: number
}
```

---

## 5. Strategy Configuration

### Default Strategy Parameters

Configure in `app/orchestrator/strategies.ts`:

```typescript
const strategyDefaults = {
  roundRobin: {
    rotationOrder: 'sequential', // or 'random'
    skipRefusedModels: true,
  },
  adversarialCross: {
    synthesisModel: 'anthropic',
    synthesisTemperature: 0.3,
    topNForSynthesis: 3,
  },
  weakestSafeguard: {
    lookbackWindow: 30, // days
    minSamples: 10,
    smoothing: 'laplace',
  },
}
```

### Per-Run Strategy Overrides

Pass in run configuration:

```json
{
  "strategy": "ADVERSARIAL_CROSS",
  "strategyParams": {
    "synthesisModel": "openai",
    "synthesisTemperature": 0.2
  }
}
```

---

## 6. Database Schema Configuration

### Schema Migrations

Drizzle ORM handles migrations automatically on first run.

**Manual Migration:**
```bash
cd app
bun run db:generate
```

### Custom Schema Extensions

Edit `app/db/schema.ts` to add tables/columns, then regenerate.

---

## 7. UI Configuration

### Dashboard Defaults

Configure in `app/components/run-composer.tsx`:

```typescript
const defaultRunConfig = {
  strategy: 'ROUND_ROBIN',
  modelIds: ['openai', 'anthropic'],
  includeBaseline: true,
  judgeModelId: 'anthropic',
  maxStepsPerTask: 10,
  costBudgetUsd: 50,
}
```

### Theme & Styling

Tailwind v4 configuration in `app/src/app/globals.css`:

```css
@theme inline {
  --color-primary: var(--primary);
  --color-secondary: var(--secondary);
  --font-sans: "Geist", ui-sans-serif, system-ui;
}
```

---

## 8. Security Configuration

### API Authentication (Optional)

Enable by setting `ADMIN_TOKEN`:

```bash
ADMIN_TOKEN=your-secret-token
```

Then include in requests:
```
Authorization: Bearer your-secret-token
```

### CORS Configuration

Edit `app/next.config.ts`:

```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://your-domain.com' },
        ],
      },
    ]
  },
}
```

---

## 9. Performance Tuning

### Concurrency Optimization

**Rule of thumb:**
- Fast providers (OpenAI, Mistral): max 5 concurrent
- Slow providers (Anthropic, local): max 2 concurrent
- Bedrock: Check your provisioned throughput

**Testing:**
```bash
# Run model tester with different concurrency levels
curl -X POST http://localhost:3000/api/models/test \
  -d '{"modelId": "openai", "maxConcurrent": 5}'
```

### Database Performance

For high-throughput runs:
```bash
# Enable WAL mode (default)
# Increase cache size
sqlite3 data/databases/mosaic.db "PRAGMA cache_size = -64000;"
```

### Memory Optimization

For large runs (1000+ steps):
- Enable streaming checkpoints
- Reduce judge max_tokens
- Use batch scoring

---

## 10. Troubleshooting Configuration

### Common Issues

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| "Can't resolve provider" | Missing API key | Check env var is set |
| "Rate limit exceeded" | Concurrency too high | Reduce MAX_CONCURRENT |
| "Connection timeout" | Timeout too low | Increase TIMEOUT_MS |
| "Database locked" | Concurrent writes | Enable WAL mode |
| "Out of memory" | Too many models | Reduce batch size |

### Debug Mode

Enable detailed logging:
```bash
LOG_LEVEL=debug
LOG_SQL=true
DEBUG_SAVE_PROMPTS=true
```

### Configuration Validation

Test configuration without running full harness:
```bash
cd app
bun run test:config
```

---

## 11. Environment-Specific Configurations

### Development

```bash
NODE_ENV=development
LOG_LEVEL=debug
LOG_AGENT_CALLS=true
COST_HARD_STOP=false
```

### Production

```bash
NODE_ENV=production
LOG_LEVEL=warn
LOG_AGENT_CALLS=false
COST_HARD_STOP=true
ADMIN_TOKEN=secure-random-token
```

### CI/CD

```bash
NODE_ENV=test
DB_FILE_NAME=:memory:
LOG_LEVEL=error
USE_MOCK_MODELS=true
```

---

*For additional help, see docs/TROUBLESHOOTING.md*
