import { NextRequest, NextResponse } from 'next/server';
import appDb from '@/lib/db/appDb';

export async function POST(request: NextRequest) {
  try {
    const { handle, cohortId } = await request.json();

    if (!handle || typeof handle !== 'string') {
      return NextResponse.json(
        { error: 'Handle is required' },
        { status: 400 }
      );
    }

    // Clean handle
    const cleanHandle = handle.toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (cleanHandle.length < 3) {
      return NextResponse.json(
        { error: 'Handle must be at least 3 characters' },
        { status: 400 }
      );
    }

    const db = await appDb.getDb();

    // Check if handle already exists
    const checkStmt = db.prepare('SELECT id FROM students WHERE handle = ?');
    checkStmt.bind([cleanHandle]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
      return NextResponse.json(
        { error: 'Handle already taken' },
        { status: 409 }
      );
    }

    // Register student
    const insertStmt = db.prepare(
      'INSERT INTO students (handle) VALUES (?)'
    );
    insertStmt.bind([cleanHandle]);
    insertStmt.step();
    insertStmt.free();

    // Get the inserted student ID
    const getStmt = db.prepare('SELECT id, handle, created_at FROM students WHERE handle = ?');
    getStmt.bind([cleanHandle]);
    getStmt.step();
    const student = getStmt.getAsObject();
    getStmt.free();

    appDb.saveDb();

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        handle: student.handle,
        created_at: student.created_at,
        cohortId: cohortId || null,
      },
    });
  } catch (error) {
    console.error('Error registering handle:', error);
    return NextResponse.json(
      { error: 'Failed to register handle' },
      { status: 500 }
    );
  }
}
