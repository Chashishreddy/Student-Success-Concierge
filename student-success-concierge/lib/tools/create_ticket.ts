/**
 * create_ticket Tool
 *
 * Creates a support ticket for a student
 */

import appDb from '@/lib/db/appDb';
import type {
  CreateTicketInput,
  CreateTicketOutput,
  ToolResult,
} from '@/lib/types';

/**
 * Create a new support ticket
 *
 * @param input - Ticket creation parameters
 * @returns Tool result with created ticket details
 */
export async function createTicket(
  input: CreateTicketInput
): Promise<ToolResult<CreateTicketOutput>> {
  try {
    const { studentId, category, summary } = input;

    // Validate input
    if (!studentId || studentId <= 0) {
      return {
        success: false,
        error: 'Valid student ID is required',
      };
    }

    if (!category || category.trim().length === 0) {
      return {
        success: false,
        error: 'Category parameter is required',
      };
    }

    if (!summary || summary.trim().length === 0) {
      return {
        success: false,
        error: 'Summary parameter is required',
      };
    }

    // Validate summary length
    if (summary.length > 500) {
      return {
        success: false,
        error: 'Summary must be 500 characters or less',
      };
    }

    const db = await appDb.getDb();

    // Check if student exists
    const studentStmt = db.prepare('SELECT id FROM students WHERE id = ?');
    studentStmt.bind([studentId]);
    const studentExists = studentStmt.step();
    studentStmt.free();

    if (!studentExists) {
      return {
        success: false,
        error: `Student with ID ${studentId} not found`,
      };
    }

    // Valid ticket categories
    const validCategories = [
      'technical',
      'academic',
      'financial',
      'administrative',
      'other',
    ];

    const categoryLower = category.toLowerCase();
    if (!validCategories.includes(categoryLower)) {
      return {
        success: false,
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      };
    }

    // Create ticket
    const insertStmt = db.prepare(`
      INSERT INTO tickets (student_id, category, summary, status)
      VALUES (?, ?, ?, 'open')
    `);
    insertStmt.bind([studentId, categoryLower, summary.trim()]);
    insertStmt.step();
    insertStmt.free();

    // Get the newly created ticket ID
    const lastIdStmt = db.prepare('SELECT last_insert_rowid() as id');
    lastIdStmt.step();
    const ticketId = lastIdStmt.getAsObject().id as number;
    lastIdStmt.free();

    // Get timestamp
    const timestampStmt = db.prepare(
      'SELECT created_at FROM tickets WHERE id = ?'
    );
    timestampStmt.bind([ticketId]);
    timestampStmt.step();
    const created_at = timestampStmt.getAsObject().created_at as string;
    timestampStmt.free();

    // Save database
    appDb.saveDb();

    return {
      success: true,
      output: {
        ticketId,
        category: categoryLower,
        status: 'open',
        created_at,
      },
    };
  } catch (error) {
    console.error('Error in create_ticket tool:', error);
    return {
      success: false,
      error: `Failed to create ticket: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
