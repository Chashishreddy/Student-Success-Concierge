/**
 * API Route: Delete Trace Tag
 *
 * DELETE /api/traces/[traceId]/tags/[tagId] - Remove a tag from a trace
 */

import { NextRequest, NextResponse } from 'next/server';
import appDb from '@/lib/db/appDb';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { traceId: string; tagId: string } }
) {
  const traceId = parseInt(params.traceId);
  const tagId = parseInt(params.tagId);

  if (isNaN(traceId) || isNaN(tagId)) {
    return NextResponse.json(
      { error: 'Invalid trace ID or tag ID' },
      { status: 400 }
    );
  }

  try {
    const db = await appDb.getDb();

    // Verify tag exists and belongs to this trace
    const checkStmt = db.prepare(`
      SELECT id FROM trace_tags
      WHERE id = ? AND trace_id = ?
    `);
    checkStmt.bind([tagId, traceId]);
    const tagExists = checkStmt.step();
    checkStmt.free();

    if (!tagExists) {
      return NextResponse.json(
        { error: 'Tag not found for this trace' },
        { status: 404 }
      );
    }

    // Delete tag
    const deleteStmt = db.prepare('DELETE FROM trace_tags WHERE id = ?');
    deleteStmt.bind([tagId]);
    deleteStmt.step();
    deleteStmt.free();

    appDb.saveDb();

    return NextResponse.json({ success: true, message: 'Tag deleted' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
