/**
 * Evals API Route
 *
 * GET /api/evals - Get eval runs and results
 */

import { NextRequest, NextResponse } from 'next/server';
import appDb from '@/lib/db/appDb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');
    const showFailuresOnly = searchParams.get('failuresOnly') === 'true';

    const db = await appDb.getDb();

    if (runId) {
      // Get specific run details
      const runStmt = db.prepare('SELECT * FROM eval_runs WHERE id = ?');
      runStmt.bind([parseInt(runId)]);
      runStmt.step();
      const run = runStmt.getAsObject();
      runStmt.free();

      if (!run) {
        return NextResponse.json({ error: 'Eval run not found' }, { status: 404 });
      }

      // Get results for this run
      let resultsQuery = `
        SELECT
          ter.*,
          t.case_id,
          t.channel,
          tc.name as case_name,
          tc.category as case_category
        FROM trace_eval_results ter
        INNER JOIN traces t ON t.id = ter.trace_id
        LEFT JOIN test_cases tc ON tc.id = t.case_id
        WHERE ter.eval_run_id = ?
      `;

      if (showFailuresOnly) {
        resultsQuery += ' AND ter.pass = 0';
      }

      resultsQuery += ' ORDER BY ter.eval_name, ter.trace_id';

      const resultsStmt = db.prepare(resultsQuery);
      resultsStmt.bind([parseInt(runId)]);

      const results = [];
      while (resultsStmt.step()) {
        const row = resultsStmt.getAsObject();
        results.push({
          ...row,
          details: row.details_json ? JSON.parse(row.details_json as string) : null,
        });
      }
      resultsStmt.free();

      // Get summary stats
      const statsStmt = db.prepare(`
        SELECT
          eval_name,
          COUNT(*) as total,
          SUM(pass) as passed,
          COUNT(*) - SUM(pass) as failed
        FROM trace_eval_results
        WHERE eval_run_id = ?
        GROUP BY eval_name
      `);
      statsStmt.bind([parseInt(runId)]);

      const stats = [];
      while (statsStmt.step()) {
        const row = statsStmt.getAsObject();
        const total = (row.total as number) || 0;
        const passed = (row.passed as number) || 0;
        stats.push({
          evalName: row.eval_name,
          total,
          passed,
          failed: row.failed,
          passRate: total > 0 ? (passed / total) * 100 : 0,
        });
      }
      statsStmt.free();

      // Get stats by case
      const caseStatsStmt = db.prepare(`
        SELECT
          tc.id as case_id,
          tc.name as case_name,
          tc.category as case_category,
          ter.eval_name,
          COUNT(*) as total,
          SUM(ter.pass) as passed,
          COUNT(*) - SUM(ter.pass) as failed
        FROM trace_eval_results ter
        INNER JOIN traces t ON t.id = ter.trace_id
        LEFT JOIN test_cases tc ON tc.id = t.case_id
        WHERE ter.eval_run_id = ?
        GROUP BY tc.id, ter.eval_name
        ORDER BY tc.id, ter.eval_name
      `);
      caseStatsStmt.bind([parseInt(runId)]);

      const caseStats = [];
      while (caseStatsStmt.step()) {
        const row = caseStatsStmt.getAsObject();
        const total = (row.total as number) || 0;
        const passed = (row.passed as number) || 0;
        caseStats.push({
          caseId: row.case_id,
          caseName: row.case_name,
          caseCategory: row.case_category,
          evalName: row.eval_name,
          total,
          passed,
          failed: row.failed,
          passRate: total > 0 ? (passed / total) * 100 : 0,
        });
      }
      caseStatsStmt.free();

      return NextResponse.json({
        run,
        stats,
        caseStats,
        results,
      });
    } else {
      // Get all eval runs
      const runsStmt = db.prepare(`
        SELECT
          er.*,
          tc.name as case_name,
          COUNT(DISTINCT ter.id) as total_evals,
          SUM(ter.pass) as passed_evals
        FROM eval_runs er
        LEFT JOIN test_cases tc ON tc.id = er.case_id
        LEFT JOIN trace_eval_results ter ON ter.eval_run_id = er.id
        GROUP BY er.id
        ORDER BY er.created_at DESC
        LIMIT 50
      `);

      const runs = [];
      while (runsStmt.step()) {
        const row = runsStmt.getAsObject();
        const total = (row.total_evals as number) || 0;
        const passed = (row.passed_evals as number) || 0;
        runs.push({
          ...row,
          passRate: total > 0 ? (passed / total) * 100 : 0,
        });
      }
      runsStmt.free();

      return NextResponse.json({ runs });
    }
  } catch (error) {
    console.error('Error fetching eval data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch eval data' },
      { status: 500 }
    );
  }
}
