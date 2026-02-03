/**
 * Traces for Labeling API Route
 *
 * GET /api/admin/traces-for-labeling - Fetch traces with details for labeling
 */

import { NextRequest, NextResponse } from 'next/server';
import appDb from '@/lib/db/appDb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30');

    const db = await appDb.getDb();

    // Fetch traces with case names
    const tracesStmt = db.prepare(`
      SELECT
        t.*,
        tc.name as case_name
      FROM traces t
      LEFT JOIN test_cases tc ON tc.id = t.case_id
      WHERE t.archived = 0
      ORDER BY t.id DESC
      LIMIT ?
    `);
    tracesStmt.bind([limit]);

    const traces = [];
    while (tracesStmt.step()) {
      traces.push(tracesStmt.getAsObject());
    }
    tracesStmt.free();

    // For each trace, fetch messages, tool calls, and existing labels
    const tracesWithDetails = [];

    for (const trace of traces) {
      // Fetch messages
      const messagesStmt = db.prepare(
        'SELECT id, role, content FROM trace_messages WHERE trace_id = ? ORDER BY id'
      );
      messagesStmt.bind([trace.id]);
      const messages = [];
      while (messagesStmt.step()) {
        messages.push(messagesStmt.getAsObject());
      }
      messagesStmt.free();

      // Fetch tool calls
      const toolCallsStmt = db.prepare(
        'SELECT id, tool_name, input_json, output_json FROM trace_tool_calls WHERE trace_id = ? ORDER BY id'
      );
      toolCallsStmt.bind([trace.id]);
      const toolCalls = [];
      while (toolCallsStmt.step()) {
        toolCalls.push(toolCallsStmt.getAsObject());
      }
      toolCallsStmt.free();

      // Fetch existing labels
      const labelsStmt = db.prepare(
        'SELECT label_type, label_value FROM human_labels WHERE trace_id = ?'
      );
      labelsStmt.bind([trace.id]);
      const labels: Record<string, string> = {};
      while (labelsStmt.step()) {
        const row = labelsStmt.getAsObject();
        labels[row.label_type as string] = row.label_value as string;
      }
      labelsStmt.free();

      tracesWithDetails.push({
        ...trace,
        messages,
        toolCalls,
        labels,
      });
    }

    // Count total traces and labeled traces
    const totalStmt = db.prepare('SELECT COUNT(*) as total FROM traces WHERE archived = 0');
    totalStmt.step();
    const total = totalStmt.getAsObject().total as number;
    totalStmt.free();

    const labeledStmt = db.prepare('SELECT COUNT(DISTINCT trace_id) as labeled FROM human_labels');
    labeledStmt.step();
    const labeled = labeledStmt.getAsObject().labeled as number;
    labeledStmt.free();

    return NextResponse.json({
      traces: tracesWithDetails,
      total,
      labeled,
    });
  } catch (error) {
    console.error('Error fetching traces for labeling:', error);
    return NextResponse.json(
      { error: 'Failed to fetch traces' },
      { status: 500 }
    );
  }
}
