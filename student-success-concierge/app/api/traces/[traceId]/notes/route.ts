/**
 * API Route: Trace Notes
 *
 * GET /api/traces/[traceId]/notes - Get all notes for a trace
 * POST /api/traces/[traceId]/notes - Add a new note to a trace
 */

import { NextRequest, NextResponse } from 'next/server';
import appDb from '@/lib/db/appDb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ traceId: string }> }
) {
  const { traceId: traceIdStr } = await params;
  const traceId = parseInt(traceIdStr);

  if (isNaN(traceId)) {
    return NextResponse.json({ error: 'Invalid trace ID' }, { status: 400 });
  }

  try {
    const db = await appDb.getDb();

    const stmt = db.prepare(`
      SELECT * FROM trace_notes
      WHERE trace_id = ?
      ORDER BY created_at DESC
    `);
    stmt.bind([traceId]);

    const notes = [];
    while (stmt.step()) {
      notes.push(stmt.getAsObject());
    }
    stmt.free();

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ traceId: string }> }
) {
  const { traceId: traceIdStr } = await params;
  const traceId = parseInt(traceIdStr);

  if (isNaN(traceId)) {
    return NextResponse.json({ error: 'Invalid trace ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { note_text } = body;

    if (!note_text || typeof note_text !== 'string' || !note_text.trim()) {
      return NextResponse.json(
        { error: 'note_text is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const db = await appDb.getDb();

    // Verify trace exists
    const checkStmt = db.prepare('SELECT id FROM traces WHERE id = ?');
    checkStmt.bind([traceId]);
    const traceExists = checkStmt.step();
    checkStmt.free();

    if (!traceExists) {
      return NextResponse.json({ error: 'Trace not found' }, { status: 404 });
    }

    // Insert note
    const insertStmt = db.prepare(`
      INSERT INTO trace_notes (trace_id, note_text)
      VALUES (?, ?)
    `);
    insertStmt.bind([traceId, note_text.trim()]);
    insertStmt.step();
    insertStmt.free();

    const noteId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];

    appDb.saveDb();

    // Fetch the created note
    const selectStmt = db.prepare('SELECT * FROM trace_notes WHERE id = ?');
    selectStmt.bind([noteId]);
    selectStmt.step();
    const note = selectStmt.getAsObject();
    selectStmt.free();

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}
