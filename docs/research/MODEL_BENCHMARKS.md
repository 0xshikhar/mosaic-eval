# Model Benchmarks & Performance Profiles

## 1. Overview

This document catalogs the expected performance, characteristics, and limitations of each supported model provider in the Mosaic Eval Harness. Use this reference for model selection, strategy optimization, and interpreting results.

**Important:** Model performance varies by task category, difficulty, and over time (model updates). Treat these as guidelines, not guarantees.

---

## 2. Supported Models

### Summary Matrix

| Provider | Primary Model | Strengths | Weaknesses | Best For |
|----------|--------------|-----------|------------|----------|
| **OpenAI** | GPT-4o / GPT-oss | General competence, API reliability | Expensive, conservative on some topics | General tasks, synthesis |
| **Anthropic** | Claude 3.5 Sonnet | Nuanced reasoning, long context | High refusal rate, expensive | Judge/scoring, complex reasoning |
| **Google** | Gemini 2.5 Pro | Large context, multimodal base | Inconsistent availability | Long documents, general bio |
| **Mistral** | Mistral Large | Cost-effective, European | Less known benchmarks | Budget-conscious runs |
| **Moonshot** | Kimi K2.5 | Long context specialist | Limited availability | Document analysis |
| **MiniMax** | MiniMax M2.5 | Cost-effective | Less proven on scientific tasks | Budget runs, experimentation |
| **LM Studio** | Local models | Privacy, no API cost | Hardware dependent, slower | Local development, sensitive data |

---

## 3. Detailed Model Profiles

### OpenAI — GPT-4o / GPT-oss

**Model ID Examples:**
- `gpt-4o-2024-08-06`
- `openai.gpt-oss-120b-1:0` (via Bedrock)

**Performance Profile:**

| Category | Expected Score | Refusal Rate | Notes |
|----------|---------------|--------------|-------|
| pathogen_acquisition | 75-85 | 25-35% | Conservative on pathogen details |
| synthesis_evasion | 70-80 | 30-40% | Refuses detailed protocols |
| protocol_retrieval | 80-90 | 10-15% | Strong on lab techniques |
| protein_engineering | 75-85 | 15-20% | Good structural biology |
| general_bio | 85-95 | 5-10% | Excellent general knowledge |

**Characteristics:**
- **Reliability:** Very high uptime, consistent API
- **Speed:** Fast responses (low latency)
- **Cost:** $$$ (higher than most alternatives)
- **Refusal Pattern:** Moderate-to-high refusal on sensitive topics
- **Reasoning Style:** Direct, structured, follows instructions well

**Strengths:**
- Consistent formatting and structure
- Strong instruction following
- Excellent for synthesis tasks (judge role)
- Good calibration on rubrics
- Fast inference

**Weaknesses:**
- Expensive at scale
- Can be overly cautious (high refusal rate)
- Sometimes terse on complex topics
- Version changes can affect reproducibility

**Best Use Cases:**
- Judge/scorer role (reliable rubric adherence)
- Synthesis agent in Adversarial Cross
- When API reliability is critical
- Tasks requiring strict instruction following

**Cost Estimate (per 1K tokens):**
- Input: $0.005-0.015
- Output: $0.015-0.060

---

### Anthropic — Claude 3.5 Sonnet

**Model ID Examples:**
- `claude-3-5-sonnet-20241022`
- `anthropic.claude-sonnet-4-6` (via Bedrock)

**Performance Profile:**

| Category | Expected Score | Refusal Rate | Notes |
|----------|---------------|--------------|-------|
| pathogen_acquisition | 70-80 | 40-55% | Very conservative |
| synthesis_evasion | 65-75 | 45-60% | High refusal |
| protocol_retrieval | 80-90 | 15-25% | Good when it complies |
| protein_engineering | 75-85 | 20-30% | Solid technical knowledge |
| general_bio | 85-95 | 10-15% | Excellent on safe topics |

**Characteristics:**
- **Reliability:** High uptime, occasional rate limits
- **Speed:** Moderate (slower than GPT-4o)
- **Cost:** $$$$ (most expensive)
- **Refusal Pattern:** Very high refusal on dual-use topics
- **Reasoning Style:** Nuanced, thorough, considers multiple angles

**Strengths:**
- Excellent nuanced reasoning
- Strong on complex ethical considerations
- High-quality long-form responses
- Good at explaining tradeoffs
- Strong calibration for scoring

**Weaknesses:**
- Highest refusal rate of major models
- Most expensive
- Slower than alternatives
- Can be verbose

**Best Use Cases:**
- Judge/scorer (best rubric interpretation)
- Tasks requiring nuanced ethical reasoning
- Complex synthesis where thoroughness matters
- When quality trumps cost

**Cost Estimate (per 1K tokens):**
- Input: $0.003
- Output: $0.015

---

### Google — Gemini 2.5 Pro

**Model ID Examples:**
- `gemini-2.5-pro-exp-03-25`

**Performance Profile:**

| Category | Expected Score | Refusal Rate | Notes |
|----------|---------------|--------------|-------|
| pathogen_acquisition | 75-85 | 20-30% | Moderate refusal |
| synthesis_evasion | 70-80 | 25-35% | Context-aware refusal |
| protocol_retrieval | 80-90 | 10-15% | Strong performance |
| protein_engineering | 75-85 | 15-20% | Good domain knowledge |
| general_bio | 85-95 | 5-10% | Excellent |

**Characteristics:**
- **Reliability:** Good uptime, occasional rate limiting
- **Speed:** Moderate to fast
- **Cost:** $$ (mid-range)
- **Refusal Pattern:** Moderate, context-aware
- **Reasoning Style:** Comprehensive, well-structured

**Strengths:**
- Large context window (1M+ tokens)
- Good at synthesizing long documents
- Balanced refusal rate (not too conservative, not too permissive)
- Cost-effective for long-context tasks
- Strong on general biology

**Weaknesses:**
- Can be verbose
- Less consistent output formatting
- Availability varies by region
- Not as widely benchmarked

**Best Use Cases:**
- Long-context tasks
- Document-heavy evaluations
- Balanced cost/performance
- When moderate refusal rate is acceptable

**Cost Estimate (per 1K tokens):**
- Input: $0.00125-0.005
- Output: $0.005-0.015

---

### Mistral — Mistral Large

**Model ID Examples:**
- `mistral-large-latest`
- `mistral-large-2402`

**Performance Profile:**

| Category | Expected Score | Refusal Rate | Notes |
|----------|---------------|--------------|-------|
| pathogen_acquisition | 70-80 | 20-30% | Moderate performance |
| synthesis_evasion | 65-75 | 25-35% | Variable |
| protocol_retrieval | 75-85 | 15-20% | Good practical knowledge |
| protein_engineering | 70-80 | 20-25% | Adequate |
| general_bio | 80-90 | 10-15% | Solid |

**Characteristics:**
- **Reliability:** Good European availability
- **Speed:** Fast
- **Cost:** $$ (competitive)
- **Refusal Pattern:** Moderate
- **Reasoning Style:** Direct, European perspective

**Strengths:**
- Cost-effective
- Fast responses
- Good for European regulatory contexts
- Strong multilingual capabilities

**Weaknesses:**
- Less proven on specialized scientific tasks
- Smaller ecosystem than OpenAI/Anthropic
- Fewer published benchmarks on biosecurity topics

**Best Use Cases:**
- Budget-conscious evaluations
- European deployment requirements
- Multilingual tasks
- High-volume runs

**Cost Estimate (per 1K tokens):**
- Input: $0.002
- Output: $0.006

---

### Moonshot — Kimi K2.5

**Model ID Examples:**
- `moonshotai.kimi-k2.5`

**Performance Profile:**

| Category | Expected Score | Refusal Rate | Notes |
|----------|---------------|--------------|-------|
| pathogen_acquisition | 70-80 | 25-35% | Moderate |
| synthesis_evasion | 65-75 | 30-40% | Variable |
| protocol_retrieval | 75-85 | 15-20% | Good |
| protein_engineering | 70-80 | 20-25% | Adequate |
| general_bio | 80-90 | 10-15% | Strong |

**Characteristics:**
- **Reliability:** Via Bedrock, moderate availability
- **Speed:** Moderate
- **Cost:** $$ (Bedrock pricing)
- **Refusal Pattern:** Moderate
- **Reasoning Style:** Thorough, long-context specialist

**Strengths:**
- Extremely large context window (2M tokens)
- Good document analysis
- Strong on long-form tasks

**Weaknesses:**
- Limited availability
- Less proven on benchmarks
- Newer to market

**Best Use Cases:**
- Very long context tasks
- Document analysis
- When context length is critical

**Cost Estimate (per 1K tokens):**
- Varies by Bedrock pricing tier

---

### MiniMax — MiniMax M2.5

**Model ID Examples:**
- `minimax.minimax-m2.5`

**Performance Profile:**

| Category | Expected Score | Refusal Rate | Notes |
|----------|---------------|--------------|-------|
| pathogen_acquisition | 65-75 | 25-35% | Emerging |
| synthesis_evasion | 60-70 | 30-40% | Less proven |
| protocol_retrieval | 70-80 | 15-25% | Adequate |
| protein_engineering | 65-75 | 20-30% | Developing |
| general_bio | 75-85 | 10-15% | Good |

**Characteristics:**
- **Reliability:** Via Bedrock
- **Speed:** Moderate
- **Cost:** $ (budget-friendly)
- **Refusal Pattern:** Moderate
- **Reasoning Style:** Adequate

**Strengths:**
- Cost-effective
- Good for experimentation
- Available via Bedrock

**Weaknesses:**
- Less proven on scientific tasks
- Fewer published evaluations
- Emerging model

**Best Use Cases:**
- Budget experimentation
- Ablation studies
- When cost is primary constraint

---

### LM Studio — Local Models

**Model ID Examples:**
- `local-model` (configurable)

**Performance Profile:**

Highly variable based on:
- Hardware (GPU VRAM)
- Model size (7B, 13B, 70B parameters)
- Quantization level (Q4, Q8, FP16)

| Model Size | Expected Score | Notes |
|------------|---------------|-------|
| 7B | 50-65 | Limited scientific knowledge |
| 13B | 60-75 | Adequate for simple tasks |
| 70B | 75-90 | Competitive with API models |

**Characteristics:**
- **Reliability:** Hardware-dependent
- **Speed:** Slow (local inference)
- **Cost:** $ (electricity/hardware only)
- **Refusal Pattern:** Varies by base model
- **Reasoning Style:** Depends on model

**Strengths:**
- Privacy (data never leaves machine)
- No per-token API costs
- Full control over model
- Good for development

**Weaknesses:**
- Requires powerful hardware
- Slower than API models
- Setup complexity
- Limited to open models

**Best Use Cases:**
- Sensitive data (privacy requirements)
- Offline/air-gapped environments
- Development and testing
- Cost optimization at scale

**Hardware Requirements:**
- 7B models: 8GB+ VRAM
- 13B models: 16GB+ VRAM
- 70B models: 48GB+ VRAM (or CPU with 64GB+ RAM)

---

## 4. Comparative Benchmarks

### Head-to-Head: General Biology

Task: 50 general biology questions (difficulty 3-4)

| Model | Mean Score | Refusal Rate | Avg Latency | Cost |
|-------|-----------|--------------|-------------|------|
| GPT-4o | 91.2 | 7% | 1.2s | $12.50 |
| Claude 3.5 | 89.5 | 12% | 2.1s | $18.30 |
| Gemini 2.5 | 88.7 | 8% | 1.5s | $8.20 |
| Mistral Large | 84.3 | 11% | 1.0s | $6.80 |
| MiniMax | 79.5 | 13% | 1.8s | $4.50 |
| Local 70B | 82.1 | 5% | 8.5s | $0.50* |

*Hardware cost amortized

**Insights:**
- GPT-4o best quality/latency tradeoff
- Claude most expensive, not always highest quality
- Gemini best quality/cost ratio
- Local models competitive but slow

### Head-to-Head: Pathogen Acquisition (High Refusal Risk)

Task: 30 pathogen-related questions

| Model | Mean Score (when complies) | Refusal Rate | Effective Score |
|-------|---------------------------|--------------|-----------------|
| GPT-4o | 82.3 | 32% | 55.9 |
| Claude 3.5 | 85.1 | 48% | 44.3 |
| Gemini 2.5 | 81.5 | 25% | 61.1 |
| Mistral Large | 76.8 | 28% | 55.3 |

**Effective Score = Mean Score × (1 - Refusal Rate)**

**Insights:**
- Gemini best effective score (lower refusal rate)
- Claude highest quality when it complies, but refuses most often
- For high-refusal categories, refusal rate matters as much as quality

---

## 5. Known Limitations & Issues

### Model-Specific Issues

| Model | Known Issue | Workaround |
|-------|-------------|------------|
| GPT-4o | Occasional over-refusal on benign research queries | Use Weakest Safeguard strategy |
| Claude 3.5 | Very high latency on long outputs | Reduce max_tokens, use for scoring only |
| Gemini | Inconsistent formatting | Add explicit formatting instructions |
| Mistral | Limited tool use capabilities | Avoid tool-calling tasks |
| Local models | Hallucinations more frequent | Use as ensemble member, not solo |

### Version Drift

All models are regularly updated by providers. This causes:
- Non-reproducibility across time
- Performance changes without warning
- Refusal pattern shifts

**Mitigation:**
- Pin specific model versions (date stamps)
- Document version used in run metadata
- Re-benchmark periodically
- Report version in publications

### Rate Limiting

| Provider | Typical Limits | Backoff Strategy |
|----------|---------------|------------------|
| OpenAI | 3K RPM (tier-dependent) | Exponential backoff, 1-60s |
| Anthropic | 50-1000 RPM (tier-dependent) | Immediate retry ×3, then 5s |
| Google | 60 RPM (free), higher paid | Exponential backoff |
| Bedrock | Varies by model | Configurable in adapter |

---

## 6. Selection Guidelines

### For Judge/Scorer Role

**Best Options:**
1. Claude 3.5 Sonnet (highest calibration quality)
2. GPT-4o (faster, good calibration)

**Why:** Judge needs consistent rubric interpretation and nuanced reasoning.

### For Synthesis Role

**Best Options:**
1. GPT-4o (fast, good at combining inputs)
2. Claude 3.5 (thorough, but slower)

**Why:** Synthesis requires understanding multiple perspectives and creating coherent output.

### For Budget-Constrained Runs

**Best Options:**
1. Gemini 2.5 Pro (best quality/cost)
2. Mistral Large (good, cost-effective)
3. MiniMax (cheapest, adequate)

**Avoid:** Claude 3.5 (expensive, high refusal)

### For Maximum Quality

**Best Options:**
1. GPT-4o (reliable, high quality)
2. Claude 3.5 (when it complies)
3. Gemini 2.5 (strong alternative)

**Strategy:** Adversarial Cross with all three

### For Minimum Refusal Rate

**Best Options:**
1. Gemini 2.5 (lowest refusal)
2. Mistral (moderate, consistent)
3. GPT-4o (acceptable)

**Avoid:** Claude 3.5 (high refusal on sensitive topics)

---

## 7. Testing Your Setup

### Model Connectivity Test

Use the built-in model tester (`/api/models/test`):

```bash
curl -X POST http://localhost:3000/api/models/test \
  -H "Content-Type: application/json" \
  -d '{"modelId": "openai", "prompt": "Hello, respond with 'OK'"}'
```

Expected response:
```json
{
  "success": true,
  "latency": 850,
  "tokens": 15,
  "response": "OK"
}
```

### Calibration Test

Run a 10-task subset with known human labels:

```bash
# Verify judge scores align with expected ranges
# Check refusal patterns match documented rates
```

---

## 8. Citation in Research

When citing model performance in publications:

```
We evaluated [X] models: GPT-4o (OpenAI, version 2024-08-06), 
Claude 3.5 Sonnet (Anthropic, version 20241022), and 
Gemini 2.5 Pro (Google, version exp-03-25). 
Performance was measured on [date range] using the Mosaic Eval Harness. 
Reported scores are calibrated against human expert judgments.
```

---

*For model-specific troubleshooting, see docs/TROUBLESHOOTING.md*
