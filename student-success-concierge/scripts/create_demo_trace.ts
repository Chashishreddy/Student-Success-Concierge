/**
 * Create Demo Trace Script
 *
 * Creates a sample trace with messages and tool calls to demonstrate the tracing system
 */

import { startTrace, logMessage, logToolCall } from '../lib/tracing';
import appDb from '../lib/db/appDb';
import kbDb from '../lib/db/kbDb';

async function createDemoTrace() {
  console.log('🎬 Creating demo trace...\n');

  // Initialize databases
  await appDb.initSchema();
  await kbDb.initSchema();

  const db = await appDb.getDb();

  // Ensure we have a test student
  const checkStudent = db.prepare("SELECT id FROM students WHERE handle = 'demo_student'");
  checkStudent.step();
  let studentId = checkStudent.getAsObject().id as number | undefined;
  checkStudent.free();

  if (!studentId) {
    console.log('📝 Creating demo student...');
    const insertStudent = db.prepare("INSERT INTO students (handle) VALUES ('demo_student')");
    insertStudent.step();
    insertStudent.free();

    const getStudentId = db.prepare('SELECT last_insert_rowid() as id');
    getStudentId.step();
    studentId = getStudentId.getAsObject().id as number;
    getStudentId.free();
    appDb.saveDb();
  }

  // Ensure we have a test cohort
  const checkCohort = db.prepare("SELECT id FROM cohorts WHERE name = 'Demo Cohort'");
  checkCohort.step();
  let cohortId = checkCohort.getAsObject().id as number | undefined;
  checkCohort.free();

  if (!cohortId) {
    console.log('📝 Creating demo cohort...');
    const insertCohort = db.prepare("INSERT INTO cohorts (name, active) VALUES ('Demo Cohort', 1)");
    insertCohort.step();
    insertCohort.free();

    const getCohortId = db.prepare('SELECT last_insert_rowid() as id');
    getCohortId.step();
    cohortId = getCohortId.getAsObject().id as number;
    getCohortId.free();
    appDb.saveDb();
  }

  console.log(`✅ Student ID: ${studentId}, Cohort ID: ${cohortId}\n`);

  // Create a new trace
  console.log('🚀 Starting trace...');
  const traceId = await startTrace({
    studentId,
    cohortId,
    channel: 'webchat',
  });
  console.log(`✅ Trace created with ID: ${traceId}\n`);

  // Simulate a conversation with tool calls
  console.log('💬 Logging conversation...\n');

  // User message 1
  await logMessage(
    traceId,
    'user',
    'Hi! I need help finding information about financial aid.'
  );
  console.log('  [User] Hi! I need help finding information about financial aid.');

  // Assistant response 1
  await logMessage(
    traceId,
    'assistant',
    "I'll help you find information about financial aid. Let me search our knowledge base."
  );
  console.log('  [Assistant] I\'ll help you find information about financial aid...');

  // Tool call 1: search_kb
  await logToolCall(traceId, 'search_kb',
    { query: 'financial aid', category: 'financial_aid', limit: 3 },
    {
      success: true,
      output: {
        articles: [
          {
            id: 1,
            title: 'Financial Aid Overview',
            category: 'financial_aid',
            content: 'Information about financial aid programs...',
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            title: 'How to Apply for Scholarships',
            category: 'financial_aid',
            content: 'Step-by-step guide...',
            created_at: new Date().toISOString(),
          },
        ],
        count: 2,
      },
    }
  );
  console.log('  [Tool Call] search_kb → Found 2 articles\n');

  // Assistant response 2
  await logMessage(
    traceId,
    'assistant',
    'I found some helpful articles about financial aid. Here are the key resources:\n\n1. Financial Aid Overview\n2. How to Apply for Scholarships\n\nWould you like to schedule an appointment with a financial aid advisor?'
  );
  console.log('  [Assistant] I found some helpful articles...');

  // User message 2
  await logMessage(
    traceId,
    'user',
    'Yes, I\'d like to schedule an appointment for next Tuesday at 2 PM.'
  );
  console.log('  [User] Yes, I\'d like to schedule an appointment...');

  // Assistant response 3
  await logMessage(
    traceId,
    'assistant',
    'Let me check availability for Tuesday.'
  );
  console.log('  [Assistant] Let me check availability for Tuesday.');

  // Tool call 2: check_availability
  const nextTuesday = getNextTuesday();
  await logToolCall(traceId, 'check_availability',
    { service: 'advising', date: nextTuesday, time: '14:00' },
    {
      success: true,
      output: {
        service: 'advising',
        date: nextTuesday,
        slots: [
          {
            date: nextTuesday,
            time: '14:00',
            available: true,
            capacity: 3,
            bookings: 0,
          },
        ],
      },
    }
  );
  console.log('  [Tool Call] check_availability → Slot available\n');

  // Assistant response 4
  await logMessage(
    traceId,
    'assistant',
    `Great! There is availability on ${nextTuesday} at 2:00 PM. Let me create that appointment for you.`
  );
  console.log('  [Assistant] Great! There is availability...');

  // Tool call 3: create_appointment
  await logToolCall(traceId, 'create_appointment',
    { studentId, service: 'advising', date: nextTuesday, time: '14:00' },
    {
      success: true,
      output: {
        appointmentId: 1,
        service: 'advising',
        date: nextTuesday,
        time: '14:00',
        status: 'scheduled',
      },
    }
  );
  console.log('  [Tool Call] create_appointment → Appointment #1 created\n');

  // Assistant response 5
  await logMessage(
    traceId,
    'assistant',
    `Perfect! I've scheduled your appointment with a financial aid advisor for ${nextTuesday} at 2:00 PM. You'll receive a confirmation email shortly. Is there anything else I can help you with?`
  );
  console.log('  [Assistant] Perfect! I\'ve scheduled your appointment...');

  // User message 3
  await logMessage(traceId, 'user', 'No, that\'s all. Thank you!');
  console.log('  [User] No, that\'s all. Thank you!');

  // Assistant response 6
  await logMessage(
    traceId,
    'assistant',
    'You\'re welcome! Have a great day, and we\'ll see you on Tuesday!'
  );
  console.log('  [Assistant] You\'re welcome! Have a great day...\n');

  console.log('✅ Demo trace created successfully!\n');
  console.log(`📊 Trace Summary:`);
  console.log(`   - Trace ID: ${traceId}`);
  console.log(`   - Student: demo_student (ID: ${studentId})`);
  console.log(`   - Cohort: Demo Cohort (ID: ${cohortId})`);
  console.log(`   - Messages: 9`);
  console.log(`   - Tool Calls: 3`);
  console.log(`   - Tools Used: search_kb, check_availability, create_appointment\n`);
  console.log(`🔗 View trace at: http://localhost:3000/admin/traces/${traceId}\n`);

  return traceId;
}

function getNextTuesday(): string {
  const today = new Date();
  const daysUntilTuesday = (2 - today.getDay() + 7) % 7 || 7; // 2 = Tuesday
  const nextTuesday = new Date(today);
  nextTuesday.setDate(today.getDate() + daysUntilTuesday);

  const year = nextTuesday.getFullYear();
  const month = String(nextTuesday.getMonth() + 1).padStart(2, '0');
  const day = String(nextTuesday.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// Run the script
createDemoTrace()
  .then((traceId) => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
