/**
 * Traces API Route
 *
 * GET: List all traces with optional filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import appDb from '@/lib/db/appDb';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const caseId = searchParams.get('caseId');
    const studentId = searchParams.get('studentId');
    const cohortId = searchParams.get('cohortId');
    const channel = searchParams.get('channel');
    const archived = searchParams.get('archived');

    const db = await appDb.getDb();

    // Build query with joins to get related data and counts
    let query = `
      SELECT
        t.*,
        s.handle as student_handle,
        c.name as cohort_name,
        tc.name as case_name,
        (SELECT COUNT(*) FROM trace_messages WHERE trace_id = t.id) as message_count,
        (SELECT COUNT(*) FROM trace_tool_calls WHERE trace_id = t.id) as tool_call_count
      FROM traces t
      LEFT JOIN students s ON t.student_id = s.id
      LEFT JOIN cohorts c ON t.cohort_id = c.id
      LEFT JOIN test_cases tc ON t.case_id = tc.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (caseId) {
      query += ' AND t.case_id = ?';
      params.push(parseInt(caseId));
    }

    if (studentId) {
      query += ' AND t.student_id = ?';
      params.push(parseInt(studentId));
    }

    if (cohortId) {
      query += ' AND t.cohort_id = ?';
      params.push(parseInt(cohortId));
    }

    if (channel) {
      query += ' AND t.channel = ?';
      params.push(channel);
    }

    if (archived !== null) {
      query += ' AND t.archived = ?';
      params.push(archived === 'true' ? 1 : 0);
    }

    query += ' ORDER BY t.created_at DESC';

    const stmt = db.prepare(query);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const traces = [];
    while (stmt.step()) {
      traces.push(stmt.getAsObject());
    }
    stmt.free();

    return NextResponse.json({
      success: true,
      traces,
      count: traces.length,
    });
  } catch (error) {
    console.error('Error fetching traces:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
