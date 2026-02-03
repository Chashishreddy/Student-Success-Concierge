/**
 * Docs API Route
 *
 * GET /api/docs?doc=student-quickstart
 * Returns markdown content for documentation
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ALLOWED_DOCS = ['student-quickstart', 'instructor-quickstart'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doc = searchParams.get('doc');

    if (!doc || !ALLOWED_DOCS.includes(doc)) {
      return NextResponse.json(
        { error: 'Invalid document. Allowed: ' + ALLOWED_DOCS.join(', ') },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), 'docs', `${doc}.md`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error fetching doc:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}
