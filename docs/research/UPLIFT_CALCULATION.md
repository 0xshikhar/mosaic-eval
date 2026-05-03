# Uplift Calculation — Mathematical Formulation

## 1. Overview

Uplift measures the performance advantage (or disadvantage) of mosaic orchestration compared to individual models. It is the central metric for evaluating whether combining models produces superior results.

**Key Principle:** Uplift is always calculated relative to the best-performing individual model, not the average. This reflects the practical question: "Does mosaic beat the best available single model?"

---

## 2. Core Definitions

### Score Space

Let $S$ be the set of all possible quality scores:
$$S = [0, 100] \subset \mathbb{R}$$

Where scores are calibrated LLM-judge assessments (0 = worst, 100 = best).

### Run Structure

A run consists of $N$ steps, where each step $i$ has:
- Task $t_i$ with category $c_i$ and difficulty $d_i$
- Set of model responses $R_i = \{r_{i,m} : m \in M\}$
- Quality scores $Q_i = \{q_{i,m} : m \in M\}$
- Strategy-selected response(s) $r_i^*$

### Model Baseline Scores

For each model $m \in M$, the baseline score is:

$$\text{Baseline}(m) = \frac{1}{|I_m|} \sum_{i \in I_m} q_{i,m}$$

Where:
- $I_m = \{i : \text{model } m \text{ responded to step } i\}$
- $|I_m|$ is the number of steps model $m$ participated in

**Note:** For SOLO strategy, $|I_m| = N$ (single model does all steps).

### Best Individual Baseline

$$\text{BestBaseline} = \max_{m \in M} \text{Baseline}(m)$$

This represents the optimal single-model performance achievable with perfect foresight.

---

## 3. Mosaic Score Formulas

### Strategy-Specific Calculations

#### ROUND_ROBIN

Models rotate through steps sequentially.

$$\text{MosaicScore}_{\text{RR}} = \frac{1}{N} \sum_{i=1}^{N} q_{i, m(i)}$$

Where $m(i)$ is the model assigned to step $i$ by rotation.

**Intuition:** Average quality of the distributed workflow.

---

#### ADVERSARIAL_CROSS

All models respond to every step; synthesis selects best.

$$\text{MosaicScore}_{\text{AC}} = \frac{1}{N} \sum_{i=1}^{N} \max_{m \in M} q_{i,m}$$

**Intuition:** Best possible quality achievable with oracle model selection.

**Synthesis Penalty (Optional):**
If synthesis agent introduces quality degradation:

$$\text{MosaicScore}_{\text{AC}} = \frac{1}{N} \sum_{i=1}^{N} \max_{m \in M} q_{i,m} \times (1 - \delta_{\text{synth}})$$

Where $\delta_{\text{synth}}$ is the estimated synthesis quality loss (typically 0.05-0.10).

---

#### WEAKEST_SAFEGUARD

Routes each step to model with lowest refusal rate for task category.

$$\text{MosaicScore}_{\text{WS}} = \frac{1}{N} \sum_{i=1}^{N} q_{i, m^*(c_i)}$$

Where:
$$m^*(c) = \arg\max_{m \in M} (1 - \text{RefusalRate}(m, c)) \times \text{Baseline}(m, c)$$

**Intuition:** Optimizes for response likelihood weighted by expected quality.

---

#### PARALLEL_BLAST

All models respond; best selected without synthesis.

$$\text{MosaicScore}_{\text{PB}} = \frac{1}{N} \sum_{i=1}^{N} \max_{m \in M} q_{i,m}$$

**Note:** Mathematically identical to Adversarial Cross without synthesis penalty.

---

## 4. Uplift Formulas

### Absolute Uplift (Delta)

$$\Delta = \text{MosaicScore} - \text{BestBaseline}$$

**Interpretation:**
- $\Delta > 0$: Mosaic outperforms best individual model
- $\Delta = 0$: Mosaic matches best individual model
- $\Delta < 0$: Mosaic underperforms best individual model

### Relative Uplift (Percentage)

$$\text{Uplift\%} = \frac{\Delta}{\text{BestBaseline}} \times 100$$

**Interpretation:** Percentage improvement over best baseline.

**Example:**
- BestBaseline = 72.0
- MosaicScore = 81.5
- $\Delta = 9.5$
- Uplift% = 13.2%

---

## 5. Normalized Uplift Index

To compare uplift across runs with different baseline levels:

$$\text{NU} = \frac{\text{MosaicScore} - \text{BestBaseline}}{100 - \text{BestBaseline}}$$

**Properties:**
- Range: $[-1, 1]$ (theoretically, typically $[0, 1]$)
- NU = 0: Mosaic matches baseline
- NU = 1: Mosaic achieves perfect score (100)
- NU < 0: Mosaic worse than baseline

**Use Case:**
Comparing uplift when baseline quality varies significantly between runs.

---

## 6. Category-Specific Uplift

### Per-Category Calculation

For each task category $c$:

$$\text{Uplift}_c = \frac{1}{N_c} \sum_{i: c_i = c} q_i^* - \max_{m} \left( \frac{1}{|I_{m,c}|} \sum_{i \in I_{m,c}} q_{i,m} \right)$$

Where:
- $N_c$ = number of steps in category $c$
- $q_i^*$ = mosaic-selected score for step $i$
- $I_{m,c}$ = steps in category $c$ where model $m$ participated

### Difficulty-Stratified Uplift

For difficulty level $d$:

$$\text{Uplift}_d = \frac{1}{N_d} \sum_{i: d_i = d} q_i^* - \max_{m} \text{Baseline}_d(m)$$

**Research Value:** Identifies if mosaic benefits are concentrated in specific difficulty ranges.

---

## 7. Statistical Considerations

### Confidence Intervals

95% CI for uplift using bootstrap resampling:

```
For b = 1 to B (B = 1000):
    Sample N steps with replacement
    Compute MosaicScore_b and BestBaseline_b
    Compute Delta_b

Sort Delta_b values
CI_lower = percentile(Delta_b, 2.5)
CI_upper = percentile(Delta_b, 97.5)
```

### Significance Testing

**Paired t-test:**

$$t = \frac{\bar{\Delta}}{s_\Delta / \sqrt{N}}$$

Where:
- $\bar{\Delta}$ = mean uplift across steps
- $s_\Delta$ = standard deviation of per-step differences
- $N$ = number of steps

**Null hypothesis:** $H_0: \mu_\Delta = 0$ (no uplift)

**Alternative:** $H_1: \mu_\Delta > 0$ (positive uplift)

### Effect Size

Cohen's d for practical significance:

$$d = \frac{\bar{\Delta}}{s_{\text{pooled}}}$$

Where:
$$s_{\text{pooled}} = \sqrt{\frac{s_{\text{mosaic}}^2 + s_{\text{baseline}}^2}{2}}$$

**Interpretation:**
- $d < 0.2$: Negligible effect
- $0.2 \leq d < 0.5$: Small effect
- $0.5 \leq d < 0.8$: Medium effect
- $d \geq 0.8$: Large effect

---

## 8. Cost-Adjusted Uplift

### Cost-Effectiveness Metric

When comparing strategies with different costs:

$$\text{CEU} = \frac{\text{Uplift}}{\text{Cost}} \quad \text{[quality points per USD]}$$

Where cost includes:
- Inference costs for all model calls
- Judge scoring costs
- Synthesis costs (if applicable)

### Efficiency Frontier

Plot strategies on (Cost, Quality) space:

| Strategy | Cost | Quality | CEU |
|----------|------|---------|-----|
| Solo | $1.00 | 72.0 | N/A |
| Round Robin | $3.00 | 74.5 | 0.83 |
| Adversarial Cross | $7.00 | 81.5 | 1.36 |
| Weakest Safeguard | $1.20 | 75.0 | 2.50 |

Strategies on the Pareto frontier dominate others.

---

## 9. Multi-Model Contribution Analysis

### Marginal Contribution

What does each model add to the mosaic?

$$\text{Marginal}_m = \text{Uplift}(M) - \text{Uplift}(M \setminus \{m\})$$

**Interpretation:**
- Positive: Model contributes unique value
- Zero: Model redundant (others cover same capability)
- Negative: Model introduces noise/errors

### Synergy Detection

Test for superadditive effects:

$$\text{Synergy} = \text{Uplift}(M) - \sum_{m \in M} \text{Uplift}(\{m\})$$

**Interpretation:**
- Synergy > 0: Models complement each other (superadditive)
- Synergy ≈ 0: Additive effects only
- Synergy < 0: Interference between models

---

## 10. Uplift Decomposition

### Quality vs. Refusal Components

Uplift can come from two sources:

$$\text{Uplift} = \text{QualityGain} + \text{AvailabilityGain}$$

**Quality Gain:** Mosaic selects higher-quality responses when all models respond.

$$\text{QualityGain} = \frac{1}{N_{\text{responded}}} \sum_{i \in \text{responded}} (q_i^* - q_{i, \text{best}})$$

**Availability Gain:** Mosaic reduces effective refusal rate.

$$\text{AvailabilityGain} = \frac{N_{\text{refused baseline}} - N_{\text{refused mosaic}}}{N} \times \text{MeanScoreWhenRespond}$$

---

## 11. Edge Cases & Special Handling

### All Models Refuse

If all models refuse a step:
- MosaicScore for step = 0 (or N/A)
- No uplift contribution from that step
- Report "Complete Refusal" in analysis

### Perfect Baseline

If BestBaseline = 100:
- Uplift% = 0 (cannot improve on perfect)
- Use absolute uplift (likely 0)
- Consider this a "saturated" condition

### Negative Baseline

If all models perform poorly (e.g., BestBaseline < 30):
- Uplift% can be misleading (small absolute = large percentage)
- Report both absolute and relative metrics
- Consider whether task is too difficult for current models

---

## 12. Implementation Reference

### TypeScript Implementation

```typescript
interface UpliftMetrics {
  // Core metrics
  mosaicScore: number
  bestBaseline: number
  absoluteUplift: number
  relativeUplift: number
  normalizedUplift: number
  
  // Statistical
  confidenceInterval: [number, number]
  pValue: number
  cohensD: number
  
  // Breakdown
  perCategoryUplift: Record<string, number>
  perDifficultyUplift: Record<number, number>
  perModelContribution: Record<string, number>
  
  // Cost
  totalCost: number
  costPerUpliftPoint: number
}

function calculateUplift(
  steps: RunStep[],
  strategy: Strategy,
  models: string[],
  costs: Record<string, number>
): UpliftMetrics {
  // Per-model baselines
  const baselines: Record<string, number> = {}
  for (const model of models) {
    const modelSteps = steps.filter(s => s.modelResponses.some(r => r.modelId === model))
    const scores = modelSteps.map(s => {
      const response = s.modelResponses.find(r => r.modelId === model)!
      return response.score?.score ?? 0
    })
    baselines[model] = mean(scores)
  }
  
  const bestBaseline = Math.max(...Object.values(baselines))
  
  // Mosaic score depends on strategy
  let mosaicScore: number
  switch (strategy) {
    case 'ROUND_ROBIN':
      mosaicScore = mean(steps.map(s => s.score?.score ?? 0))
      break
    case 'ADVERSARIAL_CROSS':
      mosaicScore = mean(steps.map(s => 
        Math.max(...s.modelResponses.map(r => r.score?.score ?? 0))
      ))
      break
    // ... other strategies
  }
  
  const absoluteUplift = mosaicScore - bestBaseline
  const relativeUplift = (absoluteUplift / bestBaseline) * 100
  const normalizedUplift = absoluteUplift / (100 - bestBaseline)
  
  return {
    mosaicScore,
    bestBaseline,
    absoluteUplift,
    relativeUplift,
    normalizedUplift,
    // ... other calculations
  }
}
```

---

## 13. Visualization Guidelines

### Standard Uplift Plots

1. **Uplift by Category** (grouped bar chart)
   - X-axis: Task category
   - Y-axis: Uplift percentage
   - Bars: Different strategies

2. **Uplift by Difficulty** (line chart)
   - X-axis: Difficulty level (1-5)
   - Y-axis: Uplift percentage
   - Lines: Different strategies

3. **Uplift vs. Cost** (scatter plot)
   - X-axis: Cost (USD)
   - Y-axis: Mosaic score
   - Points: Different strategies
   - Reference line: Best baseline

4. **Contribution Heatmap** (heatmap)
   - X-axis: Models
   - Y-axis: Categories
   - Color: Marginal contribution

---

*For questions about uplift calculation or to request custom metrics, contact the research team.*
