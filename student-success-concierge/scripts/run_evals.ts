/**
 * Run Evals Script
 *
 * Executes binary pass/fail evaluations on traces
 */

import { runEvals, RunEvalsOptions } from '../lib/evals/runner';

async function main() {
  console.log('🧪 Running Evals\n');

  try {
    // Parse command line args
    const args = process.argv.slice(2);
    const options: RunEvalsOptions = {};

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--caseId' && args[i + 1]) {
        options.caseId = parseInt(args[i + 1]);
        i++;
      } else if (args[i] === '--cohortId' && args[i + 1]) {
        options.cohortId = parseInt(args[i + 1]);
        i++;
      }
    }

    const result = await runEvals(options);

    console.log(`✅ Created eval run #${result.evalRunId}\n`);
    console.log('✨ Eval run complete!\n');
    console.log('📊 Results:');
    console.log(`   Total evaluations: ${result.totalEvals}`);
    console.log(`   Passed: ${result.passedEvals} (${((result.passedEvals / result.totalEvals) * 100).toFixed(1)}%)`);
    console.log(`   Failed: ${result.failedEvals} (${((result.failedEvals / result.totalEvals) * 100).toFixed(1)}%)\n`);

    console.log('Breakdown by eval:');
    for (const item of result.breakdown) {
      console.log(`   ${item.evalName}: ${item.passed}/${item.total} passed (${item.passRate.toFixed(1)}%) - ${item.failed} failed`);
    }

    console.log('\n🌐 Next Steps:');
    console.log(`   View results: http://localhost:3000/admin/evals?runId=${result.evalRunId}\n`);
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
