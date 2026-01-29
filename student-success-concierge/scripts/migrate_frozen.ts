/**
 * Migration Script - Add frozen column to test_cases
 *
 * sql.js doesn't support ALTER TABLE ADD COLUMN directly,
 * so we need to recreate the table
 */

import appDb from '../lib/db/appDb';

async function migrate() {
  console.log('🔄 Migrating test_cases table to add frozen column...\n');

  const db = await appDb.getDb();

  try {
    // Check if frozen column already exists
    const pragma = db.prepare('PRAGMA table_info(test_cases)');
    const columns = [];
    while (pragma.step()) {
      columns.push(pragma.getAsObject());
    }
    pragma.free();

    const hasFrozen = columns.some((col: any) => col.name === 'frozen');

    if (hasFrozen) {
      console.log('✅ Column "frozen" already exists. No migration needed.\n');
      return;
    }

    console.log('📝 Column "frozen" not found. Migrating...\n');

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

    // Create new table with frozen column
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
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Copy data back
    for (const row of existingData) {
      const insertStmt = db.prepare(`
        INSERT INTO test_cases (id, name, description, category, conversation_id, expected_behavior, eval_code, llm_judge_rubric, human_label, frozen, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        0, // default frozen = 0
        row.created_at,
      ]);
      insertStmt.step();
      insertStmt.free();
    }

    // Drop old table
    db.run('DROP TABLE test_cases_old');

    appDb.saveDb();

    console.log('✅ Migration complete!\n');
    console.log(`   Migrated ${existingData.length} test cases`);
    console.log('   Added "frozen" column with default value 0\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

migrate()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
