import { NextRequest, NextResponse } from 'next/server';
import appDb from '@/lib/db/appDb';

// GET - List all cohorts
export async function GET() {
  try {
    const db = await appDb.getDb();
    const stmt = db.prepare('SELECT * FROM cohorts ORDER BY created_at DESC');

    const cohorts: any[] = [];
    while (stmt.step()) {
      cohorts.push(stmt.getAsObject());
    }
    stmt.free();

    return NextResponse.json({ cohorts });
  } catch (error) {
    console.error('Error fetching cohorts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cohorts' },
      { status: 500 }
    );
  }
}

// POST - Create a new cohort
export async function POST(request: NextRequest) {
  try {
    const { name, active } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Cohort name is required' },
        { status: 400 }
      );
    }

    const db = await appDb.getDb();

    // Check if name already exists
    const checkStmt = db.prepare('SELECT id FROM cohorts WHERE name = ?');
    checkStmt.bind([name]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
      return NextResponse.json(
        { error: 'Cohort name already exists' },
        { status: 409 }
      );
    }

    // If this cohort should be active, deactivate others
    if (active) {
      const deactivateStmt = db.prepare('UPDATE cohorts SET active = 0');
      deactivateStmt.step();
      deactivateStmt.free();
    }

    // Create cohort
    const insertStmt = db.prepare(
      'INSERT INTO cohorts (name, active) VALUES (?, ?)'
    );
    insertStmt.bind([name, active ? 1 : 0]);
    insertStmt.step();
    insertStmt.free();

    // Get the inserted cohort
    const getStmt = db.prepare('SELECT * FROM cohorts WHERE name = ?');
    getStmt.bind([name]);
    getStmt.step();
    const cohort = getStmt.getAsObject();
    getStmt.free();

    appDb.saveDb();

    return NextResponse.json({
      success: true,
      cohort,
    });
  } catch (error) {
    console.error('Error creating cohort:', error);
    return NextResponse.json(
      { error: 'Failed to create cohort' },
      { status: 500 }
    );
  }
}
