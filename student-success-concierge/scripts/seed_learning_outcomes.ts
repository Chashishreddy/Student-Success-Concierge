/**
 * Seed Learning Outcomes Script
 *
 * Adds learning objectives and guidance checklists to test cases
 * Teaching-first approach with clear scaffolding for students
 */

import appDb from '../lib/db/appDb';

// Learning outcomes for each case category
const LEARNING_OUTCOMES = {
  policy_drift: [
    'Identify when AI agent responses contradict established knowledge base articles',
    'Recognize subtle vs. explicit policy violations in conversational responses',
    'Analyze tool usage patterns to verify information sources',
    'Apply open coding methodology to annotate problematic responses',
    'Use axial coding to categorize different types of policy drift',
    'Evaluate the severity and impact of misinformation on student experience',
  ],
  handoff_failure: [
    'Detect explicit and implicit requests for human assistance in conversations',
    'Identify common handoff keywords and escalation triggers',
    'Recognize when an AI agent inappropriately attempts to resolve complex issues',
    'Distinguish between appropriate self-service and necessary human intervention',
    'Tag conversations based on urgency level and escalation requirements',
    'Analyze failure patterns across multiple conversation traces',
  ],
  scheduling_violation: [
    'Verify appointment bookings comply with business hour constraints (9 AM - 5 PM)',
    'Identify scheduling attempts on weekends and non-business days',
    'Detect capacity violations and double-booking scenarios',
    'Recognize temporal constraint violations (past dates, dates beyond 30-day window)',
    'Trace tool call chains to understand where validation failed',
    'Evaluate the effectiveness of policy rules in preventing scheduling errors',
  ],
};

// Guidance checklists for each case category
const GUIDANCE_CHECKLISTS = {
  policy_drift: [
    'Start by reviewing 3-5 traces to get familiar with conversation patterns',
    'For each trace, identify what knowledge base articles the agent should reference',
    'Look for responses that provide different information than KB articles state',
    'Write open-coding notes for each suspicious response (what\'s wrong and why)',
    'Check for markdown formatting errors in SMS channel traces',
    'Assign tags: "contradicts_kb", "incorrect_fees", "wrong_hours", "outdated_info", "markdown_in_sms", "correct_response"',
    'Use the frequency dashboard to see which failure types are most common',
    'Review at least 10 traces before moving to synthesis',
    'Document patterns: Which types of questions trigger policy drift most often?',
    'Write a brief summary of findings and recommendations for improvement',
  ],
  handoff_failure: [
    'Begin by reading through 3-5 complete conversation traces',
    'Highlight any user messages that request human assistance (keywords: human, person, supervisor, urgent, emergency)',
    'Note the agent\'s response to each handoff request - did it escalate properly?',
    'Write open-coding notes explaining why each handoff attempt failed',
    'Look for patterns: Does the agent always fail, or only in certain contexts?',
    'Check for markdown formatting in SMS traces (another failure mode)',
    'Assign tags: "missed_handoff", "appropriate_handoff", "ambiguous_request", "emergency", "markdown_in_sms"',
    'Analyze conversation length - do longer conversations indicate handoff failure?',
    'Review the frequency dashboard to identify the most common handoff scenarios',
    'Summarize: What triggers should the agent recognize? What\'s the current gap?',
  ],
  scheduling_violation: [
    'Start by examining 3-5 traces that involve appointment scheduling',
    'For each create_appointment tool call, verify the date and time parameters',
    'Check if the appointment is within business hours (9 AM - 5 PM, Monday-Friday)',
    'Verify the date is between 1-30 days in the future',
    'Look at check_availability tool calls - did the agent verify capacity first?',
    'Note any appointments made when slots were already full',
    'Write detailed notes on each violation: what rule was broken and why',
    'Look for markdown formatting errors in SMS appointment confirmations',
    'Assign tags: "outside_hours", "weekend_booking", "double_book", "past_date", "too_far_future", "valid_booking", "markdown_in_sms"',
    'Count how many violations of each type occur across all traces',
    'Propose: What validation steps should be added to prevent these errors?',
  ],
};

async function seedLearningOutcomes() {
  console.log('📚 Seeding learning outcomes and guidance checklists...\n');

  const db = await appDb.getDb();

  try {
    // Check if columns exist
    const pragma = db.prepare('PRAGMA table_info(test_cases)');
    const columns = [];
    while (pragma.step()) {
      columns.push(pragma.getAsObject());
    }
    pragma.free();

    const hasLearning = columns.some((col: any) => col.name === 'learning_objectives_json');
    const hasGuidance = columns.some((col: any) => col.name === 'guidance_checklist_json');

    // If columns don't exist, migrate first
    if (!hasLearning || !hasGuidance) {
      console.log('🔄 Columns not found. Migrating database...\n');
      await migrateLearningColumns(db);
    }

    // Get all test cases
    const casesStmt = db.prepare('SELECT id, category FROM test_cases');
    const cases = [];
    while (casesStmt.step()) {
      cases.push(casesStmt.getAsObject());
    }
    casesStmt.free();

    console.log(`✅ Found ${cases.length} test cases\n`);

    // Update each case with learning outcomes and guidance
    for (const testCase of cases) {
      const category = testCase.category as keyof typeof LEARNING_OUTCOMES;
      const learningObjectives = LEARNING_OUTCOMES[category] || [];
      const guidanceChecklist = GUIDANCE_CHECKLISTS[category] || [];

      const updateStmt = db.prepare(`
        UPDATE test_cases
        SET learning_objectives_json = ?,
            guidance_checklist_json = ?
        WHERE id = ?
      `);

      updateStmt.bind([
        JSON.stringify(learningObjectives),
        JSON.stringify(guidanceChecklist),
        testCase.id,
      ]);
      updateStmt.step();
      updateStmt.free();

      console.log(`✅ Updated Case #${testCase.id} (${category})`);
      console.log(`   Learning Objectives: ${learningObjectives.length}`);
      console.log(`   Guidance Steps: ${guidanceChecklist.length}\n`);
    }

    appDb.saveDb();

    console.log('✅ All test cases updated with learning outcomes!\n');
    console.log('📖 Learning Outcomes Summary:');
    console.log(`   Policy Drift: ${LEARNING_OUTCOMES.policy_drift.length} objectives`);
    console.log(`   Handoff Failure: ${LEARNING_OUTCOMES.handoff_failure.length} objectives`);
    console.log(`   Scheduling Violation: ${LEARNING_OUTCOMES.scheduling_violation.length} objectives\n`);
    console.log('📝 Guidance Checklist Summary:');
    console.log(`   Policy Drift: ${GUIDANCE_CHECKLISTS.policy_drift.length} steps`);
    console.log(`   Handoff Failure: ${GUIDANCE_CHECKLISTS.handoff_failure.length} steps`);
    console.log(`   Scheduling Violation: ${GUIDANCE_CHECKLISTS.scheduling_violation.length} steps\n`);
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

async function migrateLearningColumns(db: any) {
  console.log('📝 Adding learning columns to test_cases table...\n');

  // Get existing data
  const selectStmt = db.prepare('SELECT * FROM test_cases');
  const existingData = [];
  while (selectStmt.step()) {
    existingData.push(selectStmt.getAsObject());
  }
  selectStmt.free();

  console.log(`   Found ${existingData.length} existing test cases`);

  // Drop old table
  db.run('DROP TABLE IF EXISTS test_cases_old');
  db.run('ALTER TABLE test_cases RENAME TO test_cases_old');

  // Create new table with learning columns
  db.run(`
    CREATE TABLE test_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      conversation_id INTEGER,
      expected_behavior TEXT NOT NULL,
      eval_code TEXT NOT NULL,
      llm_judge_rubric TEXT,
      human_label TEXT,
      frozen INTEGER DEFAULT 0,
      learning_objectives_json TEXT,
      guidance_checklist_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Copy data back
  for (const row of existingData) {
    const insertStmt = db.prepare(`
      INSERT INTO test_cases (id, name, description, category, conversation_id, expected_behavior, eval_code, llm_judge_rubric, human_label, frozen, learning_objectives_json, guidance_checklist_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertStmt.bind([
      row.id,
      row.name,
      row.description,
      row.category,
      row.conversation_id,
      row.expected_behavior,
      row.eval_code,
      row.llm_judge_rubric,
      row.human_label,
      row.frozen,
      null, // learning_objectives_json - will be populated later
      null, // guidance_checklist_json - will be populated later
      row.created_at,
    ]);
    insertStmt.step();
    insertStmt.free();
  }

  // Drop old table
  db.run('DROP TABLE test_cases_old');

  appDb.saveDb();

  console.log('✅ Migration complete!\n');
}

seedLearningOutcomes()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
