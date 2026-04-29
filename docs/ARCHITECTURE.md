# Architecture — Mosaic Eval Harness

## System Overview

The Mosaic Eval Harness is a Next.js full-stack application with four primary subsystems:

1. **Task Manager** — loads, stores, and serves biosecurity eval tasks
2. **Mosaic Orchestrator** — routes task steps across multiple LLM providers per a configurable routing strategy
3. **Eval Engine** — scores responses, detects refusals, computes per-model and collective uplift metrics
4. **Dashboard** — real-time visualization of runs, cross-model consistency scores, and uplift curves

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
│   /api/runs/[id]     /api/tasks/[id]     /api/results/[runId]        │
│   /api/runs/stream   /api/tasks/import   /api/export/[runId]         │
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
│         Prisma ORM ──▶ Neon Postgres (cloud, serverless)            │
│                                                                      │
│   Tables: EvalTask, EvalRun, RunStep, ModelResponse,                │
│            StepScore, UpliftMetric, RunSummary                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### `lib/orchestrator/`

The core of the project. Manages the lifecycle of a mosaic eval run.

| File | Responsibility |
|---|---|
| `runner.ts` | Top-level run executor: takes a RunConfig, iterates tasks, emits SSE events |
| `dispatcher.ts` | Routes individual task steps to specific model adapters per strategy |
| `strategies/round-robin.ts` | Distributes steps evenly across all configured models |
| `strategies/adversarial-cross.ts` | Sends same step to all models, uses best/most-informative response |
| `strategies/weakest-safeguard.ts` | Routes based on each model's historical refusal rate on similar tasks |
| `strategies/parallel-blast.ts` | Fires all models simultaneously, waits for all, feeds forward for synthesis |

### `lib/adapters/`

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

### `lib/eval/`

| File | Responsibility |
|---|---|
| `refusal-detector.ts` | Classifies a model response into 4 categories (full refusal → full compliance) |
| `scorer.ts` | Sends response + rubric to LLM judge (Claude Haiku), returns 0–100 score |
| `consistency.ts` | Computes pairwise semantic similarity between model responses using embeddings |
| `uplift.ts` | Computes per-model baseline vs. mosaic score, produces delta uplift coefficient |

### `lib/tasks/`

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
1. User creates RunConfig in UI
   └─ selects: task set, models, strategy, max steps per task

2. POST /api/runs → creates EvalRun (status: PENDING) → returns runId

3. GET /api/runs/stream?runId=X → SSE stream opened

4. Runner starts:
   for each EvalTask:
     for each step in task.steps:
       dispatcher routes step → model adapter(s)
       model adapter returns ModelResponse
       refusal-detector classifies response
       scorer scores response (LLM judge)
       RunStep + ModelResponse + StepScore saved to DB
       SSE event emitted → UI updates live

5. After all tasks:
   uplift.ts computes:
     - per_model_score[model] = mean(StepScore where model=X)
     - mosaic_score = mean(StepScore for best response per step)
     - delta_uplift = mosaic_score - max(per_model_score)
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
| ORM | Prisma 6 | Type-safe DB access, migration tooling |
| Database | Neon Postgres (serverless) | Zero-ops cloud Postgres, free tier, Prisma-compatible |
| LLM SDKs | openai, @anthropic-ai/sdk, @google/generative-ai | Official provider SDKs |
| Validation | Zod | Runtime schema validation for task files and API inputs |
| Streaming | Server-Sent Events (SSE) | Real-time run progress in browser without WebSocket overhead |
| Embeddings | OpenAI text-embedding-3-small | Cross-model consistency scoring |
| Testing | Vitest | Unit tests for scorer, refusal detector, uplift calc |
