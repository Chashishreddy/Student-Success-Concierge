/**
 * Case Detail API Route
 *
 * GET: Fetch a test case with its traces
 */

import { NextRequest, NextResponse } from 'next/server';
import appDb from '@/lib/db/appDb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId: caseIdStr } = await params;
    const caseId = parseInt(caseIdStr);

    if (isNaN(caseId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid case ID' },
        { status: 400 }
      );
    }

    const db = await appDb.getDb();

    // Get test case
    const caseStmt = db.prepare('SELECT * FROM test_cases WHERE id = ?');
    caseStmt.bind([caseId]);

    if (!caseStmt.step()) {
      caseStmt.free();
      return NextResponse.json(
        { success: false, error: 'Case not found' },
        { status: 404 }
      );
    }

    const testCase = caseStmt.getAsObject();
    caseStmt.free();

    // Get trace count
    const countStmt = db.prepare(
      'SELECT COUNT(*) as count FROM traces WHERE case_id = ?'
    );
    countStmt.bind([caseId]);
    countStmt.step();
    const traceCount = countStmt.getAsObject().count as number;
    countStmt.free();

    // Get recent traces (limit 5 for preview)
    const tracesStmt = db.prepare(`
      SELECT * FROM traces
      WHERE case_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `);
    tracesStmt.bind([caseId]);

    const traces = [];
    while (tracesStmt.step()) {
      traces.push(tracesStmt.getAsObject());
    }
    tracesStmt.free();

    return NextResponse.json({
      success: true,
      ...testCase,
      trace_count: traceCount,
      traces,
    });
  } catch (error) {
    console.error('Error fetching case:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
