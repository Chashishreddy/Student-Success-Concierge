import { NextRequest, NextResponse } from 'next/server';
import appDb from '@/lib/db/appDb';

export async function POST(request: NextRequest) {
  try {
    const { handle } = await request.json();

    if (!handle || typeof handle !== 'string') {
      return NextResponse.json(
        { error: 'Handle is required' },
        { status: 400 }
      );
    }

    // Clean handle: lowercase, alphanumeric + underscore only
    const cleanHandle = handle.toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (cleanHandle.length < 3) {
      return NextResponse.json(
        { available: false, error: 'Handle must be at least 3 characters' },
        { status: 200 }
      );
    }

    const db = await appDb.getDb();
    const stmt = db.prepare('SELECT id FROM students WHERE handle = ?');
    stmt.bind([cleanHandle]);

    const exists = stmt.step();
    stmt.free();

    return NextResponse.json({
      available: !exists,
      handle: cleanHandle,
    });
  } catch (error) {
    console.error('Error checking handle:', error);
    return NextResponse.json(
      { error: 'Failed to check handle' },
      { status: 500 }
    );
  }
}
