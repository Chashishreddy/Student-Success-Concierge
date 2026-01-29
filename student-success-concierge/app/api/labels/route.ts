/**
 * Labels API Route
 *
 * GET /api/labels - Fetch human labels for traces
 * POST /api/labels - Save a human label
 */

import { NextRequest, NextResponse } from 'next/server';
import appDb from '@/lib/db/appDb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const traceId = searchParams.get('traceId');
    const cohortId = searchParams.get('cohortId');
    const labelType = searchParams.get('labelType');

    const db = await appDb.getDb();

    let query = 'SELECT * FROM human_labels WHERE 1=1';
    const params: any[] = [];

    if (traceId) {
      query += ' AND trace_id = ?';
      params.push(parseInt(traceId));
    }

    if (cohortId) {
      query += ' AND cohort_id = ?';
      params.push(parseInt(cohortId));
    }

    if (labelType) {
      query += ' AND label_type = ?';
      params.push(labelType);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    stmt.bind(params);

    const labels = [];
    while (stmt.step()) {
      labels.push(stmt.getAsObject());
    }
    stmt.free();

    return NextResponse.json({ labels });
  } catch (error) {
    console.error('Error fetching labels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch labels' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { traceId, cohortId, labelType, labelValue } = await request.json();

    if (!traceId || !labelType || !labelValue) {
      return NextResponse.json(
        { error: 'Missing required fields: traceId, labelType, labelValue' },
        { status: 400 }
      );
    }

    if (!['handoff_required', 'policy_adherence', 'overall_pass'].includes(labelType)) {
      return NextResponse.json(
        { error: 'Invalid labelType. Must be: handoff_required, policy_adherence, or overall_pass' },
        { status: 400 }
      );
    }

    if (!['PASS', 'FAIL'].includes(labelValue)) {
      return NextResponse.json(
        { error: 'Invalid labelValue. Must be: PASS or FAIL' },
        { status: 400 }
      );
    }

    const db = await appDb.getDb();

    // Check if label already exists (upsert behavior)
    const checkStmt = db.prepare(`
      SELECT id FROM human_labels
      WHERE trace_id = ? AND label_type = ? AND (cohort_id = ? OR (cohort_id IS NULL AND ? IS NULL))
    `);
    checkStmt.bind([traceId, labelType, cohortId || null, cohortId || null]);
    const existing = checkStmt.step() ? checkStmt.getAsObject() : null;
    checkStmt.free();

    if (existing) {
      // Update existing label
      const updateStmt = db.prepare(`
        UPDATE human_labels
        SET label_value = ?, created_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateStmt.bind([labelValue, existing.id]);
      updateStmt.step();
      updateStmt.free();

      appDb.saveDb();

      return NextResponse.json({
        id: existing.id,
        traceId,
        cohortId: cohortId || null,
        labelType,
        labelValue,
        updated: true,
      });
    } else {
      // Insert new label
      const insertStmt = db.prepare(`
        INSERT INTO human_labels (trace_id, cohort_id, label_type, label_value)
        VALUES (?, ?, ?, ?)
      `);
      insertStmt.bind([traceId, cohortId || null, labelType, labelValue]);
      insertStmt.step();
      insertStmt.free();

      const labelId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;

      appDb.saveDb();

      return NextResponse.json({
        id: labelId,
        traceId,
        cohortId: cohortId || null,
        labelType,
        labelValue,
        updated: false,
      });
    }
  } catch (error) {
    console.error('Error saving label:', error);
    return NextResponse.json(
      { error: 'Failed to save label' },
      { status: 500 }
    );
  }
}
