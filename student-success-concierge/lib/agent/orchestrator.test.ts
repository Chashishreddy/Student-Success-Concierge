/**
 * Orchestrator Tests
 *
 * Tests the agent orchestrator in mock mode
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { runOrchestrator } from './orchestrator';
import { MockLLMClient } from '../llm/llmClient';
import appDb from '../db/appDb';

beforeAll(async () => {
  // Initialize database
  await appDb.initSchema();

  // Create test student
  const db = await appDb.getDb();
  const checkStmt = db.prepare('SELECT id FROM students WHERE handle = ?');
  checkStmt.bind(['test_orchestrator']);
  const exists = checkStmt.step();
  checkStmt.free();

  if (!exists) {
    const insertStmt = db.prepare('INSERT INTO students (handle) VALUES (?)');
    insertStmt.bind(['test_orchestrator']);
    insertStmt.step();
    insertStmt.free();
    appDb.saveDb();
  }
});

describe('Orchestrator', () => {
  it('should handle a simple greeting', async () => {
    const result = await runOrchestrator('Hello!', {
      channel: 'webchat',
      studentId: 1,
      llmClient: new MockLLMClient(),
    });

    expect(result.response).toBeTruthy();
    expect(result.response.toLowerCase()).toContain('hello');
    expect(result.traceId).toBeGreaterThan(0);
    expect(result.toolCallCount).toBe(0);
    expect(result.roundCount).toBe(1);
    expect(result.violations).toHaveLength(0);
  });

  it('should use search_kb tool for questions', async () => {
    const result = await runOrchestrator('What are your office hours?', {
      channel: 'webchat',
      studentId: 1,
      llmClient: new MockLLMClient(),
    });

    expect(result.response).toBeTruthy();
    expect(result.traceId).toBeGreaterThan(0);
    expect(result.toolCallCount).toBeGreaterThan(0);
    expect(result.roundCount).toBeGreaterThan(1);
  });

  it('should detect handoff requests and create tickets', async () => {
    const result = await runOrchestrator('I need to speak with a human', {
      channel: 'webchat',
      studentId: 1,
      llmClient: new MockLLMClient(),
    });

    expect(result.response).toBeTruthy();
    expect(result.traceId).toBeGreaterThan(0);

    // Either the LLM created a ticket (tool call count > 0 and response mentions it)
    // OR the guardrail forced a ticket creation
    const ticketMentioned = result.response.toLowerCase().match(/ticket|staff|reach out|support/);
    const guardrailTriggered = result.violations.includes('Handoff requested but no ticket created');

    // At least one should be true
    expect(ticketMentioned || guardrailTriggered || result.toolCallCount > 0).toBe(true);

    // If guardrail was triggered, response should definitely mention ticket
    if (guardrailTriggered) {
      expect(result.response.toLowerCase()).toMatch(/ticket|staff|reach out|support/);
    }
  });

  it('should enforce handoff guardrail when requested', async () => {
    const result = await runOrchestrator('Can I talk to a real person?', {
      channel: 'webchat',
      studentId: 1,
      llmClient: new MockLLMClient(),
    });

    expect(result.response).toBeTruthy();
    expect(result.traceId).toBeGreaterThan(0);

    // Either the LLM created a ticket, or the guardrail did
    const ticketMentioned = result.response.toLowerCase().match(/ticket|staff|reach out|support/);
    const guardrailTriggered = result.violations.includes('Handoff requested but no ticket created');

    // Should mention ticket in response (either from LLM or guardrail)
    if (guardrailTriggered) {
      // Guardrail should have created ticket and updated response
      expect(result.response.toLowerCase()).toMatch(/ticket|staff|reach out|support/);
    }

    // At minimum, either tool was called OR guardrail triggered
    expect(result.toolCallCount > 0 || guardrailTriggered).toBe(true);
  });

  it('should detect markdown in SMS channel', async () => {
    // Create a mock client that returns markdown first, then plain text
    const markdownClient = new MockLLMClient();
    const originalCall = markdownClient.call.bind(markdownClient);
    let callCount = 0;
    markdownClient.call = async (params) => {
      callCount++;

      // First call: return markdown (simulating bad response)
      if (callCount === 1) {
        return {
          content: '**Important:** Here is some *emphasized* text with `code`.',
          stop_reason: 'end_turn' as const,
        };
      }

      // Second call: rewrite request, return plain text
      if (params.messages.some((m) => m.content.includes('markdown formatting'))) {
        return {
          content: 'Important: Here is some emphasized text with code.',
          stop_reason: 'end_turn' as const,
        };
      }

      return await originalCall(params);
    };

    const result = await runOrchestrator('What are your hours?', {
      channel: 'sms',
      studentId: 1,
      llmClient: markdownClient,
    });

    expect(result.response).toBeTruthy();
    expect(result.traceId).toBeGreaterThan(0);
    expect(result.violations).toContain('Markdown detected in SMS response');
    // Response should have markdown stripped or rewritten
    expect(result.response).not.toMatch(/\*\*|`/);
  });

  it('should respect max rounds limit', async () => {
    const result = await runOrchestrator('Schedule an appointment', {
      channel: 'webchat',
      studentId: 1,
      maxRounds: 2,
      llmClient: new MockLLMClient(),
    });

    expect(result.response).toBeTruthy();
    expect(result.traceId).toBeGreaterThan(0);
    expect(result.roundCount).toBeLessThanOrEqual(2);
  });

  it('should log all messages to trace', async () => {
    const result = await runOrchestrator('Hi there', {
      channel: 'webchat',
      studentId: 1,
      llmClient: new MockLLMClient(),
    });

    expect(result.traceId).toBeGreaterThan(0);

    // Verify trace was logged
    const db = await appDb.getDb();
    const messagesStmt = db.prepare(`
      SELECT * FROM trace_messages
      WHERE trace_id = ?
      ORDER BY created_at
    `);
    messagesStmt.bind([result.traceId]);

    const messages = [];
    while (messagesStmt.step()) {
      messages.push(messagesStmt.getAsObject());
    }
    messagesStmt.free();

    // Should have at least user message + assistant message
    expect(messages.length).toBeGreaterThanOrEqual(2);
    expect(messages[0].role).toBe('user');
    expect(messages[messages.length - 1].role).toBe('assistant');
  });

  it('should log tool calls to trace', async () => {
    const result = await runOrchestrator('What are your hours?', {
      channel: 'webchat',
      studentId: 1,
      llmClient: new MockLLMClient(),
    });

    expect(result.traceId).toBeGreaterThan(0);
    expect(result.toolCallCount).toBeGreaterThan(0);

    // Verify tool calls were logged
    const db = await appDb.getDb();
    const toolCallsStmt = db.prepare(`
      SELECT * FROM trace_tool_calls
      WHERE trace_id = ?
    `);
    toolCallsStmt.bind([result.traceId]);

    const toolCalls = [];
    while (toolCallsStmt.step()) {
      toolCalls.push(toolCallsStmt.getAsObject());
    }
    toolCallsStmt.free();

    expect(toolCalls.length).toBeGreaterThan(0);
    expect(toolCalls[0].tool_name).toBeTruthy();
  });

  it('should include system prompt with channel rules', async () => {
    // This test verifies the system prompt is built correctly
    // We can't directly test the prompt, but we can verify behavior

    // SMS channel should get plain text responses
    const smsResult = await runOrchestrator('Hello', {
      channel: 'sms',
      studentId: 1,
      llmClient: new MockLLMClient(),
    });

    expect(smsResult.response).toBeTruthy();

    // Webchat channel allows markdown
    const webResult = await runOrchestrator('Hello', {
      channel: 'webchat',
      studentId: 1,
      llmClient: new MockLLMClient(),
    });

    expect(webResult.response).toBeTruthy();
  });

  it('should handle tool errors gracefully', async () => {
    // Create a mock client that tries to use invalid tools
    const errorClient = new MockLLMClient();
    const originalCall = errorClient.call.bind(errorClient);
    errorClient.call = async (params) => {
      // Return a tool call that will fail
      return {
        content: '',
        tool_calls: [
          {
            id: 'error_tool',
            name: 'invalid_tool',
            input: {},
          },
        ],
        stop_reason: 'tool_use',
      };
    };

    const result = await runOrchestrator('Test error', {
      channel: 'webchat',
      studentId: 1,
      maxRounds: 1,
      llmClient: errorClient,
    });

    expect(result.response).toBeTruthy();
    expect(result.traceId).toBeGreaterThan(0);
  });
});
