/**
 * Test Utilities
 *
 * Shared utilities for test files
 */

import appDb from '@/lib/db/appDb';
import kbDb from '@/lib/db/kbDb';

let dbInitialized = false;

/**
 * Initialize test databases with sample data
 * Only runs once per test session
 */
export async function initTestDatabases() {
  if (dbInitialized) {
    return;
  }

  // Initialize app database
  await appDb.initSchema();
  const appDatabase = await appDb.getDb();

  // Insert test student
  const studentStmt = appDatabase.prepare(
    "INSERT INTO students (handle) VALUES ('test_student')"
  );
  studentStmt.step();
  studentStmt.free();

  // Insert test availability slots
  const slotStmt = appDatabase.prepare(`
    INSERT INTO availability_slots (service, date, time, available, max_capacity, current_bookings)
    VALUES
      ('tutoring', '2026-02-15', '10:00', 1, 5, 0),
      ('tutoring', '2026-02-15', '11:00', 1, 5, 5),
      ('advising', '2026-02-16', '14:00', 1, 3, 0)
  `);
  slotStmt.step();
  slotStmt.free();

  appDb.saveDb();

  // Initialize KB database
  await kbDb.initSchema();
  const kbDatabase = await kbDb.getDb();

  // Insert test KB articles
  const articleStmt = kbDatabase.prepare(`
    INSERT INTO kb_articles (title, content, category)
    VALUES
      ('Financial Aid Overview', 'Information about financial aid programs and scholarships...', 'financial_aid'),
      ('How to Apply for Scholarships', 'Step-by-step guide for scholarship applications...', 'financial_aid'),
      ('Academic Calendar', 'Important dates for the academic year...', 'academics'),
      ('Tutoring Services', 'We offer free tutoring in math, science, and writing...', 'support_services')
  `);
  articleStmt.step();
  articleStmt.free();

  kbDb.saveDb();

  dbInitialized = true;
}
