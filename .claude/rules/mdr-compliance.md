# MDR SaMD Compliance Rules

These rules apply to ALL code changes in user-facing features. Airwaylab is positioned as educational/informational, NOT as a medical device.

## MUST Rules (violation = regulatory risk)

1. **NEVER suggest therapy changes.** The software describes data patterns. It does NOT recommend what to do about them.
   - BAD: "Discuss pressure adjustments with your clinician"
   - GOOD: "Your clinician can help interpret these findings in context"
   - BAD: "Consider adjusting Trigger sensitivity"
   - GOOD: "Machine-triggered breath percentage is elevated"

2. **NEVER use diagnostic language.** Do not imply the software diagnoses, detects, or classifies a medical condition.
   - BAD: "suggests persistent upper airway obstruction"
   - GOOD: "breath-shape scores are elevated"
   - BAD: "may indicate complex sleep apnea"
   - GOOD: "both obstructive and central events are elevated"

3. **NEVER make predictive claims.** Do not claim the software predicts therapy response or health outcomes.
   - BAD: "patterns like yours typically respond to..."
   - GOOD: "deeper analysis of cross-engine correlations in your data"

4. **NEVER assert clinical effectiveness.** Do not judge whether therapy is "working" or "effective."
   - BAD: "Your therapy looks effective"
   - GOOD: "Your metrics are in the typical range"

5. **AI system prompts MUST NOT instruct the model to suggest actions, adjustments, or investigations.** The AI describes what the data shows. Period.

## SHOULD Rules (best practice)

6. Every component showing clinical metrics SHOULD have a point-of-use disclaimer.
7. Email templates SHOULD include a medical disclaimer.
8. Traffic light labels SHOULD use directional language ("lower"/"typical"/"higher") rather than clinical judgment language in user-facing display.
9. Community benchmarks SHOULD note that comparisons are informational, not clinical reference ranges.

## PR Checklist

Before merging any PR that touches insights, AI prompts, thresholds, community features, email templates, or marketing copy:

- [ ] No therapeutic recommendations ("discuss adjustments", "consider changing", "may need adjustment")
- [ ] No diagnostic claims ("suggests obstruction", "indicates central apnea")
- [ ] No predictive claims ("typically respond to", "predicts")
- [ ] No clinical effectiveness judgments ("therapy looks effective")
- [ ] AI system prompts describe data only, never suggest actions
- [ ] Point-of-use disclaimers present on clinical feature components
- [ ] Email content has medical disclaimer

## Background

Under EU MDR Rule 11, software is classified as a medical device when it "provides information which is used to take decisions with diagnosis or therapeutic purposes." Disclaimers do NOT override functional classification.

Run `cortis:mdr-compliance-scanner` agent for a full audit when making significant changes to clinical features.
