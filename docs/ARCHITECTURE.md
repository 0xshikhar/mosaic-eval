# Architecture — Mosaic Eval

**Version:** 1.0  
**Last Updated:** 2024

---

## 1. System Overview

The Mosaic Eval is a research platform for evaluating LLM orchestration strategies on biosecurity-relevant proxy tasks. It combines a Next.js web interface with a sophisticated evaluation engine that can route tasks across multiple model providers, score responses, and compute "mosaic uplift" metrics.

### Architecture Principles

1. **Local-First:** SQLite database runs locally; no external database required
2. **Reproducible:** All runs generate deterministic configuration hashes
3. **Observable:** Real-time SSE streaming with full audit logging
4. **Extensible:** New models and strategies added via adapter pattern
5. **Research-Ready:** Built-in calibration, statistical analysis, and export tools

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                        │
│                                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                │
│  │   Dashboard      │  │   Run Composer   │  │   Results View   │                │
│  │   (Overview)     │  │   (Configure)    │  │   (Analyze)        │                │
│  │                  │  │                  │  │                  │                │
│  │  • Run history   │  │  • Task selector │  │  • Charts        │                │
│  │  • Metrics       │  │  • Model picker  │  │  • Diff viewer   │                │
│  │  • Status        │  │  • Strategy cfg  │  │  • Export        │                │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘                │
│           │                     │                     │                        │
│           └─────────────────────┼─────────────────────┘                        │
│                                 │                                                │
│                    ┌────────────▼────────────┐                                    │
│                    │   shadcn/ui + Tailwind  │                                    │
│                    │   Recharts (graphs)     │                                    │
│                    └─────────────────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP / SSE
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Next.js App Router (API Layer)                          │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                        API Routes (/app/api/)                               ││
│  │                                                                              ││
│  │   /api/runs              /api/tasks              /api/models                ││
│  │   ├─ POST (create)       ├─ GET (list)          ├─ GET (list)              ││
│  │   ├─ GET (list)          ├─ POST (import)       └─ POST (test)            ││
│  │   ├─ [id]/GET            └─ [id]/GET                                     ││
│  │   ├─ [id]/stream                                                             ││
│  │   ├─ [id]/resume                                                             ││
│  │   └─ [id]/export                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                          │
│                    ┌─────────────────┼─────────────────┐                        │
│                    │                 │                 │                        │
│                    ▼                 ▼                 ▼                        │
│  ┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────┐        │
│  │   Task Manager       │  │   Run Orchestrator │  │   Results API      │        │
│  │   (app/tasks/)       │  │   (app/orchestrator│  │   (app/results/)   │        │
│  │                      │  │    /)              │  │                    │        │
│  │  • Load/validate     │  │  • Strategy engine │  │  • Aggregations    │        │
│  │  • Import JSONL      │  │  • Model dispatch  │  │  • Export          │        │
│  │  • Schema validation │  │  • SSE events      │  │  • Analytics       │        │
│  └──────────────────────┘  └─────────┬──────────┘  └──────────────────┘        │
│                                      │                                          │
└──────────────────────────────────────┼──────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Core Engine Layer                                      │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                        Strategy Router                                      │ │
│  │                                                                             │ │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │ │
│  │   │  Round Robin │  │   Adversarial│  │   Weakest    │  │   Parallel   │   │ │
│  │   │              │  │   Cross      │  │   Safeguard  │  │   Blast      │   │ │
│  │   │  Sequential  │  │   All→Synt   │  │   By refusal │  │   All→Best   │   │ │
│  │   │  rotation    │  │   hesizer    │  │   rate       │  │   (no synth) │   │ │
│  │   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │ │
│  │          └─────────────────┴─────────────────┴─────────────────┘             │ │
│  │                              │                                           │ │
│  │                              ▼                                           │ │
│  │                   ┌────────────────────┐                                  │ │
│  │                   │   Step Dispatcher  │                                  │ │
│  │                   │   (per-step routing) │                                  │ │
│  │                   └──────────┬─────────┘                                  │ │
│  └──────────────────────────────┼────────────────────────────────────────────┘ │
│                                 │                                              │
│                    ┌────────────┼────────────┐                                 │
│                    │            │            │                                 │
│                    ▼            ▼            ▼                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                      Model Adapter Layer                                  │  │
│  │                                                                         │  │
│  │   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐       │  │
│  │   │   OpenAI   │  │  Anthropic │  │   Google   │  │   Bedrock  │       │  │
│  │   │   Adapter  │  │   Adapter  │  │   Adapter  │  │   Adapter  │       │  │
│  │   │            │  │            │  │            │  │            │       │  │
│  │   │ gpt-oss-120b│  │ Sonnet 4.6 │  │  Gemini 2.5│  │  Kimi K2.5 │       │  │
│  │   │ GPT-4o fbk  │  │ (Bedrock)  │  │   Pro      │  │ MiniMax M2.5│      │  │
│  │   └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘       │  │
│  │         └───────────────┴───────────────┴───────────────┘               │  │
│  │                           │                                           │  │
│  │                           ▼                                           │  │
│  │              ┌────────────────────────┐                                 │  │
│  │              │   Circuit Breaker      │                                 │  │
│  │              │   • Rate limiting      │                                 │  │
│  │              │   • Retry logic        │                                 │  │
│  │              │   • Health checks      │                                 │  │
│  │              └────────────────────────┘                                 │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                        Evaluation Engine                                  │  │
│  │                                                                         │  │
│  │   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐      │  │
│  │   │ Refusal Detector│   │ LLM Judge       │   │ Uplift Engine   │      │  │
│  │   │                 │   │                 │   │                 │      │  │
│  │   │ 2-stage:        │   │ • Rubric-based  │   │ • Baselines     │      │  │
│  │   │ 1. Keywords     │   │ • 0-100 scores  │   │ • Mosaic score  │      │  │
│  │   │ 2. LLM confirm  │   │ • Calibration   │   │ • Delta uplift  │      │  │
│  │   └─────────────────┘   └─────────────────┘   └─────────────────┘      │  │
│  │                                                                         │  │
│  │   ┌─────────────────┐   ┌─────────────────┐                            │  │
│  │   │ Consistency      │   │ Synthesizer     │                            │  │
│  │   │ Analyzer         │   │ (Adversarial)   │                            │  │
│  │   │                 │   │                 │                            │  │
│  │   │ • Embeddings    │   │ • Merge best    │                            │  │
│  │   │ • Pairwise sim  │   │ • Reconcile     │                            │  │
│  │   │ • Agreement     │   │   conflicts     │                            │  │
│  │   └─────────────────┘   └─────────────────┘                            │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Data & Telemetry Layer                                   │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                        Persistence (Drizzle ORM)                            │ │
│  │                                                                            │ │
│  │   SQLite Database: data/databases/mosaic.db                               │ │
│  │                                                                            │ │
│  │   Tables:                                                                  │ │
│  │   • eval_tasks, eval_task_steps     (Task definitions)                    │ │
│  │   • eval_runs, run_steps            (Run execution)                       │ │
│  │   • model_responses, step_scores    (Results)                             │ │
│  │   • run_summaries, uplift_metrics   (Aggregations)                        │ │
│  │   • audit_logs, run_checkpoints     (Telemetry & recovery)               │ │
│  │   • calibration_labels, cost_events (Quality & accounting)               │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────┐   │
│  │      Cache Layer        │  │      Event Bus          │  │   Audit Logger  │   │
│  │                         │  │                         │  │                 │   │
│  │  • Response cache       │  │  • SSE streaming        │  │  • Security     │   │
│  │  • Judge cache          │  │  • Persisted events     │  │  • Compliance   │   │
│  │  • Embedding cache      │  │  • Reconnect support    │  │  • Reproducib.  │   │
│  └─────────────────────────┘  └─────────────────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Structure

```
/Users/shikharsingh/Downloads/code/bio-tech/mosaic/
├── app/                          # Next.js application
│   ├── src/app/
│   │   ├── api/                  # API routes
│   │   │   ├── runs/             # Run management endpoints
│   │   │   ├── tasks/            # Task management endpoints
│   │   │   └── models/           # Model testing endpoints
│   │   ├── components/           # Reusable UI components
│   │   │   ├── ui/               # shadcn/ui primitives
│   │   │   ├── charts/           # Recharts wrappers
│   │   │   └── *.tsx             # Domain components
│   │   ├── db/                   # Database layer
│   │   │   ├── schema.ts         # Drizzle schema definitions
│   │   │   ├── client.ts         # Database client setup
│   │   │   ├── bootstrap.ts      # Schema initialization
│   │   │   └── store.ts          # Data access functions
│   │   ├── orchestrator/         # Core orchestration engine
│   │   │   ├── runner.ts         # Run execution orchestrator
│   │   │   ├── dispatcher.ts     # Step routing logic
│   │   │   ├── strategies/       # Strategy implementations
│   │   │   │   ├── round-robin.ts
│   │   │   │   ├── adversarial-cross.ts
│   │   │   │   ├── weakest-safeguard.ts
│   │   │   │   ├── parallel-blast.ts
│   │   │   │   ├── solo.ts
│   │   │   │   └── random.ts
│   │   │   └── adapters/         # Model provider adapters
│   │   │       ├── openai.ts
│   │   │       ├── anthropic.ts
│   │   │       ├── google.ts
│   │   │       ├── mistral.ts
│   │   │       └── bedrock.ts
│   │   ├── eval/                 # Evaluation engine
│   │   │   ├── refusal-detector.ts
│   │   │   ├── scorer.ts
│   │   │   ├── consistency.ts
│   │   │   ├── uplift.ts
│   │   │   └── calibration.ts
│   │   ├── tasks/                # Task management
│   │   │   ├── loader.ts
│   │   │   ├── schema.ts
│   │   │   └── service.ts
│   │   ├── safety/               # Safety & controls
│   │   │   ├── sanitize-task.ts
│   │   │   ├── rate-limit.ts
│   │   │   └── policy.ts
│   │   ├── cache/                # Caching layer
│   │   │   ├── response-cache.ts
│   │   │   ├── judge-cache.ts
│   │   │   └── embedding-cache.ts
│   │   ├── telemetry/            # Observability
│   │   │   ├── audit-log.ts
│   │   │   ├── cost-meter.ts
│   │   │   └── events.ts
│   │   └── hooks/                # React hooks
│   ├── public/                   # Static assets
│   └── tests/                    # Unit & integration tests
├── data/                         # Data storage
│   ├── databases/                # SQLite databases
│   └── imports/                  # Raw task imports
├── docs/                         # Documentation
│   ├── research/                 # Research methodology docs
│   ├── API_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── DATA_SCHEMA.md
│   └── ...
└── ...
```

### Boundary Rules

| Directory | Purpose | Rule |
|-----------|---------|------|
| `app/` | Application code | All runtime code lives here |
| `app/components/` | UI primitives | Reusable, domain-agnostic |
| `app/api/` | API routes | Next.js App Router convention |
| `app/*/service.ts` | Business logic | Encapsulated operations |
| `app/db/` | Data access | Drizzle ORM only |
| `data/` | Static data | JSONL, seed files |
| `docs/` | Documentation | Markdown files |
| `tests/` | Tests | Vitest, outside app bundle |

---

## 4. Component Deep-Dive

### 4.1 Orchestrator (`app/orchestrator/`)

The orchestrator is the heart of the system, managing the lifecycle of evaluation runs.

#### Runner (`runner.ts`)

**Responsibilities:**
- Initialize run from configuration
- Iterate through tasks and steps
- Coordinate strategy, adapters, and eval engine
- Emit SSE events for real-time updates
- Manage checkpoints for crash recovery

**Execution Flow:**
```typescript
async function executeRun(config: RunConfig): Promise<void> {
  // 1. Initialize
  const run = await createRun(config)
  emitEvent('run_started', { runId: run.id })
  
  // 2. For each task
  for (const task of config.tasks) {
    // 3. For each step
    for (const step of task.steps) {
      // 4. Route per strategy
      const models = await strategy.selectModels(step)
      
      // 5. Invoke models
      const responses = await Promise.all(
        models.map(m => adapter.invoke(m, step.prompt))
      )
      
      // 6. Classify and score
      const classifications = responses.map(r => detectRefusal(r))
      const scores = await Promise.all(
        responses.map(r => scoreResponse(r, step.rubric))
      )
      
      // 7. Persist
      await saveStepResults(run.id, step.id, responses, scores)
      
      // 8. Emit progress
      emitEvent('step_complete', { stepId: step.id, scores })
    }
  }
  
  // 9. Compute uplift
  const summary = await computeUplift(run.id)
  await saveRunSummary(run.id, summary)
  
  // 10. Complete
  emitEvent('run_complete', { runId: run.id, summary })
}
```

#### Dispatcher (`dispatcher.ts`)

Routes individual steps to model adapters based on the active strategy.

```typescript
interface StepDispatcher {
  dispatch(
    step: TaskStep,
    strategy: RoutingStrategy,
    availableModels: ModelAdapter[]
  ): Promise<ModelResponse[]>
}
```

#### Strategies (`strategies/`)

| Strategy | Algorithm | Cost | Use Case |
|----------|-----------|------|----------|
| **SOLO** | Single model, all steps | $ | Baseline calibration |
| **ROUND_ROBIN** | Sequential rotation | $$$ | Even distribution |
| **RANDOM** | Random assignment | $$ | Statistical baseline |
| **ADVERSARIAL_CROSS** | All models + synthesis | $$$$$ | Maximum quality |
| **PARALLEL_BLAST** | All models, no synthesis | $$$$$ | Raw capability analysis |
| **WEAKEST_SAFEGUARD** | By historical refusal rate | $$ | Minimize refusals |

**Strategy Interface:**
```typescript
interface RoutingStrategy {
  name: string
  selectModels(
    step: TaskStep,
    context: RunContext,
    availableModels: ModelAdapter[]
  ): Promise<ModelAdapter[]>
}
```

### 4.2 Model Adapters (`app/orchestrator/adapters/`)

Uniform interface over provider-specific SDKs.

```typescript
interface ModelAdapter {
  id: string                          // 'openai', 'anthropic', etc.
  name: string                        // Display name
  
  invoke(
    prompt: string,
    options: InvokeOptions
  ): Promise<ModelResponse>
  
  streamInvoke?(
    prompt: string,
    options: InvokeOptions
  ): AsyncGenerator<string>
  
  isAvailable(): Promise<boolean>
  getCostEstimate(tokens: TokenCount): number
}

interface ModelResponse {
  content: string
  latency: number                     // milliseconds
  tokens: { input: number; output: number }
  costUsd: number
  refusalClassification?: RefusalClass
  metadata: Record<string, unknown>
}
```

**Adapter Responsibilities:**
- Provider SDK integration
- Request/response transformation
- Error handling and retries
- Cost calculation
- Rate limit compliance

### 4.3 Evaluation Engine (`app/eval/`)

#### Refusal Detector (`refusal-detector.ts`)

Two-stage classification pipeline:

```
Model Response
    │
    ▼
┌─────────────────┐
│ Stage 1:        │
│ Keyword         │──▶ FULL_REFUSAL? → Done
│ Heuristics      │
└─────────────────┘
    │
    │ (ambiguous)
    ▼
┌─────────────────┐
│ Stage 2:        │──▶ FULL_REFUSAL
│ LLM Judge       │    PARTIAL_REFUSAL
│ Classification  │    SOFT_COMPLY
└─────────────────┘    FULL_COMPLY
```

**Classes:**
- `FULL_REFUSAL`: Complete refusal, no content
- `PARTIAL_REFUSAL`: Refuses but provides context
- `SOFT_COMPLY`: Complies with caveats
- `FULL_COMPLY`: Direct response

#### Scorer (`scorer.ts`)

LLM-as-judge implementation:

```typescript
interface Scorer {
  score(
    response: string,
    task: TaskStep,
    judgeModel: ModelAdapter
  ): Promise<ScoreResult>
}

interface ScoreResult {
  score: number        // 0-100
  reasoning: string
  calibrated: boolean
  rubricVersion: string
}
```

**Calibration:**
- 10% of tasks have human expert labels
- Calibration factor per category: `human_mean / judge_mean`
- Applied to all scores: `calibrated = raw × factor`

#### Uplift Engine (`uplift.ts`)

Computes mosaic uplift metrics:

```typescript
interface UpliftMetrics {
  mosaicScore: number
  bestBaseline: number
  absoluteUplift: number      // mosaic - max(baselines)
  relativeUplift: number       // (absolute / bestBaseline) × 100
  
  perModelBaselines: Record<string, number>
  perCategoryUplift: Record<string, number>
  
  // Statistical
  confidenceInterval: [number, number]
  cohensD: number
  pValue: number
}
```

### 4.4 Database Layer (`app/db/`)

#### Schema (`schema.ts`)

Drizzle ORM schema definitions. See [DATA_SCHEMA.md](./DATA_SCHEMA.md) for full details.

#### Client (`client.ts`)

SQLite client configuration:

```typescript
// Key settings
- journal_mode = WAL           // Write-ahead logging
- foreign_keys = ON          // Referential integrity
- busy_timeout = 5000        // 5s timeout for locks
```

#### Store (`store.ts`)

Data access functions:

```typescript
// Runs
export async function createRun(config: RunConfig): Promise<EvalRun>
export async function getRunById(id: string): Promise<EvalRun | null>
export async function updateRunStatus(id: string, status: RunStatus): Promise<void>

// Steps
export async function createRunStep(runId: string, step: TaskStep): Promise<RunStep>
export async function saveModelResponse(stepId: string, response: ModelResponse): Promise<void>
export async function saveStepScore(stepId: string, score: StepScore): Promise<void>

// Tasks
export async function listTasks(filters: TaskFilters): Promise<EvalTask[]>
export async function importTasks(tasks: EvalTask[]): Promise<ImportResult>
```

### 4.5 Safety Layer (`app/safety/`)

| Component | Responsibility |
|-----------|---------------|
| `sanitize-task.ts` | Validate task prompts, strip PII |
| `rate-limit.ts` | Per-provider concurrency limits, circuit breakers |
| `policy.ts` | Content gates, escalation rules |

**Rate Limiting:**
```typescript
const limits: Record<string, ConcurrencyLimit> = {
  openai: { max: 5, current: 0 },
  anthropic: { max: 2, current: 0 },
  google: { max: 5, current: 0 },
}
```

### 4.6 Telemetry (`app/telemetry/`)

| Component | Responsibility |
|-----------|---------------|
| `audit-log.ts` | Security events, compliance trail |
| `cost-meter.ts` | Real-time cost tracking |
| `events.ts` | SSE event persistence |

---

## 5. Data Flow Deep-Dive

### 5.1 Run Execution Flow

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User   │────▶│  POST    │────▶│  Create  │────▶│  Runner  │
│         │     │  /runs   │     │  Run     │     │  Start   │
└─────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                         │
    ┌────────────────────────────────────────────────────┼────┐
    │                                                    │    │
    ▼                                                    ▼    │
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌────────┴──┐
│  Load    │────▶│  Route   │────▶│  Invoke  │────▶│  Evaluate │
│  Task    │     │  Step    │     │  Models  │     │  Response │
└──────────┘     └──────────┘     └──────────┘     └─────┬─────┘
                                                         │
                              ┌──────────────────────────┼──────────┐
                              │                          │          │
                              ▼                          ▼          ▼
                         ┌─────────┐              ┌──────────┐ ┌──────────┐
                         │  Score  │              │ Refusal  │ │  Cons.   │
                         │  Judge  │              │ Detect   │ │  Check   │
                         └────┬────┘              └──────────┘ └──────────┘
                              │
                              ▼
                        ┌──────────┐
                        │  Persist │────▶ Database
                        │  Results │
                        └────┬─────┘
                             │
                             ▼
                        ┌──────────┐
                        │  Emit    │────▶ SSE Stream ────▶ Browser
                        │  Event   │
                        └──────────┘
                             │
                             │ (loop for next step)
                             ▼
                        ┌──────────┐
                        │  Next    │─────────────────────────────────┐
                        │  Step?   │────▶ No ────▶ Compute Uplift  │
                        └──────────┘                      │          │
                             │ Yes                        ▼          │
                             └────────────────────────────────────────┘
```

### 5.2 Strategy-Specific Flows

#### Round Robin

```
Step 1 ──▶ Model A
Step 2 ──▶ Model B
Step 3 ──▶ Model C
Step 4 ──▶ Model A
...
```

#### Adversarial Cross

```
         ┌────────▶ Model A ──┐
         │                      │
Step N ──┼────────▶ Model B ──┼──▶ Synthesizer ──▶ Best Response
         │                      │
         └────────▶ Model C ──┘
```

#### Weakest Safeguard

```
Step N ──▶ Check Refusal DB ──▶ Select Model X (lowest refusal rate for category)
           ↑___________________________________________│
           └──────────── Update after response ──────────┘
```

---

## 6. Technology Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Framework** | Next.js | 15.x | App Router, SSR, API routes |
| **Language** | TypeScript | 5.x | Strict mode, type safety |
| **UI** | React | 19.x | Server/Client components |
| **Styling** | Tailwind CSS | 4.x | Utility-first, shadcn/ui |
| **Components** | shadcn/ui | latest | Accessible primitives |
| **Charts** | Recharts | 2.x | Composable, React-native |
| **ORM** | Drizzle ORM | 0.30+ | Type-safe, SQLite-first |
| **Database** | SQLite | 3.x | Local, zero-config |
| **Validation** | Zod | 3.x | Runtime schemas |
| **Testing** | Vitest | 1.x | Fast, TypeScript-native |
| **LLM SDKs** | Provider SDKs | latest | Official support |
| **Streaming** | SSE | native | Real-time updates |

---

## 7. Security & Compliance

### Data Flow Security

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   API       │────▶│   Models    │
│   (Browser) │     │   (Next.js) │     │   (External)│
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      │ HTTPS only        │ No data stored    │ API keys
      │ No PII in URLs    │ SQLite local      │ Env vars only
      │                   │ No cloud DB       │ Never logged
```

### Audit Trail

All actions logged to `audit_logs` table:

```typescript
interface AuditLog {
  id: string
  runId: string | null
  action: AuditAction
  actor: string | null      // User ID or 'system'
  ipAddress: string | null
  userAgent: string | null
  details: object | null
  timestamp: string
}

type AuditAction = 
  | 'RUN_CREATED' | 'RUN_STARTED' | 'RUN_COMPLETED' 
  | 'RUN_FAILED' | 'RUN_CANCELLED' | 'RUN_RESUMED'
  | 'STEP_STARTED' | 'STEP_COMPLETED'
  | 'MODEL_INVOKED' | 'SCORE_RECORDED'
  | 'TASK_IMPORTED' | 'DATA_EXPORTED'
```

---

## 8. Performance Characteristics

### Throughput

| Operation | Expected Rate | Bottleneck |
|-----------|--------------|------------|
| Task import | 100 tasks/sec | JSONL parsing |
| Run execution | 1-5 steps/sec | Model API latency |
| Judge scoring | 2-4 scores/sec | LLM judge latency |
| SSE streaming | 1000 events/sec | Network |
| Database writes | 500 writes/sec | SQLite WAL |

### Scalability Limits

- **SQLite:** Single-writer, good for research scale (10K+ runs)
- **Concurrent runs:** 1 active run recommended (configurable)
- **Models per run:** 2-7 recommended (diminishing returns beyond)
- **Tasks per run:** No hard limit, but 100-500 typical

### Optimization Strategies

1. **Response Caching:** Identical prompts served from cache
2. **Judge Caching:** Same (response, rubric) pairs cached
3. **Batch Scoring:** Multiple scores per judge call
4. **Streaming:** UI updates without polling
5. **Checkpoints:** Resume without reprocessing

---

## 9. Extension Points

### Adding a New Model

1. Create adapter in `app/orchestrator/adapters/{provider}.ts`
2. Implement `ModelAdapter` interface
3. Add configuration in environment
4. Register in adapter registry

### Adding a New Strategy

1. Create file in `app/orchestrator/strategies/{name}.ts`
2. Implement `RoutingStrategy` interface
3. Add to strategy enum and UI picker
4. Document in strategies comparison

### Adding a New Metric

1. Define in `app/eval/` (e.g., `novelty.ts`)
2. Update `computeUplift()` to include
3. Add database column if persisted
4. Update UI to display

---

*For implementation details, see source code and inline comments.*
