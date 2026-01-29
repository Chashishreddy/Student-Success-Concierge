/**
 * Dashboard API Route
 *
 * GET /api/dashboard - Get admin dashboard statistics
 */

import { NextResponse } from 'next/server';
import appDb from '@/lib/db/appDb';

export async function GET() {
  try {
    const db = await appDb.getDb();

    // Total solutions
    const totalSolutionsStmt = db.prepare('SELECT COUNT(*) as count FROM solutions');
    totalSolutionsStmt.step();
    const totalSolutions = totalSolutionsStmt.getAsObject().count as number;
    totalSolutionsStmt.free();

    // Total unique students with solutions
    const totalStudentsStmt = db.prepare('SELECT COUNT(DISTINCT student_id) as count FROM solutions');
    totalStudentsStmt.step();
    const totalStudents = totalStudentsStmt.getAsObject().count as number;
    totalStudentsStmt.free();

    // Total cases
    const totalCasesStmt = db.prepare('SELECT COUNT(*) as count FROM test_cases');
    totalCasesStmt.step();
    const totalCases = totalCasesStmt.getAsObject().count as number;
    totalCasesStmt.free();

    // Solutions by case
    const caseStatsStmt = db.prepare(`
      SELECT
        tc.id as case_id,
        tc.name as case_name,
        tc.category as case_category,
        COUNT(s.id) as solution_count,
        COUNT(DISTINCT s.student_id) as unique_students
      FROM test_cases tc
      LEFT JOIN solutions s ON s.case_id = tc.id
      GROUP BY tc.id
      HAVING solution_count > 0
      ORDER BY solution_count DESC, tc.id
    `);

    const caseStats = [];
    while (caseStatsStmt.step()) {
      caseStats.push(caseStatsStmt.getAsObject());
    }
    caseStatsStmt.free();

    // Student progress
    const studentStatsStmt = db.prepare(`
      SELECT
        st.id as student_id,
        st.handle as student_handle,
        COUNT(s.id) as solution_count,
        COUNT(DISTINCT s.case_id) as cases_solved
      FROM students st
      INNER JOIN solutions s ON s.student_id = st.id
      GROUP BY st.id
      ORDER BY solution_count DESC, cases_solved DESC
    `);

    const studentStats = [];
    while (studentStatsStmt.step()) {
      studentStats.push(studentStatsStmt.getAsObject());
    }
    studentStatsStmt.free();

    return NextResponse.json({
      totalSolutions,
      totalStudents,
      totalCases,
      caseStats,
      studentStats,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
