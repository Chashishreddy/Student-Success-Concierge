/**
 * API Route: Analysis Dashboard Data
 *
 * GET /api/analysis - Get tag frequency analysis across all traces
 */

import { NextResponse } from 'next/server';
import appDb from '@/lib/db/appDb';

export async function GET() {
  try {
    const db = await appDb.getDb();

    // Overall tag counts
    const overallStmt = db.prepare(`
      SELECT tag, COUNT(*) as count
      FROM trace_tags
      GROUP BY tag
      ORDER BY count DESC
    `);

    const overall = [];
    while (overallStmt.step()) {
      overall.push(overallStmt.getAsObject());
    }
    overallStmt.free();

    // Tag counts by case
    const caseStmt = db.prepare(`
      SELECT
        tc.id as case_id,
        tc.name as case_name,
        tc.category as case_category,
        COUNT(DISTINCT t.id) as total_traces
      FROM test_cases tc
      LEFT JOIN traces t ON t.case_id = tc.id
      GROUP BY tc.id
      HAVING total_traces > 0
      ORDER BY tc.id
    `);

    const caseData = [];
    while (caseStmt.step()) {
      caseData.push(caseStmt.getAsObject());
    }
    caseStmt.free();

    // For each case, get tag counts
    const by_case = caseData.map((caseInfo: any) => {
      const tagStmt = db.prepare(`
        SELECT tt.tag, COUNT(*) as count
        FROM trace_tags tt
        INNER JOIN traces t ON t.id = tt.trace_id
        WHERE t.case_id = ?
        GROUP BY tt.tag
        ORDER BY count DESC
      `);
      tagStmt.bind([caseInfo.case_id]);

      const tag_counts = [];
      while (tagStmt.step()) {
        tag_counts.push(tagStmt.getAsObject());
      }
      tagStmt.free();

      return {
        case_id: caseInfo.case_id,
        case_name: caseInfo.case_name,
        case_category: caseInfo.case_category,
        total_traces: caseInfo.total_traces,
        tag_counts,
      };
    });

    return NextResponse.json({
      overall,
      by_case,
    });
  } catch (error) {
    console.error('Error fetching analysis data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis data' },
      { status: 500 }
    );
  }
}
