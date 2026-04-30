# SQLite Architecture Proposal — Mosaic Eval Harness

This document is retained as a tradeoff note for a more elaborate storage migration. The MVP architecture now uses Drizzle + local SQLite for simplicity. Treat the older Drizzle/libSQL path below as an alternative future option, not the current baseline.

## Executive Summary

This document proposes replacing **Prisma + Neon Postgres** with **Drizzle ORM + libSQL** (SQLite fork) for the Mosaic Eval Harness. This change addresses 8+ identified flaws while improving developer experience, performance, and offline capability.

---

## Why SQLite for Mosaic?

### 1. Local-First Design Alignment

| Requirement | Postgres (Current) | SQLite (Proposed) |
|-------------|-------------------|-------------------|
| Offline operation | Requires internet | Fully offline capable |
| Setup complexity | Connection strings, env vars | Zero config (file path only) |
| Developer onboarding | Create Neon account, provision DB | Clone repo, `bun install`, run |
| Air-gapped environments | Not possible | Native support |
| CI/CD | Need test DB provisioning | In-memory or temp file tests |

### 2. Performance Characteristics

**Mosaic's Access Patterns:**
- Write-heavy: Each step creates RunStep + ModelResponse + StepScore
- Read-heavy: Dashboard queries, historical analysis
- Transactional: Run must be atomic per step
- Single-user: No concurrent writers needed

**SQLite Advantages:**
```
SQLite Write Performance: ~50,000+ inserts/sec (WAL mode)
SQLite Read Performance: ~2M+ queries/sec (indexed)
Postgres (Neon) Latency: 10-50ms per query (network)
SQLite Latency: 0.01-0.1ms per query (local file)
```

For a 100-step run with 3 models creating ~300 records:
- Postgres: ~15 seconds (network overhead dominates)
- SQLite: ~0.1 seconds (local I/O only)

### 3. Portability & Reproducibility

| Scenario | Postgres | SQLite |
|----------|----------|--------|
| Share run results | Export JSON, import to their DB | Send `.db` file directly |
| Version control | Schema migrations only | Entire database can be versioned |
| Backup | pg_dump, complex restore | Copy file |
| Reproduce exact state | Recreate DB, import data | Open same `.db` file |

---

## Proposed Stack

### Option A: Drizzle + libSQL (Recommended)

```typescript
// Schema definition - cleaner than Prisma
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const evalRuns = sqliteTable('eval_runs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  strategy: text('strategy').notNull(),
  modelIds: text('model_ids', { mode: 'json' }).notNull(),
  status: text('status').notNull(),
  mosaicScore: real('mosaic_score'),
  deltaUplift: real('delta_uplift'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Query - type-safe, zero runtime overhead
import { eq } from 'drizzle-orm';
const run = await db.query.evalRuns.findFirst({
  where: eq(evalRuns.id, runId),
  with: { steps: true }
});
```

**Dependencies:**
```json
{
  "drizzle-orm": "^0.30.0",
  "@libsql/client": "^0.6.0"
}
```

**libSQL Advantages over standard SQLite:**
- Native vector search extension (for embeddings)
- WASM support (browser compatibility)
- Git-like branching (experimental)
- 100% SQLite compatible (same file format)

### Option B: Bun SQLite (If using Bun runtime)

```typescript
import { Database } from 'bun:sqlite';

const db = new Database('mosaic.db');

// Synchronous, extremely fast
const run = db.query('SELECT * FROM eval_runs WHERE id = ?').get(runId);
```

**Trade-offs:**
- Simpler, no ORM overhead
- Manual schema management
- Bun runtime required (not Node.js compatible)

---

## Migration Strategy

### Schema Translation

| Prisma (Postgres) | Drizzle (SQLite) | Notes |
|-------------------|------------------|-------|
| `String @id @default(cuid())` | `text('id').primaryKey()` | Use same CUID |
| `String[]` | `text('arr', {mode: 'json'})` | JSON array storage |
| `Float[]` | `text('embedding', {mode: 'json'})` | Store embeddings as JSON |
| `DateTime` | `integer('ts', {mode: 'timestamp'})` | Unix timestamp |
| `Json` | `text('json', {mode: 'json'})` | Native JSON support |
| `enum` | `text().notNull()` + TypeScript | SQLite has no native enum |

### Vector Search Solution

**Problem**: Storing embeddings (1536-dim Float[]) for similarity analysis.

**Solution A: libSQL Native Vectors**
```sql
-- libSQL supports vector extension
CREATE TABLE model_responses (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding F32_BLOB(1536), -- native vector type
  created_at INTEGER
);

-- Vector similarity search
SELECT * FROM model_responses 
WHERE embedding MATCH 'vector_query' 
ORDER BY distance;
```

**Solution B: Separate Vector Store (if needed)**
- Use `usearch` or `faiss` for heavy similarity workloads
- Keep SQLite for relational data
- Join by foreign key when needed

### Data Migration

```typescript
// One-time migration script
import { PrismaClient } from '@prisma/client';
import { db } from './drizzle-db';

async function migrate() {
  const prisma = new PrismaClient();
  
  // Batch export from Postgres
  const runs = await prisma.evalRun.findMany({
    include: { steps: { include: { responses: true } } }
  });
  
  // Batch insert to SQLite
  await db.insert(evalRuns).values(runs.map(r => ({
    id: r.id,
    name: r.name,
    // ... mapping
  })));
}
```

---

## Architecture Changes

### Before (Prisma + Neon)

```
┌─────────────┐     HTTP      ┌─────────────┐     TCP      ┌─────────────┐
│   Next.js   │ ───────────── │   Vercel    │ ──────────── │ Neon Postgres │
│   (local)   │    SSE        │   (edge)    │   SSL        │   (remote)    │
└─────────────┘               └─────────────┘              └─────────────┘
     │                                                            │
     │ Prisma Client                                              │
     │ (connection pooling, retry logic, network errors)          │
     └────────────────────────────────────────────────────────────┘
```

### After (Drizzle + libSQL)

```
┌─────────────┐                                              ┌─────────────┐
│   Next.js   │ ◄──────────────────────────────────────────► │  libSQL/SQLite│
│   (local)   │         Drizzle ORM (local file I/O)         │   (local file) │
└─────────────┘                                              └─────────────┘
                                    │
                                    │ Optional: Turso Cloud for sync
                                    │ (not required for local use)
                                    ▼
                            ┌─────────────┐
                            │  Turso Cloud │
                            │  (optional)  │
                            └─────────────┘
```

---

## Implementation Plan

### Phase 1: Schema Migration (2-3 hours)

1. **Install dependencies**
   ```bash
   pnpm remove prisma @prisma/client
   pnpm add drizzle-orm @libsql/client
   pnpm add -D drizzle-kit
   ```

2. **Create Drizzle schema** (translate from Prisma)
   - `lib/db/schema.ts` - all table definitions
   - `lib/db/migrate.ts` - migration runner
   - `lib/db/index.ts` - client export

3. **Migration config**
   ```typescript
   // drizzle.config.ts
   export default {
     schema: './lib/db/schema.ts',
     driver: 'turso',
     dbCredentials: {
       url: process.env.DATABASE_URL || 'file:./mosaic.db',
     },
   };
   ```

### Phase 2: Code Updates (4-6 hours)

1. **Replace Prisma queries**
   ```typescript
   // Before
   const run = await prisma.evalRun.findUnique({
     where: { id },
     include: { steps: true }
   });
   
   // After
   const run = await db.query.evalRuns.findFirst({
     where: eq(evalRuns.id, id),
     with: { steps: true }
   });
   ```

2. **Update environment variables**
   ```bash
   # Before
   DATABASE_URL="postgresql://..."
   
   # After
   DATABASE_URL="file:./mosaic.db"
   # Or for Turso:
   # DATABASE_URL="libsql://..."
   # DATABASE_AUTH_TOKEN="..."
   ```

3. **Update scripts**
   ```json
   {
     "db:migrate": "drizzle-kit migrate",
     "db:studio": "drizzle-kit studio",
     "db:seed": "tsx scripts/seed-tasks.ts"
   }
   ```

### Phase 3: Testing & Validation (2-3 hours)

1. **Run existing test suite**
2. **Verify data integrity**
3. **Performance benchmarks**
   ```typescript
   // Benchmark script
   console.time('insert');
   await db.insert(evalRuns).values(testRuns);
   console.timeEnd('insert'); // Should be < 100ms for 100 rows
   ```

---

## Detailed Comparison

### Developer Experience

| Aspect | Prisma + Neon | Drizzle + libSQL |
|--------|---------------|------------------|
| Schema changes | `prisma migrate dev` (slow, needs DB) | `drizzle-kit generate` (fast, local) |
| Type generation | Separate build step | Instant, from schema.ts |
| Query syntax | Abstracted, hides SQL | SQL-like, explicit |
| IDE autocomplete | Good | Excellent (direct from TS) |
| Debugging | Harder (network layer) | Easy (local file) |
| Testing | Needs test DB | In-memory or temp files |

### Performance Benchmarks (Estimated)

| Operation | Prisma + Neon | Drizzle + SQLite | Improvement |
|-----------|---------------|------------------|-------------|
| Insert 100 rows | ~2,500ms | ~50ms | **50x** |
| Query by ID | ~100ms | ~1ms | **100x** |
| Complex join | ~300ms | ~5ms | **60x** |
| Cold start | ~3,000ms | ~0ms | **∞** |

### Feature Comparison

| Feature | Prisma + Neon | Drizzle + libSQL |
|---------|---------------|------------------|
| Migrations | Yes | Yes |
| Type safety | Yes | Yes (better) |
| Relations | Yes | Yes |
| Transactions | Yes | Yes |
| Connection pooling | Yes (required) | No (not needed) |
| Real-time subscriptions | No | No (use polling) |
| Vector search | No (needs pgvector) | Yes (libSQL native) |
| Edge deployment | Yes | Yes (WASM) |
| Offline capable | No | Yes |
| Single file | No | Yes |

---

## Risk Mitigation

### Concern: SQLite Not "Production Grade"

**Reality**: SQLite is used in:
- Chrome, Firefox, Safari (browser data)
- iOS, Android (app data)
- Photoshop, Lightroom (session data)
- Airbus A350 avionics (flight data)

For single-user local tools, SQLite is more reliable than networked Postgres.

### Concern: Concurrency

**Not an issue for Mosaic**:
- Single researcher using the tool
- No concurrent writes needed
- SQLite WAL mode handles multiple readers + 1 writer

If future needs change:
- libSQL's replication features
- Turso Cloud for multi-user

### Concern: Data Corruption

**Mitigations**:
- SQLite has ACID compliance
- WAL mode prevents corruption on crash
- Regular backups (just copy the file)
- Exports to JSON for portability

---

## Environment Configuration

### Local Development

```bash
# .env.local
DATABASE_URL="file:./mosaic.db"
```

### CI/CD Testing

```typescript
// Test setup - in-memory database
import { Database } from 'bun:sqlite'; // or createClient from @libsql/client

const testDb = new Database(':memory:');
// Run migrations
// Run tests
// Database auto-cleans on process exit
```

### Optional: Turso Cloud Sync

```bash
# For team sharing or backup
DATABASE_URL="libsql://mosaic-[team].turso.io"
DATABASE_AUTH_TOKEN="..."
```

---

## Conclusion

**SQLite (via libSQL + Drizzle) is the correct choice for Mosaic Eval Harness because:**

1. **Fits the use case**: Local-first, single-user, offline-capable evaluation tool
2. **Better performance**: 50-100x faster queries, zero network overhead
3. **Simpler architecture**: No connection management, no external dependencies
4. **Improved DX**: Faster iteration, easier testing, zero-config setup
5. **Native vector support**: libSQL handles embeddings better than Postgres without pgvector
6. **Portability**: Single file database, easy to share, backup, version

**Trade-offs accepted**:
- No built-in row-level security (not needed for local tool)
- No built-in user management (not in requirements)
- Manual enum handling (trivial in TypeScript)

**Recommendation**: Proceed with Option A (Drizzle + libSQL) for immediate implementation.


Solutions for Vercel Deployment
Option 1: Turso (libSQL Cloud) ← Recommended for Vercel
bash
# .env.local for Vercel
DATABASE_URL="libsql://mosaic-[username].turso.io"
DATABASE_AUTH_TOKEN="your-token"
typescript
// Works on Vercel - cloud-hosted SQLite
import { createClient } from '@libsql/client';
 
const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
How it works: Turso hosts the SQLite database. Your Vercel functions connect to it via HTTP (like Postgres). You get SQLite's benefits with cloud hosting.

Option 2: Keep Postgres (Neon)
Original choice works fine on Vercel. Just accept the trade-offs I documented.

Option 3: Don't Deploy to Vercel
Host on:

Railway/Render/Fly.io (persistent disk available)
Docker container anywhere with volume mount
Self-hosted with SQLite file on disk
Bun + SQLite: Two Scenarios
Scenario A: Local Development Only (No Vercel)
If you're building a desktop/local tool that researchers run on their machines:

typescript
// Using Bun's built-in SQLite
import { Database } from 'bun:sqlite';
 
const db = new Database('mosaic.db'); // File persists locally
Package manager: Use Bun (replacing pnpm/npm):

bash
bun install
bun run dev
bun run build
Scenario B: Vercel Deployment
If you need Vercel hosting, use Turso + libSQL:

bash
# Works with Bun or Node
bun add @libsql/client drizzle-orm
