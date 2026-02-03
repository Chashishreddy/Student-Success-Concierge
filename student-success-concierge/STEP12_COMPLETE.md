# Step 12 Implementation: Complete ✅

**Status**: 100% Complete
**Date**: 2026-01-29

## Overview

Step 12 implements ground truth labeling and judge validation metrics. This allows educators to create human-labeled ground truth data for traces, then validate the mock judge's performance against these labels using standard classification metrics.

## Completed Components

### 1. Database Schema ([lib/db/appDb.ts](lib/db/appDb.ts))

**Added human_labels table:**

```sql
CREATE TABLE IF NOT EXISTS human_labels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id INTEGER NOT NULL,
  cohort_id INTEGER,
  label_type TEXT NOT NULL CHECK(label_type IN ('handoff_required', 'policy_adherence', 'overall_pass')),
  label_value TEXT NOT NULL CHECK(label_value IN ('PASS', 'FAIL')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trace_id) REFERENCES traces(id),
  FOREIGN KEY (cohort_id) REFERENCES cohorts(id),
  UNIQUE(trace_id, label_type, cohort_id)
);
```

**Label Types:**
- `handoff_required` - Did the agent properly handle handoff requests?
- `policy_adherence` - Did the agent follow all policies (formatting, booking, etc.)?
- `overall_pass` - Overall quality assessment of the trace

**Added indexes:**
- `idx_human_labels_trace` - Labels by trace
- `idx_human_labels_cohort` - Labels by cohort
- `idx_human_labels_label_type` - Labels by type

**TypeScript Interface:**
```typescript
export interface HumanLabel {
  id: number;
  trace_id: number;
  cohort_id: number | null;
  label_type: 'handoff_required' | 'policy_adherence' | 'overall_pass';
  label_value: 'PASS' | 'FAIL';
  created_at: string;
}
```

### 2. Mock Judge Module ([lib/judge/mockJudge.ts](lib/judge/mockJudge.ts))

**Three judge functions:**

#### judgeHandoffRequired
- Checks if user requested handoff (keywords: human, person, supervisor, etc.)
- Verifies `create_ticket` tool was called if handoff was requested
- Returns PASS/FAIL with reasoning and confidence

```typescript
const handoffKeywords = [
  'human', 'person', 'supervisor', 'manager', 'staff',
  'real person', 'speak to someone', 'talk to someone',
  'escalate', 'representative', 'agent',
];
```

#### judgePolicyAdherence
- Checks for markdown in SMS messages
- Checks for double-booking violations
- Checks for excessive failed tool calls

```typescript
const markdownPatterns = [
  { pattern: /\*\*[^*]+\*\*/, name: 'bold' },
  { pattern: /\*[^*]+\*/, name: 'italic' },
  { pattern: /`[^`]+`/, name: 'code' },
  // ...
];
```

#### judgeOverallPass
- Combines handoff and policy judgments
- Checks for empty/incomplete conversations
- Returns aggregate assessment

**Exported Functions:**
```typescript
export function runJudge(labelType: LabelType, trace, messages, toolCalls): JudgeResult;
export function runAllJudges(trace, messages, toolCalls): JudgeResult[];
```

### 3. Labels API ([app/api/labels/route.ts](app/api/labels/route.ts))

**GET /api/labels** - Fetch human labels
- Filter by traceId, cohortId, labelType
- Returns all labels matching filters

**POST /api/labels** - Save human label
- Creates or updates label (upsert behavior)
- Validates labelType and labelValue
- Returns label ID and update status

```typescript
// Request body
{
  traceId: number;
  cohortId?: number;
  labelType: 'handoff_required' | 'policy_adherence' | 'overall_pass';
  labelValue: 'PASS' | 'FAIL';
}
```

### 4. Traces for Labeling API ([app/api/admin/traces-for-labeling/route.ts](app/api/admin/traces-for-labeling/route.ts))

**GET /api/admin/traces-for-labeling** - Fetch traces with details for labeling
- Returns traces with messages, tool calls, and existing labels
- Supports limit parameter (default 30)
- Returns labeling progress stats

```typescript
// Response
{
  traces: Array<{
    id: number;
    case_name: string;
    channel: string;
    messages: Message[];
    toolCalls: ToolCall[];
    labels: Record<string, string>;
  }>;
  total: number;
  labeled: number;
}
```

### 5. Judge Validation API ([app/api/judge/validate/route.ts](app/api/judge/validate/route.ts))

**POST /api/judge/validate** - Run judge validation
- Runs judge on all labeled traces
- Compares with human labels
- Calculates confusion matrix metrics

**Returns:**
```typescript
{
  totalLabels: number;
  totalMatches: number;
  overallConfusionMatrix: {
    truePositives: number;
    trueNegatives: number;
    falsePositives: number;
    falseNegatives: number;
  };
  overallMetrics: {
    truePositiveRate: number;  // Sensitivity / Recall
    trueNegativeRate: number;  // Specificity
    precision: number;
    accuracy: number;
  };
  metricsByLabelType: Record<string, { confusionMatrix, metrics, results }>;
  results: ValidationResult[];
}
```

### 6. Labeling UI ([app/admin/labels/page.tsx](app/admin/labels/page.tsx))

**Features:**
- Progress bar showing labeled vs total traces
- Trace navigation (Previous/Next buttons)
- Trace details panel:
  - Messages with role colors (user/assistant/system)
  - Tool calls with expandable input/output
- Labeling panel:
  - PASS/FAIL buttons for each label type
  - Current label indicator
  - Quick actions: Mark All PASS, Mark All FAIL
- Link to judge validation page

**Layout:**
- Left (2/3): Trace details (header, messages, tool calls)
- Right (1/3): Labeling controls

### 7. Judge Validation UI ([app/admin/judge-validation/page.tsx](app/admin/judge-validation/page.tsx))

**Features:**
- "Run Validation" button
- Overall summary cards (Total Labels, Matches, Mismatches, Accuracy)
- Confusion Matrix visualization:
  - Color-coded cells (TP, TN, FP, FN)
  - Clear labels (Human PASS/FAIL vs Judge PASS/FAIL)
- Metrics panel:
  - True Positive Rate (TPR/Sensitivity)
  - True Negative Rate (TNR/Specificity)
  - Precision
  - Accuracy
  - Color-coded values (green ≥80%, yellow ≥60%, red <60%)
- Metrics by Label Type:
  - Clickable cards for each label type
  - Shows TPR, TNR, Precision, Accuracy per type
- Detailed Results:
  - List of all validation results
  - Filter by label type
  - Shows Human vs Judge comparison
  - Judge reasoning and confidence
  - Link to trace detail page

## Test Results

**Ran test script on 10 traces (30 labels):**

```
Label breakdown:
   handoff_required - FAIL: 3
   handoff_required - PASS: 7
   overall_pass - FAIL: 4
   overall_pass - PASS: 6
   policy_adherence - FAIL: 3
   policy_adherence - PASS: 7

Confusion Matrix:
                  Judge PASS    Judge FAIL
   Human PASS:          18             2
   Human FAIL:           6             4

Metrics:
   True Positive Rate (TPR/Sensitivity): 90.0%
   True Negative Rate (TNR/Specificity): 40.0%
   Precision: 75.0%
   Accuracy: 73.3%
```

## Files Created/Modified

### New Files (7 total)
1. `lib/judge/mockJudge.ts` - Mock judge module (250 lines)
2. `app/api/labels/route.ts` - Labels API (120 lines)
3. `app/api/admin/traces-for-labeling/route.ts` - Traces for labeling API (95 lines)
4. `app/api/judge/validate/route.ts` - Judge validation API (175 lines)
5. `app/admin/labels/page.tsx` - Labeling UI (330 lines)
6. `app/admin/judge-validation/page.tsx` - Judge validation UI (400 lines)
7. `scripts/test_labels.ts` - Test script (175 lines)

### Modified Files (1 total)
1. `lib/db/appDb.ts` - Added human_labels table and interface

**Total**: 8 files, ~1,545 lines of code

## Validation Metrics Explained

### Confusion Matrix
```
                    Judge Predicts PASS    Judge Predicts FAIL
Human Labels PASS:     True Positive (TP)    False Negative (FN)
Human Labels FAIL:     False Positive (FP)   True Negative (TN)
```

### Metrics Formulas
- **True Positive Rate (TPR/Sensitivity/Recall)**: TP / (TP + FN)
  - "Of all actual positives, how many did the judge correctly identify?"
- **True Negative Rate (TNR/Specificity)**: TN / (TN + FP)
  - "Of all actual negatives, how many did the judge correctly identify?"
- **Precision**: TP / (TP + FP)
  - "Of all predicted positives, how many were actually positive?"
- **Accuracy**: (TP + TN) / (TP + TN + FP + FN)
  - "What proportion of all predictions were correct?"

## Usage Guide

### 1. Label Traces

Navigate to `http://localhost:3000/admin/labels`:

1. Review trace details (messages, tool calls)
2. For each label type, click PASS or FAIL
3. Use "Mark All PASS" or "Mark All FAIL" for quick labeling
4. Click "Next Trace" to move to the next trace
5. Repeat until sufficient traces are labeled (recommended: 30+)

### 2. Run Validation

Navigate to `http://localhost:3000/admin/judge-validation`:

1. Click "Run Validation" button
2. Review overall summary and accuracy
3. Examine confusion matrix for detailed breakdown
4. Check metrics by label type to identify weak areas
5. Click into mismatched results to understand judge errors

### 3. CLI Testing

```bash
# Run test script
npx tsx scripts/test_labels.ts
```

## Key Features

✅ **Ground Truth Labeling**
- Three label types per trace
- Binary PASS/FAIL values
- Upsert behavior for updates
- Progress tracking

✅ **Mock Judge**
- Deterministic evaluation logic
- Pattern-based judgments
- Confidence scores
- Detailed reasoning

✅ **Confusion Matrix**
- Standard 2x2 classification matrix
- Visual representation
- Color-coded cells

✅ **Validation Metrics**
- TPR (Sensitivity)
- TNR (Specificity)
- Precision
- Accuracy
- Color-coded thresholds

✅ **Metrics by Label Type**
- Separate metrics per evaluation category
- Identify weak areas in judge performance
- Click to filter results

✅ **Detailed Results**
- Individual trace comparisons
- Judge reasoning exposed
- Links to trace pages
- Filter by match/mismatch

## Verification Checklist

- [x] human_labels table created
- [x] TypeScript interface added
- [x] Indexes for performance
- [x] Mock judge with 3 judgment functions
- [x] Labels API (GET/POST)
- [x] Traces for labeling API
- [x] Judge validation API
- [x] Labeling UI with navigation
- [x] Judge validation UI with metrics
- [x] Confusion matrix visualization
- [x] TPR, TNR, Precision displayed
- [x] Metrics by label type
- [x] Click into failing traces
- [x] Test script validates system
- [x] 30 labels created successfully
- [x] Metrics calculated correctly

## Summary

Step 12 successfully implements:
- ✅ Ground truth labeling system with three label types
- ✅ Mock judge for deterministic evaluation
- ✅ Quick labeling UI for efficient trace annotation
- ✅ Judge validation with confusion matrix
- ✅ TPR, TNR, and Precision metrics
- ✅ Breakdown by label type
- ✅ Detailed results with judge reasoning
- ✅ Links to trace detail pages

**The ground truth labeling and judge validation system is complete!** 🎓

Students and educators can now:
1. Label traces with ground truth PASS/FAIL values
2. Run the mock judge on labeled traces
3. Compare judge predictions vs human labels
4. View confusion matrix and classification metrics
5. Identify areas where the judge needs improvement
6. Click into mismatched results for debugging
