/**
 * Chat API Route
 *
 * Handles student chat messages and returns AI responses
 * Integrates with orchestrator for tool calling and guardrails
 */

import { NextRequest, NextResponse } from 'next/server';
import { runOrchestrator } from '@/lib/agent/orchestrator';
import appDb from '@/lib/db/appDb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentHandle, caseId, cohortId, channel, message, traceId } = body;

    // Validate required fields
    if (!studentHandle || typeof studentHandle !== 'string') {
      return NextResponse.json(
        { error: 'studentHandle is required and must be a string' },
        { status: 400 }
      );
    }

    if (!channel || !['sms', 'webchat'].includes(channel)) {
      return NextResponse.json(
        { error: 'channel must be either "sms" or "webchat"' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'message is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Get or create student
    const db = await appDb.getDb();

    // Find student by handle
    let studentStmt = db.prepare('SELECT id FROM students WHERE handle = ?');
    studentStmt.bind([studentHandle]);
    const existingStudent = studentStmt.step() ? studentStmt.getAsObject() : null;
    studentStmt.free();

    let studentId: number;
    if (existingStudent) {
      studentId = existingStudent.id as number;
    } else {
      // Create new student
      const insertStmt = db.prepare('INSERT INTO students (handle) VALUES (?)');
      insertStmt.bind([studentHandle]);
      insertStmt.step();
      insertStmt.free();

      studentId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;
      appDb.saveDb();
    }

    // If caseId provided, check if case is frozen
    if (caseId) {
      const caseStmt = db.prepare('SELECT frozen, name, description FROM test_cases WHERE id = ?');
      caseStmt.bind([caseId]);
      const testCase = caseStmt.step() ? caseStmt.getAsObject() : null;
      caseStmt.free();

      if (!testCase) {
        return NextResponse.json(
          { error: 'Test case not found' },
          { status: 404 }
        );
      }

      if (testCase.frozen === 1) {
        return NextResponse.json(
          {
            error: 'This case is frozen for investigation. Please view the existing traces instead.',
            frozen: true,
          },
          { status: 403 }
        );
      }
    }

    // Get case details if provided
    let caseName: string | undefined;
    let caseDescription: string | undefined;
    if (caseId) {
      const caseStmt = db.prepare('SELECT name, description FROM test_cases WHERE id = ?');
      caseStmt.bind([caseId]);
      const testCase = caseStmt.step() ? caseStmt.getAsObject() : null;
      caseStmt.free();

      if (testCase) {
        caseName = testCase.name as string;
        caseDescription = testCase.description as string;
      }
    }

    // Run orchestrator
    const result = await runOrchestrator(message, {
      channel: channel as 'sms' | 'webchat',
      studentId,
      caseId: caseId || undefined,
      caseName,
      caseDescription,
      cohortId: cohortId || undefined,
    });

    return NextResponse.json({
      traceId: result.traceId,
      assistantMessage: result.response,
      toolCallCount: result.toolCallCount,
      roundCount: result.roundCount,
      violations: result.violations,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
