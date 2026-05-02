# Demo Video Script

## Purpose

This script is written for a researcher-facing demo video. The goal is to present Mosaic as a controlled evaluation harness for proxy bio-research tasks, not as a generic chatbot app.

The narration should emphasize:

- reproducibility
- auditability
- multi-model comparison
- routing strategy selection
- step-level scoring
- uplift and consistency analysis
- checkpointed execution
- direct-provider and Bedrock-backed model support

## Core Message

Use this sentence early and often:

> Mosaic is a local-first evaluation harness for proxy bio-research tasks that compares single-model and multi-model orchestration under a controlled, auditable, checkpointed workflow.

If you want a shorter version for the opening:

> Mosaic asks a simple research question: does combining multiple models produce measurably better outputs than using one model alone?

## What The Demo Must Prove

The video should prove four things:

1. The system can configure multiple models from environment-based setup.
2. The system can run a task set through a routing strategy and keep the run auditable.
3. The system can compare model outputs step by step and score them consistently.
4. The system can show uplift, refusal behavior, and response traces in a way a researcher can inspect later.

## Recommended Demo Order

1. Home or overview page
2. Model test page
3. Run composer
4. Live run page
5. Results page
6. Export path or audit trail

If time is limited, skip directly from the model test page to the run composer and then to the results page.

## Key Technical Terms To Use

Use these terms exactly as written:

- `adapter layer`
- `routing strategy`
- `baseline run`
- `checkpoint`
- `SSE stream`
- `step-level trace`
- `refusal classification`
- `consistency score`
- `mosaic uplift`
- `judge cache`
- `Bedrock-backed model`
- `direct API model`

Avoid vague phrases like:

- "AI magic"
- "the thing runs the model"
- "it just figures it out"
- "we kind of compare stuff"

## Model Story

Explain the provider setup as a deliberate research choice:

- OpenAI-compatible Bedrock model for one frontier baseline
- Claude Sonnet 4.6 through Bedrock runtime for a second frontier baseline
- Moonshot Kimi K2.5 through Bedrock for a different reasoning style
- MiniMax M2.5 through Bedrock for another independent model family
- LM Studio for a local baseline

The point is not raw model count. The point is contrast.

### Use this line

> The demo intentionally mixes direct and Bedrock-backed providers so we can compare behavior across different model families using one orchestration layer.

### Another good line

> The Bedrock setup lets us reuse one private API key to evaluate multiple model families, which makes the demo cheaper, simpler, and easier to reproduce.

## Opening Script

### What to say

> This project is Mosaic, a local-first evaluation harness for proxy bio-research tasks.  
> The core question is whether a controlled multi-model workflow can outperform a single model on the same task.  
> What matters here is not just the answer quality, but the trace: which models were called, how they were routed, how they scored, and whether the run can be reproduced later.

### What to show

- the title or landing page
- the main product summary
- any visible mention of tasks, runs, and analysis

### Point to these concepts

- research workflow
- controlled evaluation
- auditable output

## Problem Statement

### What to say

> In a research setting, isolated model outputs are not enough.  
> We need to see whether combining models changes refusal behavior, response quality, and consistency across steps.  
> Mosaic is designed to answer that question with a checkpointed, inspectable pipeline instead of a black-box chat interface.

### Why this wording works

- It frames the app as research infrastructure.
- It avoids sounding like a generic product pitch.
- It connects directly to evaluation and reproducibility.

## Model Configuration Segment

### What to show

Open the model test page and show that models are discovered from environment configuration.

### What to say

> Before any run starts, the system checks which models are actually configured.  
> Some providers use direct API keys.  
> Others use Bedrock-backed access.  
> That means the application can switch between a direct-provider setup and a shared Bedrock key without changing the rest of the orchestration logic.

### If you want to be more technical

> The adapter layer normalizes provider differences so the orchestrator receives the same interface regardless of whether the underlying model is OpenAI-compatible, Anthropic, Moonshot, MiniMax, or local.

### Important point to emphasize

> The UI is not asking the user to re-enter keys. It is reading the configured environment and showing which adapters are available.

### Technical phrases to use

- "environment-driven configuration"
- "adapter normalization"
- "provider-specific request shape"
- "shared Bedrock key"

## Run Composer Segment

### What to show

Open the run composer and select:

- multiple models
- a routing strategy
- a task set
- baseline or comparison runs if available

### What to say

> Here I am selecting the models that will participate in the evaluation.  
> The important choice is not only which models are selected, but which routing strategy governs the step-level dispatch.  
> That lets us test round robin, parallel blast, adversarial cross, or baseline control behavior under the same task set.

### Add this sentence

> The run composer is where the evaluation becomes a controlled experiment rather than a manual chat session.

### If you are using the Bedrock bundle

> In this demo, Bedrock is especially useful because one key can unlock multiple model families. That lets us test the same prompt family across several agents without multiplying the key-management overhead.

## Live Run Segment

### What to show

Start the run and stay on the live run page.

Highlight:

- live audit stream
- step-by-step updates
- run progress
- checkpointing
- model call visibility

### What to say

> Once the run starts, the orchestrator sends each step through the selected routing strategy.  
> Every request is logged, scored, and written to the run history.  
> The live page is showing the run as an event stream, so a researcher can follow the execution in real time instead of waiting for a final result.

### Say this next

> This is important because the system is not just returning answers. It is preserving the trace of how those answers were produced.

### Point out

- `step dispatched`
- `step complete`
- best model
- refusal class
- score

## Technical Explanation Of The Pipeline

Use this explanation when the audience wants the implementation detail:

> Under the hood, the runner dispatches each task step to the selected adapter(s), applies refusal detection and scoring, persists the responses, and stores a checkpoint after each completed step.  
> That means the run can be resumed, inspected, exported, and analyzed without losing the original trace.

### If asked about the live update mechanism

> The UI uses a streamed event feed, so updates arrive as the run progresses. The persistent records are stored separately in SQLite, which is what makes the results reproducible.

## Results Segment

### What to show

Open the results page and walk through:

- per-model score chart
- uplift curve or uplift breakdown
- consistency heatmap
- step diff viewer
- export buttons

### What to say

> This page is where the evaluation becomes a research artifact.  
> We can compare the best single-model response against the combined mosaic output, inspect consistency across model families, and see how the system behaves at the step level.

### For uplift

> The key metric here is uplift: whether the mosaic strategy improves over the strongest individual model on the same task step.

### For consistency

> Consistency helps us understand whether the models agree, diverge, or complement each other in a meaningful way.

### For refusal behavior

> Refusal classification is also part of the analysis, because in safety-sensitive domains the best answer is not always the most verbose answer.

## Step Diff Viewer Segment

### What to say

> The step diff viewer is the most useful screen for a researcher, because it makes the comparison explicit.  
> For each step, we can inspect the final responses side by side and identify which model produced the strongest result.

### If one card is blank

> If a response is missing here, that is a data issue worth investigating.  
> The intended behavior is that every completed step should carry its persisted response text into the results view.

### If a response is very long

> Long responses are expected in research workflows, so the interface is designed to preserve the full text rather than compress it into a single summary line.

## Bedrock Segment

### What to say

> The Bedrock path matters because it gives us a single authenticated entry point for multiple model families.  
> In practice, that means Claude, OpenAI-compatible Mantle models, Moonshot, and MiniMax can all be tested under one demo setup.

### Stronger technical phrasing

> The integration is provider-specific under the hood, but operationally it behaves like one shared research layer.

### If someone asks why this matters

> It reduces friction for researchers and judges.  
> It also makes the demo more credible, because we can show a consistent orchestration model instead of a one-off integration per provider.

## Closing Script

### What to say

> The main contribution here is not a single answer from a single model.  
> It is a reproducible framework for comparing model behavior, scoring the output, and tracing the run from prompt to result.  
> That makes Mosaic useful as a research harness, not just a UI.

### Final closing line

> In short, Mosaic turns multi-model evaluation into a controlled, auditable research workflow.

## Short Version For A 2 To 3 Minute Demo

If you need a compressed version, use this:

> Mosaic is a local-first evaluation harness for proxy bio-research tasks.  
> I can configure direct providers and Bedrock-backed models, choose a routing strategy, and run the same task set across multiple agents.  
> While the run executes, the system streams live updates, stores checkpoints, and records each response with refusal classification and scoring metadata.  
> On the results page, I can compare model outputs step by step, inspect uplift and consistency, and export the full run as a research artifact.  
> The point is to answer a research question with a reproducible trace, not just to generate a chat response.

## Speaker Notes

- Speak slowly on the first sentence.
- Pause after "the research question" and after "reproducible trace".
- Do not over-explain the UI animations.
- Emphasize the evaluation loop more than the visual polish.
- If a page takes a moment to load, say "the run is checkpointed and streamed live" rather than apologizing.

## Things To Avoid Saying

- Do not say the app is "just a chatbot."
- Do not imply the models are interchangeable.
- Do not describe the demo as a "hack" or a "prototype only."
- Do not go into unsafe operational detail.
- Do not over-focus on provider branding.

## Suggested On-Screen Labels

If you add callouts in editing, use these labels:

- `Configured models`
- `Routing strategy`
- `Live run trace`
- `Step-level scores`
- `Consistency analysis`
- `Exportable artifact`

## Final Preparation Checklist

- Confirm the Bedrock key is loaded before recording.
- Confirm the model test page shows the intended models.
- Confirm the demo run uses one clean task set.
- Confirm the results page shows at least one completed step with visible response text.
- Confirm exports work before the recording starts.

