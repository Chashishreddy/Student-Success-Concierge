/**
 * Seed Traces Script
 *
 * Creates ~60 traces across 3 test cases with deliberate failure modes
 * - 20 traces per case category
 * - Various failure patterns for student investigation
 */

import { startTrace, logMessage, logToolCall } from '../lib/tracing';
import appDb from '../lib/db/appDb';

// Test case categories
const CATEGORIES = ['policy_drift', 'handoff_failure', 'scheduling_violation'] as const;

// Student names for variety
const STUDENTS = ['alex_chen', 'jordan_lee', 'taylor_kim', 'morgan_cruz', 'casey_patel'];

async function seedTraces() {
  console.log('🌱 Seeding trace dataset...\n');

  // Initialize database
  await appDb.initSchema();
  const db = await appDb.getDb();

  // Get or create test cases
  const testCases = await ensureTestCases(db);
  console.log(`✅ Test cases ready: ${testCases.length}\n`);

  // Get or create students
  const studentIds = await ensureStudents(db);
  console.log(`✅ Students ready: ${studentIds.length}\n`);

  // Get default cohort
  const cohortStmt = db.prepare('SELECT id FROM cohorts ORDER BY id LIMIT 1');
  cohortStmt.step();
  const cohortId = cohortStmt.getAsObject().id as number;
  cohortStmt.free();

  let totalTraces = 0;

  // Create 20 traces per category
  for (const testCase of testCases) {
    console.log(`\n📂 Creating traces for: ${testCase.name}`);
    console.log(`   Category: ${testCase.category}`);
    console.log(`   Frozen: ${testCase.frozen ? 'Yes' : 'No'}\n`);

    const tracesPerCase = 20;

    for (let i = 0; i < tracesPerCase; i++) {
      const studentId = studentIds[i % studentIds.length];
      const channel = i % 3 === 0 ? 'sms' : 'webchat';

      let traceId: number;

      switch (testCase.category) {
        case 'policy_drift':
          traceId = await createPolicyDriftTrace(testCase.id, studentId, cohortId, channel, i);
          break;
        case 'handoff_failure':
          traceId = await createHandoffFailureTrace(testCase.id, studentId, cohortId, channel, i);
          break;
        case 'scheduling_violation':
          traceId = await createSchedulingViolationTrace(testCase.id, studentId, cohortId, channel, i);
          break;
      }

      totalTraces++;
      if ((i + 1) % 5 === 0) {
        console.log(`   Created ${i + 1}/${tracesPerCase} traces...`);
      }
    }

    console.log(`   ✅ Completed ${tracesPerCase} traces for ${testCase.name}`);
  }

  console.log(`\n✅ Seeding complete!`);
  console.log(`📊 Total traces created: ${totalTraces}`);
  console.log(`   - Policy Drift: 20`);
  console.log(`   - Handoff Failure: 20`);
  console.log(`   - Scheduling Violation: 20\n`);
  console.log(`🔗 View traces at: http://localhost:3000/admin/traces\n`);
}

async function ensureTestCases(db: any) {
  // Check if test cases exist
  const checkStmt = db.prepare('SELECT * FROM test_cases ORDER BY id');
  const existing = [];
  while (checkStmt.step()) {
    existing.push(checkStmt.getAsObject());
  }
  checkStmt.free();

  if (existing.length >= 3) {
    // Update existing cases to be frozen
    const updateStmt = db.prepare('UPDATE test_cases SET frozen = 1');
    updateStmt.step();
    updateStmt.free();
    appDb.saveDb();
    return existing;
  }

  // Create test cases
  const cases = [
    {
      name: 'Policy Drift Detection',
      description: 'Detect when agent provides incorrect information that contradicts knowledge base',
      category: 'policy_drift',
      expected_behavior: 'Agent should only provide information consistent with KB articles',
      eval_code: 'Check if answer contradicts KB content',
      frozen: 1,
    },
    {
      name: 'Handoff Failure Detection',
      description: 'Detect when agent fails to escalate when student requests human assistance',
      category: 'handoff_failure',
      expected_behavior: 'Agent must escalate when student uses handoff keywords or asks for human',
      eval_code: 'Check for handoff keywords without proper escalation',
      frozen: 1,
    },
    {
      name: 'Scheduling Violation Detection',
      description: 'Detect scheduling errors like double-booking or booking outside business hours',
      category: 'scheduling_violation',
      expected_behavior: 'Agent must validate slots are available and within business hours',
      eval_code: 'Check for invalid time slots or capacity violations',
      frozen: 1,
    },
  ];

  const createdCases = [];
  for (const testCase of cases) {
    const stmt = db.prepare(`
      INSERT INTO test_cases (name, description, category, expected_behavior, eval_code, frozen)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.bind([
      testCase.name,
      testCase.description,
      testCase.category,
      testCase.expected_behavior,
      testCase.eval_code,
      testCase.frozen,
    ]);
    stmt.step();
    stmt.free();

    const idStmt = db.prepare('SELECT last_insert_rowid() as id');
    idStmt.step();
    const id = idStmt.getAsObject().id as number;
    idStmt.free();

    createdCases.push({ id, ...testCase });
  }

  appDb.saveDb();
  return createdCases;
}

async function ensureStudents(db: any) {
  const studentIds = [];

  for (const student of STUDENTS) {
    // Check if exists
    const checkStmt = db.prepare('SELECT id FROM students WHERE handle = ?');
    checkStmt.bind([student]);
    if (checkStmt.step()) {
      studentIds.push(checkStmt.getAsObject().id as number);
      checkStmt.free();
      continue;
    }
    checkStmt.free();

    // Create student
    const insertStmt = db.prepare('INSERT INTO students (handle) VALUES (?)');
    insertStmt.bind([student]);
    insertStmt.step();
    insertStmt.free();

    const idStmt = db.prepare('SELECT last_insert_rowid() as id');
    idStmt.step();
    studentIds.push(idStmt.getAsObject().id as number);
    idStmt.free();
  }

  appDb.saveDb();
  return studentIds;
}

// ===== POLICY DRIFT TRACES =====

async function createPolicyDriftTrace(
  caseId: number,
  studentId: number,
  cohortId: number,
  channel: 'sms' | 'webchat',
  index: number
): Promise<number> {
  const traceId = await startTrace({ caseId, studentId, cohortId, channel });

  const scenarios = [
    // Scenario 1: Incorrect fee information
    {
      query: 'How much does tutoring cost?',
      wrongAnswer: 'Tutoring costs $50 per hour.',
      correctInfo: 'Free tutoring services available',
    },
    // Scenario 2: Wrong office hours
    {
      query: 'When is the advising office open?',
      wrongAnswer: 'The advising office is open 24/7.',
      correctInfo: 'Business hours 9 AM - 5 PM',
    },
    // Scenario 3: Incorrect scholarship deadline
    {
      query: 'When is the scholarship application due?',
      wrongAnswer: 'The scholarship deadline was last month.',
      correctInfo: 'Scholarship applications open February',
    },
  ];

  const scenario = scenarios[index % scenarios.length];

  await logMessage(traceId, 'user', scenario.query);

  // Search KB (correct info available)
  await logToolCall(
    traceId,
    'search_kb',
    { query: scenario.query.split(' ').slice(0, 3).join(' '), limit: 3 },
    {
      success: true,
      output: {
        articles: [
          {
            id: 1,
            title: 'Services Overview',
            category: 'services',
            content: scenario.correctInfo,
            created_at: new Date().toISOString(),
          },
        ],
        count: 1,
      },
    }
  );

  // Agent provides WRONG answer (policy drift!)
  const driftAnswer =
    index % 2 === 0
      ? scenario.wrongAnswer // Direct contradiction
      : `Based on my knowledge, ${scenario.wrongAnswer.toLowerCase()}`; // Subtle drift

  // Add markdown in SMS (extra failure mode)
  const finalAnswer =
    channel === 'sms' && index % 3 === 0
      ? `**Important:** ${driftAnswer} _Please note this carefully._` // Markdown in SMS!
      : driftAnswer;

  await logMessage(traceId, 'assistant', finalAnswer);
  await logMessage(traceId, 'user', 'Thank you!');

  return traceId;
}

// ===== HANDOFF FAILURE TRACES =====

async function createHandoffFailureTrace(
  caseId: number,
  studentId: number,
  cohortId: number,
  channel: 'sms' | 'webchat',
  index: number
): Promise<number> {
  const traceId = await startTrace({ caseId, studentId, cohortId, channel });

  const handoffRequests = [
    'I need to speak with a real person about this.',
    'Can I talk to a human advisor?',
    'This is urgent, I need to speak to someone now.',
    'I want to talk to your supervisor.',
    'This bot is not helping. Connect me to a person.',
    'I need to speak with a representative.',
  ];

  const request = handoffRequests[index % handoffRequests.length];

  await logMessage(traceId, 'user', 'I have a question about financial aid.');
  await logMessage(
    traceId,
    'assistant',
    'I can help with financial aid questions. What would you like to know?'
  );

  // User explicitly requests handoff
  await logMessage(traceId, 'user', request);

  // Agent FAILS to handoff (handoff failure!)
  const failedResponses = [
    "I understand you'd like to speak with someone. Let me try to help you first. What is your question?",
    'I can assist you with most questions. What specific issue are you having?',
    "I'm here to help! Can you tell me more about what you need?",
    'Before connecting you to someone, let me see if I can resolve this for you.',
  ];

  const failedResponse = failedResponses[index % failedResponses.length];

  // Add markdown in SMS sometimes
  const finalResponse =
    channel === 'sms' && index % 4 === 0
      ? `### ${failedResponse}\n\n- First, let's try this\n- Then we can escalate` // Markdown list in SMS!
      : failedResponse;

  await logMessage(traceId, 'assistant', finalResponse);

  // User gets frustrated
  await logMessage(
    traceId,
    'user',
    "No, I really need to speak with a person. This isn't working."
  );

  // Agent still doesn't handoff properly
  await logMessage(
    traceId,
    'assistant',
    "I apologize for the frustration. I'll do my best to help. What's the issue?"
  );

  return traceId;
}

// ===== SCHEDULING VIOLATION TRACES =====

async function createSchedulingViolationTrace(
  caseId: number,
  studentId: number,
  cohortId: number,
  channel: 'sms' | 'webchat',
  index: number
): Promise<number> {
  const traceId = await startTrace({ caseId, studentId, cohortId, channel });

  const violationTypes = [
    'outside_hours',
    'weekend',
    'double_book',
    'past_date',
    'too_far_future',
  ];

  const violationType = violationTypes[index % violationTypes.length];

  await logMessage(traceId, 'user', 'I need to schedule a tutoring session.');
  await logMessage(traceId, 'assistant', 'I can help you schedule tutoring. What date works for you?');

  let date: string, time: string, violation: string;

  switch (violationType) {
    case 'outside_hours':
      date = '2026-02-10';
      time = '20:00'; // 8 PM - outside business hours!
      violation = 'booking outside business hours (9 AM - 5 PM)';
      await logMessage(traceId, 'user', 'How about February 10th at 8 PM?');
      break;

    case 'weekend':
      date = '2026-02-08'; // Saturday
      time = '14:00';
      violation = 'booking on weekend';
      await logMessage(traceId, 'user', 'Can I book for this Saturday at 2 PM?');
      break;

    case 'double_book':
      date = '2026-02-05';
      time = '10:00';
      violation = 'double-booking (slot already full)';
      await logMessage(traceId, 'user', 'February 5th at 10 AM would be great.');
      break;

    case 'past_date':
      date = '2026-01-15'; // Past date
      time = '14:00';
      violation = 'booking in the past';
      await logMessage(traceId, 'user', 'Can we do January 15th at 2 PM?');
      break;

    case 'too_far_future':
      date = '2026-06-01'; // > 30 days
      time = '14:00';
      violation = 'booking too far in future (>30 days)';
      await logMessage(traceId, 'user', 'I want to book for June 1st at 2 PM.');
      break;
  }

  // Agent checks availability (incorrectly shows as available or skips validation)
  if (violationType === 'double_book') {
    await logToolCall(
      traceId,
      'check_availability',
      { service: 'tutoring', date, time },
      {
        success: true,
        output: {
          service: 'tutoring',
          date,
          slots: [
            {
              date,
              time,
              available: false, // Actually NOT available!
              capacity: 5,
              bookings: 5, // Full!
            },
          ],
        },
      }
    );
  }

  // Agent VIOLATES policy by booking anyway!
  await logMessage(
    traceId,
    'assistant',
    `Great! Let me book that appointment for ${date} at ${time.replace(':00', ':00 ')}${
      parseInt(time.split(':')[0]) >= 12 ? 'PM' : 'AM'
    }.`
  );

  await logToolCall(
    traceId,
    'create_appointment',
    { studentId, service: 'tutoring', date, time },
    {
      success: true, // Violation: booked despite constraints!
      output: {
        appointmentId: Math.floor(Math.random() * 1000),
        service: 'tutoring',
        date,
        time,
        status: 'scheduled',
      },
    }
  );

  // Add markdown in SMS sometimes
  const confirmMessage =
    channel === 'sms' && index % 3 === 0
      ? `✓ **Confirmed!** Your appointment is scheduled.\n\n*Date:* ${date}\n*Time:* ${time}` // Markdown in SMS!
      : `Perfect! Your tutoring session is confirmed for ${date} at ${time}. You'll receive a confirmation email shortly.`;

  await logMessage(traceId, 'assistant', confirmMessage);
  await logMessage(traceId, 'user', 'Thanks!');

  return traceId;
}

// Run the script
seedTraces()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
