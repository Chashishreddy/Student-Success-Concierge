import { NextRequest, NextResponse } from 'next/server';
import appDb from '@/lib/db/appDb';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cohortId = parseInt(id);

    if (isNaN(cohortId)) {
      return NextResponse.json(
        { error: 'Invalid cohort ID' },
        { status: 400 }
      );
    }

    const db = await appDb.getDb();

    // Verify cohort exists
    const checkStmt = db.prepare('SELECT id, name FROM cohorts WHERE id = ?');
    checkStmt.bind([cohortId]);
    const cohortExists = checkStmt.step();
    if (!cohortExists) {
      checkStmt.free();
      return NextResponse.json(
        { error: 'Cohort not found' },
        { status: 404 }
      );
    }
    const cohortData = checkStmt.getAsObject();
    checkStmt.free();

    // Archive conversations for this cohort
    const archiveStmt = db.prepare(
      'UPDATE conversations SET archived = 1 WHERE cohort_id = ?'
    );
    archiveStmt.bind([cohortId]);
    archiveStmt.step();
    archiveStmt.free();

    // Delete conversation notes for this cohort
    const deleteNotesStmt = db.prepare(
      'DELETE FROM conversation_notes WHERE cohort_id = ?'
    );
    deleteNotesStmt.bind([cohortId]);
    deleteNotesStmt.step();
    deleteNotesStmt.free();

    // Delete conversation tags for this cohort
    const deleteTagsStmt = db.prepare(
      'DELETE FROM conversation_tags WHERE cohort_id = ?'
    );
    deleteTagsStmt.bind([cohortId]);
    deleteTagsStmt.step();
    deleteTagsStmt.free();

    // Delete eval results for this cohort
    const deleteEvalsStmt = db.prepare(
      'DELETE FROM eval_results WHERE cohort_id = ?'
    );
    deleteEvalsStmt.bind([cohortId]);
    deleteEvalsStmt.step();
    deleteEvalsStmt.free();

    // Get counts for reporting
    const archivedCount = db.prepare(
      'SELECT COUNT(*) as count FROM conversations WHERE cohort_id = ? AND archived = 1'
    );
    archivedCount.bind([cohortId]);
    archivedCount.step();
    const archived = archivedCount.getAsObject();
    archivedCount.free();

    appDb.saveDb();

    return NextResponse.json({
      success: true,
      cohort: cohortData,
      archived: archived.count,
      message: `Cohort "${cohortData.name}" reset successfully. ${archived.count} conversations archived, notes/tags/eval results cleared.`,
    });
  } catch (error) {
    console.error('Error resetting cohort:', error);
    return NextResponse.json(
      { error: 'Failed to reset cohort' },
      { status: 500 }
    );
  }
}
