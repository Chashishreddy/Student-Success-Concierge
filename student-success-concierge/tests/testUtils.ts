/**
 * Test Utilities
 *
 * Shared utilities for test files
 */

import appDb from '@/lib/db/appDb';
import kbDb from '@/lib/db/kbDb';

/**
 * Initialize test databases with sample data
 * Only runs once per test session (checks database state to avoid duplicates)
 */
export async function initTestDatabases() {
  // Initialize app database
  await appDb.initSchema();
  const appDatabase = await appDb.getDb();

  // Check if test student already exists
  const checkStmt = appDatabase.prepare(
    "SELECT COUNT(*) as count FROM students WHERE handle = 'test_student'"
  );
  checkStmt.step();
  const studentExists = (checkStmt.getAsObject().count as number) > 0;
  checkStmt.free();

  if (!studentExists) {
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
  }

  // Initialize KB database
  await kbDb.initSchema();
  const kbDatabase = await kbDb.getDb();

  // Check if KB articles already exist
  const checkKbStmt = kbDatabase.prepare('SELECT COUNT(*) as count FROM kb_articles');
  checkKbStmt.step();
  const articlesExist = (checkKbStmt.getAsObject().count as number) > 0;
  checkKbStmt.free();

  if (!articlesExist) {
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
  }
}
