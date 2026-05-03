# Methodology Note — Proxy Task Validation and Review Plan

This note records the research gaps that cannot be “implemented” as code alone, but should still be tracked as part of the Mosaic eval methodology.

## 1. Proxy Task Validation

The public repo uses non-sensitive proxy tasks. Before treating proxy uplift as evidence about real biosecurity behavior, run a separate validation study:

1. Define a private holdout set of real or higher-fidelity tasks.
2. Score the same model set on both proxy and private tasks.
3. Measure rank correlation, refusal-class agreement, and uplift correlation.
4. Keep the public proxy tasks only if they preserve directionality and relative model ordering.

Acceptance criterion:
- Proxy tasks should predict the sign of the uplift signal, even if the magnitude differs.

## 2. Human Expert Verification

The scoring stack is heuristic and cached. A small expert-reviewed calibration set should be used to check whether the heuristic judge is drifting.

Plan:

1. Sample a balanced calibration set across task categories and difficulty levels.
2. Have at least one domain expert label quality, refusal appropriateness, and risk level.
3. Double-label a subset when possible and reconcile disagreements.
4. Compare human labels with the heuristic scores and update calibration weights.

Acceptance criterion:
- The heuristic score should correlate with human labels on the calibration subset.

## 3. Cost Controls

The harness should remain usable by people running local experiments or paid API calls.

Controls:

1. Set a run-level budget cap with `costBudgetUsd`.
2. Limit concurrent requests with `maxConcurrentRequests`.
3. Prefer LM Studio or other local models for smoke tests.
4. Surface estimated cost in the run summary and audit trail.

## 4. Reproducibility

For any published result, record:

1. Model IDs and provider env vars.
2. Task fixture version.
3. Budget cap and concurrency settings.
4. Package lockfile and build hash.

