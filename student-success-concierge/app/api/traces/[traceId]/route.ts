/**
 * Single Trace API Route
 *
 * GET: Fetch a trace with all messages and tool calls
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCompleteTrace } from '@/lib/tracing';
import appDb from '@/lib/db/appDb';

export async function GET(
  request: NextRequest,
  { params }: { params: { traceId: string } }
) {
  try {
    const traceId = parseInt(params.traceId);

    if (isNaN(traceId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid trace ID' },
        { status: 400 }
      );
    }

    const completeTrace = await getCompleteTrace(traceId);

    if (!completeTrace) {
      return NextResponse.json(
        { success: false, error: 'Trace not found' },
        { status: 404 }
      );
    }

    // Get related data (student handle, cohort name, case name)
    const db = await appDb.getDb();

    let studentHandle = null;
    if (completeTrace.trace.student_id) {
      const studentStmt = db.prepare('SELECT handle FROM students WHERE id = ?');
      studentStmt.bind([completeTrace.trace.student_id]);
      if (studentStmt.step()) {
        studentHandle = studentStmt.getAsObject().handle as string;
      }
      studentStmt.free();
    }

    let cohortName = null;
    if (completeTrace.trace.cohort_id) {
      const cohortStmt = db.prepare('SELECT name FROM cohorts WHERE id = ?');
      cohortStmt.bind([completeTrace.trace.cohort_id]);
      if (cohortStmt.step()) {
        cohortName = cohortStmt.getAsObject().name as string;
      }
      cohortStmt.free();
    }

    let caseName = null;
    if (completeTrace.trace.case_id) {
      const caseStmt = db.prepare('SELECT name FROM test_cases WHERE id = ?');
      caseStmt.bind([completeTrace.trace.case_id]);
      if (caseStmt.step()) {
        caseName = caseStmt.getAsObject().name as string;
      }
      caseStmt.free();
    }

    return NextResponse.json({
      success: true,
      ...completeTrace,
      student_handle: studentHandle,
      cohort_name: cohortName,
      case_name: caseName,
    });
  } catch (error) {
    console.error('Error fetching trace:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
