# Demo Runbook

This document is the presentation layer for the prototype. It explains how to show the system as a research tool rather than just a product UI.

## One-Sentence Pitch

Mosaic is a local-first evaluation harness that compares single-model and multi-model orchestration on proxy bio-research tasks, while keeping the run fully auditable, reproducible, and checkpointed.

## What We Should Demo

The demo should show a complete research loop:

1. Import approved proxy tasks or research inputs.
2. Launch a run with multiple models and a routing strategy.
3. Watch the live audit stream and checkpoint progress.
4. Inspect the per-step outputs, refusal classes, and judge scores.
5. Review uplift, consistency, and cost summaries.
6. Export the run for follow-up analysis.

That sequence is stronger than trying to show every feature. It demonstrates the core contribution: whether mosaic orchestration changes model behavior in measurable ways.

## Demo Storyline

### 1. Problem Framing

Explain that most benchmarks score models in isolation. This prototype asks a different question: what happens when multiple models are combined inside one controlled evaluation loop?

### 2. Controlled Data Intake

Show `data/imports/` as the only place where raw researcher inputs enter the system.

Explain the rule:

- inputs are approved first
- imports are indexed or moved into the SQL layer
- the agent only reads approved sources

This is important for reproducibility and for avoiding hidden dependencies.

### 3. Run Execution

Start a run from the dashboard.

Call out the three things the audience should notice:

- the run is checkpointed
- the live stream shows what happened step by step
- the system records audit metadata as the run progresses

### 4. Evaluation Output

Move to the results page and show:

- per-model scores
- mosaic score
- delta uplift
- consistency across responses
- export path for sharing results

### 5. Research Value

Close by saying the prototype is not only a UI. It is a structured research workflow that produces artifacts a reviewer can inspect:

- task definitions
- run configuration
- response traces
- scoring decisions
- cost and checkpoint history

## Suggested Presentation Order

For a short demo, use this order:

1. Home dashboard
2. Task library
3. New run form
4. Live run page
5. Results page
6. Export / audit trail

For a longer demo, add:

- task import workflow
- model connectivity test
- resume from checkpoint
- import folder walkthrough

## Data Workflow

Use this repository structure:

```text
data/
  imports/
  databases/
```

Policy:

- `data/imports/` is for raw inputs
- `data/databases/` is for SQLite and SQL artifacts
- the agent should not auto-scan the entire repository
- imported content should be recorded in a manifest or index

That keeps the demo deterministic and avoids accidental leakage from unrelated files.

## What to Say About Reproducibility

Use the language of research workflows:

- inputs are explicit
- outputs are versioned
- runs are replayable
- results are traceable back to source data

That framing matters more than polishing the UI.

## Research Citations

Use these references in the final writeup or slide deck:

- FAIR data principles emphasize findability, accessibility, interoperability, and reusability of research data. See Wilkinson et al. (2016). [Scientific Data](https://www.nature.com/articles/sdata201618)
- Scientific computing best practices recommend version control, testing, automation, and readable structure. See Wilson et al. (2014). [PLOS Biology](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.1001745)
- NIH data management guidance emphasizes planned sharing, documentation, and reproducibility for biomedical research data. [NIH Data Management and Sharing Policy](https://sharing.nih.gov/data-management-and-sharing-policy)
- The Turing Way frames reproducible research as a process that depends on transparent documentation and shareable workflows. [The Turing Way](https://book.the-turing-way.org/reproducible-research/overview.html)

## Reusable Text For The Demo

You can describe the prototype like this:

> Mosaic is a reproducible evaluation harness for proxy bio-research tasks. It compares model behavior under different routing strategies, records an auditable trace of each run, and produces analysis artifacts that support review and follow-up experimentation.

## Final Checklist

- confirm the app builds cleanly
- confirm the data folders exist and are documented
- confirm the demo path is one polished end-to-end run
- confirm the run output includes a trace, a score, and an export

If time is tight, cut everything that does not help tell that story.
