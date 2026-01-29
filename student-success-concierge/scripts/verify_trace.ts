/**
 * Verify Trace Script
 *
 * Verifies the demo trace was created correctly
 */

import { getCompleteTrace } from '../lib/tracing';

async function verifyTrace() {
  console.log('🔍 Verifying demo trace...\n');

  const traceId = 1;
  const trace = await getCompleteTrace(traceId);

  if (!trace) {
    console.error('❌ Trace not found!');
    process.exit(1);
  }

  console.log('✅ Trace found!\n');
  console.log('📋 Trace Details:');
  console.log(`   ID: ${trace.trace.id}`);
  console.log(`   Student ID: ${trace.trace.student_id}`);
  console.log(`   Cohort ID: ${trace.trace.cohort_id}`);
  console.log(`   Channel: ${trace.trace.channel}`);
  console.log(`   Created: ${trace.trace.created_at}\n`);

  console.log(`💬 Messages (${trace.messages.length}):`);
  trace.messages.forEach((msg, i) => {
    console.log(`   ${i + 1}. [${msg.role}] ${msg.content.substring(0, 60)}...`);
  });

  console.log(`\n🔧 Tool Calls (${trace.toolCalls.length}):`);
  trace.toolCalls.forEach((call, i) => {
    const input = JSON.parse(call.input_json);
    const output = JSON.parse(call.output_json);
    console.log(`   ${i + 1}. ${call.tool_name}`);
    console.log(`      Input: ${JSON.stringify(input).substring(0, 60)}...`);
    console.log(`      Success: ${output.success}`);
  });

  console.log('\n✅ Trace verification complete!');
  console.log(`\n🌐 View in browser: http://localhost:3000/admin/traces/${traceId}`);
}

verifyTrace()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
