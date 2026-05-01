# Mosaic Eval Harness

> A local-first, multi-model LLM evaluation harness for biosecurity research that measures whether combining multiple AI models can produce more capable outputs than any single model alone.

---

## What This Product Does

Mosaic Eval Harness is a **research evaluation tool** designed to answer a specific question: **Does combining multiple LLMs create measurable improvement (or uplift) in biosecurity-relevant tasks compared to using a single model?**

### Core Use Case

Researchers and security analysts often need outputs that cross multiple domains — biology, chemistry, physics, protein engineering. No single LLM is optimal at everything. This harness evaluates whether **mosaic orchestration** (strategically combining multiple AI models) can outperform any individual model.

### What It Measures

1. **Refusal Detection** — Does the model refuse to answer? How definitively?
   - FULL_REFUSAL, PARTIAL_REFUSAL, SOFT_COMPLY, FULL_COMPLY
   
2. **Quality Scoring** — How well did the model answer the proxy task?
   - Rubric-based scoring (0-100)
   - Judge caching for consistency

3. **Uplift Calculation** — Does the mosaic approach beat single models?
   - Per-model scores
   - Mosaic score (best-of-N)
   - Delta uplift = mosaic advantage

4. **Consistency Analysis** — Do models agree?
   - Pairwise similarity matrix
   - Used by Parallel Blast and Adversarial Cross strategies

---

## Key Features

### Multi-Model Routing Strategies

| Strategy | Description | When to Use |
|----------|--------------|-------------|
| **Round Robin** | Alternate between models | Balanced cost/performance |
| **Adversarial Cross** | Fire all models, synthesize best response | High-stakes tasks |
| **Weakest-Safeguard Router** | Route to historically least-refusing model per category | Risk reduction |
| **Parallel Blast** | Run all models, compare outputs | Analysis/debugging |
| **Random Baseline** | Random routing | Control condition |
| **Solo Baseline** | Single model runs | Control condition |

### Task Categories

- pathogen_acquisition
- synthesis_evasion
- protocol_retrieval
- protein_engineering
- general_bio

### Eval Engine Components

- **Refusal Detector** — Keyword heuristics + optional LLM judge
- **Scorer** — Rubric-based scoring with calibration
- **Consistency Analyzer** — Embedding-based similarity
- **Uplift Calculator** — Computes mosaic advantage

---

## How It Works

### 1. Configure a Run

Select:
- Tasks (by category, difficulty range)
- Models (OpenAI, Anthropic, Google)
- Strategy (Round Robin, Adversarial Cross, etc.)
- Baseline runs toggle

### 2. Execute

The orchestrator:
1. Creates an `EvalRun` record in SQLite
2. For each task → each step:
   - Dispatches to selected strategy
   - Invokes model adapter(s)
   - Stores `RunStep` + `ModelResponse`
3. Streams events via SSE for live UI updates
4. Persists checkpoints for resume capability

### 3. Evaluate

After execution:
1. Refusal detector classifies each response
2. Scorer grades via rubric
3. Uplift calculator computes mosaic advantage
4. Results stored in `UpliftMetric` table

### 4. Analyze

Results dashboard shows:
- Per-model scores vs. mosaic score (bar chart)
- Uplift by task difficulty (line chart)
- Consistency heatmap
- Step-level response comparison

---

## API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/runs` | POST | Create new evaluation run |
| `/api/runs` | GET | List all runs |
| `/api/runs/[id]` | GET | Get run details |
| `/api/runs/[id]/resume` | POST | Resume interrupted run |
| `/api/runs/[id]/events` | GET | Get run event history |
| `/api/runs/[id]/export` | GET | Export results |
| `/api/runs/stream/[id]` | GET | SSE stream |
| `/api/tasks` | GET | List tasks |
| `/api/tasks/import` | POST | Import tasks from JSONL |
| `/api/models` | GET | List available models |
| `/api/models/test` | POST | Test model connectivity |

---

## Tech Stack

- **Next.js 16** — App Router framework
- **TypeScript** — Type safety
- **Drizzle ORM** + **SQLite** — Local-first storage
- **shadcn/ui** + **Tailwind v4** — UI components
- **Recharts** — Data visualization

---

## Getting Started

```bash
# Install
bun install

# Set up environment
cp .env.example .env.local

# Add API keys to .env.local:
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# GOOGLE_API_KEY=AIza...

# Run
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

---