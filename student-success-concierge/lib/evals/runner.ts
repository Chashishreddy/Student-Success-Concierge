/**
 * Eval Runner Module
 *
 * Core evaluation logic for running binary pass/fail evals on traces
 */

import appDb, { Trace, TraceMessage, TraceToolCall } from '../db/appDb';

export interface EvalResult {
  pass: boolean;
  details: any;
}

export interface RunEvalsOptions {
  caseId?: number;
  cohortId?: number;
}

export interface RunEvalsResult {
  evalRunId: number;
  totalEvals: number;
  passedEvals: number;
  failedEvals: number;
  breakdown: Array<{
    evalName: string;
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  }>;
}

/**
 * Eval 1: SMS No Markdown
 * Checks that SMS messages don't contain markdown formatting
 */
export function evalSmsNoMarkdown(
  trace: Trace,
  messages: TraceMessage[],
  toolCalls: TraceToolCall[]
): EvalResult {
  // Only applies to SMS channel
  if (trace.channel !== 'sms') {
    return { pass: true, details: { reason: 'Not an SMS trace' } };
  }

  const markdownPatterns = [
    /\*\*[^*]+\*\*/,     // Bold: **text**
    /\*[^*]+\*/,         // Italic: *text*
    /`[^`]+`/,           // Code: `text`
    /^#+\s/m,            // Headers: # Header
    /^[-*+]\s/m,         // Lists: - item
    /\[([^\]]+)\]\(([^)]+)\)/, // Links: [text](url)
  ];

  const assistantMessages = messages.filter((m) => m.role === 'assistant');

  for (const msg of assistantMessages) {
    for (const pattern of markdownPatterns) {
      if (pattern.test(msg.content)) {
        return {
          pass: false,
          details: {
            reason: 'Markdown found in SMS message',
            message_id: msg.id,
            content: msg.content.substring(0, 100),
            pattern: pattern.source,
          },
        };
      }
    }
  }

  return { pass: true, details: { reason: 'No markdown found in SMS messages' } };
}

/**
 * Eval 2: Handoff Required
 * If user requests handoff, ensure create_ticket tool was called
 */
export function evalHandoffRequired(
  trace: Trace,
  messages: TraceMessage[],
  toolCalls: TraceToolCall[]
): EvalResult {
  const handoffKeywords = [
    'human', 'person', 'supervisor', 'manager', 'staff',
    'real person', 'speak to someone', 'talk to someone',
    'escalate', 'representative', 'agent',
  ];

  const userMessages = messages.filter((m) => m.role === 'user');

  // Check if any user message contains handoff keywords
  const handoffRequested = userMessages.some((msg) => {
    const lowerContent = msg.content.toLowerCase();
    return handoffKeywords.some((keyword) => lowerContent.includes(keyword));
  });

  if (!handoffRequested) {
    return { pass: true, details: { reason: 'No handoff requested' } };
  }

  // Handoff was requested - check if create_ticket was called
  const ticketCreated = toolCalls.some((tc) => tc.tool_name === 'create_ticket');

  if (!ticketCreated) {
    const requestMessage = userMessages.find((msg) => {
      const lowerContent = msg.content.toLowerCase();
      return handoffKeywords.some((keyword) => lowerContent.includes(keyword));
    });

    return {
      pass: false,
      details: {
        reason: 'Handoff requested but no ticket created',
        user_message: requestMessage?.content.substring(0, 100),
      },
    };
  }

  return { pass: true, details: { reason: 'Ticket created for handoff request' } };
}

/**
 * Eval 3: No Double Booking
 * Checks that no two appointments were booked for the same slot
 */
export function evalNoDoubleBooking(
  trace: Trace,
  messages: TraceMessage[],
  toolCalls: TraceToolCall[]
): EvalResult {
  const bookAppointmentCalls = toolCalls.filter((tc) => tc.tool_name === 'book_appointment');

  if (bookAppointmentCalls.length === 0) {
    return { pass: true, details: { reason: 'No appointments booked' } };
  }

  const bookedSlots = new Map<string, any>();

  for (const call of bookAppointmentCalls) {
    try {
      const input = JSON.parse(call.input_json);
      const output = JSON.parse(call.output_json);

      // Check if booking was successful
      const success = output.success || output.status === 'scheduled';

      if (success) {
        const slotKey = `${input.service}|${input.date}|${input.time}`;

        if (bookedSlots.has(slotKey)) {
          return {
            pass: false,
            details: {
              reason: 'Double booking detected',
              slot: { service: input.service, date: input.date, time: input.time },
              first_booking: bookedSlots.get(slotKey),
              second_booking: { tool_call_id: call.id },
            },
          };
        }

        bookedSlots.set(slotKey, { tool_call_id: call.id, input });
      }
    } catch (err) {
      // Skip malformed tool calls
      continue;
    }
  }

  return { pass: true, details: { reason: 'No double bookings', bookings_count: bookedSlots.size } };
}

/**
 * Run all evals on traces
 */
export async function runEvals(options?: RunEvalsOptions): Promise<RunEvalsResult> {
  await appDb.initSchema();
  const db = await appDb.getDb();

  // Create eval run
  const evalRunStmt = db.prepare(`
    INSERT INTO eval_runs (cohort_id, case_id)
    VALUES (?, ?)
  `);
  evalRunStmt.bind([options?.cohortId || null, options?.caseId || null]);
  evalRunStmt.step();
  evalRunStmt.free();

  const evalRunId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;

  // Fetch traces
  let tracesQuery = 'SELECT * FROM traces WHERE archived = 0';
  const params: any[] = [];

  if (options?.caseId) {
    tracesQuery += ' AND case_id = ?';
    params.push(options.caseId);
  }

  if (options?.cohortId) {
    tracesQuery += ' AND cohort_id = ?';
    params.push(options.cohortId);
  }

  const tracesStmt = db.prepare(tracesQuery);
  tracesStmt.bind(params);

  const traces: Trace[] = [];
  while (tracesStmt.step()) {
    traces.push(tracesStmt.getAsObject() as any as Trace);
  }
  tracesStmt.free();

  const evals = [
    { name: 'sms_no_markdown', fn: evalSmsNoMarkdown },
    { name: 'handoff_required', fn: evalHandoffRequired },
    { name: 'no_double_booking', fn: evalNoDoubleBooking },
  ];

  let totalEvals = 0;
  let passedEvals = 0;
  let failedEvals = 0;

  for (const trace of traces) {
    // Fetch messages for this trace
    const messagesStmt = db.prepare('SELECT * FROM trace_messages WHERE trace_id = ? ORDER BY id');
    messagesStmt.bind([trace.id]);
    const messages: TraceMessage[] = [];
    while (messagesStmt.step()) {
      messages.push(messagesStmt.getAsObject() as any as TraceMessage);
    }
    messagesStmt.free();

    // Fetch tool calls for this trace
    const toolCallsStmt = db.prepare('SELECT * FROM trace_tool_calls WHERE trace_id = ? ORDER BY id');
    toolCallsStmt.bind([trace.id]);
    const toolCalls: TraceToolCall[] = [];
    while (toolCallsStmt.step()) {
      toolCalls.push(toolCallsStmt.getAsObject() as any as TraceToolCall);
    }
    toolCallsStmt.free();

    // Run each eval
    for (const evalDef of evals) {
      const result = evalDef.fn(trace, messages, toolCalls);
      totalEvals++;

      if (result.pass) {
        passedEvals++;
      } else {
        failedEvals++;
      }

      // Store result
      const resultStmt = db.prepare(`
        INSERT INTO trace_eval_results (eval_run_id, trace_id, eval_name, pass, details_json)
        VALUES (?, ?, ?, ?, ?)
      `);
      resultStmt.bind([
        evalRunId,
        trace.id,
        evalDef.name,
        result.pass ? 1 : 0,
        JSON.stringify(result.details),
      ]);
      resultStmt.step();
      resultStmt.free();
    }
  }

  appDb.saveDb();

  // Get breakdown by eval
  const breakdown = [];
  for (const evalDef of evals) {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(pass) as passed
      FROM trace_eval_results
      WHERE eval_run_id = ? AND eval_name = ?
    `);
    stmt.bind([evalRunId, evalDef.name]);
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();

    const total = (row.total as number) || 0;
    const passed = (row.passed as number) || 0;
    const failed = total - passed;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    breakdown.push({
      evalName: evalDef.name,
      total,
      passed,
      failed,
      passRate,
    });
  }

  return {
    evalRunId,
    totalEvals,
    passedEvals,
    failedEvals,
    breakdown,
  };
}
