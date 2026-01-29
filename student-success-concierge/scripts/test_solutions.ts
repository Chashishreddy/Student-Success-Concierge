/**
 * Test Solutions Integration
 *
 * Tests solution submission and dashboard statistics
 */

import appDb from '../lib/db/appDb';

async function testSolutions() {
  console.log('🧪 Testing Solutions Feature\n');

  try {
    // Initialize database schema
    await appDb.initSchema();

    const db = await appDb.getDb();

    // Create test students if they don't exist
    const students = ['alice_smith', 'bob_jones', 'carol_white'];
    const studentIds: number[] = [];

    for (const handle of students) {
      let studentStmt = db.prepare('SELECT id FROM students WHERE handle = ?');
      studentStmt.bind([handle]);
      const existing = studentStmt.step() ? studentStmt.getAsObject() : null;
      studentStmt.free();

      if (existing) {
        studentIds.push(existing.id as number);
      } else {
        const insertStmt = db.prepare('INSERT INTO students (handle) VALUES (?)');
        insertStmt.bind([handle]);
        insertStmt.step();
        insertStmt.free();

        const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;
        studentIds.push(id);
        appDb.saveDb();
      }
    }

    console.log(`✅ Created/found ${studentIds.length} test students\n`);

    // Get test cases
    const casesStmt = db.prepare('SELECT id, name FROM test_cases LIMIT 3');
    const cases = [];
    while (casesStmt.step()) {
      cases.push(casesStmt.getAsObject());
    }
    casesStmt.free();

    if (cases.length === 0) {
      console.log('❌ No test cases found. Please run seed scripts first.');
      return;
    }

    console.log(`✅ Found ${cases.length} test cases\n`);

    // Submit solutions
    console.log('1️⃣ Submitting solutions...\n');

    const solutionsToSubmit = [
      {
        studentId: studentIds[0],
        caseId: cases[0].id as number,
        diagnosis: 'The agent is using markdown formatting in SMS messages, which breaks the display on SMS clients. Found this in traces #2, #5, and #8.',
        proposedFix: 'Add a post-processing step in the orchestrator to strip markdown from SMS responses. Use regex to remove **bold**, *italic*, and `code` formatting.',
        evidenceTraceIds: [2, 5, 8],
      },
      {
        studentId: studentIds[1],
        caseId: cases[0].id as number,
        diagnosis: 'Similar to the markdown issue, I also noticed that lists and headers are being used in SMS. This is a channel-specific problem.',
        proposedFix: 'Update the system prompt to explicitly state "NO markdown in SMS" and add examples of plain text alternatives.',
        evidenceTraceIds: [3, 7],
      },
      {
        studentId: studentIds[0],
        caseId: cases.length > 1 ? (cases[1].id as number) : (cases[0].id as number),
        diagnosis: 'The agent ignores explicit handoff requests from users who say "I need to speak with a human". The agent tries to help instead of escalating.',
        proposedFix: 'Add a handoff detection guardrail that checks for keywords like "human", "person", "supervisor" and forces a create_ticket call.',
        evidenceTraceIds: [15, 22],
      },
    ];

    for (const sol of solutionsToSubmit) {
      const solutionStmt = db.prepare(`
        INSERT INTO solutions (case_id, student_id, diagnosis_text, proposed_fix_text)
        VALUES (?, ?, ?, ?)
      `);
      solutionStmt.bind([sol.caseId, sol.studentId, sol.diagnosis, sol.proposedFix]);
      solutionStmt.step();
      solutionStmt.free();

      const solutionId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;

      // Add evidence
      for (const traceId of sol.evidenceTraceIds) {
        const evidenceStmt = db.prepare(`
          INSERT INTO solution_evidence (solution_id, type, value)
          VALUES (?, 'trace', ?)
        `);
        evidenceStmt.bind([solutionId, traceId.toString()]);
        evidenceStmt.step();
        evidenceStmt.free();
      }

      console.log(`   ✅ Solution #${solutionId} submitted by student #${sol.studentId} for case #${sol.caseId}`);
    }

    appDb.saveDb();

    console.log('\n2️⃣ Querying dashboard statistics...\n');

    // Get total solutions
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM solutions');
    totalStmt.step();
    const totalSolutions = totalStmt.getAsObject().count;
    totalStmt.free();

    console.log(`   Total solutions: ${totalSolutions}`);

    // Get solutions by case
    const caseStatsStmt = db.prepare(`
      SELECT
        tc.name,
        COUNT(s.id) as solution_count,
        COUNT(DISTINCT s.student_id) as unique_students
      FROM test_cases tc
      LEFT JOIN solutions s ON s.case_id = tc.id
      GROUP BY tc.id
      HAVING solution_count > 0
    `);

    console.log('\n   Solutions by case:');
    while (caseStatsStmt.step()) {
      const stat = caseStatsStmt.getAsObject();
      console.log(`     ${stat.name}: ${stat.solution_count} solutions from ${stat.unique_students} students`);
    }
    caseStatsStmt.free();

    // Get student stats
    const studentStatsStmt = db.prepare(`
      SELECT
        st.handle,
        COUNT(s.id) as solution_count,
        COUNT(DISTINCT s.case_id) as cases_solved
      FROM students st
      INNER JOIN solutions s ON s.student_id = st.id
      GROUP BY st.id
    `);

    console.log('\n   Student progress:');
    while (studentStatsStmt.step()) {
      const stat = studentStatsStmt.getAsObject();
      console.log(`     ${stat.handle}: ${stat.solution_count} solutions, ${stat.cases_solved} cases`);
    }
    studentStatsStmt.free();

    console.log('\n3️⃣ Verifying evidence links...\n');

    // Get all evidence
    const evidenceStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM solution_evidence
      WHERE type = 'trace'
    `);
    evidenceStmt.step();
    const evidenceCount = evidenceStmt.getAsObject().count;
    evidenceStmt.free();

    console.log(`   Total evidence traces: ${evidenceCount}`);

    console.log('\n✨ Test complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Created ${solutionsToSubmit.length} test solutions`);
    console.log(`   - Total solutions in DB: ${totalSolutions}`);
    console.log(`   - Total evidence links: ${evidenceCount}\n`);

    console.log('🌐 Next Steps:');
    console.log('   1. Start dev server: npm run dev');
    console.log('   2. View dashboard: http://localhost:3000/admin/dashboard');
    console.log('   3. View solutions: http://localhost:3000/admin/solutions');
    console.log('   4. Submit solution: http://localhost:3000/cases/1\n');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

testSolutions()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
