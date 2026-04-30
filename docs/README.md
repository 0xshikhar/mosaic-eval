# Mosaic Eval Harness

> **A local-first, multi-model biosecurity evaluation harness that measures whether combining LLMs can produce more capable or more harmful bio-related outputs than any single model alone.**

The core research question is whether agentic or adversarial cross-model workflows create measurable uplift in biosecurity-relevant tasks. Existing benchmarks mostly test models in isolation. This project evaluates the combined behavior of multiple model providers, while keeping the public repo limited to non-sensitive proxy tasks.

---

## Repository Structure

```
mosaic/
├── README.md                    ← this file
├── docs/
│   ├── ARCHITECTURE.md          ← system design, data flow, component boundaries
│   ├── IMPLEMENTATION_PLAN.md   ← phased build plan, milestones, task breakdown
│   ├── DATA_SCHEMA.md           ← canonical data model / storage sketch
│   ├── API_SPEC.md              ← internal API routes, request/response shapes
│   └── research/
│       ├── info.md              ← scholarship / mentor fit notes
│       ├── FLAWS_AND_GAPS.md    ← gap analysis and risks
│       └── SQLITE_ARCHITECTURE.md ← local-first storage proposal
├── app/                         ← Next.js routes, pages, db, orchestration, eval, safety
│   ├── api/                     ← route handlers
│   ├── db/                      ← Drizzle client, schema, bootstrap helpers
│   ├── components/              ← reusable UI, charts, forms, design system
│   ├── orchestrator/            ← run dispatcher and strategies
│   ├── eval/                    ← refusal, scoring, uplift, consistency
│   ├── safety/                  ← prompt checks, rate limits, audit hooks
│   ├── tasks/                   ← loader, schema, categories
│   └── analysis/                ← exports, report generation, summaries
├── data/                        ← task corpora, fixtures, calibration sets
├── scripts/                     ← importers and one-off maintenance scripts
├── tests/                       ← unit and integration tests
└── types/                       ← shared TypeScript types
```

---

## Quick Start

```bash
bun install
cp .env.example .env.local        # add API keys and DB_FILE_NAME if needed
bun dev
```

Default local storage is SQLite through Drizzle. The repo should run without provisioning an external database for first-pass development.

---

## Docs Index

| Document | What It Covers |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Full system design, component responsibilities, data flow |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Phased build plan with tasks, milestones, and daily targets |
| [DATA_SCHEMA.md](./DATA_SCHEMA.md) | Storage model, tables, fixtures, eval data formats |
| [API_SPEC.md](./API_SPEC.md) | Next.js API routes, request/response shapes, error codes |
| [research/info.md](./research/info.md) | Mentor fit, scholarship context, initial market notes |
| [research/FLAWS_AND_GAPS.md](./research/FLAWS_AND_GAPS.md) | Gap analysis and risk register |
| [research/SQLITE_ARCHITECTURE.md](./research/SQLITE_ARCHITECTURE.md) | Local-first storage proposal and tradeoffs |
