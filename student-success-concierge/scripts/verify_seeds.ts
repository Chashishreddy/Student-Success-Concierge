/**
 * Verify Seeded Traces
 *
 * Checks that all 60 traces were created correctly
 */

import appDb from '../lib/db/appDb';
import { getCompleteTrace } from '../lib/tracing';

async function verify() {
  console.log('🔍 Verifying seeded traces...\n');

  const db = await appDb.getDb();

  // Get test cases
  const casesStmt = db.prepare('SELECT id, name, category, frozen FROM test_cases ORDER BY id');
  const cases = [];
  while (casesStmt.step()) {
    cases.push(casesStmt.getAsObject());
  }
  casesStmt.free();

  console.log(`📚 Test Cases (${cases.length}):`);
  cases.forEach((c: any) => {
    console.log(`   ${c.id}. ${c.name}`);
    console.log(`      Category: ${c.category}`);
    console.log(`      Frozen: ${c.frozen ? 'Yes ❄️' : 'No 🟢'}`);
  });

  // Get trace counts per case
  console.log(`\n📊 Trace Distribution:`);
  for (const testCase of cases) {
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM traces WHERE case_id = ?');
    countStmt.bind([testCase.id]);
    countStmt.step();
    const count = countStmt.getAsObject().count as number;
    countStmt.free();

    console.log(`   ${testCase.name}: ${count} traces`);
  }

  // Get total traces
  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM traces');
  totalStmt.step();
  const total = totalStmt.getAsObject().count as number;
  totalStmt.free();

  console.log(`\n✅ Total Traces: ${total}`);

  // Get trace breakdown by channel
  const smsStmt = db.prepare("SELECT COUNT(*) as count FROM traces WHERE channel = 'sms'");
  smsStmt.step();
  const smsCount = smsStmt.getAsObject().count as number;
  smsStmt.free();

  const webchatStmt = db.prepare("SELECT COUNT(*) as count FROM traces WHERE channel = 'webchat'");
  webchatStmt.step();
  const webchatCount = webchatStmt.getAsObject().count as number;
  webchatStmt.free();

  console.log(`\n📱 Channel Distribution:`);
  console.log(`   SMS: ${smsCount}`);
  console.log(`   Webchat: ${webchatCount}`);

  // Sample a few traces to show failure modes
  console.log(`\n🔬 Sample Traces:`);

  // Policy drift example
  const policyStmt = db.prepare(`
    SELECT t.id, t.case_id, t.channel
    FROM traces t
    JOIN test_cases tc ON t.case_id = tc.id
    WHERE tc.category = 'policy_drift'
    LIMIT 1
  `);
  policyStmt.step();
  const policyTrace = policyStmt.getAsObject();
  policyStmt.free();

  if (policyTrace.id) {
    const trace = await getCompleteTrace(policyTrace.id as number);
    console.log(`\n   📍 Policy Drift Trace #${policyTrace.id} (${policyTrace.channel}):`);
    console.log(`      Messages: ${trace?.messages.length}`);
    console.log(`      Tool Calls: ${trace?.toolCalls.length}`);

    // Check for markdown in SMS
    if (policyTrace.channel === 'sms') {
      const hasMarkdown = trace?.messages.some(m =>
        m.content.includes('**') || m.content.includes('_') || m.content.includes('#')
      );
      if (hasMarkdown) {
        console.log(`      ⚠️  Contains markdown in SMS`);
      }
    }
  }

  // Handoff failure example
  const handoffStmt = db.prepare(`
    SELECT t.id, t.case_id, t.channel
    FROM traces t
    JOIN test_cases tc ON t.case_id = tc.id
    WHERE tc.category = 'handoff_failure'
    LIMIT 1
  `);
  handoffStmt.step();
  const handoffTrace = handoffStmt.getAsObject();
  handoffStmt.free();

  if (handoffTrace.id) {
    const trace = await getCompleteTrace(handoffTrace.id as number);
    console.log(`\n   📍 Handoff Failure Trace #${handoffTrace.id} (${handoffTrace.channel}):`);
    console.log(`      Messages: ${trace?.messages.length}`);
    console.log(`      Tool Calls: ${trace?.toolCalls.length}`);

    // Check for handoff request
    const hasHandoffRequest = trace?.messages.some(m =>
      m.role === 'user' && (
        m.content.toLowerCase().includes('human') ||
        m.content.toLowerCase().includes('person') ||
        m.content.toLowerCase().includes('supervisor')
      )
    );
    if (hasHandoffRequest) {
      console.log(`      ⚠️  User requested handoff but agent didn't escalate`);
    }
  }

  // Scheduling violation example
  const schedStmt = db.prepare(`
    SELECT t.id, t.case_id, t.channel
    FROM traces t
    JOIN test_cases tc ON t.case_id = tc.id
    WHERE tc.category = 'scheduling_violation'
    LIMIT 1
  `);
  schedStmt.step();
  const schedTrace = schedStmt.getAsObject();
  schedStmt.free();

  if (schedTrace.id) {
    const trace = await getCompleteTrace(schedTrace.id as number);
    console.log(`\n   📍 Scheduling Violation Trace #${schedTrace.id} (${schedTrace.channel}):`);
    console.log(`      Messages: ${trace?.messages.length}`);
    console.log(`      Tool Calls: ${trace?.toolCalls.length}`);

    // Check for create_appointment call
    const hasAppointment = trace?.toolCalls.some(tc => tc.tool_name === 'create_appointment');
    if (hasAppointment) {
      console.log(`      ⚠️  Contains scheduling violation`);
    }
  }

  console.log(`\n\n✅ Verification complete!`);
  console.log(`\n🌐 View all traces: http://localhost:3000/admin/traces`);
  console.log(`📚 View case #1: http://localhost:3000/cases/1`);
  console.log(`📚 View case #2: http://localhost:3000/cases/2`);
  console.log(`📚 View case #3: http://localhost:3000/cases/3\n`);
}

verify()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
