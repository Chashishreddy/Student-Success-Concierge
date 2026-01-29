/**
 * Tracing Library
 *
 * Functions for creating and managing execution traces
 * Traces capture conversations, messages, and tool calls for evaluation and debugging
 */

import appDb from '@/lib/db/appDb';
import type { Trace, TraceMessage, TraceToolCall } from '@/lib/db/appDb';

// ===== TRACE MANAGEMENT =====

export interface StartTraceParams {
  caseId?: number | null;
  studentId?: number | null;
  cohortId?: number | null;
  channel: 'sms' | 'webchat';
}

/**
 * Start a new trace
 *
 * @param params - Trace initialization parameters
 * @returns Trace ID
 */
export async function startTrace(params: StartTraceParams): Promise<number> {
  const { caseId = null, studentId = null, cohortId = null, channel } = params;

  const db = await appDb.getDb();

  const stmt = db.prepare(`
    INSERT INTO traces (case_id, student_id, cohort_id, channel, archived)
    VALUES (?, ?, ?, ?, 0)
  `);

  stmt.bind([caseId, studentId, cohortId, channel]);
  stmt.step();
  stmt.free();

  // Get the newly created trace ID
  const lastIdStmt = db.prepare('SELECT last_insert_rowid() as id');
  lastIdStmt.step();
  const traceId = lastIdStmt.getAsObject().id as number;
  lastIdStmt.free();

  appDb.saveDb();

  return traceId;
}

/**
 * Log a message to a trace
 *
 * @param traceId - Trace ID
 * @param role - Message role (user, assistant, system)
 * @param content - Message content
 * @returns Message ID
 */
export async function logMessage(
  traceId: number,
  role: 'user' | 'assistant' | 'system',
  content: string
): Promise<number> {
  const db = await appDb.getDb();

  const stmt = db.prepare(`
    INSERT INTO trace_messages (trace_id, role, content)
    VALUES (?, ?, ?)
  `);

  stmt.bind([traceId, role, content]);
  stmt.step();
  stmt.free();

  // Get the newly created message ID
  const lastIdStmt = db.prepare('SELECT last_insert_rowid() as id');
  lastIdStmt.step();
  const messageId = lastIdStmt.getAsObject().id as number;
  lastIdStmt.free();

  appDb.saveDb();

  return messageId;
}

/**
 * Log a tool call to a trace
 *
 * @param traceId - Trace ID
 * @param toolName - Name of the tool called
 * @param input - Tool input (will be JSON stringified)
 * @param output - Tool output (will be JSON stringified)
 * @returns Tool call ID
 */
export async function logToolCall(
  traceId: number,
  toolName: string,
  input: any,
  output: any
): Promise<number> {
  const db = await appDb.getDb();

  const inputJson = JSON.stringify(input);
  const outputJson = JSON.stringify(output);

  const stmt = db.prepare(`
    INSERT INTO trace_tool_calls (trace_id, tool_name, input_json, output_json)
    VALUES (?, ?, ?, ?)
  `);

  stmt.bind([traceId, toolName, inputJson, outputJson]);
  stmt.step();
  stmt.free();

  // Get the newly created tool call ID
  const lastIdStmt = db.prepare('SELECT last_insert_rowid() as id');
  lastIdStmt.step();
  const toolCallId = lastIdStmt.getAsObject().id as number;
  lastIdStmt.free();

  appDb.saveDb();

  return toolCallId;
}

// ===== TRACE RETRIEVAL =====

/**
 * Get a trace by ID
 *
 * @param traceId - Trace ID
 * @returns Trace or null if not found
 */
export async function getTrace(traceId: number): Promise<Trace | null> {
  const db = await appDb.getDb();

  const stmt = db.prepare('SELECT * FROM traces WHERE id = ?');
  stmt.bind([traceId]);

  if (stmt.step()) {
    const trace = stmt.getAsObject() as Trace;
    stmt.free();
    return trace;
  }

  stmt.free();
  return null;
}

/**
 * Get all messages for a trace
 *
 * @param traceId - Trace ID
 * @returns Array of messages ordered by creation time
 */
export async function getTraceMessages(traceId: number): Promise<TraceMessage[]> {
  const db = await appDb.getDb();

  const stmt = db.prepare(`
    SELECT * FROM trace_messages
    WHERE trace_id = ?
    ORDER BY created_at ASC, id ASC
  `);
  stmt.bind([traceId]);

  const messages: TraceMessage[] = [];
  while (stmt.step()) {
    messages.push(stmt.getAsObject() as TraceMessage);
  }
  stmt.free();

  return messages;
}

/**
 * Get all tool calls for a trace
 *
 * @param traceId - Trace ID
 * @returns Array of tool calls ordered by creation time
 */
export async function getTraceToolCalls(traceId: number): Promise<TraceToolCall[]> {
  const db = await appDb.getDb();

  const stmt = db.prepare(`
    SELECT * FROM trace_tool_calls
    WHERE trace_id = ?
    ORDER BY created_at ASC, id ASC
  `);
  stmt.bind([traceId]);

  const toolCalls: TraceToolCall[] = [];
  while (stmt.step()) {
    toolCalls.push(stmt.getAsObject() as TraceToolCall);
  }
  stmt.free();

  return toolCalls;
}

/**
 * Get complete trace with messages and tool calls
 *
 * @param traceId - Trace ID
 * @returns Trace with messages and tool calls, or null if not found
 */
export async function getCompleteTrace(traceId: number): Promise<{
  trace: Trace;
  messages: TraceMessage[];
  toolCalls: TraceToolCall[];
} | null> {
  const trace = await getTrace(traceId);
  if (!trace) {
    return null;
  }

  const messages = await getTraceMessages(traceId);
  const toolCalls = await getTraceToolCalls(traceId);

  return { trace, messages, toolCalls };
}

/**
 * List all traces with optional filtering
 *
 * @param filters - Optional filters
 * @returns Array of traces
 */
export async function listTraces(filters?: {
  caseId?: number;
  studentId?: number;
  cohortId?: number;
  channel?: string;
  archived?: boolean;
}): Promise<Trace[]> {
  const db = await appDb.getDb();

  let query = 'SELECT * FROM traces WHERE 1=1';
  const params: any[] = [];

  if (filters?.caseId !== undefined) {
    query += ' AND case_id = ?';
    params.push(filters.caseId);
  }

  if (filters?.studentId !== undefined) {
    query += ' AND student_id = ?';
    params.push(filters.studentId);
  }

  if (filters?.cohortId !== undefined) {
    query += ' AND cohort_id = ?';
    params.push(filters.cohortId);
  }

  if (filters?.channel) {
    query += ' AND channel = ?';
    params.push(filters.channel);
  }

  if (filters?.archived !== undefined) {
    query += ' AND archived = ?';
    params.push(filters.archived ? 1 : 0);
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  if (params.length > 0) {
    stmt.bind(params);
  }

  const traces: Trace[] = [];
  while (stmt.step()) {
    traces.push(stmt.getAsObject() as Trace);
  }
  stmt.free();

  return traces;
}

/**
 * Archive a trace
 *
 * @param traceId - Trace ID
 */
export async function archiveTrace(traceId: number): Promise<void> {
  const db = await appDb.getDb();

  const stmt = db.prepare('UPDATE traces SET archived = 1 WHERE id = ?');
  stmt.bind([traceId]);
  stmt.step();
  stmt.free();

  appDb.saveDb();
}

/**
 * Delete a trace and all associated messages and tool calls
 *
 * @param traceId - Trace ID
 */
export async function deleteTrace(traceId: number): Promise<void> {
  const db = await appDb.getDb();

  // Delete tool calls
  const deleteToolCallsStmt = db.prepare('DELETE FROM trace_tool_calls WHERE trace_id = ?');
  deleteToolCallsStmt.bind([traceId]);
  deleteToolCallsStmt.step();
  deleteToolCallsStmt.free();

  // Delete messages
  const deleteMessagesStmt = db.prepare('DELETE FROM trace_messages WHERE trace_id = ?');
  deleteMessagesStmt.bind([traceId]);
  deleteMessagesStmt.step();
  deleteMessagesStmt.free();

  // Delete trace
  const deleteTraceStmt = db.prepare('DELETE FROM traces WHERE id = ?');
  deleteTraceStmt.bind([traceId]);
  deleteTraceStmt.step();
  deleteTraceStmt.free();

  appDb.saveDb();
}

// ===== UTILITY FUNCTIONS =====

/**
 * Get trace count with optional filtering
 *
 * @param filters - Optional filters
 * @returns Count of traces
 */
export async function getTraceCount(filters?: {
  caseId?: number;
  studentId?: number;
  cohortId?: number;
  archived?: boolean;
}): Promise<number> {
  const db = await appDb.getDb();

  let query = 'SELECT COUNT(*) as count FROM traces WHERE 1=1';
  const params: any[] = [];

  if (filters?.caseId !== undefined) {
    query += ' AND case_id = ?';
    params.push(filters.caseId);
  }

  if (filters?.studentId !== undefined) {
    query += ' AND student_id = ?';
    params.push(filters.studentId);
  }

  if (filters?.cohortId !== undefined) {
    query += ' AND cohort_id = ?';
    params.push(filters.cohortId);
  }

  if (filters?.archived !== undefined) {
    query += ' AND archived = ?';
    params.push(filters.archived ? 1 : 0);
  }

  const stmt = db.prepare(query);
  if (params.length > 0) {
    stmt.bind(params);
  }

  stmt.step();
  const count = stmt.getAsObject().count as number;
  stmt.free();

  return count;
}

export default {
  startTrace,
  logMessage,
  logToolCall,
  getTrace,
  getTraceMessages,
  getTraceToolCalls,
  getCompleteTrace,
  listTraces,
  archiveTrace,
  deleteTrace,
  getTraceCount,
};
