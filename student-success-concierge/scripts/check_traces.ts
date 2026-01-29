import appDb from '../lib/db/appDb';

(async () => {
  const db = await appDb.getDb();
  const stmt = db.prepare('SELECT id, student_id, case_id, channel, created_at FROM traces WHERE id >= 62 ORDER BY id');
  console.log('Recent traces:');
  while (stmt.step()) {
    const trace = stmt.getAsObject();
    console.log(`  Trace #${trace.id}: student_id=${trace.student_id}, channel=${trace.channel}`);
  }
  stmt.free();
})();
