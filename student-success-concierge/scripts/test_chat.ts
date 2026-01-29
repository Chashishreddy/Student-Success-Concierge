/**
 * Test Chat Integration
 *
 * Tests the chat API and orchestrator integration
 * Verifies that conversations create traces that appear in the admin viewer
 */

import { runOrchestrator } from '../lib/agent/orchestrator';
import { getCompleteTrace } from '../lib/tracing';
import appDb from '../lib/db/appDb';

async function testChat() {
  console.log('🧪 Testing Chat Integration\n');

  try {
    // Initialize database
    await appDb.initSchema();

    // Create or get test student
    const db = await appDb.getDb();

    let studentId: number;
    const studentStmt = db.prepare('SELECT id FROM students WHERE handle = ?');
    studentStmt.bind(['test_chat_user']);
    const existingStudent = studentStmt.step() ? studentStmt.getAsObject() : null;
    studentStmt.free();

    if (existingStudent) {
      studentId = existingStudent.id as number;
      console.log(`✅ Found existing student: ${studentId}\n`);
    } else {
      const insertStmt = db.prepare('INSERT INTO students (handle) VALUES (?)');
      insertStmt.bind(['test_chat_user']);
      insertStmt.step();
      insertStmt.free();

      studentId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;
      appDb.saveDb();
      console.log(`✅ Created new student: ${studentId}\n`);
    }

    // Test 1: Simple greeting
    console.log('1️⃣ Testing simple greeting...');
    const greeting = await runOrchestrator('Hello!', {
      channel: 'webchat',
      studentId,
    });

    console.log(`   Trace ID: ${greeting.traceId}`);
    console.log(`   Response: ${greeting.response}`);
    console.log(`   Tool Calls: ${greeting.toolCallCount}`);
    console.log(`   Violations: ${greeting.violations.length}\n`);

    // Test 2: Knowledge base question
    console.log('2️⃣ Testing KB search...');
    const kbQuestion = await runOrchestrator('What are your office hours?', {
      channel: 'webchat',
      studentId,
    });

    console.log(`   Trace ID: ${kbQuestion.traceId}`);
    console.log(`   Response: ${kbQuestion.response.substring(0, 100)}...`);
    console.log(`   Tool Calls: ${kbQuestion.toolCallCount}`);
    console.log(`   Violations: ${kbQuestion.violations.length}\n`);

    // Test 3: SMS channel (should enforce plain text)
    console.log('3️⃣ Testing SMS channel...');
    const smsMessage = await runOrchestrator('What services do you offer?', {
      channel: 'sms',
      studentId,
    });

    console.log(`   Trace ID: ${smsMessage.traceId}`);
    console.log(`   Response: ${smsMessage.response.substring(0, 100)}...`);
    console.log(`   Tool Calls: ${smsMessage.toolCallCount}`);
    console.log(`   Violations: ${smsMessage.violations.length}`);
    if (smsMessage.violations.length > 0) {
      console.log(`   Violation: ${smsMessage.violations[0]}`);
    }
    console.log();

    // Test 4: Handoff request
    console.log('4️⃣ Testing handoff request...');
    const handoffRequest = await runOrchestrator('I need to speak with a human', {
      channel: 'webchat',
      studentId,
    });

    console.log(`   Trace ID: ${handoffRequest.traceId}`);
    console.log(`   Response: ${handoffRequest.response}`);
    console.log(`   Tool Calls: ${handoffRequest.toolCallCount}`);
    console.log(`   Violations: ${handoffRequest.violations.length}`);
    if (handoffRequest.violations.length > 0) {
      console.log(`   Violation: ${handoffRequest.violations[0]}`);
    }
    console.log();

    // Verify traces exist
    console.log('5️⃣ Verifying traces in database...');
    const tracesStmt = db.prepare(`
      SELECT COUNT(*) as count FROM traces
      WHERE student_id = ?
    `);
    tracesStmt.bind([studentId]);
    tracesStmt.step();
    const traceCount = tracesStmt.getAsObject();
    tracesStmt.free();

    console.log(`   Total traces for student: ${traceCount.count}\n`);

    // Get complete trace details for one
    console.log('6️⃣ Fetching complete trace...');
    const completeTrace = await getCompleteTrace(greeting.traceId);

    if (completeTrace) {
      console.log(`   Trace #${completeTrace.trace.id}:`);
      console.log(`   - Messages: ${completeTrace.messages.length}`);
      console.log(`   - Tool Calls: ${completeTrace.toolCalls.length}`);
      console.log(`   - Channel: ${completeTrace.trace.channel}`);
      console.log();
    }

    console.log('✨ All tests completed!\n');
    console.log('📊 Summary:');
    console.log(`   - Created ${traceCount.count} traces`);
    console.log(`   - Student ID: ${studentId}`);
    console.log(`   - Test handles: test_chat_user\n`);

    console.log('🌐 Next Steps:');
    console.log('   1. Start dev server: npm run dev');
    console.log('   2. Visit: http://localhost:3000/chat');
    console.log('   3. Use handle "test_chat_user" to see traces');
    console.log(`   4. View traces: http://localhost:3000/admin/traces\n`);
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

testChat()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
