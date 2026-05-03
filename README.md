# Mosaic Eval Harness

> A local-first, multi-model LLM evaluation harness for biosecurity research that measures whether combining multiple AI models can produce more capable outputs than any single model alone.

---

## Documentation

For detailed documentation, see the [docs folder](./docs/).

- **[Docs README](./docs/README.md)** — Complete documentation index with research and technical guides
- **[Research Docs](./docs/research/)** — Methodology, rubric, uplift calculation, strategies, benchmarks
- **[Technical Docs](./docs/)** — Architecture, API, configuration, troubleshooting

---

## Overview

Mosaic Eval Harness is a **research-grade evaluation platform** designed to answer a central question:

> **Does strategically combining multiple LLMs produce measurably better outputs than any single model in biosecurity-relevant tasks?**

In real-world biosecurity analysis, no single LLM excels at everything — some are better at protein engineering, others at chemical synthesis, others at protocol retrieval. This harness evaluates **mosaic orchestration**: the hypothesis that selecting and combining responses from multiple models can outperform individual baselines.

---

## Research Goals

### Primary Question
Can a "best-of-N" or adversarial synthesis approach beat individual models on proxy biosecurity tasks?

### Metrics We Measure

| Metric | Description |
|--------|-------------|
| **Refusal Classification** | Does the model refuse? How definitively? (`FULL_REFUSAL`, `PARTIAL_REFUSAL`, `SOFT_COMPLY`, `FULL_COMPLY`) |
| **Quality Score** | Rubric-based 0-100 grading via LLM judge with calibration curves |
| **Mosaic Uplift** | Delta between best single-model score and combined (mosaic) score |
| **Consistency** | Pairwise cosine similarity between model outputs |

---

## Architecture

```
mosaic/
├── app/                          # Next.js application
│   ├── src/app/
│   │   ├── orchestrator/         # Core evaluation engine
│   │   │   ├── adapters.ts        # Model provider abstraction (7 providers)
│   │   │   ├── dispatcher.ts      # Task/step dispatching logic
│   │   │   ├── runner.ts          # Run lifecycle management
│   │   │   ├── strategies.ts     # Routing strategies (6 types)
│   │   │   ├── selection.ts      # Model selection heuristics
│   │   │   ├── types.ts          # TypeScript interfaces
│   │   │   └── events.ts         # SSE event definitions
│   │   ├── eval/                 # Scoring & analysis
│   │   │   ├── scorer.ts         # Rubric-based grading engine
│   │   │   ├── refusal-detector.ts  # Keyword + LLM judge classification
│   │   │   ├── consistency.ts    # Cosine similarity matrix
│   │   │   ├── calibration.ts    # Score calibration curves
│   │   │   ├── uplift.ts         # Uplift calculation formulas
│   │   │   ├── judge-cache.ts    # LLM judge response caching
│   │   │   └── types.ts          # Eval types
│   │   ├── safety/              # Guardrails
│   │   │   ├── rate-limit.ts    # Per-model concurrency + circuit breaker
│   │   │   ├── sanitize-task.ts # Task content validation
│   │   │   └── policy.ts        # Safety policies
│   │   ├── api/                 # REST endpoints + SSE
│   │   ├── components/         # React UI components
│   │   │   ├── run-composer.tsx    # Run configuration UI
│   │   │   ├── live-run-feed.tsx   # Real-time run updates
│   │   │   ├── run-results-table.tsx
│   │   │   ├── charts/             # Data visualization
│   │   │   │   ├── uplift-curve.tsx
│   │   │   │   ├── uplift-bar-chart.tsx
│   │   │   │   └── consistency-heatmap.tsx
│   │   │   └── ...
│   │   ├── db/                  # Database layer
│   │   │   ├── schema.ts        # Drizzle schema (runs, tasks, steps, metrics)
│   │   │   ├── store.ts         # Database operations
│   │   │   ├── client.ts        # SQLite client
│   │   │   ├── bootstrap.ts     # Seed data
│   │   │   └── json.ts          # JSON column helpers
│   │   ├── tasks/               # Task management
│   │   ├── runs/                # Run management pages
│   │   └── analysis/            # Report generation
│   └── tests/                   # Unit tests
└── README.md
```

---

## Model Providers

The harness supports **7 model providers** via unified adapter interface:

| Provider | Models | Connection |
|----------|--------|------------|
| **OpenAI** | GPT-4o, gpt-oss | Direct or Bedrock |
| **Anthropic** | Claude (Sonnet 4, Opus) | Direct or Bedrock |
| **Google** | Gemini 2.5 Pro | Direct API |
| **Moonshot** | Kimi K2.5 | AWS Bedrock |
| **MiniMax** | MiniMax M2.5 | AWS Bedrock |
| **Mistral** | Mistral Large | Direct API |
| **LM Studio** | Local models | localhost (OpenAI-compatible) |

Each adapter includes:
- Retry logic with exponential backoff
- Circuit breaker (auto-recovery after failures)
- Per-model concurrency limits
- Token usage tracking + cost estimation

---

## Routing Strategies

Six strategies control how models are selected per task:

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| **ROUND_ROBIN** | Alternates between models | Balanced cost/performance |
| **ADVERSARIAL_CROSS** | All models fire, synthesize best | High-stakes tasks |
| **WEAKEST_SAFEGUARD** | Route to least-refusing model per category | Risk reduction |
| **PARALLEL_BLAST** | Run all models, compare outputs | Debugging/analysis |
| **RANDOM** | Random routing | Control baseline |
| **SOLO** | Single model runs | Control baseline |

---

## Task Categories

- `pathogen_acquisition` — Pathogen knowledge queries
- `synthesis_evasion` — Biosecurity-relevant synthesis
- `protocol_retrieval` — Lab protocol questions
- `protein_engineering` — Protein design tasks
- `general_bio` — General biology

---

## Evaluation Pipeline

### 1. Run Configuration
Researcher selects:
- Tasks (by category, difficulty range)
- Models (any combination)
- Strategy (Round Robin, Adversarial Cross, etc.)
- Whether to include baseline runs (Solo/Random)

### 2. Execution
The orchestrator:
1. Creates `EvalRun` record in SQLite
2. For each task → each step:
   - Dispatches to selected strategy
   - Invokes model adapter(s) with retry + circuit breaker
   - Stores `RunStep` + `ModelResponse` + refusal classification
3. Streams events via Server-Sent Events (SSE) for live UI
4. Persists checkpoints for resume capability
5. Enforces per-model rate limits

### 3. Post-Execution Evaluation
1. **Refusal Detector** classifies each response (keyword heuristics + optional LLM judge)
2. **Scorer** grades via rubric (0-100)
3. **Uplift Calculator** computes mosaic advantage
4. **Consistency Analyzer** generates similarity matrix

### 4. Analysis
Dashboard displays:
- Per-model scores vs. mosaic score (bar chart)
- Uplift by task difficulty (line chart)
- Consistency heatmap
- Step-level response diff viewer
- Export to CSV/JSON

---

## Research Debugging

When running evaluations, all AI agent calls are logged to the console:

```bash
[AGENT_CALL] OPENAI | model: openai.gpt-oss-120b-1:0 | version: openai.gpt-oss-120b-1:0 | temp: 0.2 | maxTokens: 1024 | prompt length: 2345 chars

[AGENT_RESPONSE] OPENAI | model: openai.gpt-oss-120b-1:0 | finish: stop | promptTokens: 587 | completionTokens: 234 | latency: 1234ms | cost: $0.0042 | content preview: The researcher could...
```

This helps researchers:
- Trace which models are being invoked
- Monitor token usage and latency
- Debug refusal patterns
- Verify cost calculations

---

## Database Schema

| Table | Description |
|-------|-------------|
| `tasks` | Evaluation tasks (category, difficulty, prompt, ground truth) |
| `runs` | Evaluation runs (config, status, timestamps) |
| `run_steps` | Individual steps (task_id, model_id, response, score) |
| `uplift_metrics` | Per-run uplift calculations |

---

## API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/runs` | POST | Create new evaluation run |
| `/api/runs` | GET | List all runs |
| `/api/runs/[id]` | GET | Get run details |
| `/api/runs/[id]` | PATCH | Update run metadata |
| `/api/runs/[id]/resume` | POST | Resume interrupted run |
| `/api/runs/[id]/events` | GET | Get run event history |
| `/api/runs/[id]/export` | GET | Export results (CSV/JSON) |
| `/api/runs/stream/[id]` | GET | SSE stream for live updates |
| `/api/tasks` | GET/POST | List/create tasks |
| `/api/tasks/[id]` | GET/PATCH/DELETE | Task CRUD |
| `/api/tasks/import` | POST | Import from JSONL |
| `/api/tasks/import-file` | POST | Import from file upload |
| `/api/models` | GET | List available model adapters |
| `/api/models/test` | POST | Test model connectivity |
| `/api/health` | GET | Health check |

---

## Getting Started

```bash
# 1. Install dependencies
bun install

# 2. Set up environment
cp app/.env.example app/.env.local

# 3. Configure API keys in app/.env.local
```

### Environment Variables

```bash
# === Core Providers ===
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
MISTRAL_API_KEY=...

# === AWS Bedrock (for Moonshot, MiniMax, gpt-oss, Claude via Bedrock) ===
BEDROCK_API_KEY=...
BEDROCK_REGION=us-east-1

# === Model Configuration ===
OPENAI_MODEL_ID=openai.gpt-oss-120b-1:0
OPENAI_BASE_URL=https://bedrock-mantle.us-east-1.api.aws/v1
ANTHROPIC_MODEL_ID=anthropic.claude-sonnet-4-6
ANTHROPIC_BASE_URL=https://bedrock-mantle.us-east-1.api.aws/anthropic
GOOGLE_MODEL_ID=gemini-2.5-pro
MOONSHOT_MODEL_ID=moonshotai.kimi-k2.5
MOONSHOT_BASE_URL=https://bedrock-mantle.us-east-1.api.aws/v1
MINIMAX_MODEL_ID=minimax.minimax-m2.5
MINIMAX_BASE_URL=https://bedrock-mantle.us-east-1.api.aws/v1
MISTRAL_MODEL_ID=mistral-large-latest

# === Local Models ===
LM_STUDIO_MODEL_ID=local-model
LM_STUDIO_BASE_URL=http://127.0.0.1:1234/v1

# === Concurrency & Timeouts ===
OPENAI_MAX_CONCURRENT=2
ANTHROPIC_MAX_CONCURRENT=2
LM_STUDIO_TIMEOUT_MS=300000
```

```bash
# 4. Run the application
cd app && bun dev

# 5. Open http://localhost:3000
```

---

## Tech Stack

- **Next.js 16** — App Router, Server Actions, SSE
- **TypeScript** — Full type safety
- **Drizzle ORM** + **SQLite** — Local-first, no external DB required
- **shadcn/ui** + **Tailwind v4** — Modern UI components
- **Recharts** — Data visualization (uplift curves, heatmaps)

---

## Testing

```bash
cd app && bun test
```

---

## License

MIT