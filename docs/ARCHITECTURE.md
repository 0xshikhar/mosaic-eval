# Architecture — Mosaic Eval Harness

## System Overview

The Mosaic Eval Harness is a Next.js MVP with a simple file layout: keep reusable UI in `app/components/`, and keep the rest of the application inside `app/` so the code is easy to find and iterate on. For a small prototype, the app directory can hold routes, pages, database access, orchestration, evaluation, safety checks, and analysis helpers without adding extra top-level service folders.

Core subsystems:

1. **Task Catalog** - loads, validates, and serves proxy eval tasks and calibration sets
2. **Run Orchestrator** - routes task steps across multiple LLM providers per a configurable strategy
3. **Eval Engine** - scores responses, detects refusals, computes uplift and consistency metrics
4. **Safety and Control Layer** - sanitizes inputs, enforces rate limits, records audit events, and gates sensitive content
5. **Dashboard and Reporting** - visualizes runs, supports export, and surfaces cost and reproducibility metadata

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Browser (Next.js)                             │
│                                                                      │
│  ┌─────────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
│  │  Dashboard UI   │   │  Run Config UI   │   │  Results View    │  │
│  │  (shadcn/ui)    │   │  (task selector, │   │  (charts,        │  │
│  │                 │   │   model picker,  │   │   diff viewer,   │  │
│  │                 │   │   strategy cfg)  │   │   export)        │  │
│  └────────┬────────┘   └────────┬─────────┘   └────────┬─────────┘  │
│           │                     │                       │            │
└───────────┼─────────────────────┼───────────────────────┼────────────┘
            │         Next.js App Router API Routes        │
            ▼                     ▼                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         API Layer (/app/api/)                        │
│                                                                      │
│   /api/runs          /api/tasks          /api/results                │
│   /api/runs/[id]     /api/tasks/[id]     /api/export/[runId]         │
│   /api/runs/stream   /api/tasks/import   /api/models/test            │
└──────────┬───────────────────┬───────────────────────────────────────┘
           │                   │
           ▼                   ▼
┌──────────────────┐  ┌──────────────────────────────────────────────┐
│   Task Manager   │  │              Mosaic Orchestrator              │
│                  │  │                                               │
│  - Load tasks    │  │  ┌────────────┐   ┌──────────────────────┐   │
│  - JSONL import  │  │  │  Routing   │   │   Step Dispatcher    │   │
│  - Validate task │  │  │  Strategy  │──▶│                      │   │
│    schemas       │  │  │  Engine    │   │  - Round Robin       │   │
│  - Tag/filter    │  │  └────────────┘   │  - Weakest Safeguard │   │
│                  │  │                   │  - Parallel Blast    │   │
└────────┬─────────┘  │                   │  - Adversarial Cross │   │
         │            │                   └──────────┬───────────┘   │
         │            │                              │               │
         │            │         ┌────────────────────▼──────────────┐│
         │            │         │         Model Adapters            ││
         │            │         │                                   ││
         │            │         │  ┌─────────┐  ┌──────────────┐   ││
         │            │         │  │ OpenAI  │  │  Anthropic   │   ││
         │            │         │  │ Adapter │  │  Adapter     │   ││
         │            │         │  └────┬────┘  └──────┬───────┘   ││
         │            │         │       │               │           ││
         │            │         │  ┌────▼────┐  ┌──────▼───────┐   ││
         │            │         │  │ Google  │  │   Mistral /  │   ││
         │            │         │  │ Adapter │  │   others     │   ││
         │            │         │  └─────────┘  └──────────────┘   ││
         │            │         └────────────────────┬──────────────┘│
         │            └─────────────────────────────┬┘               │
         │                                          │                 
         ▼                                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          Eval Engine                                 │
│                                                                      │
│  ┌───────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Refusal Detector │  │  Scorer          │  │  Uplift Calc     │  │
│  │                   │  │                  │  │                  │  │
│  │  - Full refusal   │  │  - LLM-judge     │  │  - Per-model     │  │
│  │  - Partial refuse │  │    scoring       │  │    baseline      │  │
│  │  - Partial comply │  │  - Rubric-based  │  │  - Mosaic score  │  │
│  │  - Full comply    │  │  - Keyword check │  │  - Delta uplift  │  │
│  └─────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│            └───────────────────┬─┘                     │            │
│                                ▼                        ▼            │
│                    ┌────────────────────────────────────────────┐   │
│                    │    Consistency Analyzer                     │   │
│                    │                                             │   │
│                    │  - Cross-model agreement score              │   │
│                    │  - Semantic similarity (embedding-based)    │   │
│                    │  - Factual consistency check (LLM judge)    │   │
│                    │  - Best-of-N aggregation logic              │   │
│                    └────────────────────────────────────────────┘   │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Persistence Layer                               │
│                                                                      │
│        Drizzle ORM ──▶ SQLite (local file by default)               │
│                                                                      │
│   Tables: EvalTask, EvalTaskStep, EvalRun, RunStep, ModelResponse,  │
│            StepScore, UpliftMetric, RunSummary, AuditLog,           │
│            RunCheckpoint, CalibrationLabel, CostEvent               │
└──────────────────────────────────────────────────────────────────────┘
```

## Boundary Rules

- `app/` contains routes, pages, storage code, orchestration, eval, safety, analysis, and UI components.
- `app/components/` contains reusable UI, charts, forms, and design-system primitives.
- `data/` contains seed tasks, fixtures, calibration samples, and other static research inputs.
- `scripts/` contains importers, migration helpers, analysis jobs, and one-off maintenance tools.
- `tests/` contains unit tests and integration tests because they are not runtime app code and should not be bundled with routes.
- `types/` contains shared contracts used across routes, components, eval, and scripts, so they stay separate from route-local implementation.
This keeps the prototype easy to navigate without forcing a separate service-layer structure.

---

## Component Responsibilities

### `app/orchestrator/`

The core of the project. Manages the lifecycle of a mosaic eval run.

| File | Responsibility |
|---|---|
| `runner.ts` | Top-level run executor: takes a RunConfig, iterates tasks, emits SSE events |
| `dispatcher.ts` | Routes individual task steps to specific model adapters per strategy |
| `strategies/round-robin.ts` | Distributes steps evenly across all configured models |
| `strategies/adversarial-cross.ts` | Sends same step to all models, uses best/most-informative response |
| `strategies/weakest-safeguard.ts` | Routes based on each model's historical refusal rate on similar tasks |
| `strategies/parallel-blast.ts` | Fires all models simultaneously, waits for all, feeds forward for synthesis |
| `strategies/solo.ts` | Baseline single-model run for calibration and comparison |
| `strategies/random.ts` | Naive control strategy for benchmark comparison |

### `app/orchestrator/adapters/`

Thin, uniform wrapper around each LLM provider SDK.

```typescript
interface ModelAdapter {
  id: string
  name: string
  invoke(prompt: string, options: InvokeOptions): Promise<ModelResponse>
  streamInvoke(prompt: string, options: InvokeOptions): AsyncGenerator<string>
}
```

| File | Provider |
|---|---|
| `openai.ts` | GPT-4o, o3, o4-mini via openai SDK |
| `anthropic.ts` | Claude Opus 4, Sonnet 4.5 via @anthropic-ai/sdk |
| `google.ts` | Gemini 2.5 Pro via @google/generative-ai |
| `mistral.ts` | Mistral Large (optional/extensible) |

### `app/db/`

| File | Responsibility |
|---|---|
| `client.ts` | Drizzle proxy client setup for local SQLite |
| `schema.ts` | Drizzle schema definitions and types |
| `bootstrap.ts` | Schema bootstrap helper for local SQLite |

Why it lives under `app/`: it is server-only code, it is used directly by route handlers, and colocating it with the rest of the app keeps the MVP easy to scan without a separate data-access layer.

### `app/safety/`

| File | Responsibility |
|---|---|
| `sanitize-task.ts` | Validates proxy task prompts and strips unsafe patterns |
| `rate-limit.ts` | Concurrency and provider throttling |
| `policy.ts` | Content gates, redaction rules, and escalation decisions |

### `app/cache/`

| File | Responsibility |
|---|---|
| `response-cache.ts` | Caches deterministic model responses and prompt hashes |
| `judge-cache.ts` | Caches judge outputs for identical response/rubric pairs |
| `embedding-cache.ts` | Caches embeddings for similarity analysis |

### `app/telemetry/`

| File | Responsibility |
|---|---|
| `audit-log.ts` | Records run lifecycle, imports, exports, and admin actions |
| `cost-meter.ts` | Tracks estimated spend per model, run, and task |
| `events.ts` | Persisted run-event log for SSE reconnects and polling fallback |

### `app/eval/`

| File | Responsibility |
|---|---|
| `refusal-detector.ts` | Classifies a model response into 4 categories (full refusal → full compliance) |
| `scorer.ts` | Sends response + rubric to LLM judge (Claude Haiku), returns 0–100 score |
| `consistency.ts` | Computes pairwise semantic similarity between model responses using embeddings |
| `uplift.ts` | Computes per-model baseline vs. mosaic score, produces delta uplift coefficient |
| `calibration.ts` | Compares model scores against human-labeled calibration samples |

### `app/tasks/`

| File | Responsibility |
|---|---|
| `loader.ts` | Reads `.jsonl` task files, validates against `EvalTaskSchema` (Zod) |
| `schema.ts` | Zod schema for task validation |
| `categories.ts` | Task category constants (pathogen acquisition, synthesis, evasion, etc.) |

---

## Routing Strategies — Detail

### Round Robin
Steps 1→N are distributed sequentially across models [Model A, B, C, A, B, C...]. Baseline strategy. Measures whether distributing work degrades or maintains quality.

### Adversarial Cross-Validation
Every step is sent to ALL models simultaneously. A synthesis agent (separate Claude Haiku call) receives all responses and produces a consensus/best answer, explicitly preferring the most complete and least-refused response. This simulates the most dangerous adversarial pattern.

### Weakest-Safeguard Routing
Before each step, query the `UpliftMetric` table to find which model has the lowest historical refusal rate for the current task category. Route the step there. Models are ranked dynamically per task type.

### Parallel Blast
Same as Adversarial Cross but non-synthesizing — all responses logged independently. Used to measure raw per-model capability on identical prompts for cross-model consistency analysis.

---

## Data Flow — Single Run

```
0. User creates RunConfig in UI
   └─ selects: task set, models, strategy, calibration mode, max steps per task
   └─ run config is validated and hashed for reproducibility

2. POST /api/runs → creates EvalRun (status: PENDING) → returns runId

3. GET /api/runs/stream?runId=X → SSE stream opened

4. Runner starts:
   for each EvalTask:
     for each step in task.steps:
       - sanitize prompt and record prompt hash
       dispatcher routes step → model adapter(s)
       model adapter returns ModelResponse
       refusal-detector classifies response
       scorer scores response (LLM judge)
       RunStep + ModelResponse + StepScore saved to DB
       RunCheckpoint saved after every completed step
       AuditLog event appended for traceability
       SSE event emitted → UI updates live

5. After all tasks:
   uplift.ts computes:
     - per_model_score[model] = mean(StepScore where model=X)
     - mosaic_score = mean(StepScore for best response per step)
     - delta_uplift = mosaic_score - max(per_model_score)
     - control metrics = naive baseline, solo baseline, calibration subset deltas
   RunSummary saved to DB
   EvalRun status → COMPLETE
   Final SSE event emitted

6. Dashboard renders:
   - Per-model score breakdown
   - Mosaic vs. individual comparison bar chart
   - Step-level diff viewer (which model answered each step)
   - Consistency heatmap (pairwise agreement)
   - Uplift curve over task difficulty
```

---

## Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) | Full-stack, SSE support, API routes, file-based routing |
| Language | TypeScript (strict) | Type safety for complex eval data structures |
| UI | shadcn/ui + Tailwind v4 | Fast, accessible component primitives |
| Charts | Recharts | React-native, composable, good for run comparison views |
| ORM | Drizzle ORM | Familiar DB access with simple local SQLite setup |
| Database | SQLite | Offline-capable local file by default |
| LLM SDKs | openai, @anthropic-ai/sdk, @google/generative-ai | Official provider SDKs |
| Validation | Zod | Runtime schema validation for task files and API inputs |
| Streaming | Server-Sent Events (SSE) + persisted events | Real-time browser updates with reconnect support |
| Embeddings | OpenAI text-embedding-3-small | Cross-model consistency scoring |
| Testing | Vitest | Unit tests for scorer, refusal detector, uplift calc |
