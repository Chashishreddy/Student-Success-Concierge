/**
 * Agent Orchestrator
 *
 * Manages the full agent conversation loop with:
 * - System prompt building from case + channel policies
 * - Multi-turn tool calling (max 3 rounds)
 * - Hard guardrails (markdown detection, handoff enforcement)
 * - Full conversation tracing
 */

import { getLLMClient, type LLMClient, type Message, type ToolDefinition } from '../llm/llmClient';
import { runTool } from '../tools';
import { startTrace, logMessage, logToolCall } from '../tracing';
import type { ToolCall as DbToolCall } from '@/lib/types';

// ===== TOOL DEFINITIONS =====

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'search_kb',
    description: 'Search the knowledge base for articles matching a query. Use this to find official information about services, policies, hours, fees, etc.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find relevant articles',
        },
        category: {
          type: 'string',
          description: 'Optional category to filter articles (e.g., "hours", "fees", "services")',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of articles to return (default: 5)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'check_availability',
    description: 'Check available time slots for a service on a specific date. Always check availability before creating appointments.',
    input_schema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          description: 'The service name (e.g., "tutoring", "advising", "counseling")',
        },
        date: {
          type: 'string',
          description: 'Date to check in YYYY-MM-DD format',
        },
        time: {
          type: 'string',
          description: 'Optional specific time to check in HH:MM format',
        },
      },
      required: ['service', 'date'],
    },
  },
  {
    name: 'create_appointment',
    description: 'Create an appointment for a student. Must check availability first. Only book during business hours (9 AM - 5 PM, Monday-Friday) and within 1-30 days from today.',
    input_schema: {
      type: 'object',
      properties: {
        studentId: {
          type: 'number',
          description: 'The student ID',
        },
        service: {
          type: 'string',
          description: 'The service name',
        },
        date: {
          type: 'string',
          description: 'Appointment date in YYYY-MM-DD format',
        },
        time: {
          type: 'string',
          description: 'Appointment time in HH:MM format (must be between 09:00 and 17:00)',
        },
      },
      required: ['studentId', 'service', 'date', 'time'],
    },
  },
  {
    name: 'create_ticket',
    description: 'Create a support ticket to escalate to a human staff member. Use this when the student explicitly requests human assistance or when the issue requires human judgment.',
    input_schema: {
      type: 'object',
      properties: {
        studentId: {
          type: 'number',
          description: 'The student ID',
        },
        category: {
          type: 'string',
          description: 'Ticket category (e.g., "general", "urgent", "technical", "financial")',
        },
        summary: {
          type: 'string',
          description: 'Brief summary of the issue or request',
        },
      },
      required: ['studentId', 'category', 'summary'],
    },
  },
];

// ===== GUARDRAILS =====

/**
 * Check if text contains markdown formatting
 */
function containsMarkdown(text: string): boolean {
  const markdownPatterns = [
    /\*\*[^*]+\*\*/,     // Bold: **text**
    /\*[^*]+\*/,         // Italic: *text*
    /_[^_]+_/,           // Italic: _text_
    /^#{1,6}\s/m,        // Headers: # text
    /^\s*[-*+]\s/m,      // Lists: - item or * item
    /^\s*\d+\.\s/m,      // Numbered lists: 1. item
    /\[([^\]]+)\]\(([^)]+)\)/, // Links: [text](url)
    /`[^`]+`/,           // Code: `code`
  ];

  return markdownPatterns.some((pattern) => pattern.test(text));
}

/**
 * Detect if user is requesting human handoff
 */
function isHandoffRequest(message: string): boolean {
  const handoffKeywords = [
    'human',
    'person',
    'supervisor',
    'speak to someone',
    'real person',
    'talk to someone',
    'staff member',
    'representative',
    'urgent',
    'emergency',
  ];

  const lowerMessage = message.toLowerCase();
  return handoffKeywords.some((keyword) => lowerMessage.includes(keyword));
}

// ===== SYSTEM PROMPT BUILDER =====

/**
 * Build system prompt from case and channel policies
 */
function buildSystemPrompt(params: {
  channel: 'sms' | 'webchat';
  studentId: number;
  testCaseName?: string;
  testCaseDescription?: string;
}): string {
  const { channel, studentId, testCaseName, testCaseDescription } = params;

  let prompt = `You are the Student Success Concierge, an AI assistant helping students at a university.

Your role is to:
- Answer questions about university services, policies, and resources
- Help students schedule appointments
- Create support tickets for issues requiring human assistance
- Be helpful, professional, and accurate

IMPORTANT RULES:
`;

  // Channel-specific rules
  if (channel === 'sms') {
    prompt += `
- SMS CHANNEL: You must respond in plain text only. DO NOT use any markdown formatting (no bold, italic, headers, lists, links, or code blocks). Keep responses concise for SMS.
`;
  } else {
    prompt += `
- Webchat channel: You may use markdown formatting for better readability.
`;
  }

  // Scheduling rules
  prompt += `
- SCHEDULING: Only book appointments during business hours (9 AM - 5 PM, Monday-Friday). Only book appointments 1-30 days from today.
- Always check availability before creating an appointment.
- If a time slot is full or invalid, suggest alternative times.
`;

  // Handoff rules
  prompt += `
- HANDOFF: If a student explicitly requests to speak with a human, or if the issue requires human judgment, create a support ticket using create_ticket and inform the student that a staff member will follow up.
- Look for keywords like "human", "person", "supervisor", "urgent", "emergency".
`;

  // Knowledge base rules
  prompt += `
- ACCURACY: Always search the knowledge base before answering questions about policies, hours, fees, or services. Do not make up information.
- If you're uncertain, search the knowledge base or create a ticket for clarification.
`;

  // Student context
  prompt += `
Student ID: ${studentId}
`;

  // Test case context (if applicable)
  if (testCaseName && testCaseDescription) {
    prompt += `
Test Case: ${testCaseName}
Description: ${testCaseDescription}
`;
  }

  return prompt.trim();
}

// ===== ORCHESTRATOR =====

export interface OrchestratorConfig {
  channel: 'sms' | 'webchat';
  studentId: number;
  caseId?: number;
  caseName?: string;
  caseDescription?: string;
  cohortId?: number;
  maxRounds?: number;
  llmClient?: LLMClient;
}

export interface OrchestratorResult {
  traceId: number;
  response: string;
  toolCallCount: number;
  roundCount: number;
  violations: string[];
}

/**
 * Run the agent orchestrator
 *
 * Manages the full conversation loop:
 * 1. Build system prompt
 * 2. Call LLM with tools
 * 3. Execute tools and append results
 * 4. Repeat up to maxRounds times
 * 5. Apply guardrails
 * 6. Log everything to trace
 */
export async function runOrchestrator(
  userMessage: string,
  config: OrchestratorConfig
): Promise<OrchestratorResult> {
  const {
    channel,
    studentId,
    caseId,
    caseName,
    caseDescription,
    cohortId,
    maxRounds = 3,
    llmClient = getLLMClient(),
  } = config;

  // Initialize trace
  const traceId = await startTrace({
    caseId: caseId || null,
    studentId,
    cohortId: cohortId || null,
    channel,
  });

  // Log user message
  await logMessage(traceId, 'user', userMessage);

  // Build system prompt
  const systemPrompt = buildSystemPrompt({
    channel,
    studentId,
    testCaseName: caseName,
    testCaseDescription: caseDescription,
  });

  // Initialize conversation
  const messages: Message[] = [
    {
      role: 'user',
      content: userMessage,
    },
  ];

  let toolCallCount = 0;
  let roundCount = 0;
  let finalResponse = '';
  const violations: string[] = [];

  // Check for handoff request
  const needsHandoff = isHandoffRequest(userMessage);
  let handoffCreated = false;

  // Main loop (max rounds)
  for (let round = 0; round < maxRounds; round++) {
    roundCount++;

    // Call LLM
    const llmResponse = await llmClient.call({
      system: systemPrompt,
      messages,
      tools: TOOL_DEFINITIONS,
    });

    // If LLM returned text, it's the final response
    if (llmResponse.content && !llmResponse.tool_calls) {
      finalResponse = llmResponse.content;
      break;
    }

    // If LLM wants to use tools
    if (llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {
      // Process each tool call
      for (const toolCall of llmResponse.tool_calls) {
        toolCallCount++;

        // Check if this is a handoff (create_ticket)
        if (toolCall.name === 'create_ticket') {
          handoffCreated = true;
        }

        // Run the tool
        const toolResult = await runTool({
          tool: toolCall.name as any,
          input: toolCall.input,
        });

        // Log tool call
        await logToolCall(
          traceId,
          toolCall.name,
          toolCall.input,
          toolResult
        );

        // Append tool result to conversation
        const resultContent = toolResult.success
          ? JSON.stringify(toolResult.output, null, 2)
          : `Error: ${toolResult.error}`;

        messages.push({
          role: 'assistant',
          content: `[Tool: ${toolCall.name}]`,
        });

        messages.push({
          role: 'user',
          content: `Tool result:\n${resultContent}`,
        });
      }

      // Continue loop to get LLM's response after tool use
      continue;
    }

    // If no content and no tool calls, something went wrong
    if (!llmResponse.content) {
      finalResponse = "I apologize, but I'm having trouble processing your request. Please try again or contact support.";
      violations.push('No content or tool calls returned from LLM');
      break;
    }

    finalResponse = llmResponse.content;
    break;
  }

  // Ensure we always have a response
  if (!finalResponse) {
    finalResponse = "I apologize, but I'm having trouble processing your request. Please try again or contact support.";
    violations.push('No final response generated');
  }

  // Guardrail: Check for handoff requirement
  if (needsHandoff && !handoffCreated) {
    violations.push('Handoff requested but no ticket created');

    // Force create ticket
    const ticketResult = await runTool({
      tool: 'create_ticket',
      input: {
        studentId,
        category: 'general',
        summary: 'Student requested human assistance',
      },
    });

    await logToolCall(traceId, 'create_ticket', {
      studentId,
      category: 'general',
      summary: 'Student requested human assistance',
    }, ticketResult);

    finalResponse = "I've created a support ticket for you. A staff member will reach out to help you shortly.";
  }

  // Guardrail: Check for markdown in SMS
  if (channel === 'sms' && containsMarkdown(finalResponse)) {
    violations.push('Markdown detected in SMS response');

    // Ask LLM to rewrite without markdown
    messages.push({
      role: 'assistant',
      content: finalResponse,
    });

    messages.push({
      role: 'user',
      content: 'Your response contains markdown formatting. Please rewrite it in plain text only, with no bold, italic, headers, lists, or other formatting. Keep it concise for SMS.',
    });

    const rewriteResponse = await llmClient.call({
      system: systemPrompt,
      messages,
      tools: [],
    });

    if (rewriteResponse.content) {
      finalResponse = rewriteResponse.content;
    } else {
      // Strip markdown as fallback
      finalResponse = finalResponse
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^\s*[-*+]\s/gm, '')
        .replace(/^\s*\d+\.\s/gm, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1');
    }
  }

  // Log final assistant message
  await logMessage(traceId, 'assistant', finalResponse);

  return {
    traceId,
    response: finalResponse,
    toolCallCount,
    roundCount,
    violations,
  };
}

/**
 * Run orchestrator with conversation history
 *
 * For multi-turn conversations, pass previous messages
 */
export async function runOrchestratorWithHistory(
  userMessage: string,
  config: OrchestratorConfig,
  previousMessages: Message[]
): Promise<OrchestratorResult> {
  // This is a simplified version for now
  // In a full implementation, we'd maintain conversation state
  return runOrchestrator(userMessage, config);
}
