# Routing Strategies — Comprehensive Comparison

## 1. Executive Summary

The Mosaic Eval Harness implements six routing strategies that control how tasks are distributed across multiple LLMs. Each strategy represents a different hypothesis about how multi-model orchestration should work.

**Key Insight:** No single strategy is optimal for all scenarios. Strategy selection should be based on task characteristics, cost constraints, and risk tolerance.

---

## 2. Strategy Overview Matrix

| Strategy | Approach | Use Case | Cost | Risk | Uplift Potential |
|----------|----------|----------|------|------|------------------|
| **SOLO** | Single model baseline | Control condition, calibration | $ | Low | 0% (by definition) |
| **ROUND_ROBIN** | Rotate models per step | Balanced cost, even distribution | $$$ | Low | Low (5-10%) |
| **RANDOM** | Random model assignment | Statistical baseline | $$ | Low | Minimal (0-5%) |
| **ADVERSARIAL_CROSS** | All models + synthesis | Maximum quality, adversarial robustness | $$$$$ | Medium | High (15-25%) |
| **PARALLEL_BLAST** | All models, best wins | Analysis, debugging, no synthesis | $$$$$ | Low | High (15-25%) |
| **WEAKEST_SAFEGUARD** | Route to least-refusing model | High availability, low refusal | $$ | High | Medium (10-15%) |

---

## 3. Detailed Strategy Analysis

### SOLO (Single Model)

**Concept:** One model handles all steps. The control condition against which all mosaic strategies are compared.

**Algorithm:**
```
for each step:
    assign to model M
    execute
    record response
```

**When to Use:**
- Baseline measurement (essential for uplift calculation)
- Cost-constrained evaluations
- Single-model capability assessment
- Ablation studies (remove one model at a time)

**Pros:**
- Cheapest option (1x inference cost)
- Simple to understand and debug
- Direct model capability measurement
- No orchestration complexity

**Cons:**
- No uplift possible (by definition)
- No redundancy if model refuses
- No synthesis opportunities
- Vulnerable to model-specific weaknesses

**Cost Profile:**
```
Cost = N_steps × Cost(M)
```

**Expected Uplift:** 0% (baseline)

---

### ROUND_ROBIN

**Concept:** Distribute steps evenly across all available models in sequential rotation.

**Algorithm:**
```
model_index = 0
for each step i:
    assign to models[model_index]
    execute
    model_index = (model_index + 1) % len(models)
```

**When to Use:**
- First mosaic experiment (simplest multi-model approach)
- Even load distribution needed
- No prior knowledge of task-model fit
- Balanced cost distribution across providers

**Pros:**
- Simple and predictable
- Fair distribution of compute across models
- Low complexity (no runtime decision making)
- Natural baseline for multi-model approaches

**Cons:**
- Ignores task difficulty and model strengths
- No optimization for refusal rates
- No synthesis benefit
- May assign hard tasks to weak models

**Cost Profile:**
```
Cost = N_steps × mean(Cost(models))
```

**Expected Uplift:** 5-10%
- Benefits from model diversification
- Risk reduction (one model's bad day doesn't kill entire run)

**Research Findings:**
- Best for: Homogeneous model sets (similar capability)
- Worst for: Highly heterogeneous models (wastes strong models on easy tasks)
- Optimal model count: 3-5 (diminishing returns beyond)

---

### RANDOM

**Concept:** Assign each step to a randomly selected model from the available set.

**Algorithm:**
```
for each step:
    model = random_choice(models)
    assign to model
    execute
```

**When to Use:**
- Statistical baseline for strategy comparison
- Testing robustness to assignment variation
- Monte Carlo simulation of strategy performance
- Control condition for deterministic strategies

**Pros:**
- Unbiased model selection
- Simple statistical properties
- Good for variance estimation
- No strategic complexity

**Cons:**
- No optimization
- Higher variance in outcomes
- May cluster assignments by chance
- Not a practical production strategy

**Cost Profile:**
```
Cost = N_steps × mean(Cost(models))
```

**Expected Uplift:** 0-5% (similar to average of individual models)

**Statistical Properties:**
- Expected quality = mean of individual model baselines
- Variance depends on model heterogeneity
- Converges to Round Robin over large N (law of large numbers)

---

### ADVERSARIAL_CROSS

**Concept:** Send every step to ALL models simultaneously, then synthesize the best response. The "kitchen sink" approach that maximizes quality at maximum cost.

**Algorithm:**
```
for each step:
    for each model in models:
        dispatch to model (parallel)
    
    wait for all responses
    
    score all responses
    
    synthesizer_model = select_best_or_synthesize(responses)
    
    record synthesized response
```

**When to Use:**
- Maximum quality is required
- Cost is not a constraint
- Adversarial evaluation (find best possible response)
- Research on synthesis effectiveness
- High-stakes tasks where failure is costly

**Pros:**
- Maximum quality potential (selects from all responses)
- Robust to individual model failures
- Best-of-N selection
- Synthesis can combine strengths of multiple responses

**Cons:**
- Most expensive strategy (N_models × cost per step)
- Synthesis adds latency
- Synthesis quality depends on synthesizer model
- May overfit to judge preferences

**Cost Profile:**
```
Cost = N_steps × (sum(Cost(models)) + Cost(synthesizer))
```

**Expected Uplift:** 15-25%
- Highest potential uplift
- Diminishing returns after 4-5 models

**Synthesis Variants:**

| Variant | Description | Best For |
|---------|-------------|----------|
| **Best-of-N** | Simply select highest-scored response | Speed, clear quality differences |
| **Merge** | Combine non-conflicting information from top 2-3 responses | Complementary knowledge |
| **Full Synthesis** | Generate new response synthesizing all inputs | Complex tasks requiring integration |
| **Refusal-Aware** | If any model refuses, use synthesis; else best-of-N | High-stakes scenarios |

**Research Findings:**
- Uplift increases with model diversity (different providers > same provider)
- Synthesis penalty: ~5-10% quality loss vs. oracle selection
- Optimal model count: 3-5 (returns diminish beyond)
- Critical: Synthesizer must be strong (Claude 3.5 Sonnet or GPT-4o)

---

### PARALLEL_BLAST

**Concept:** Send every step to ALL models, but don't synthesize—just select the best raw response.

**Algorithm:**
```
for each step:
    for each model in models:
        dispatch to model (parallel)
    
    wait for all responses
    
    select response with highest score
    
    record selected response (no modification)
```

**When to Use:**
- Pure capability measurement (no synthesis confounds)
- Debugging which models perform best on which tasks
- Cost is secondary to quality
- Analysis of model disagreement patterns
- When synthesis might introduce hallucinations

**Pros:**
- Maximum quality without synthesis artifacts
- Pure model capability measurement
- No synthesis latency
- Easier to debug (direct model outputs)
- Good for understanding model differences

**Cons:**
- Expensive (same as Adversarial Cross)
- No synthesis benefits (can't combine partial answers)
- May select responses with different styles/voices
- No "best of both worlds" combinations

**Cost Profile:**
```
Cost = N_steps × sum(Cost(models))
```

**Expected Uplift:** 15-25% (similar to Adversarial Cross, minus synthesis penalty)

**vs. Adversarial Cross:**
| Aspect | Parallel Blast | Adversarial Cross |
|--------|---------------|-------------------|
| Quality | Raw model outputs | Synthesized/combined |
| Latency | Lower (no synthesis call) | Higher |
| Cost | Same | Same + synthesis cost |
| Debugging | Easier | Harder |
| Best For | Analysis, purity | Production, maximum quality |

**Research Findings:**
- Gap between Parallel Blast and Adversarial Cross shows synthesis value
- If gap > 10%, synthesis is adding significant value
- If gap < 5%, may not be worth synthesis overhead

---

### WEAKEST_SAFEGUARD

**Concept:** Route each step to the model historically least likely to refuse for that task category.

**Algorithm:**
```
for each step:
    category = step.task.category
    
    # Get refusal rates for this category
    refusal_rates = {
        model: get_historical_refusal_rate(model, category)
        for model in models
    }
    
    # Select model with lowest refusal rate
    selected_model = argmin(refusal_rates)
    
    # Secondary: if tie, select by quality
    if tie:
        select by mean_quality_score(model, category)
    
    assign to selected_model
    execute
```

**When to Use:**
- Minimizing refusal rates is priority
- Exploring model "personalities" per domain
- Cost-constrained but need high availability
- Studying refusal patterns across models
- High-stakes where any refusal is costly

**Pros:**
- Minimizes effective refusal rate
- Learns from historical data
- Cost-effective (single model per step)
- Adaptive to model updates

**Cons:**
- Requires historical data (cold start problem)
- May sacrifice quality for availability
- Can create echo chambers (keep using same model)
- "Weakest safeguard" may have other weaknesses

**Cost Profile:**
```
Cost = N_steps × mean(Cost(models))
```

**Expected Uplift:** 10-15%
- Primary benefit: availability, not raw quality
- Quality uplift comes from avoiding refused steps

**Refusal Rate Calculation:**
```
RefusalRate(model, category) = 
    count(refused_steps) / count(total_steps_in_category)
```

**Windowing:**
- Use rolling 30-day window
- Minimum 10 samples before reliable estimate
- Apply Laplace smoothing for low-sample categories:
  ```
  smoothed_rate = (refusals + 1) / (total + 2)
  ```

**Research Findings:**
- Refusal rates vary dramatically by category (50%+ variance)
- Model rankings stable within category, unstable across categories
- Cold start: Use Round Robin for first N=20 steps, then switch
- Risk: If "weakest" model has low quality, may trade too much accuracy for availability

---

## 4. Strategy Selection Guide

### Decision Tree

```
What is your primary goal?
├── Maximum quality, cost no object
│   └── Adversarial Cross (with synthesis)
├── Best quality/efficiency tradeoff
│   └── How many models?
│       ├── 2-3 models → Round Robin
│       └── 4+ models → Weakest Safeguard
├── Maximum availability (minimize refusals)
│   └── Weakest Safeguard
├── Pure analysis/debugging
│   └── Parallel Blast
├── Baseline measurement
│   └── SOLO (per model)
└── Statistical baseline
    └── RANDOM
```

### By Task Characteristics

| Task Characteristic | Recommended Strategy |
|---------------------|---------------------|
| High difficulty, high stakes | Adversarial Cross |
| Mix of difficulties | Weakest Safeguard |
| Uniform difficulty | Round Robin |
| High refusal risk | Weakest Safeguard |
| Requires synthesis of multiple perspectives | Adversarial Cross |
| Simple factual queries | SOLO or Round Robin |

### By Cost Constraint

| Budget | Recommended Strategy | Expected Uplift |
|--------|---------------------|-----------------|
| Minimal ($) | SOLO + best model | 0% |
| Moderate ($$) | Round Robin (3 models) | 5-10% |
| Generous ($$$) | Weakest Safeguard (3-4 models) | 10-15% |
| Unlimited ($$$$$) | Adversarial Cross (5+ models) | 15-25% |

### By Risk Tolerance

| Risk Level | Concern | Strategy |
|------------|---------|----------|
| Conservative | Model failures, refusals | Adversarial Cross |
| Moderate | Balanced | Weakest Safeguard |
| Aggressive | Cost optimization | Round Robin |

---

## 5. Hybrid Strategies (Experimental)

### Difficulty-Adaptive

Select strategy based on task difficulty:
```
if difficulty <= 2:
    use Round Robin (simple tasks don't need synthesis)
elif difficulty >= 4:
    use Adversarial Cross (complex tasks benefit from synthesis)
else:
    use Weakest Safeguard (middle ground)
```

### Confidence-Based

Use cheap model first, escalate if confidence low:
```
response = cheap_model(step)
if confidence(response) < threshold:
    responses = [response] + expensive_models(step)
    response = synthesize(responses)
```

**Cost savings:** 30-50% vs. full Adversarial Cross
**Quality:** ~90% of full Adversarial Cross

### Category-Expert

Pre-assign models as "experts" for categories:
```
expert_models = {
    'protein_engineering': ['claude', 'gpt4'],
    'pathogen_acquisition': ['gemini', 'mistral'],
    ...
}

selected = expert_models[step.category]
```

---

## 6. Performance Benchmarks

### Measured Results (Example Dataset)

Based on 100-task evaluation across 5 categories:

| Strategy | Mean Score | Refusal Rate | Cost | Uplift |
|----------|-----------|--------------|------|--------|
| Best Solo | 72.3 | 28% | $100 | 0% |
| Round Robin | 76.5 | 12% | $300 | 5.8% |
| Weakest Safeguard | 79.2 | 4% | $280 | 9.5% |
| Parallel Blast | 85.1 | 2% | $700 | 17.7% |
| Adversarial Cross | 87.4 | 2% | $750 | 20.9% |
| Random | 74.8 | 15% | $300 | 3.5% |

**Key Insights:**
- Weakest Safeguard best cost/availability tradeoff
- Adversarial Cross 3.3% better than Parallel Blast (synthesis value)
- Round Robin beats Random (strategic assignment matters)
- Refusal rate reduction significant benefit of mosaic approaches

### Statistical Significance

Paired t-test vs. Best Solo baseline:

| Strategy | p-value | Cohen's d | Significant? |
|----------|---------|-----------|--------------|
| Round Robin | <0.001 | 0.45 | Yes (medium effect) |
| Weakest Safeguard | <0.001 | 0.72 | Yes (large effect) |
| Adversarial Cross | <0.001 | 1.15 | Yes (very large effect) |

---

## 7. Implementation Considerations

### Concurrency Limits

```
# Per-model concurrency (safety valve)
max_concurrent = {
    'openai': 5,
    'anthropic': 3,
    'google': 5,
    ...
}

# Strategy-specific limits
adversarial_cross_max_parallel = len(models)  # All at once
weakest_safeguard_max_parallel = 1  # Sequential
```

### Circuit Breakers

If model failure rate exceeds threshold, temporarily exclude from rotation:
```
if failure_rate(model) > 0.5:
    exclude_from_strategy(model, duration=300s)
```

### Warm-Up

For Weakest Safeguard, seed with Round Robin:
```
if historical_data_insufficient:
    use Round Robin for first 20 steps
    collect baseline refusal rates
    switch to Weakest Safeguard
```

---

## 8. Research Directions

### Open Questions

1. **Optimal model count:** Diminishing returns threshold?
2. **Heterogeneity vs. homogeneity:** Diverse providers or same family?
3. **Dynamic strategy:** Switch strategies mid-run based on performance?
4. **Multi-objective:** Optimize quality, cost, and refusal rate simultaneously?
5. **Transfer:** Do learned refusal patterns transfer across task sets?

### Recommended Ablations

For publication-quality research, test:
- Same strategy, varying model count (2, 3, 4, 5, 7 models)
- Same models, varying strategies (all 6 strategies)
- Strategy × Category interaction effects
- Cost-constrained optimization (fixed budget, maximize quality)

---

*For strategy recommendations for your specific use case, contact the research team.*
