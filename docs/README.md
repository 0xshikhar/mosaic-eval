# Mosaic Eval Harness

> **A multi-model biosecurity evaluation scaffold that simulates adversarial "mosaic attacks" — where bad actors route tasks across multiple LLM providers to find the weakest safeguard and maximize collective uplift.**

Motivated by the finding in the Feb 2026 novice uplift paper (Nedungadi, Götting et al.) that adversaries no longer rely on a single model, but cross-validate outputs across o3, Gemini 2.5 Pro, Claude Opus 4, and others to bypass individual safeguards. All existing benchmarks (VCT, ABC-Bench, ABLE) test models in isolation. This project fills that gap.

---

## Repository Structure

```
mosaic-eval-harness/
├── README.md                    ← this file
├── docs/
│   ├── ARCHITECTURE.md          ← system design, data flow, component map
│   ├── IMPLEMENTATION_PLAN.md   ← phased build plan, milestones, task breakdown
│   ├── DATA_SCHEMA.md           ← Prisma schema, DB design, eval data formats
│   ├── API_SPEC.md              ← internal API routes, request/response shapes
│   └── RESEARCH_CONTEXT.md     ← biosecurity framing, prior work, novel contribution
├── app/                         ← Next.js app router
├── components/                  ← shadcn/ui + custom components
├── lib/                         ← core logic: orchestrator, scorers, adapters
├── prisma/                      ← schema.prisma + migrations
├── scripts/                     ← eval runners, data loaders, analysis scripts
└── types/                       ← shared TypeScript types
```

---

## Quick Start

```bash
pnpm install
cp .env.example .env.local        # add API keys and DB URL
pnpm prisma migrate dev
pnpm dev
```

---

## Docs Index

| Document | What It Covers |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Full system design, component responsibilities, data flow |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Phased build plan with tasks, milestones, and daily targets |
| [DATA_SCHEMA.md](./DATA_SCHEMA.md) | Prisma schema, all models, eval data JSON formats |
| [API_SPEC.md](./API_SPEC.md) | Next.js API routes, request/response shapes, error codes |
| [RESEARCH_CONTEXT.md](./RESEARCH_CONTEXT.md) | Research framing, prior work gap analysis, contribution statement |
