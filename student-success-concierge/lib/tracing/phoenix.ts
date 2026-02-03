/**
 * Phoenix Tracing Module
 *
 * OpenTelemetry/OpenInference integration for Arize Phoenix
 * Provides advanced observability for LLM conversations
 *
 * Local DB tracing remains the source of truth for the teaching UI.
 * Phoenix is for advanced analysis and visualization.
 */

import { trace, context, SpanStatusCode, Span, SpanKind } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { BasicTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

// OpenInference semantic conventions for LLM observability
// See: https://github.com/Arize-ai/openinference
const OPENINFERENCE = {
  // Span kinds
  SPAN_KIND: 'openinference.span.kind',

  // LLM attributes
  LLM_MODEL_NAME: 'llm.model_name',
  LLM_PROVIDER: 'llm.provider',
  LLM_TOKEN_COUNT_PROMPT: 'llm.token_count.prompt',
  LLM_TOKEN_COUNT_COMPLETION: 'llm.token_count.completion',
  LLM_TOKEN_COUNT_TOTAL: 'llm.token_count.total',
  LLM_INPUT_MESSAGES: 'llm.input_messages',
  LLM_OUTPUT_MESSAGES: 'llm.output_messages',

  // Tool attributes
  TOOL_NAME: 'tool.name',
  TOOL_DESCRIPTION: 'tool.description',
  TOOL_PARAMETERS: 'tool.parameters',
  TOOL_OUTPUT: 'tool.output',

  // Session/conversation attributes
  SESSION_ID: 'session.id',
  USER_ID: 'user.id',

  // Custom attributes for teaching app
  CASE_ID: 'teaching.case_id',
  COHORT_ID: 'teaching.cohort_id',
  STUDENT_ID: 'teaching.student_id',
  SCENARIO: 'teaching.scenario',
  CHANNEL: 'teaching.channel',
  LOCAL_TRACE_ID: 'teaching.local_trace_id',
};

// Span kinds for OpenInference
type OpenInferenceSpanKind = 'CHAIN' | 'LLM' | 'TOOL' | 'RETRIEVER' | 'EMBEDDING' | 'AGENT';

let provider: BasicTracerProvider | null = null;
let isInitialized = false;

/**
 * Check if Phoenix tracing is enabled
 */
export function isPhoenixEnabled(): boolean {
  return !!process.env.PHOENIX_COLLECTOR_ENDPOINT;
}

/**
 * Initialize Phoenix tracing
 * Call this once at application startup
 */
export function initPhoenixTracing(): boolean {
  if (isInitialized) {
    return true;
  }

  const endpoint = process.env.PHOENIX_COLLECTOR_ENDPOINT;
  if (!endpoint) {
    console.log('[Phoenix] Tracing disabled - PHOENIX_COLLECTOR_ENDPOINT not set');
    return false;
  }

  try {
    // Create OTLP exporter for Phoenix
    const exporter = new OTLPTraceExporter({
      url: endpoint,
      headers: process.env.PHOENIX_API_KEY
        ? { Authorization: `Bearer ${process.env.PHOENIX_API_KEY}` }
        : undefined,
    });

    // Create resource with service info
    const resource = new Resource({
      'service.name': 'student-success-concierge',
      'service.version': '1.0.0',
    });

    // Create and register provider
    provider = new BasicTracerProvider({ resource });
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    provider.register();

    isInitialized = true;
    console.log(`[Phoenix] Tracing initialized - sending to ${endpoint}`);
    return true;
  } catch (error) {
    console.error('[Phoenix] Failed to initialize tracing:', error);
    return false;
  }
}

/**
 * Get the Phoenix tracer
 */
function getTracer() {
  if (!isInitialized) {
    initPhoenixTracing();
  }
  return trace.getTracer('student-success-concierge');
}

/**
 * Create a root span for a conversation/orchestration run
 */
export function startConversationSpan(params: {
  localTraceId: number;
  caseId?: number | null;
  cohortId?: number | null;
  studentId?: number | null;
  channel: string;
  scenario?: string;
}): Span | null {
  if (!isPhoenixEnabled()) {
    return null;
  }

  const tracer = getTracer();

  const span = tracer.startSpan('conversation', {
    kind: SpanKind.SERVER,
    attributes: {
      [OPENINFERENCE.SPAN_KIND]: 'CHAIN' as OpenInferenceSpanKind,
      [OPENINFERENCE.LOCAL_TRACE_ID]: params.localTraceId,
      [OPENINFERENCE.CASE_ID]: params.caseId ?? undefined,
      [OPENINFERENCE.COHORT_ID]: params.cohortId ?? undefined,
      [OPENINFERENCE.STUDENT_ID]: params.studentId ?? undefined,
      [OPENINFERENCE.CHANNEL]: params.channel,
      [OPENINFERENCE.SCENARIO]: params.scenario ?? 'unknown',
      [OPENINFERENCE.SESSION_ID]: `trace-${params.localTraceId}`,
      [OPENINFERENCE.USER_ID]: params.studentId ? `student-${params.studentId}` : undefined,
    },
  });

  return span;
}

/**
 * Create a child span for an LLM call
 */
export function startLLMSpan(
  parentSpan: Span | null,
  params: {
    model: string;
    provider: string;
    inputMessages: Array<{ role: string; content: string }>;
  }
): Span | null {
  if (!isPhoenixEnabled() || !parentSpan) {
    return null;
  }

  const tracer = getTracer();
  const parentContext = trace.setSpan(context.active(), parentSpan);

  const span = tracer.startSpan(
    'llm_call',
    {
      kind: SpanKind.CLIENT,
      attributes: {
        [OPENINFERENCE.SPAN_KIND]: 'LLM' as OpenInferenceSpanKind,
        [OPENINFERENCE.LLM_MODEL_NAME]: params.model,
        [OPENINFERENCE.LLM_PROVIDER]: params.provider,
        [OPENINFERENCE.LLM_INPUT_MESSAGES]: JSON.stringify(params.inputMessages),
      },
    },
    parentContext
  );

  return span;
}

/**
 * End an LLM span with output and token counts
 */
export function endLLMSpan(
  span: Span | null,
  params: {
    outputMessage?: string;
    promptTokens?: number;
    completionTokens?: number;
    error?: Error;
  }
): void {
  if (!span) return;

  if (params.outputMessage) {
    span.setAttribute(OPENINFERENCE.LLM_OUTPUT_MESSAGES, params.outputMessage);
  }

  if (params.promptTokens !== undefined) {
    span.setAttribute(OPENINFERENCE.LLM_TOKEN_COUNT_PROMPT, params.promptTokens);
  }

  if (params.completionTokens !== undefined) {
    span.setAttribute(OPENINFERENCE.LLM_TOKEN_COUNT_COMPLETION, params.completionTokens);
  }

  if (params.promptTokens !== undefined && params.completionTokens !== undefined) {
    span.setAttribute(
      OPENINFERENCE.LLM_TOKEN_COUNT_TOTAL,
      params.promptTokens + params.completionTokens
    );
  }

  if (params.error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: params.error.message });
    span.recordException(params.error);
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }

  span.end();
}

/**
 * Create a child span for a tool call
 */
export function startToolSpan(
  parentSpan: Span | null,
  params: {
    toolName: string;
    toolDescription?: string;
    toolParameters: Record<string, any>;
  }
): Span | null {
  if (!isPhoenixEnabled() || !parentSpan) {
    return null;
  }

  const tracer = getTracer();
  const parentContext = trace.setSpan(context.active(), parentSpan);

  const span = tracer.startSpan(
    `tool:${params.toolName}`,
    {
      kind: SpanKind.CLIENT,
      attributes: {
        [OPENINFERENCE.SPAN_KIND]: 'TOOL' as OpenInferenceSpanKind,
        [OPENINFERENCE.TOOL_NAME]: params.toolName,
        [OPENINFERENCE.TOOL_DESCRIPTION]: params.toolDescription ?? '',
        [OPENINFERENCE.TOOL_PARAMETERS]: JSON.stringify(params.toolParameters),
      },
    },
    parentContext
  );

  return span;
}

/**
 * End a tool span with output and optional row count
 */
export function endToolSpan(
  span: Span | null,
  params: {
    output: any;
    rowCount?: number;
    error?: Error;
  }
): void {
  if (!span) return;

  span.setAttribute(OPENINFERENCE.TOOL_OUTPUT, JSON.stringify(params.output));

  if (params.rowCount !== undefined) {
    span.setAttribute('tool.row_count', params.rowCount);
  }

  if (params.error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: params.error.message });
    span.recordException(params.error);
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }

  span.end();
}

/**
 * End a conversation span
 */
export function endConversationSpan(
  span: Span | null,
  params: {
    toolCallCount: number;
    violations: string[];
    error?: Error;
  }
): void {
  if (!span) return;

  span.setAttribute('conversation.tool_call_count', params.toolCallCount);
  span.setAttribute('conversation.violation_count', params.violations.length);

  if (params.violations.length > 0) {
    span.setAttribute('conversation.violations', JSON.stringify(params.violations));
  }

  if (params.error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: params.error.message });
    span.recordException(params.error);
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }

  span.end();
}

/**
 * Shutdown Phoenix tracing gracefully
 */
export async function shutdownPhoenixTracing(): Promise<void> {
  if (provider) {
    await provider.shutdown();
    provider = null;
    isInitialized = false;
    console.log('[Phoenix] Tracing shut down');
  }
}

// Export constants for external use
export { OPENINFERENCE };
