/**
 * Test Analysis Workflow
 *
 * Tags 5 traces with various tags to demonstrate the analysis workflow
 */

import appDb from '../lib/db/appDb';

async function testAnalysis() {
  console.log('🧪 Testing Analysis Workflow\n');

  const db = await appDb.getDb();

  try {
    // Get 5 traces from different cases
    const tracesStmt = db.prepare(`
      SELECT t.id, t.case_id, tc.name as case_name
      FROM traces t
      LEFT JOIN test_cases tc ON tc.id = t.case_id
      ORDER BY t.id
      LIMIT 5
    `);

    const traces = [];
    while (tracesStmt.step()) {
      traces.push(tracesStmt.getAsObject());
    }
    tracesStmt.free();

    if (traces.length === 0) {
      console.log('❌ No traces found. Run seed:traces first.');
      return;
    }

    console.log(`✅ Found ${traces.length} traces to tag\n`);

    // Define tags to apply
    const tagsToApply = [
      { traceId: traces[0].id, tag: 'formatting_error' },
      { traceId: traces[1].id, tag: 'policy_violation' },
      { traceId: traces[2].id, tag: 'missed_handoff' },
      { traceId: traces[3].id, tag: 'scheduling_error' },
      { traceId: traces[4] ? traces[4].id : traces[0].id, tag: 'hallucination_or_drift' },
    ];

    // Apply tags
    for (const { traceId, tag } of tagsToApply) {
      const trace = traces.find((t: any) => t.id === traceId);

      // Check if tag already exists
      const checkStmt = db.prepare(`
        SELECT id FROM trace_tags
        WHERE trace_id = ? AND tag = ?
      `);
      checkStmt.bind([traceId, tag]);
      const exists = checkStmt.step();
      checkStmt.free();

      if (exists) {
        console.log(`⏭️  Trace #${traceId} already has tag "${tag}"`);
        continue;
      }

      const insertStmt = db.prepare(`
        INSERT INTO trace_tags (trace_id, tag)
        VALUES (?, ?)
      `);
      insertStmt.bind([traceId, tag]);
      insertStmt.step();
      insertStmt.free();

      console.log(`✅ Tagged Trace #${traceId} (${trace?.case_name || 'Unknown'}) with "${tag}"`);
    }

    appDb.saveDb();

    console.log('\n📊 Current Tag Statistics:\n');

    // Show overall tag counts
    const overallStmt = db.prepare(`
      SELECT tag, COUNT(*) as count
      FROM trace_tags
      GROUP BY tag
      ORDER BY count DESC
    `);

    console.log('Overall Tag Counts:');
    while (overallStmt.step()) {
      const row = overallStmt.getAsObject();
      console.log(`  ${row.tag}: ${row.count}`);
    }
    overallStmt.free();

    console.log('\nTag Counts by Case:');

    // Show tag counts by case
    const casesStmt = db.prepare(`
      SELECT DISTINCT tc.id, tc.name
      FROM test_cases tc
      INNER JOIN traces t ON t.case_id = tc.id
      INNER JOIN trace_tags tt ON tt.trace_id = t.id
      ORDER BY tc.id
    `);

    const cases = [];
    while (casesStmt.step()) {
      cases.push(casesStmt.getAsObject());
    }
    casesStmt.free();

    for (const testCase of cases) {
      console.log(`\n  ${testCase.name}:`);

      const tagStmt = db.prepare(`
        SELECT tt.tag, COUNT(*) as count
        FROM trace_tags tt
        INNER JOIN traces t ON t.id = tt.trace_id
        WHERE t.case_id = ?
        GROUP BY tt.tag
        ORDER BY count DESC
      `);
      tagStmt.bind([testCase.id]);

      while (tagStmt.step()) {
        const row = tagStmt.getAsObject();
        console.log(`    ${row.tag}: ${row.count}`);
      }
      tagStmt.free();
    }

    console.log('\n✨ Test complete!');
    console.log('\n📱 Next steps:');
    console.log('   1. Start dev server: npm run dev');
    console.log('   2. Visit: http://localhost:3000/admin/analysis');
    console.log('   3. View tag frequency dashboard\n');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

testAnalysis()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
