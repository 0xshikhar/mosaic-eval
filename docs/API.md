# API Specification — Mosaic Eval Harness

All routes are Next.js App Router API routes under `/app/api/`. All request/response bodies are JSON. All routes return appropriate HTTP status codes with `{ error: string }` on failure.

---

## Authentication

For the PoC, all routes are unauthenticated (local dev / private deployment). In a production deployment, add a middleware that checks `Authorization: Bearer <ADMIN_TOKEN>` from env.

---

## Routes

### `POST /api/runs`

Create a new eval run and start execution.

**Request Body:**
```typescript
{
  name: string                    // display name for the run
  taskIds: string[]               // task IDs to include (from EvalTask table)
  modelIds: string[]              // model IDs to use (must be registered in adapter registry)
  strategy: 'ROUND_ROBIN' | 'ADVERSARIAL_CROSS' | 'WEAKEST_SAFEGUARD' | 'PARALLEL_BLAST'
  includeBaseline?: boolean       // default: true — also run solo baseline for each model
  judgeModelId?: string           // default: value of JUDGE_MODEL env var
  maxStepsPerTask?: number        // default: unlimited
}
```

**Response: `201 Created`**
```typescript
{
  runId: string
  status: 'PENDING'
  estimatedSteps: number
  streamUrl: string               // "/api/runs/stream?runId=<runId>"
}
```

**Errors:**
- `400` — invalid modelIds (not registered), no tasks found, invalid strategy
- `500` — DB error creating run

---

### `GET /api/runs/stream`

Stream real-time run events as Server-Sent Events.

**Query Params:** `runId=<string>`

**Response:** `text/event-stream`

```
data: {"type":"run_started","runId":"...","taskCount":10,"stepCount":27}

data: {"type":"step_complete","stepId":"...","bestScore":74,"bestModelId":"claude-opus-4"}

data: {"type":"run_complete","runId":"...","summary":{...}}
```

**Notes:**
- Client should use `EventSource` API
- Connection closes automatically when run completes or errors
- If run already complete when client connects, immediately sends `run_complete` with cached summary

---

### `GET /api/runs`

List all eval runs.

**Query Params:**
- `status` (optional): filter by `PENDING | RUNNING | COMPLETE | FAILED`
- `limit` (optional): default 20, max 100
- `cursor` (optional): pagination cursor (createdAt timestamp)

**Response: `200 OK`**
```typescript
{
  runs: Array<{
    id: string
    name: string
    strategy: string
    modelIds: string[]
    status: string
    mosaicScore: number | null      // null if not complete
    deltaUplift: number | null
    stepCount: number
    completedAt: string | null
    createdAt: string
  }>
  nextCursor: string | null
}
```

---

### `GET /api/runs/[id]`

Get full run data including all steps, responses, and summary.

**Response: `200 OK`**
```typescript
{
  run: EvalRun & {
    steps: Array<RunStep & {
      modelResponses: ModelResponse[]
      score: StepScore | null
    }>
    summary: RunSummary | null
  }
}
```

**Errors:**
- `404` — run not found

---

### `DELETE /api/runs/[id]`

Cancel a running run or delete a completed one.

**Response: `200 OK`**
```typescript
{ success: true }
```

**Notes:**
- If status is RUNNING, marks as CANCELLED and stops the generator
- Cascades deletes all RunSteps, ModelResponses, StepScores via Prisma cascade

---

### `GET /api/runs/[id]/export`

Export run results as JSON or CSV.

**Query Params:** `format=json|csv` (default: `json`)

**Response:**
- `Content-Type: application/json` or `text/csv`
- `Content-Disposition: attachment; filename="run-<id>-results.<ext>"`

JSON export structure:
```typescript
{
  run: { id, name, strategy, modelIds, createdAt, completedAt },
  summary: RunSummary,
  steps: Array<{
    taskId: string
    taskTitle: string
    stepIndex: number
    modelUsed: string           // for single-model strategies
    responses: Array<{          // all model responses for this step
      modelId: string
      content: string
      refusalClass: string
      score: number
    }>
    bestScore: number
    bestModelId: string
    consistencyScore: number
  }>
}
```

---

### `GET /api/tasks`

List all eval tasks.

**Query Params:**
- `category`: filter by `TaskCategory`
- `difficulty`: filter by difficulty 1–5
- `tags`: comma-separated tag filter
- `limit`: default 50
- `cursor`: pagination cursor

**Response: `200 OK`**
```typescript
{
  tasks: Array<{
    id: string
    title: string
    category: string
    difficulty: number
    tags: string[]
    stepCount: number
    source: string | null
  }>
  nextCursor: string | null
  total: number
}
```

---

### `GET /api/tasks/[id]`

Get a single task with all steps.

**Response: `200 OK`**
```typescript
{
  task: EvalTask & { steps: EvalTaskStep[] }
}
```

---

### `POST /api/tasks/import`

Import tasks from a JSONL payload.

**Request Body:**
```typescript
{
  jsonl: string       // raw JSONL content (one task JSON per line)
  overwrite?: boolean // default: false — skip existing task IDs
}
```

**Response: `200 OK`**
```typescript
{
  imported: number
  skipped: number
  errors: Array<{ line: number; message: string }>
}
```

---

### `GET /api/models`

List all registered model adapters.

**Response: `200 OK`**
```typescript
{
  models: Array<{
    id: string              // e.g. "gpt-4o", "claude-opus-4"
    displayName: string
    provider: string
    available: boolean      // false if API key not configured
  }>
}
```

---

### `POST /api/models/test`

Test a model adapter with a simple ping.

**Request Body:**
```typescript
{ modelId: string }
```

**Response: `200 OK`**
```typescript
{
  modelId: string
  latencyMs: number
  success: boolean
  error: string | null
}
```

---

## Error Response Format

All error responses follow:

```typescript
{
  error: string           // human-readable message
  code?: string           // machine-readable error code
  details?: unknown       // additional context (dev mode only)
}
```

Common error codes:
- `INVALID_INPUT` — request body validation failed (Zod error)
- `NOT_FOUND` — resource does not exist
- `MODEL_UNAVAILABLE` — adapter not configured or API key missing
- `RUN_IN_PROGRESS` — attempted operation on a RUNNING run
- `DB_ERROR` — database operation failed
DOCEOF
echo "API_SPEC.md written"
API_SPEC.md written
/bin/bash: line 1: /home/user/mosaic-eval-harness/docs/API_SPEC.md: No such file or directory