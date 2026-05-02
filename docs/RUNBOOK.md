# Operations Runbook — Mosaic Eval

## 1. Overview

This runbook provides step-by-step procedures for running evaluations, managing the system, and handling common operational scenarios.

---

## 2. Pre-Flight Checklist

Before starting any evaluation run:

### System Checks

- [ ] Application builds without errors: `cd app && bun run build`
- [ ] Health endpoint responds: `curl http://localhost:3000/api/health`
- [ ] Database accessible: `sqlite3 data/databases/mosaic.db ".tables"`
- [ ] At least one model configured and tested
- [ ] Sufficient API credits/budget available
- [ ] Disk space available (>1GB recommended)

### Configuration Verification

```bash
cd app

# Verify environment
bun run build

# Test model connectivity
curl -X POST http://localhost:3000/api/models/test \
  -H "Content-Type: application/json" \
  -d '{"modelId": "openai"}'

# Check database
sqlite3 ../data/databases/mosaic.db "SELECT COUNT(*) FROM evalTasks;"
```

---

## 3. Standard Evaluation Procedures

### Procedure 1: Single Model Baseline

**Purpose:** Establish baseline performance for one model.

**Steps:**

1. **Navigate to Run Composer:**
   - Open http://localhost:3000/runs/new

2. **Configure Run:**
   - Name: `baseline-{model}-{date}` (e.g., `baseline-gpt4o-2024-05-01`)
   - Strategy: SOLO
   - Models: Select single model
   - Tasks: Choose categories and difficulty range
   - Include Baseline: No (this IS the baseline)

3. **Set Budget:**
   - Cost Budget: Estimate based on task count
   - Formula: `tasks × steps × $0.02` (rough estimate)

4. **Launch:**
   - Click "Start Evaluation"
   - Note the Run ID from URL: `/runs/{run-id}`

5. **Monitor:**
   - Watch live stream for progress
   - Check for refusals or errors

6. **Verify Completion:**
   - Status should show "COMPLETE"
   - Results page shows per-step scores
   - Export data for analysis

---

### Procedure 2: Mosaic Comparison Run

**Purpose:** Compare mosaic strategy against baseline.

**Prerequisites:**
- Baseline run completed for comparison

**Steps:**

1. **Navigate to Run Composer**

2. **Configure Mosaic Run:**
   - Name: `mosaic-{strategy}-{models}-{date}`
   - Strategy: Select mosaic strategy (Round Robin, Adversarial Cross, etc.)
   - Models: Select 3-5 models
   - Tasks: Same task set as baseline (for comparison)
   - Include Baseline: Yes (runs SOLO alongside)

3. **Launch and Monitor**

4. **Post-Run Analysis:**
   - Navigate to Results page
   - Compare uplift metrics
   - Check per-category performance
   - Export data

---

### Procedure 3: Ablation Study

**Purpose:** Measure contribution of each model to mosaic performance.

**Design:**
- Full set: All N models
- Ablation 1: Set minus Model A
- Ablation 2: Set minus Model B
- ...

**Steps:**

1. **Run Full Set:**
   - All models, mosaic strategy
   - Record mosaic score

2. **Run Ablations:**
   - For each model, run with that model excluded
   - Use same task set, same strategy

3. **Calculate Marginal Contributions:**
   ```
   Marginal(Model) = Score(Full) - Score(Full - Model)
   ```

4. **Document:**
   - Table showing contribution per model
   - Identify redundant models (near-zero contribution)
   - Identify critical models (high contribution)

---

### Procedure 4: Refusal Pattern Analysis

**Purpose:** Understand how different models handle sensitive categories.

**Steps:**

1. **Create Category-Specific Run:**
   - Select single category (e.g., pathogen_acquisition)
   - Include all difficulty levels
   - Run with each model individually (SOLO)

2. **Collect Refusal Data:**
   - Export run results
   - Note refusal classifications per model

3. **Analyze:**
   - Calculate refusal rate per model per category
   - Identify "weakest safeguard" models
   - Document for Weakest Safeguard strategy

4. **Update Strategy:**
   - Weakest Safeguard uses this data automatically
   - Verify in dashboard "Refusal Rates" view

---

## 4. Data Management

### Importing Tasks

**Via UI:**
1. Navigate to `/tasks`
2. Click "Import tasks"
3. Select "Upload File" or "Paste Text"
4. Upload `.jsonl` file or paste content
5. Verify preview looks correct
6. Click "Import JSONL"

**Via API:**
```bash
curl -X POST http://localhost:3000/api/tasks/import \
  -H "Content-Type: application/json" \
  -d '{
    "jsonl": "{\"id\": \"task-1\", \"title\": \"...\"}\\n{...}"
  }'
```

**File Format (JSONL):**
```jsonl
{"id": "task-001", "title": "Task name", "category": "general_bio", "difficulty": 3, "steps": [...]}
{"id": "task-002", "title": "Another task", "category": "protein_engineering", "difficulty": 4, "steps": [...]}
```

### Exporting Results

**Via UI:**
1. Navigate to run results page
2. Click "Export" button
3. Choose format: CSV or JSON

**Via API:**
```bash
# Export as JSON
curl http://localhost:3000/api/runs/{run-id}/export?format=json

# Export as CSV
curl http://localhost:3000/api/runs/{run-id}/export?format=csv
```

**Export Contents:**
- Run metadata (config, timestamps)
- All steps with prompts
- All model responses
- Scores and refusal classifications
- Uplift calculations

### Database Backup

**Manual Backup:**
```bash
# Create backup
cp data/databases/mosaic.db data/databases/mosaic-backup-$(date +%Y%m%d).db

# Verify backup
sqlite3 data/databases/mosaic-backup-*.db "SELECT COUNT(*) FROM evalRuns;"
```

**Automated Backup (Cron):**
```bash
# Add to crontab -e
0 2 * * * cp /path/to/mosaic.db /path/to/backups/mosaic-$(date +\%Y\%m\%d).db
```

---

## 5. Troubleshooting Procedures

### Procedure: Resume Interrupted Run

**When:** Run failed or stopped mid-execution.

**Steps:**

1. **Identify Run ID:**
   - Check `/runs` page for partial run
   - Note the ID

2. **Check Status:**
   ```bash
   curl http://localhost:3000/api/runs/{run-id}
   ```

3. **Resume:**
   - Via UI: Click "Resume" button on run page
   - Via API:
   ```bash
   curl -X POST http://localhost:3000/api/runs/{run-id}/resume
   ```

4. **Verify:**
   - Run continues from last checkpoint
   - No duplicate steps executed
   - Final status shows "COMPLETE"

---

### Procedure: Handle Model Failure

**When:** One model fails repeatedly during run.

**Steps:**

1. **Check Logs:**
   ```bash
   # Look for error patterns
   grep "ERROR\|FAIL" app/logs/
   ```

2. **Verify Model Status:**
   ```bash
   curl -X POST http://localhost:3000/api/models/test \
     -d '{"modelId": "failed-model"}'
   ```

3. **Options:**
   - **Wait:** Circuit breaker auto-resets after 5 minutes
   - **Resume:** Run continues with remaining models
   - **Restart:** If critical, restart run with different models

4. **Document:**
   - Note failure in run notes
   - Adjust concurrency limits if needed

---

### Procedure: Cost Budget Exceeded

**When:** Run stops due to cost limit.

**Steps:**

1. **Check Current Spend:**
   - Dashboard shows "Cost to date"

2. **Options:**
   - Increase budget and resume
   - Accept partial results
   - Restart with cheaper models/strategy

3. **For Future:**
   - Set higher default budget: `DEFAULT_COST_BUDGET_USD=100`
   - Use cheaper strategy (Round Robin vs Adversarial Cross)
   - Reduce model count

---

### Procedure: Judge Calibration Drift

**When:** Judge scores seem inconsistent or biased.

**Steps:**

1. **Review Calibration Sample:**
   - Check human vs. judge agreement on calibration tasks
   - Target: >85% agreement

2. **Recalibrate:**
   - Add new human-labeled samples
   - Recalculate calibration factors
   - Update in `app/eval/calibration.ts`

3. **Re-score:**
   - If significant drift, re-run judge on affected tasks
   - Update scores in database

---

## 6. Maintenance Procedures

### Daily

- [ ] Check disk space: `df -h`
- [ ] Review active runs
- [ ] Check error logs
- [ ] Verify backups completed

### Weekly

- [ ] Review refusal rate trends
- [ ] Check model performance consistency
- [ ] Archive old runs (if needed)
- [ ] Update task library (if new tasks added)

### Monthly

- [ ] Full database backup verification
- [ ] Judge calibration check
- [ ] Model benchmark refresh
- [ ] Documentation updates

### Quarterly

- [ ] Full system update (dependencies)
- [ ] Re-benchmark all models
- [ ] Security review
- [ ] Disaster recovery test

---

## 7. Research Workflows

### Workflow: Publish-Quality Study

**Goal:** Generate results suitable for academic publication.

**Phases:**

**Phase 1: Design (Week 1)**
- [ ] Define research questions
- [ ] Select task set (minimum 100 tasks)
- [ ] Choose models (minimum 3)
- [ ] Define strategies to compare
- [ ] Calculate required sample size (power analysis)
- [ ] Pre-register hypotheses

**Phase 2: Pilot (Week 2)**
- [ ] Run 10-task pilot
- [ ] Verify pipeline works end-to-end
- [ ] Check data quality
- [ ] Estimate final cost
- [ ] Adjust if needed

**Phase 3: Full Run (Week 3-4)**
- [ ] Run all conditions
- [ ] Document any issues
- [ ] Export all data
- [ ] Verify reproducibility (re-run subset)

**Phase 4: Analysis (Week 5-6)**
- [ ] Statistical analysis
- [ ] Generate figures
- [ ] Draft results section
- [ ] Peer review (internal)

**Phase 5: Documentation (Week 7)**
- [ ] Write methods section
- [ ] Document limitations
- [ ] Prepare supplementary materials
- [ ] Create reproducibility package

**Deliverables:**
- Run configuration hashes
- Complete response traces
- Analysis code
- Draft manuscript sections

---

### Workflow: Quick Experiment

**Goal:** Fast iteration on hypothesis.

**Steps:**

1. **Select Subset:**
   - 20-30 representative tasks
   - Mix of categories and difficulties

2. **Minimal Config:**
   - 2-3 models
   - 2 strategies (baseline + experimental)
   - Round Robin (cheapest)

3. **Run and Analyze:**
   - Same day turnaround
   - Focus on uplift direction (positive/negative)
   - Note effect sizes

4. **Iterate:**
   - Adjust based on results
   - Full run if promising

---

## 8. Emergency Procedures

### Database Corruption

**Symptoms:** SQLite errors, malformed database warnings.

**Recovery:**

1. **Stop Application**
2. **Attempt Repair:**
   ```bash
   sqlite3 data/databases/mosaic.db ".recover" | \
     sqlite3 data/databases/mosaic_recovered.db
   ```
3. **If Unrecoverable:**
   - Restore from backup
   - Document data loss
   - Re-run affected evaluations

### API Key Compromise

**Immediate:**
1. Revoke key at provider console
2. Generate new key
3. Update `.env.local`
4. Restart application

### Cost Spike

**Detection:** Budget alert triggered.

**Response:**
1. Check current run status
2. If abnormal cost:
   - Stop current run
   - Check for infinite loops
   - Verify no duplicate requests
3. Contact provider if billing error suspected

---

## 9. Checklists

### Pre-Run Checklist

- [ ] Task set finalized and imported
- [ ] Models configured and tested
- [ ] Budget set and verified
- [ ] Strategy selected
- [ ] Run name follows convention
- [ ] Backup current database
- [ ] Team notified (if shared)

### Post-Run Checklist

- [ ] Status shows "COMPLETE"
- [ ] All steps have scores
- [ ] Refusal rates reasonable
- [ ] Uplift calculated
- [ ] Data exported
- [ ] Results reviewed
- [ ] Notes documented
- [ ] Next steps planned

### Publication Checklist

- [ ] All runs completed
- [ ] Data exported and archived
- [ ] Statistical analysis complete
- [ ] Figures generated
- [ ] Methods documented
- [ ] Reproducibility package ready
- [ ] IRB/ethics approval (if required)
- [ ] Co-author review complete

---

## 10. Quick Reference

### Common Commands

```bash
# Start development server
cd app && bun run dev

# Build for production
cd app && bun run build

# Run tests
cd app && bun test

# Database operations
sqlite3 data/databases/mosaic.db "SELECT * FROM evalRuns;"

# Model test
curl -X POST http://localhost:3000/api/models/test \
  -d '{"modelId": "openai"}'

# Export run
curl http://localhost:3000/api/runs/{id}/export?format=json
```

### File Locations

| File | Path |
|------|------|
| Database | `data/databases/mosaic.db` |
| Environment | `app/.env.local` |
| Config | `app/next.config.ts` |
| Logs | `app/.next/` (dev) |
| Imports | `data/imports/` |
| Tasks | Stored in database |

### Contact & Support

- Technical issues: Check docs/TROUBLESHOOTING.md
- Research questions: See docs/research/ methodology docs
- Bug reports: Include run ID and logs

---

*This runbook is a living document. Update procedures as the system evolves.*
