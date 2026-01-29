/**
 * Judge Validation API Route
 *
 * POST /api/judge/validate - Run judge on labeled traces and compare with human labels
 */

import { NextRequest, NextResponse } from 'next/server';
import appDb, { Trace, TraceMessage, TraceToolCall, HumanLabel } from '@/lib/db/appDb';
import { runJudge, LabelType } from '@/lib/judge/mockJudge';

interface ConfusionMatrix {
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
}

interface Metrics {
  truePositiveRate: number; // Sensitivity / Recall
  trueNegativeRate: number; // Specificity
  precision: number;
  accuracy: number;
}

interface ValidationResult {
  traceId: number;
  labelType: LabelType;
  humanLabel: 'PASS' | 'FAIL';
  judgeLabel: 'PASS' | 'FAIL';
  match: boolean;
  judgeReasoning: string;
  judgeConfidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const { labelType, cohortId } = await request.json();

    const db = await appDb.getDb();

    // Fetch all human labels for the specified label type
    let labelsQuery = 'SELECT * FROM human_labels WHERE 1=1';
    const labelsParams: any[] = [];

    if (labelType) {
      labelsQuery += ' AND label_type = ?';
      labelsParams.push(labelType);
    }

    if (cohortId) {
      labelsQuery += ' AND cohort_id = ?';
      labelsParams.push(cohortId);
    }

    const labelsStmt = db.prepare(labelsQuery);
    labelsStmt.bind(labelsParams);

    const humanLabels: HumanLabel[] = [];
    while (labelsStmt.step()) {
      humanLabels.push(labelsStmt.getAsObject() as any as HumanLabel);
    }
    labelsStmt.free();

    if (humanLabels.length === 0) {
      return NextResponse.json({
        error: 'No human labels found. Please label some traces first.',
      }, { status: 400 });
    }

    // Run judge on each labeled trace
    const results: ValidationResult[] = [];

    for (const humanLabel of humanLabels) {
      // Fetch trace
      const traceStmt = db.prepare('SELECT * FROM traces WHERE id = ?');
      traceStmt.bind([humanLabel.trace_id]);
      traceStmt.step();
      const trace = traceStmt.getAsObject() as any as Trace;
      traceStmt.free();

      if (!trace) continue;

      // Fetch messages
      const messagesStmt = db.prepare('SELECT * FROM trace_messages WHERE trace_id = ? ORDER BY id');
      messagesStmt.bind([humanLabel.trace_id]);
      const messages: TraceMessage[] = [];
      while (messagesStmt.step()) {
        messages.push(messagesStmt.getAsObject() as any as TraceMessage);
      }
      messagesStmt.free();

      // Fetch tool calls
      const toolCallsStmt = db.prepare('SELECT * FROM trace_tool_calls WHERE trace_id = ? ORDER BY id');
      toolCallsStmt.bind([humanLabel.trace_id]);
      const toolCalls: TraceToolCall[] = [];
      while (toolCallsStmt.step()) {
        toolCalls.push(toolCallsStmt.getAsObject() as any as TraceToolCall);
      }
      toolCallsStmt.free();

      // Run judge
      const judgeResult = runJudge(humanLabel.label_type, trace, messages, toolCalls);

      results.push({
        traceId: humanLabel.trace_id,
        labelType: humanLabel.label_type,
        humanLabel: humanLabel.label_value,
        judgeLabel: judgeResult.labelValue,
        match: humanLabel.label_value === judgeResult.labelValue,
        judgeReasoning: judgeResult.reasoning,
        judgeConfidence: judgeResult.confidence,
      });
    }

    // Calculate metrics by label type
    const metricsByLabelType: Record<string, {
      confusionMatrix: ConfusionMatrix;
      metrics: Metrics;
      results: ValidationResult[];
    }> = {};

    // Group results by label type
    const resultsByLabelType = results.reduce((acc, result) => {
      if (!acc[result.labelType]) {
        acc[result.labelType] = [];
      }
      acc[result.labelType].push(result);
      return acc;
    }, {} as Record<string, ValidationResult[]>);

    // Calculate metrics for each label type
    for (const [type, typeResults] of Object.entries(resultsByLabelType)) {
      const confusionMatrix: ConfusionMatrix = {
        truePositives: 0,
        trueNegatives: 0,
        falsePositives: 0,
        falseNegatives: 0,
      };

      for (const result of typeResults) {
        if (result.humanLabel === 'PASS' && result.judgeLabel === 'PASS') {
          confusionMatrix.truePositives++;
        } else if (result.humanLabel === 'FAIL' && result.judgeLabel === 'FAIL') {
          confusionMatrix.trueNegatives++;
        } else if (result.humanLabel === 'FAIL' && result.judgeLabel === 'PASS') {
          confusionMatrix.falsePositives++;
        } else if (result.humanLabel === 'PASS' && result.judgeLabel === 'FAIL') {
          confusionMatrix.falseNegatives++;
        }
      }

      const { truePositives: tp, trueNegatives: tn, falsePositives: fp, falseNegatives: fn } = confusionMatrix;

      const total = tp + tn + fp + fn;
      const accuracy = total > 0 ? (tp + tn) / total : 0;

      const truePositiveRate = (tp + fn) > 0 ? tp / (tp + fn) : 0; // Sensitivity / Recall
      const trueNegativeRate = (tn + fp) > 0 ? tn / (tn + fp) : 0; // Specificity
      const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;

      metricsByLabelType[type] = {
        confusionMatrix,
        metrics: {
          truePositiveRate,
          trueNegativeRate,
          precision,
          accuracy,
        },
        results: typeResults,
      };
    }

    // Overall metrics (all label types combined)
    const overallConfusionMatrix: ConfusionMatrix = {
      truePositives: 0,
      trueNegatives: 0,
      falsePositives: 0,
      falseNegatives: 0,
    };

    for (const result of results) {
      if (result.humanLabel === 'PASS' && result.judgeLabel === 'PASS') {
        overallConfusionMatrix.truePositives++;
      } else if (result.humanLabel === 'FAIL' && result.judgeLabel === 'FAIL') {
        overallConfusionMatrix.trueNegatives++;
      } else if (result.humanLabel === 'FAIL' && result.judgeLabel === 'PASS') {
        overallConfusionMatrix.falsePositives++;
      } else if (result.humanLabel === 'PASS' && result.judgeLabel === 'FAIL') {
        overallConfusionMatrix.falseNegatives++;
      }
    }

    const { truePositives: tp, trueNegatives: tn, falsePositives: fp, falseNegatives: fn } = overallConfusionMatrix;
    const total = tp + tn + fp + fn;

    const overallMetrics: Metrics = {
      accuracy: total > 0 ? (tp + tn) / total : 0,
      truePositiveRate: (tp + fn) > 0 ? tp / (tp + fn) : 0,
      trueNegativeRate: (tn + fp) > 0 ? tn / (tn + fp) : 0,
      precision: (tp + fp) > 0 ? tp / (tp + fp) : 0,
    };

    return NextResponse.json({
      totalLabels: humanLabels.length,
      totalMatches: results.filter(r => r.match).length,
      overallConfusionMatrix,
      overallMetrics,
      metricsByLabelType,
      results,
    });
  } catch (error) {
    console.error('Error validating judge:', error);
    return NextResponse.json(
      { error: 'Failed to validate judge' },
      { status: 500 }
    );
  }
}
