/**
 * Test Cases API Route
 *
 * GET /api/cases - List all test cases
 */

import { NextResponse } from 'next/server';
import appDb from '@/lib/db/appDb';

export async function GET() {
  try {
    const db = await appDb.getDb();

    const stmt = db.prepare(`
      SELECT
        id,
        name,
        description,
        category,
        frozen,
        created_at
      FROM test_cases
      ORDER BY id
    `);

    const cases = [];
    while (stmt.step()) {
      cases.push(stmt.getAsObject());
    }
    stmt.free();

    return NextResponse.json(cases);
  } catch (error) {
    console.error('Error fetching test cases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test cases' },
      { status: 500 }
    );
  }
}
