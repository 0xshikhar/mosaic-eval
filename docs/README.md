# Mosaic Eval — Documentation

> **A local-first, multi-model LLM evaluation harness for biosecurity research that measures whether combining LLMs can produce more capable outputs than any single model alone.**

Current demo stack:
- OpenAI-compatible Bedrock `gpt-oss-120b` via `bedrock-mantle`
- Claude Sonnet 4.6 via `bedrock-runtime`
- Moonshot Kimi K2.5 via `bedrock-mantle`
- MiniMax M2.5 via `bedrock-mantle`
- LM Studio local baseline

This folder contains all project documentation — both for developers setting up the system and researchers wanting to understand the methodology.

---

## Documentation Overview

| Category | Audience | What You'll Find |
|----------|----------|-------------------|
| **Research** | Researchers, judges, reviewers | Methodology, scoring, uplift calculations, strategies |
| **Technical** | Developers, contributors | Architecture, API, schema, configuration, troubleshooting |

---

## Research Documentation (`docs/research/`)

These documents explain the research methodology and evaluation framework.

| Document | Purpose |
|----------|---------|
| [METHODOLOGY.md](./research/METHODOLOGY.md) | Core research question, hypothesis, evaluation approach, reproducibility |
| [RUBRIC.md](./research/RUBRIC.md) | Full scoring rubric (0-100) with examples for each score level |
| [REFUSAL_CLASSIFICATION.md](./research/REFUSAL_CLASSIFICATION.md) | How refusal detection works (keyword heuristics + LLM judge) |
| [UPLIFT_CALCULATION.md](./research/UPLIFT_CALCULATION.md) | Mathematical formulas for calculating mosaic uplift |
| [STRATEGIES_COMPARISON.md](./research/STRATEGIES_COMPARISON.md) | When to use each routing strategy (Round Robin, Adversarial Cross, etc.) |
| [MODEL_BENCHMARKS.md](./research/MODEL_BENCHMARKS.md) | Expected performance per model, known limitations |
| [METHODOLOGY_NOTE.md](./research/METHODOLOGY_NOTE.md) | Additional methodology notes and context |


## Technical Documentation (`docs/`)

These documents guide developers through setup, configuration, and troubleshooting.

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, component responsibilities, data flow |
| [DATA_SCHEMA.md](./DATA_SCHEMA.md) | Database schema, tables, storage model |
| [API_SPEC.md](./API_SPEC.md) | REST API routes, request/response shapes, error codes |
| [CONFIGURATION.md](./CONFIGURATION.md) | Environment variables, model setup, provider configuration |
| [DEMO_VIDEO_SCRIPT.md](./DEMO_VIDEO_SCRIPT.md) | Detailed presenter script and talking points for the demo video |
| [DEMO_RUNBOOK.md](./DEMO_RUNBOOK.md) | Step-by-step demo walkthrough |
| [RUNBOOK.md](./RUNBOOK.md) | Production run instructions |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common issues, debugging tips, circuit breaker behavior |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Phased build plan with milestones |

---

## Quick Access by Goal

### For Researchers
1. Start with [METHODOLOGY.md](./research/METHODOLOGY.md)
2. Understand the [RUBRIC.md](./research/RUBRIC.md) for scoring
3. Review [UPLIFT_CALCULATION.md](./research/UPLIFT_CALCULATION.md) for metrics
4. Check [STRATEGIES_COMPARISON.md](./research/STRATEGIES_COMPARISON.md) for strategy selection

### For Developers
1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system overview
2. Follow [CONFIGURATION.md](./CONFIGURATION.md) to set up models
3. Use [DEMO_RUNBOOK.md](./DEMO_RUNBOOK.md) to run your first eval
4. Reference [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) when issues arise

### For Judges/Reviewers
1. Review [METHODOLOGY.md](./research/METHODOLOGY.md) for the research question
2. Read [RUBRIC.md](./research/RUBRIC.md) to understand scoring
3. Check [REFUSAL_CLASSIFICATION.md](./research/REFUSAL_CLASSIFICATION.md) for response classification
4. Review [UPLIFT_CALCULATION.md](./research/UPLIFT_CALCULATION.md) for metrics definition

---

## Related Files

- **Root [README.md](../README.md)** — Project overview and current demo stack
- **Code in `app/`** — Implementation (orchestrator, eval, safety modules)

---

## Getting Help

If you can't find what you need:
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
2. Review the relevant category above
3. Check the main project [README.md](../README.md) for additional context
