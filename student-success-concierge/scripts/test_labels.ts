/**
 * Test Labels Script
 *
 * Tests the labeling and judge validation system
 */

import appDb from '../lib/db/appDb';
import { runAllJudges } from '../lib/judge/mockJudge';

async function main() {
  console.log('🏷️ Testing Labels and Judge Validation\n');

  try {
    await appDb.initSchema();
    const db = await appDb.getDb();

    // Check how many traces we have
    const tracesStmt = db.prepare('SELECT COUNT(*) as count FROM traces WHERE archived = 0');
    tracesStmt.step();
    const traceCount = tracesStmt.getAsObject().count as number;
    tracesStmt.free();

    console.log(`📊 Found ${traceCount} traces\n`);

    if (traceCount === 0) {
      console.log('❌ No traces found. Please run some chats first.');
      return;
    }

    // Get first 10 traces for labeling
    const tracesStmt2 = db.prepare('SELECT * FROM traces WHERE archived = 0 ORDER BY id LIMIT 10');
    const traces = [];
    while (tracesStmt2.step()) {
      traces.push(tracesStmt2.getAsObject());
    }
    tracesStmt2.free();

    console.log(`🏷️ Labeling ${traces.length} traces...\n`);

    // Label each trace based on judge output (simulating human labeling)
    let labelCount = 0;

    for (const trace of traces) {
      // Fetch messages
      const messagesStmt = db.prepare('SELECT * FROM trace_messages WHERE trace_id = ? ORDER BY id');
      messagesStmt.bind([trace.id]);
      const messages: any[] = [];
      while (messagesStmt.step()) {
        messages.push(messagesStmt.getAsObject());
      }
      messagesStmt.free();

      // Fetch tool calls
      const toolCallsStmt = db.prepare('SELECT * FROM trace_tool_calls WHERE trace_id = ? ORDER BY id');
      toolCallsStmt.bind([trace.id]);
      const toolCalls: any[] = [];
      while (toolCallsStmt.step()) {
        toolCalls.push(toolCallsStmt.getAsObject());
      }
      toolCallsStmt.free();

      // Run judge to get "ground truth" (in real scenario, human would label)
      const judgeResults = runAllJudges(trace as any, messages, toolCalls);

      // For testing: sometimes agree with judge, sometimes disagree to create variance
      for (const result of judgeResults) {
        // 80% agreement with judge, 20% disagreement (to simulate human variance)
        const agree = Math.random() > 0.2;
        const labelValue = agree ? result.labelValue : (result.labelValue === 'PASS' ? 'FAIL' : 'PASS');

        // Insert label
        const insertStmt = db.prepare(`
          INSERT OR REPLACE INTO human_labels (trace_id, cohort_id, label_type, label_value)
          VALUES (?, ?, ?, ?)
        `);
        insertStmt.bind([trace.id, null, result.labelType, labelValue]);
        insertStmt.step();
        insertStmt.free();
        labelCount++;
      }

      console.log(`   Trace #${trace.id}: labeled (${messages.length} messages, ${toolCalls.length} tool calls)`);
    }

    appDb.saveDb();

    console.log(`\n✅ Created ${labelCount} labels\n`);

    // Now run validation
    console.log('🔍 Running judge validation...\n');

    // Count labels
    const labelCountStmt = db.prepare('SELECT COUNT(*) as count FROM human_labels');
    labelCountStmt.step();
    const totalLabels = labelCountStmt.getAsObject().count as number;
    labelCountStmt.free();

    // Get label breakdown
    const breakdownStmt = db.prepare(`
      SELECT label_type, label_value, COUNT(*) as count
      FROM human_labels
      GROUP BY label_type, label_value
      ORDER BY label_type, label_value
    `);

    console.log('Label breakdown:');
    while (breakdownStmt.step()) {
      const row = breakdownStmt.getAsObject();
      console.log(`   ${row.label_type} - ${row.label_value}: ${row.count}`);
    }
    breakdownStmt.free();

    // Run validation manually
    console.log('\n📊 Validation Results:\n');

    let tp = 0, tn = 0, fp = 0, fn = 0;

    const labelsStmt = db.prepare('SELECT * FROM human_labels');
    while (labelsStmt.step()) {
      const label = labelsStmt.getAsObject() as any;

      // Get trace
      const traceStmt = db.prepare('SELECT * FROM traces WHERE id = ?');
      traceStmt.bind([label.trace_id]);
      traceStmt.step();
      const traceObj = traceStmt.getAsObject();
      traceStmt.free();

      // Get messages and tool calls
      const msgsStmt = db.prepare('SELECT * FROM trace_messages WHERE trace_id = ?');
      msgsStmt.bind([label.trace_id]);
      const msgs: any[] = [];
      while (msgsStmt.step()) {
        msgs.push(msgsStmt.getAsObject());
      }
      msgsStmt.free();

      const tcsStmt = db.prepare('SELECT * FROM trace_tool_calls WHERE trace_id = ?');
      tcsStmt.bind([label.trace_id]);
      const tcs: any[] = [];
      while (tcsStmt.step()) {
        tcs.push(tcsStmt.getAsObject());
      }
      tcsStmt.free();

      // Run judge
      const results = runAllJudges(traceObj as any, msgs, tcs);
      const judgeResult = results.find(r => r.labelType === label.label_type);

      if (judgeResult) {
        const humanPass = label.label_value === 'PASS';
        const judgePass = judgeResult.labelValue === 'PASS';

        if (humanPass && judgePass) tp++;
        else if (!humanPass && !judgePass) tn++;
        else if (!humanPass && judgePass) fp++;
        else if (humanPass && !judgePass) fn++;
      }
    }
    labelsStmt.free();

    const total = tp + tn + fp + fn;
    const accuracy = total > 0 ? (tp + tn) / total : 0;
    const tpr = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const tnr = (tn + fp) > 0 ? tn / (tn + fp) : 0;
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;

    console.log('Confusion Matrix:');
    console.log(`                  Judge PASS    Judge FAIL`);
    console.log(`   Human PASS:    ${tp.toString().padStart(8)}    ${fn.toString().padStart(10)}`);
    console.log(`   Human FAIL:    ${fp.toString().padStart(8)}    ${tn.toString().padStart(10)}`);

    console.log('\nMetrics:');
    console.log(`   True Positive Rate (TPR/Sensitivity): ${(tpr * 100).toFixed(1)}%`);
    console.log(`   True Negative Rate (TNR/Specificity): ${(tnr * 100).toFixed(1)}%`);
    console.log(`   Precision: ${(precision * 100).toFixed(1)}%`);
    console.log(`   Accuracy: ${(accuracy * 100).toFixed(1)}%`);

    console.log('\n🌐 Next Steps:');
    console.log('   Label more traces: http://localhost:3000/admin/labels');
    console.log('   View validation: http://localhost:3000/admin/judge-validation\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
