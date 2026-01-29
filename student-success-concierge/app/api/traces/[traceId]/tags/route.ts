/**
 * API Route: Trace Tags
 *
 * GET /api/traces/[traceId]/tags - Get all tags for a trace
 * POST /api/traces/[traceId]/tags - Add a tag to a trace
 */

import { NextRequest, NextResponse } from 'next/server';
import appDb from '@/lib/db/appDb';

const VALID_TAGS = [
  'formatting_error',
  'policy_violation',
  'tool_misuse',
  'missed_handoff',
  'hallucination_or_drift',
  'scheduling_error',
] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { traceId: string } }
) {
  const traceId = parseInt(params.traceId);

  if (isNaN(traceId)) {
    return NextResponse.json({ error: 'Invalid trace ID' }, { status: 400 });
  }

  try {
    const db = await appDb.getDb();

    const stmt = db.prepare(`
      SELECT * FROM trace_tags
      WHERE trace_id = ?
      ORDER BY created_at DESC
    `);
    stmt.bind([traceId]);

    const tags = [];
    while (stmt.step()) {
      tags.push(stmt.getAsObject());
    }
    stmt.free();

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { traceId: string } }
) {
  const traceId = parseInt(params.traceId);

  if (isNaN(traceId)) {
    return NextResponse.json({ error: 'Invalid trace ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { tag, cohort_id = null } = body;

    if (!tag || !VALID_TAGS.includes(tag)) {
      return NextResponse.json(
        {
          error: `Invalid tag. Must be one of: ${VALID_TAGS.join(', ')}`,
        },
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

    // Check if tag already exists (to avoid duplicates)
    const existingStmt = db.prepare(`
      SELECT id FROM trace_tags
      WHERE trace_id = ? AND tag = ? AND (cohort_id IS ? OR cohort_id = ?)
    `);
    existingStmt.bind([traceId, tag, cohort_id, cohort_id]);
    const tagExists = existingStmt.step();
    existingStmt.free();

    if (tagExists) {
      return NextResponse.json(
        { error: 'Tag already exists for this trace' },
        { status: 409 }
      );
    }

    // Insert tag
    const insertStmt = db.prepare(`
      INSERT INTO trace_tags (trace_id, cohort_id, tag)
      VALUES (?, ?, ?)
    `);
    insertStmt.bind([traceId, cohort_id, tag]);
    insertStmt.step();
    insertStmt.free();

    const tagId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];

    appDb.saveDb();

    // Fetch the created tag
    const selectStmt = db.prepare('SELECT * FROM trace_tags WHERE id = ?');
    selectStmt.bind([tagId]);
    selectStmt.step();
    const createdTag = selectStmt.getAsObject();
    selectStmt.free();

    return NextResponse.json(createdTag, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
