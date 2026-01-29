/**
 * Run Evals API Route
 *
 * POST /api/evals/run - Trigger an eval run
 */

import { NextRequest, NextResponse } from 'next/server';
import { runEvals } from '@/lib/evals/runner';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, cohortId } = body;

    const result = await runEvals({
      caseId: caseId ? parseInt(caseId) : undefined,
      cohortId: cohortId ? parseInt(cohortId) : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error running evals:', error);
    return NextResponse.json(
      { error: 'Failed to run evals' },
      { status: 500 }
    );
  }
}
