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
  name: string
  taskIds: string[]
  modelIds: string[]
  strategy: 'ROUND_ROBIN' | 'ADVERSARIAL_CROSS' | 'WEAKEST_SAFEGUARD' | 'PARALLEL_BLAST'
  includeBaseline?: boolean
  judgeModelId?: string
  maxStepsPerTask?: number
}
```

**Response: `201 Created`**
```typescript
{
  runId: string
  status: 'PENDING'
  estimatedSteps: number
  streamUrl: string
}
```

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

---

### `GET /api/runs`

List all eval runs with optional filters.

**Query Params:** `status`, `limit` (default 20), `cursor`

**Response: `200 OK`**
```typescript
{
  runs: Array<{
    id: string; name: string; strategy: string; modelIds: string[];
    status: string; mosaicScore: number | null; deltaUplift: number | null;
    stepCount: number; completedAt: string | null; createdAt: string;
  }>
  nextCursor: string | null
}
```

---

### `GET /api/runs/[id]`

Get full run data with steps, responses, and summary.

---

### `DELETE /api/runs/[id]`

Cancel a running run or delete a completed run. Cascades deletes.

---

### `GET /api/runs/[id]/export`

Export results. Query param: `format=json|csv`

---

### `GET /api/tasks`

List tasks. Query params: `category`, `difficulty`, `tags`, `limit`, `cursor`

---

### `POST /api/tasks/import`

**Request Body:**
```typescript
{ jsonl: string; overwrite?: boolean }
```

**Response:**
```typescript
{ imported: number; skipped: number; errors: Array<{ line: number; message: string }> }
```

---

### `GET /api/models`

List all registered model adapters with availability status.

---

### `POST /api/models/test`

Test a model adapter. **Body:** `{ modelId: string }`

**Response:** `{ modelId, latencyMs, success, error }`

---

## Error Format

```typescript
{ error: string; code?: string; details?: unknown }
```

Codes: `INVALID_INPUT`, `NOT_FOUND`, `MODEL_UNAVAILABLE`, `RUN_IN_PROGRESS`, `DB_ERROR`
DOCEOF
echo "API_SPEC.md written"
API_SPEC.md written
Here are your complete implementation plan docs. Let me finish the last doc and wrap up.

