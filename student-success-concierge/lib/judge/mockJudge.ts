/**
 * Mock Judge Module
 *
 * Provides deterministic pass/fail judgments for trace validation.
 * Uses pattern matching similar to code-based evals.
 */

import { Trace, TraceMessage, TraceToolCall } from '../db/appDb';

export type LabelType = 'handoff_required' | 'policy_adherence' | 'overall_pass';
export type LabelValue = 'PASS' | 'FAIL';

export interface JudgeResult {
  labelType: LabelType;
  labelValue: LabelValue;
  reasoning: string;
  confidence: number;
}

/**
 * Judge: Handoff Required
 * Evaluates if handoff requests were properly handled
 */
export function judgeHandoffRequired(
  trace: Trace,
  messages: TraceMessage[],
  toolCalls: TraceToolCall[]
): JudgeResult {
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
    return {
      labelType: 'handoff_required',
      labelValue: 'PASS',
      reasoning: 'No handoff requested by user',
      confidence: 1.0,
    };
  }

  // Handoff was requested - check if create_ticket was called
  const ticketCreated = toolCalls.some((tc) => tc.tool_name === 'create_ticket');

  if (ticketCreated) {
    return {
      labelType: 'handoff_required',
      labelValue: 'PASS',
      reasoning: 'Handoff requested and ticket created successfully',
      confidence: 1.0,
    };
  }

  return {
    labelType: 'handoff_required',
    labelValue: 'FAIL',
    reasoning: 'Handoff requested but no ticket was created',
    confidence: 0.9,
  };
}

/**
 * Judge: Policy Adherence
 * Evaluates if policies were followed (no markdown in SMS, no double booking, etc.)
 */
export function judgePolicyAdherence(
  trace: Trace,
  messages: TraceMessage[],
  toolCalls: TraceToolCall[]
): JudgeResult {
  const violations: string[] = [];

  // Check 1: No markdown in SMS
  if (trace.channel === 'sms') {
    const markdownPatterns = [
      { pattern: /\*\*[^*]+\*\*/, name: 'bold' },
      { pattern: /\*[^*]+\*/, name: 'italic' },
      { pattern: /`[^`]+`/, name: 'code' },
      { pattern: /^#+\s/m, name: 'header' },
      { pattern: /^[-*+]\s/m, name: 'list' },
    ];

    const assistantMessages = messages.filter((m) => m.role === 'assistant');

    for (const msg of assistantMessages) {
      for (const { pattern, name } of markdownPatterns) {
        if (pattern.test(msg.content)) {
          violations.push(`SMS message contains ${name} markdown`);
          break;
        }
      }
      if (violations.length > 0) break;
    }
  }

  // Check 2: No double booking
  const bookAppointmentCalls = toolCalls.filter((tc) => tc.tool_name === 'book_appointment');
  const bookedSlots = new Map<string, any>();

  for (const call of bookAppointmentCalls) {
    try {
      const input = JSON.parse(call.input_json);
      const output = JSON.parse(call.output_json);

      const success = output.success || output.status === 'scheduled';

      if (success) {
        const slotKey = `${input.service}|${input.date}|${input.time}`;

        if (bookedSlots.has(slotKey)) {
          violations.push('Double booking detected for same slot');
          break;
        }

        bookedSlots.set(slotKey, { tool_call_id: call.id });
      }
    } catch (err) {
      // Skip malformed tool calls
      continue;
    }
  }

  // Check 3: No failed tool calls (basic policy check)
  const failedToolCalls = toolCalls.filter((tc) => {
    try {
      const output = JSON.parse(tc.output_json);
      return output.error || output.success === false;
    } catch {
      return false;
    }
  });

  if (failedToolCalls.length > 3) {
    violations.push('Multiple failed tool calls indicate policy issues');
  }

  if (violations.length === 0) {
    return {
      labelType: 'policy_adherence',
      labelValue: 'PASS',
      reasoning: 'No policy violations detected',
      confidence: 0.95,
    };
  }

  return {
    labelType: 'policy_adherence',
    labelValue: 'FAIL',
    reasoning: violations.join('; '),
    confidence: 0.85,
  };
}

/**
 * Judge: Overall Pass
 * Provides overall assessment of the trace quality
 */
export function judgeOverallPass(
  trace: Trace,
  messages: TraceMessage[],
  toolCalls: TraceToolCall[]
): JudgeResult {
  // Run both other judges
  const handoffResult = judgeHandoffRequired(trace, messages, toolCalls);
  const policyResult = judgePolicyAdherence(trace, messages, toolCalls);

  const handoffFailed = handoffResult.labelValue === 'FAIL';
  const policyFailed = policyResult.labelValue === 'FAIL';

  // Additional checks for overall quality
  const assistantMessages = messages.filter((m) => m.role === 'assistant');
  const userMessages = messages.filter((m) => m.role === 'user');

  // Check if conversation seems complete
  const noAssistantResponse = assistantMessages.length === 0 && userMessages.length > 0;
  const veryShort = messages.length < 2;

  if (noAssistantResponse) {
    return {
      labelType: 'overall_pass',
      labelValue: 'FAIL',
      reasoning: 'No assistant response to user message',
      confidence: 1.0,
    };
  }

  if (veryShort) {
    return {
      labelType: 'overall_pass',
      labelValue: 'FAIL',
      reasoning: 'Trace too short to be meaningful',
      confidence: 0.8,
    };
  }

  // If both handoff and policy passed, overall should pass
  if (!handoffFailed && !policyFailed) {
    return {
      labelType: 'overall_pass',
      labelValue: 'PASS',
      reasoning: 'Handoff and policy checks passed',
      confidence: 0.9,
    };
  }

  // If either failed, overall fails
  const reasons: string[] = [];
  if (handoffFailed) reasons.push(handoffResult.reasoning);
  if (policyFailed) reasons.push(policyResult.reasoning);

  return {
    labelType: 'overall_pass',
    labelValue: 'FAIL',
    reasoning: reasons.join('; '),
    confidence: 0.85,
  };
}

/**
 * Run all judges on a trace
 */
export function runAllJudges(
  trace: Trace,
  messages: TraceMessage[],
  toolCalls: TraceToolCall[]
): JudgeResult[] {
  return [
    judgeHandoffRequired(trace, messages, toolCalls),
    judgePolicyAdherence(trace, messages, toolCalls),
    judgeOverallPass(trace, messages, toolCalls),
  ];
}

/**
 * Run a specific judge on a trace
 */
export function runJudge(
  labelType: LabelType,
  trace: Trace,
  messages: TraceMessage[],
  toolCalls: TraceToolCall[]
): JudgeResult {
  switch (labelType) {
    case 'handoff_required':
      return judgeHandoffRequired(trace, messages, toolCalls);
    case 'policy_adherence':
      return judgePolicyAdherence(trace, messages, toolCalls);
    case 'overall_pass':
      return judgeOverallPass(trace, messages, toolCalls);
    default:
      throw new Error(`Unknown label type: ${labelType}`);
  }
}
