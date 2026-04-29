# Flaws and Gaps Analysis — Mosaic Eval Harness

## Executive Summary

This document catalogs critical flaws, gaps, and risks identified in the Mosaic Eval Harness design documentation. These range from architectural overengineering to scientific methodology concerns that could undermine the validity of research findings.

---

## 1. Architecture & Data Layer Flaws

### 1.1 Neon Postgres is Overkill for Local-First Tool
**Severity: High**

**Problem**: Using cloud serverless Postgres for a local evaluation tool adds unnecessary complexity:
- Network latency on every database query
- Connection string management and environment-specific configuration
- Dependency on external service for local development
- Neon free tier cold start issues (3-5 second connection delays)
- Complex CI/CD (need test database provisioning)
- Cannot run offline/air-gapped

**Impact**: Slower development, brittle tests, researcher friction.

**Recommendation**: Use SQLite (see SQLITE_ARCHITECTURE.md for detailed proposal).

---

### 1.2 Missing Offline Capability
**Severity: High**

**Problem**: Researchers may need to run biosecurity evaluations in:
- Air-gapped environments
- Locations with limited connectivity
- Secure facilities without internet access

Current design prevents this entirely.

**Recommendation**: SQLite local file supports true offline operation.

---

### 1.3 Embedding Storage in Postgres Without pgvector
**Severity: Medium**

**Problem**: Schema stores `embeddingVector Float[]` (1536 dimensions for OpenAI embeddings) as a native array. Postgres without pgvector extension cannot efficiently:
- Index vector data
- Perform similarity searches
- Handle high-dimensional data efficiently

**Impact**: Table scans for consistency analysis = O(n) per query instead of O(log n).

---

### 1.4 No Data Migration/Archival Strategy
**Severity: Medium**

**Problem**: Schema has complex relations (EvalTask → EvalTaskStep → RunStep → ModelResponse → StepScore). No documented way to:
- Archive old runs (database will grow indefinitely)
- Export/import full database state between machines
- Migrate results between dev/staging/prod
- Compress or prune historical data

---

### 1.5 SSE Overhead for Local Process
**Severity: Medium**

**Problem**: Using Server-Sent Events for real-time updates in a local single-machine application is unnecessarily complex:
- HTTP overhead for same-machine communication
- Connection management complexity
- Need for reconnection logic
- Browser-only limitation

**Simpler Alternative**: Direct function calls, or SQLite file polling, or IPC if electron wrapper needed.

---

## 2. Research Methodology & Scientific Validity Flaws

### 2.1 No Proxy Task Validation
**Severity: Critical**

**Problem**: The plan uses "proxy tasks" (non-sensitive biology content) for the public repo but:
- No validation that proxy tasks correlate with real biosecurity task behavior
- No discussion of construct validity
- Risk of overfitting evaluation system to proxy tasks that don't represent real adversarial scenarios

**Gap**: Missing correlation study between proxy and real task performance.

---

### 2.2 Circular Scoring Problem
**Severity: High**

**Problem**: Using Claude Haiku (Anthropic) as the LLM judge to score responses from Claude Opus 4 (same provider family) creates:
- Potential conflict of interest in scoring
- Unknown bias toward Anthropic model outputs
- No cross-validation with other judge models

**Recommendation**: Use multi-judge ensemble or judge from different provider.

---

### 2.3 No Inter-Rater Reliability
**Severity: High**

**Problem**: The 0-100 scoring system has no documented:
- Variance between different judge models on same responses
- Human expert ground truth for calibration subset
- Rubric sensitivity analysis

**Risk**: Scores may not be reproducible or meaningful.

---

### 2.4 Single-Dimensional Scoring is Insufficient
**Severity: High**

**Problem**: A single 0-100 score cannot capture:
- Response quality vs. dangerousness (orthogonal dimensions)
- A response could be high-quality AND dangerous
- A response could be low-quality AND benign

**Missing Dimensions**:
- Information completeness
- Technical accuracy
- Risk level / dual-use concern
- Refusal appropriateness

---

### 2.5 No Negative Control Baseline
**Severity: Medium**

**Problem**: No mention of running the harness on obviously benign tasks to establish:
- False-positive refusal rates
- Baseline score distributions
- System calibration

---

### 2.6 No Statistical Power Analysis
**Severity: Medium**

**Problem**: With only 20 seed tasks mentioned:
- Confidence intervals for uplift metrics will be wide
- No calculation of how many tasks needed to detect meaningful effect sizes
- Risk of underpowered study finding false negatives

---

## 3. Product & UX Flaws

### 3.1 No Cost Controls
**Severity: High**

**Problem**: The schema has `estimatedCostUsd` as nullable float but no mechanism for:
- Real-time cost tracking during runs
- Budget caps to prevent runaway spending
- Alerts when expensive models (o3, Claude Opus 4) selected
- Per-model cost breakdown

**Risk**: A Parallel Blast with 5 models on 100 tasks could cost $50-100+ with no warning.

---

### 3.2 Missing Reproducibility Features
**Severity: High**

**Problem**: No documented approach for:
- Seeding randomness (if any stochastic routing)
- Model version pinning (what if Anthropic updates "claude-opus-4"?)
- Dependency versioning for exact reproduction
- Docker/containerization

**Impact**: Results may not be reproducible weeks later.

---

### 3.3 No Checkpoint/Resume Capability
**Severity: Medium**

**Problem**: If a 100-step run fails at step 99:
- Must restart entirely
- All API costs for 99 steps are wasted
- No partial result recovery

**Missing**: Transactional checkpointing after each step.

---

### 3.4 Limited Export Formats
**Severity: Low**

**Problem**: Only JSON and CSV exports mentioned. Missing:
- Jupyter notebook export for analysis
- Weights & Biases / MLflow integration
- PDF report generation for fellowship submissions
- Integration with academic tools (R, pandas direct load)

---

### 3.5 No Collaboration/Audit Features
**Severity: Medium**

**Problem**: For a research tool, missing:
- User accounts and attribution
- Comments on runs
- Sharing specific run comparisons
- Audit trail of evaluations

---

## 4. Technical Implementation Flaws

### 4.1 Inefficient Weakest-Safeguard Strategy
**Severity: Medium**

**Problem**: Strategy queries historical refusal rates per step during execution:
```typescript
// For 100-step run = 100 SELECT queries scanning UpliftMetric table
getWeakestModel(category, modelIds) // called per step
```

**Should**: Pre-compute model rankings per category at run start (1 query).

---

### 4.2 No Response/Judge/Embedding Caching
**Severity: High**

**Problem**: No caching layer for:
- Model responses (expensive to re-run, deterministic for same prompt)
- Judge scoring (deterministic for same inputs)
- Embedding computation (same text = same embedding)

**Impact**: Re-running same eval wastes API calls and money.

---

### 4.3 Race Condition in SSE Streaming
**Severity: Medium**

**Problem**: SSE uses AsyncGenerator but:
- No documented mechanism to resume if client disconnects
- No way to get current run state on reconnect
- Potential for missed events

---

### 4.4 No Rate Limiting
**Severity: High**

**Problem**: Dispatcher uses `Promise.all` for parallel model calls:
```typescript
// Parallel Blast with 5 models on 100 steps = 500 concurrent API calls
Promise.all(modelAdapters.map(m => m.invoke(prompt)))
```

**Impact**: Will hit provider rate limits immediately.

**Missing**: Concurrency limiting, backoff, queue management.

---

### 4.5 No Circuit Breaker
**Severity: Medium**

**Problem**: If one provider fails (Anthropic API error):
- Entire run fails
- No fallback to other models
- No graceful degradation

---

### 4.6 Zod Validation Overhead
**Severity: Low**

**Problem**: Validating every JSONL task with Zod on import is CPU-intensive for large datasets. No streaming validation or batch optimization mentioned.

---

## 5. Security & Ethics Flaws

### 5.1 No Input Sanitization
**Severity: High**

**Problem**: Importing user-provided JSONL tasks with no discussion of:
- Sanitizing prompts before sending to LLMs
- Preventing prompt injection from malicious task definitions
- Validating that proxy tasks don't contain actual dangerous instructions

---

### 5.2 Prompt Leakage via Synthesis
**Severity: Medium**

**Problem**: Adversarial Cross strategy synthesizes responses from multiple models. Could inadvertently reconstruct sensitive information if:
- Models have memorized dangerous content
- Synthesis agent combines partial information into complete picture

---

### 5.3 No Audit Logging
**Severity: High**

**Problem**: For a biosecurity evaluation tool, no mention of:
- Logging who ran what evaluation
- Flagging particularly concerning outputs
- Access controls on sensitive results
- Data retention policies

---

### 5.4 Basic API Key Management
**Severity: Medium**

**Problem**: All API keys in `.env.local` with no:
- Key rotation mechanism
- Per-user key management
- Usage quotas per key
- Sandboxing to prevent exfiltration

---

## 6. Research Contribution Gaps

### 6.1 Missing Control Conditions
**Severity: High**

**Problem**: No testing of:
- Naive baseline (no strategy, random routing)
- Single-model runs with intentional retry
- Comparison to actual novice behavior (not just simulated)

---

### 6.2 No Human Expert Verification
**Severity: Critical**

**Problem**: For a biosecurity fellowship application, relying entirely on automated LLM judging without:
- Human expert correlation study
- Calibration of automated scores to expert assessment
- Validation that uplift metrics correspond to actual risk increase

---

### 6.3 Category Granularity Too Coarse
**Severity: Medium**

**Problem**: Only 5 TaskCategories. Missing nuance:
- DNA synthesis vs protein engineering are very different risk profiles
- No DURC (dual-use research of concern) tagging
- No pathogen-specific categorization
- No technique-specific tags (CRISPR, viral vectors, etc.)

---

### 6.4 No Model Behavior Characterization
**Severity: Medium**

**Problem**: Focus on uplift metrics but missing:
- Which specific refusal patterns each model uses
- How models respond when "cornered" (multiple attempts)
- Differences in explanations vs actual content

---

### 6.5 No Temporal Tracking
**Severity: Low**

**Problem**: Model behavior changes over time. No:
- Model version tracking (exact API dates)
- Re-evaluation of same tasks over time
- Detection of model drift

---

## Summary Table

| Category | High Severity | Medium Severity | Low Severity |
|----------|---------------|-----------------|--------------|
| Architecture | 2 | 3 | 1 |
| Research Methodology | 4 | 2 | 0 |
| Product/UX | 2 | 3 | 1 |
| Technical Implementation | 2 | 3 | 1 |
| Security/Ethics | 3 | 2 | 0 |
| Research Contribution | 2 | 2 | 1 |
| **Total** | **15** | **15** | **4** |

---

## Recommended Priority Actions

### Immediate (Before Fellowship Submission)
1. **Replace Neon Postgres with SQLite** (see SQLITE_ARCHITECTURE.md)
2. **Add basic cost tracking and limits**
3. **Implement checkpoint/resume for runs**
4. **Add rate limiting to dispatcher**
5. **Create at least one human-verified calibration set**

### Before Production Use
1. **Implement comprehensive caching**
2. **Add audit logging**
3. **Create proxy task validation study**
4. **Add multi-dimensional scoring**
5. **Implement circuit breakers and error handling**
