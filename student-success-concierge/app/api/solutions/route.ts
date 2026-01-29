/**
 * Solutions API Route
 *
 * GET /api/solutions - List all solutions
 * POST /api/solutions - Submit a new solution
 */

import { NextRequest, NextResponse } from 'next/server';
import appDb from '@/lib/db/appDb';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const caseId = searchParams.get('caseId');
    const studentId = searchParams.get('studentId');

    const db = await appDb.getDb();

    let query = `
      SELECT
        s.*,
        tc.name as case_name,
        tc.category as case_category,
        st.handle as student_handle
      FROM solutions s
      LEFT JOIN test_cases tc ON tc.id = s.case_id
      LEFT JOIN students st ON st.id = s.student_id
    `;

    const conditions = [];
    const params = [];

    if (caseId) {
      conditions.push('s.case_id = ?');
      params.push(parseInt(caseId));
    }

    if (studentId) {
      conditions.push('s.student_id = ?');
      params.push(parseInt(studentId));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY s.created_at DESC';

    const stmt = db.prepare(query);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const solutions = [];
    while (stmt.step()) {
      const solution = stmt.getAsObject();

      // Get evidence for this solution
      const evidenceStmt = db.prepare(`
        SELECT * FROM solution_evidence
        WHERE solution_id = ?
        ORDER BY created_at
      `);
      evidenceStmt.bind([solution.id]);

      const evidence = [];
      while (evidenceStmt.step()) {
        evidence.push(evidenceStmt.getAsObject());
      }
      evidenceStmt.free();

      solutions.push({
        ...solution,
        evidence,
      });
    }
    stmt.free();

    return NextResponse.json(solutions);
  } catch (error) {
    console.error('Error fetching solutions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch solutions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId, studentHandle, diagnosis, proposedFix, evidenceTraceIds } = body;

    // Validate required fields
    if (!caseId || !studentHandle || !diagnosis || !proposedFix) {
      return NextResponse.json(
        { error: 'caseId, studentHandle, diagnosis, and proposedFix are required' },
        { status: 400 }
      );
    }

    const db = await appDb.getDb();

    // Get or create student
    let studentStmt = db.prepare('SELECT id FROM students WHERE handle = ?');
    studentStmt.bind([studentHandle]);
    const existingStudent = studentStmt.step() ? studentStmt.getAsObject() : null;
    studentStmt.free();

    let studentId: number;
    if (existingStudent) {
      studentId = existingStudent.id as number;
    } else {
      // Create new student
      const insertStmt = db.prepare('INSERT INTO students (handle) VALUES (?)');
      insertStmt.bind([studentHandle]);
      insertStmt.step();
      insertStmt.free();

      studentId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;
      appDb.saveDb();
    }

    // Insert solution
    const solutionStmt = db.prepare(`
      INSERT INTO solutions (case_id, student_id, diagnosis_text, proposed_fix_text)
      VALUES (?, ?, ?, ?)
    `);

    solutionStmt.bind([caseId, studentId, diagnosis, proposedFix]);
    solutionStmt.step();
    solutionStmt.free();

    const solutionId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;

    // Insert evidence trace IDs
    if (evidenceTraceIds && Array.isArray(evidenceTraceIds) && evidenceTraceIds.length > 0) {
      for (const traceId of evidenceTraceIds) {
        const evidenceStmt = db.prepare(`
          INSERT INTO solution_evidence (solution_id, type, value)
          VALUES (?, 'trace', ?)
        `);
        evidenceStmt.bind([solutionId, traceId.toString()]);
        evidenceStmt.step();
        evidenceStmt.free();
      }
    }

    appDb.saveDb();

    // Fetch the created solution with evidence
    const selectStmt = db.prepare(`
      SELECT
        s.*,
        tc.name as case_name,
        st.handle as student_handle
      FROM solutions s
      LEFT JOIN test_cases tc ON tc.id = s.case_id
      LEFT JOIN students st ON st.id = s.student_id
      WHERE s.id = ?
    `);
    selectStmt.bind([solutionId]);
    selectStmt.step();
    const solution = selectStmt.getAsObject();
    selectStmt.free();

    // Get evidence
    const evidenceStmt = db.prepare(`
      SELECT * FROM solution_evidence
      WHERE solution_id = ?
    `);
    evidenceStmt.bind([solutionId]);

    const evidence = [];
    while (evidenceStmt.step()) {
      evidence.push(evidenceStmt.getAsObject());
    }
    evidenceStmt.free();

    return NextResponse.json(
      {
        ...solution,
        evidence,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating solution:', error);
    return NextResponse.json(
      { error: 'Failed to create solution' },
      { status: 500 }
    );
  }
}
