# Metrics Comprehension & Contextual Framing

**Issue:** FB-3, FB-4
**Tier:** Full spec (clinical UX, design-heavy)
**Priority:** P2

## Problem

Users with excellent AHI control (e.g., AHI 61 -> <1) see red traffic lights on flow limitation metrics and panic, thinking treatment has failed. Direct quote: "Overall I have no clue what any of this means but it seems like my treatment hasn't been as effective as I thought."

The current traffic light system shows metric severity without framing it relative to overall treatment success. Users interpret red = bad = treatment failing, when the clinical reality is: AHI control is the primary success metric, and flow limitation is a secondary optimization layer.

## Root cause

Two gaps:
1. **No treatment success framing.** The dashboard shows metric severity but never says "your treatment is working well" when AHI is controlled.
2. **Metric explanations are too technical.** Users see "FL Score 62.6%" in red but don't understand what this means for their daily life.

## Solution

Add a contextual framing layer that:
1. Shows a treatment success summary before individual metrics
2. Explains what traffic light colors mean in context ("red here means room to optimize, not treatment failure")
3. Provides plain-language "what this means for you" text for key metrics

## Implementation Steps

### Step 1: Treatment Success Banner (Overview Tab)

**File:** `components/dashboard/overview-tab.tsx`

Add a summary banner at the top of the overview tab that frames the overall picture:

**When AHI/RERA is well-controlled (AHI < 5):**
> "Your therapy is controlling respiratory events effectively. The metrics below show areas where further optimization may improve sleep quality."

**When AHI is elevated (AHI >= 5):**
> "Your respiratory event index suggests room for therapy adjustment. Discuss these findings with your clinician."

**When no AHI data available:**
> "Upload your machine's SD card data to see how your therapy is performing."

Logic: Check `settings.ahi` from the selected night. If available, frame accordingly. If not, check if ResMed machine-reported AHI exists in settings.

### Step 2: Traffic Light Context Tooltip

**File:** `components/common/metric-card.tsx`

Add an optional context line below the traffic light indicator that explains what the color means for this specific metric category:

- **Green:** "Within target range"
- **Amber:** "May benefit from optimization"
- **Red (flow limitation metrics):** "Room to optimize -- this does not mean treatment is failing"
- **Red (event-based metrics like ODI, AHI):** "Elevated -- discuss with your clinician"

Implementation: Add a `contextHint` prop to `MetricCard`. The hint varies by metric category (flow vs event vs oximetry). The hint only shows for amber/red metrics.

### Step 3: Plain-Language Metric Summaries

**File:** `lib/metric-explanations.ts`

The existing `METRIC_EXPLANATIONS` object has technical descriptions. Add a `plainLanguage` field to each explanation that translates the metric into "what this means for you" language:

Example for FL Score:
- Technical: "Percentage of inspiratory flow limitation detected by the WAT engine"
- Plain language: "How much of your breathing shows restricted airflow. Higher values mean your airway narrows more during sleep, which can fragment sleep quality even when events like apneas are controlled."

### Step 4: "What does this mean?" Expandable Section

**File:** `components/dashboard/overview-tab.tsx`

Below the metric cards grid, add a collapsible "Understanding your results" section that:
- Explains the three-tier traffic light system
- Clarifies that flow limitation metrics (Glasgow, FL Score, NED) measure a different dimension than AHI
- Includes the standard medical disclaimer
- Links to the glossary for deeper reading

### Step 5: Update Insights Generator

**File:** `lib/insights.ts`

When AHI is well-controlled but FL metrics are red, generate a specific insight:
- Type: `info`
- Category: `therapy`
- Title: "Strong AHI control with residual flow limitation"
- Body: "Your therapy effectively controls respiratory events (AHI < 1). Red flow limitation metrics indicate room for further optimization, not treatment failure. These patterns are common and worth discussing with your clinician."

## Scope boundaries

- No changes to threshold values or engine logic
- No changes to the traffic light color assignments
- Text and framing only -- no new data processing
- Must include medical disclaimer language in any new explanatory text
- Mobile-responsive (the banner and expandable section must work on mobile)

## Manual QA checklist

- [ ] Overview tab shows treatment success banner
- [ ] Banner content changes based on AHI value (controlled vs elevated vs missing)
- [ ] Metric cards show context hints for amber/red metrics
- [ ] "Understanding your results" section expands/collapses
- [ ] Plain-language explanations display in metric tooltips
- [ ] Info insight generated for controlled-AHI + red-FL combination
- [ ] Medical disclaimer present in new explanatory text
- [ ] Mobile layout renders correctly
