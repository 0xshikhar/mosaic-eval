# API Specification — Mosaic Eval Harness

**Version:** 1.0  
**Base URL:** `http://localhost:3000` (development), `https://your-domain.com` (production)

---

## 1. Overview

All routes are Next.js App Router API routes under `/app/api/`. The system uses local-first SQLite storage through Drizzle ORM. All request/response bodies are JSON unless noted otherwise.

**Response Format:**
- Success: HTTP 200-201 with JSON payload
- Error: HTTP 400/404/500 with `{ error: string; code: string; details?: unknown }`

---

## 2. Authentication

### Current (PoC)

All routes are unauthenticated for local development and private deployments.

### Production Deployment

Set `ADMIN_TOKEN` environment variable and include in requests:

```
Authorization: Bearer <ADMIN_TOKEN>
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Invalid or missing authentication token",
  "code": "UNAUTHORIZED"
}
```

---

## 3. Rate Limiting

No rate limiting in PoC. For production:

| Endpoint Type | Default Limit |
|---------------|---------------|
| Read (GET) | 1000 requests/minute |
| Write (POST/PUT/DELETE) | 100 requests/minute |
| Model invocation | Provider-specific limits apply |

**Error Response (429 Too Many Requests):**
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": { "retryAfter": 60 }
}
```

---

## 4. Run Management

### `POST /api/runs`

Create a new evaluation run and begin execution.

**Request Body:**
```typescript
{
  name: string                    // Run name (1-100 chars)
  taskIds: string[]               // Array of task IDs to evaluate
  modelIds: string[]              // Models to include (2-7 recommended)
  strategy: 'ROUND_ROBIN'         // Routing strategy
           | 'ADVERSARIAL_CROSS'
           | 'WEAKEST_SAFEGUARD'
           | 'PARALLEL_BLAST'
           | 'SOLO'
           | 'RANDOM'
  includeBaseline?: boolean       // Run solo baseline for each model (default: false)
  judgeModelId?: string           // Model for scoring (default: 'anthropic')
  maxStepsPerTask?: number        // Limit steps per task (default: all)
  costBudgetUsd?: number          // Stop if exceeded (default: 100)
  tags?: string[]                 // Custom tags for organization
  description?: string            // Optional run description
  configHash?: string             // Reproducibility hash (auto-generated)
}
```

**Response: `201 Created`**
```typescript
{
  runId: string                  // UUID for the run
  status: 'PENDING' | 'RUNNING'
  estimatedSteps: number         // Total steps to execute
  estimatedCost: number          // USD estimate
  streamUrl: string              // SSE endpoint for live updates
  configHash: string             // Hash for reproducibility
  createdAt: string              // ISO timestamp
}
```

**Error Responses:**
- `400 INVALID_INPUT`: Missing required fields, invalid strategy, unknown model/task IDs
- `409 RUN_IN_PROGRESS`: Cannot start new run while another is running (configurable)
- `402 PAYMENT_REQUIRED`: Cost estimate exceeds available API credits
- `500 DB_ERROR`: Database connection failed

**Example:**
```bash
curl -X POST http://localhost:3000/api/runs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "baseline-gpt4o",
    "taskIds": ["task-001", "task-002", "task-003"],
    "modelIds": ["openai"],
    "strategy": "SOLO",
    "judgeModelId": "anthropic",
    "costBudgetUsd": 50
  }'
```

---

### `GET /api/runs`

List evaluation runs with filtering and pagination.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | - | Filter: `PENDING`, `RUNNING`, `COMPLETE`, `FAILED`, `CANCELLED` |
| `strategy` | string | - | Filter by strategy |
| `modelId` | string | - | Filter by model (runs containing this model) |
| `tags` | string | - | Filter by tag (comma-separated for AND) |
| `limit` | number | 20 | Results per page (max 100) |
| `cursor` | string | - | Pagination cursor from previous response |
| `sortBy` | string | `createdAt` | Sort field: `createdAt`, `name`, `status` |
| `sortOrder` | string | `desc` | Sort: `asc`, `desc` |
| `fromDate` | string | - | ISO date filter (inclusive) |
| `toDate` | string | - | ISO date filter (inclusive) |

**Response: `200 OK`**
```typescript
{
  runs: Array<{
    id: string
    name: string
    strategy: string
    modelIds: string[]
    status: string
    mosaicScore: number | null        // Null if incomplete
    deltaUplift: number | null         // Null if incomplete
    percentUplift: number | null
    stepCount: number
    completedSteps: number
    costUsd: number | null
    tags: string[]
    createdAt: string
    completedAt: string | null
    duration: number | null            // Seconds, null if incomplete
    configHash: string                 // For reproducibility
  }>
  pagination: {
    total: number
    limit: number
    nextCursor: string | null
    hasMore: boolean
  }
}
```

---

### `GET /api/runs/[id]`

Get complete run details with all steps, responses, and metadata.

**Response: `200 OK`**
```typescript
{
  run: {
    id: string
    name: string
    description: string | null
    strategy: string
    modelIds: string[]
    taskIds: string[]
    status: string
    judgeModelId: string
    includeBaseline: boolean
    costBudgetUsd: number
    configHash: string
    createdAt: string
    startedAt: string | null
    completedAt: string | null
    failedAt: string | null
    errorMessage: string | null
    
    // Aggregated metrics
    metrics: {
      totalSteps: number
      completedSteps: number
      failedSteps: number
      refusedSteps: number
      mosaicScore: number | null
      deltaUplift: number | null
      percentUplift: number | null
      costUsd: number | null
      duration: number | null
      meanLatency: number | null
    }
    
    // Per-model breakdown
    modelMetrics: Array<{
      modelId: string
      meanScore: number | null
      refusalRate: number
      totalCost: number
      meanLatency: number
    }>
    
    // Steps with full details
    steps: Array<{
      id: string
      taskId: string
      taskStepId: string
      stepNumber: number
      status: string
      createdAt: string
      completedAt: string | null
      
      // All model responses for this step
      modelResponses: Array<{
        id: string
        modelId: string
        response: string
        latency: number
        tokensInput: number
        tokensOutput: number
        costUsd: number
        refusalClassification: 'FULL_REFUSAL' | 'PARTIAL_REFUSAL' | 'SOFT_COMPLY' | 'FULL_COMPLY' | null
        createdAt: string
      }>
      
      // Judge score (if scored)
      score: {
        id: string
        score: number
        reasoning: string
        rubricVersion: string
        judgeModelId: string
        calibrated: boolean
        createdAt: string
      } | null
    }>
  }
}
```

**Error Responses:**
- `404 NOT_FOUND`: Run ID does not exist

---

### `DELETE /api/runs/[id]`

Cancel a running run or delete a completed run and all associated data.

**Behavior:**
- If `RUNNING`: Sends cancellation signal, waits for graceful shutdown
- If `PENDING`: Removes from queue
- If `COMPLETE`/`FAILED`/`CANCELLED`: Deletes run and all related records (cascading)

**Response:**
- `202 Accepted`: Cancellation initiated
- `204 No Content`: Deleted successfully

**Error Responses:**
- `404 NOT_FOUND`: Run ID does not exist
- `409 RUN_BEING_CANCELLED`: Already in cancellation process

---

### `POST /api/runs/[id]/resume`

Resume an interrupted or checkpointed run from the last completed step.

**When to Use:**
- System crash during run
- Manual cancellation (mistake)
- Cost budget temporarily exceeded (after increasing)

**Response: `200 OK`**
```typescript
{
  runId: string
  status: 'PENDING' | 'RUNNING'
  resumedFromStep: number
  remainingSteps: number
  streamUrl: string
}
```

**Error Responses:**
- `400 INVALID_STATE`: Run is not in resumable state (must be FAILED or CANCELLED)
- `404 NOT_FOUND`: Run ID does not exist

---

### `GET /api/runs/stream`

Stream real-time run events via Server-Sent Events (SSE).

**Query Parameters:**
| Param | Required | Description |
|-------|----------|-------------|
| `runId` | Yes | Run UUID |
| `resumeFrom` | No | Event ID to resume from (for reconnection) |

**Response:** `text/event-stream`

**Event Types:**

```
event: run_started
data: {
  "type": "run_started",
  "runId": "...",
  "timestamp": "...",
  "taskCount": 10,
  "stepCount": 27,
  "models": ["openai", "anthropic"],
  "strategy": "ROUND_ROBIN"
}

event: step_started
data: {
  "type": "step_started",
  "runId": "...",
  "stepId": "...",
  "stepNumber": 5,
  "taskId": "...",
  "assignedModels": ["openai"],
  "timestamp": "..."
}

event: model_response
data: {
  "type": "model_response",
  "runId": "...",
  "stepId": "...",
  "modelId": "openai",
  "latency": 1250,
  "tokens": { "input": 150, "output": 280 },
  "refusalClassification": "FULL_COMPLY",
  "timestamp": "..."
}

event: step_scored
data: {
  "type": "step_scored",
  "runId": "...",
  "stepId": "...",
  "score": 87,
  "judgeModelId": "anthropic",
  "bestModelId": "openai",
  "timestamp": "..."
}

event: step_complete
data: {
  "type": "step_complete",
  "runId": "...",
  "stepId": "...",
  "stepNumber": 5,
  "score": 87,
  "bestModelId": "openai",
  "uplift": 12.5,
  "timestamp": "..."
}

event: checkpoint_saved
data: {
  "type": "checkpoint_saved",
  "runId": "...",
  "stepNumber": 10,
  "timestamp": "..."
}

event: run_complete
data: {
  "type": "run_complete",
  "runId": "...",
  "timestamp": "...",
  "summary": {
    "totalSteps": 27,
    "completedSteps": 27,
    "mosaicScore": 84.5,
    "deltaUplift": 8.2,
    "percentUplift": 10.7,
    "costUsd": 45.30,
    "duration": 1845
  }
}

event: run_failed
data: {
  "type": "run_failed",
  "runId": "...",
  "timestamp": "...",
  "error": "Rate limit exceeded for provider: openai",
  "failedAtStep": 15,
  "recoverable": true
}

event: run_cancelled
data: {
  "type": "run_cancelled",
  "runId": "...",
  "timestamp": "...",
  "cancelledAtStep": 10,
  "reason": "user_request"
}
```

**Reconnection:**
Clients should:
1. Store last received event ID
2. On disconnect, reconnect with `?resumeFrom={lastEventId}`
3. Server will replay missed events

---

### `GET /api/runs/[id]/events`

Get persisted event history for a run (for SSE reconnection or polling).

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `after` | string | - | Get events after this event ID |
| `limit` | number | 100 | Max events to return |

**Response: `200 OK`**
```typescript
{
  events: Array<{
    id: string          // Event UUID
    type: string        // Event type
    runId: string
    data: object        // Event payload
    timestamp: string
  }>
  hasMore: boolean
  nextCursor: string | null
}
```

---

### `GET /api/runs/[id]/audit`

Get audit log entries for a run (security and compliance).

**Response: `200 OK`**
```typescript
{
  auditLogs: Array<{
    id: string
    runId: string
    action: string
    actor: string | null        // User/system identifier
    ipAddress: string | null
    details: object | null
    timestamp: string
  }>
}
```

**Actions Logged:**
- `RUN_CREATED`
- `RUN_STARTED`
- `RUN_COMPLETED`
- `RUN_FAILED`
- `RUN_CANCELLED`
- `RUN_RESUMED`
- `STEP_STARTED`
- `STEP_COMPLETED`
- `MODEL_INVOKED`
- `SCORE_RECORDED`

---

### `GET /api/runs/[id]/costs`

Get detailed cost breakdown for a run.

**Response: `200 OK`**
```typescript
{
  summary: {
    totalCostUsd: number
    budget: number
    percentUsed: number
    modelCosts: number
    judgeCosts: number
    synthesisCosts: number
  }
  byModel: Array<{
    modelId: string
    invocations: number
    tokensInput: number
    tokensOutput: number
    costUsd: number
  }>
  byStep: Array<{
    stepId: string
    stepNumber: number
    costUsd: number
    breakdown: object
  }>
}
```

---

### `GET /api/runs/[id]/export`

Export run results for analysis or publication.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `format` | string | `json` | `json`, `csv`, `jsonl` |
| `includeResponses` | boolean | `true` | Include full model responses |
| `includeScores` | boolean | `true` | Include judge scores |
| `includeMetadata` | boolean | `true` | Include run metadata |

**Response Formats:**

**JSON:**
```typescript
{
  exportVersion: "1.0"
  exportedAt: string
  run: { /* full run object */ }
  tasks: Array<{ /* task definitions */ }>
  steps: Array<{ /* step details */ }>
}
```

**CSV:**
- Response: `text/csv` with headers
- Columns: `runId`, `stepId`, `taskId`, `modelId`, `response`, `score`, `refusal`, `latency`, `cost`, `timestamp`

**JSONL:**
- Response: `text/plain` with one JSON object per line
- Each line: `{"stepId": "...", ...}`

**Response Headers:**
```
Content-Type: application/json | text/csv | text/plain
Content-Disposition: attachment; filename="run-{id}-export.{ext}"
X-Export-Version: 1.0
```

---

## 5. Task Management

### `GET /api/tasks`

List available evaluation tasks with filtering.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `category` | string | - | Filter by category |
| `difficulty` | number | - | Filter by difficulty (1-5) |
| `tags` | string | - | Comma-separated tags |
| `search` | string | - | Text search in title/description |
| `limit` | number | 50 | Results per page |
| `cursor` | string | - | Pagination cursor |
| `includeSteps` | boolean | `false` | Include full step definitions |

**Response: `200 OK`**
```typescript
{
  tasks: Array<{
    id: string
    title: string
    description: string | null
    category: string
    difficulty: number
    tags: string[]
    stepCount: number
    createdAt: string
    updatedAt: string
    steps?: Array<{       // If includeSteps=true
      id: string
      order: number
      prompt: string
      rubric: object
    }>
  }>
  pagination: {
    total: number
    limit: number
    nextCursor: string | null
    hasMore: boolean
  }
}
```

---

### `GET /api/tasks/[id]`

Get single task details.

**Response: `200 OK`**
```typescript
{
  task: {
    id: string
    title: string
    description: string | null
    category: string
    difficulty: number
    tags: string[]
    createdAt: string
    updatedAt: string
    steps: Array<{
      id: string
      order: number
      prompt: string
      rubric: object
      expectedOutput?: string | null
      calibrationNotes?: string | null
    }>
  }
}
```

---

### `POST /api/tasks/import`

Import tasks from JSONL format.

**Request Body:**
```typescript
{
  jsonl: string           // JSONL content (newline-delimited JSON)
  overwrite?: boolean    // Replace existing tasks with same ID (default: false)
  validateOnly?: boolean // Just validate, don't import (default: false)
}
```

**JSONL Format:**
```jsonl
{"id": "task-001", "title": "Protein folding basics", "category": "protein_engineering", "difficulty": 2, "tags": ["protein", "folding"], "steps": [{"id": "step-001", "order": 1, "prompt": "Explain hydrophobic collapse...", "rubric": {"criteria": [{"description": "Mentions hydrophobic core", "weight": 0.3}]}}]}
{"id": "task-002", "title": "CRISPR mechanism", "category": "general_bio", "difficulty": 3, "tags": ["crispr", "gene-editing"], "steps": [{"id": "step-002", "order": 1, "prompt": "Describe Cas9 mechanism...", "rubric": {"criteria": []}}]}
```

**Response: `200 OK`**
```typescript
{
  success: boolean
  imported: number          // Tasks successfully imported
  skipped: number           // Tasks skipped (already exist, overwrite=false)
  updated: number           // Tasks updated (overwrite=true)
  errors: Array<{
    line: number
    taskId?: string
    message: string
    type: 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'DUPLICATE_ID'
  }>
  warnings: Array<{
    line: number
    message: string
  }>
}
```

**Error Responses:**
- `400 INVALID_INPUT`: Malformed JSONL or validation errors
- `413 PAYLOAD_TOO_LARGE`: Content exceeds 10MB limit

---

### `POST /api/tasks/import-file`

Import tasks from uploaded file (multipart/form-data).

**Request:** `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | `.jsonl` or `.json` file |
| `overwrite` | string | No | `"true"` or `"false"` (default: false) |

**Response:** Same as `/api/tasks/import`

---

### `DELETE /api/tasks/[id]`

Delete a task and all its steps.

**Caution:** Cannot delete tasks that have been used in completed runs.

**Error Responses:**
- `409 TASK_IN_USE`: Task referenced by existing runs

---

## 6. Model Management

### `GET /api/models`

List all configured model adapters with status.

**Response: `200 OK`**
```typescript
{
  models: Array<{
    id: string              // openai, anthropic, google, etc.
    name: string            // Display name
    provider: string       // Provider type
    modelId: string        // Actual model identifier
    status: 'AVAILABLE' | 'UNAVAILABLE' | 'ERROR' | 'RATE_LIMITED'
    capabilities: {
      streaming: boolean
      toolUse: boolean
      vision: boolean
      maxTokens: number
    }
    costs: {
      inputPer1k: number   // USD per 1K input tokens
      outputPer1k: number  // USD per 1K output tokens
    }
    limits: {
      maxConcurrent: number
      currentLoad: number
    }
    lastError?: string | null
    lastUsed?: string | null
  }>
}
```

---

### `POST /api/models/test`

Test connectivity and latency for a model.

**Request Body:**
```typescript
{
  modelId: string        // Model to test
  prompt?: string        // Custom prompt (default: "Respond with OK")
  timeout?: number       // Timeout ms (default: 30000)
}
```

**Response: `200 OK`**
```typescript
{
  modelId: string
  success: boolean
  latency: number        // milliseconds
  tokens: {
    input: number
    output: number
  }
  response: string       // Actual response content
  error: string | null
}
```

**Error Response:**
```typescript
{
  modelId: string
  success: false
  latency: number
  error: "Rate limit exceeded"
  errorCode: "RATE_LIMIT"
}
```

---

## 7. Analytics & Metrics

### `GET /api/analytics/summary`

Get high-level analytics across all runs.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `from` | string | ISO date start |
| `to` | string | ISO date end |

**Response: `200 OK`**
```typescript
{
  period: { from: string, to: string }
  runs: {
    total: number
    completed: number
    failed: number
    cancelled: number
  }
  costs: {
    totalUsd: number
    byStrategy: Record<string, number>
    byModel: Record<string, number>
  }
  performance: {
    meanUplift: number | null
    medianUplift: number | null
    bestStrategy: string | null
  }
}
```

---

### `GET /api/analytics/refusal-rates`

Get refusal rate analytics by model and category.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `modelId` | string | Filter by model |
| `category` | string | Filter by category |
| `window` | string | Time window: `7d`, `30d`, `90d` (default: 30d) |

**Response: `200 OK`**
```typescript
{
  window: string
  overall: {
    byModel: Record<string, number>      // Model -> refusal rate %
    byCategory: Record<string, number>  // Category -> refusal rate %
  }
  detailed: Array<{
    modelId: string
    category: string
    refusalRate: number
    sampleSize: number
    lastUpdated: string
  }>
}
```

---

## 8. Error Reference

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_INPUT` | 400 | Request body validation failed |
| `MISSING_FIELD` | 400 | Required field not provided |
| `INVALID_FORMAT` | 400 | Data format error (e.g., malformed JSONL) |
| `NOT_FOUND` | 404 | Resource does not exist |
| `RUN_IN_PROGRESS` | 409 | Cannot modify resource while run is active |
| `RUN_NOT_RESUMABLE` | 400 | Run is not in a state that can be resumed |
| `TASK_IN_USE` | 409 | Cannot delete task used in existing runs |
| `MODEL_UNAVAILABLE` | 503 | Model provider is down or rate limited |
| `RATE_LIMIT_EXCEEDED` | 429 | API rate limit hit |
| `BUDGET_EXCEEDED` | 402 | Cost budget exceeded |
| `DB_ERROR` | 500 | Database operation failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `TIMEOUT` | 504 | Request timed out |

### Error Response Format

```typescript
{
  error: string          // Human-readable message
  code: string          // Machine-readable code (see above)
  details?: unknown      // Additional context (validation errors, etc.)
  requestId?: string    // Correlation ID for debugging
  timestamp: string    // ISO timestamp
}
```

**Example Validation Error:**
```json
{
  "error": "Invalid request body",
  "code": "INVALID_INPUT",
  "details": {
    "fieldErrors": [
      { "field": "strategy", "message": "Invalid strategy 'INVALID_STRATEGY'" },
      { "field": "modelIds", "message": "At least one model required" }
    ]
  },
  "requestId": "req-abc123",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 9. Versioning

API version is embedded in the Accept header:

```
Accept: application/json; version=1.0
```

Current version: **1.0**

Breaking changes will increment the major version. Additions are backward compatible.

---

*For SDK examples and client libraries, see the project repository.*
