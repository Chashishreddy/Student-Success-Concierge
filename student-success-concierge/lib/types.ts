/**
 * Core Type System for Student Success Concierge
 *
 * Provides strong TypeScript types for:
 * - Database entities (re-exported from appDb)
 * - Tool system (tool names, inputs, outputs)
 * - Policy rules
 * - Conversation tracing
 */

// ===== DATABASE ENTITY TYPES =====
// Re-export from appDb for convenience
export type {
  Student,
  Cohort,
  Appointment,
  Ticket,
  Conversation,
  Message,
  ToolCall as DbToolCall,
  AvailabilitySlot,
  TestCase,
  EvalResult,
  ConversationNote,
  Tag,
  ConversationTag,
} from '@/lib/db/appDb';

// ===== TOOL SYSTEM TYPES =====

/**
 * Available tool names
 */
export type ToolName =
  | 'search_kb'
  | 'check_availability'
  | 'create_appointment'
  | 'create_ticket';

/**
 * Base tool call structure
 */
export interface ToolCall<TName extends ToolName = ToolName, TInput = any> {
  id?: string;
  tool: TName;
  input: TInput;
}

/**
 * Base tool result structure
 */
export interface ToolResult<TOutput = any> {
  success: boolean;
  output?: TOutput;
  error?: string;
}

// ===== TOOL-SPECIFIC INPUT TYPES =====

/**
 * Input for search_kb tool
 */
export interface SearchKbInput {
  query: string;
  category?: string;
  limit?: number;
}

/**
 * Input for check_availability tool
 */
export interface CheckAvailabilityInput {
  service: string;
  date: string;
  time?: string;
}

/**
 * Input for create_appointment tool
 */
export interface CreateAppointmentInput {
  studentId: number;
  service: string;
  date: string;
  time: string;
}

/**
 * Input for create_ticket tool
 */
export interface CreateTicketInput {
  studentId: number;
  category: string;
  summary: string;
}

// ===== TOOL-SPECIFIC OUTPUT TYPES =====

/**
 * Article from knowledge base
 */
export interface KbArticle {
  id: number;
  title: string;
  category: string;
  content: string;
  created_at: string;
}

/**
 * Output for search_kb tool
 */
export interface SearchKbOutput {
  articles: KbArticle[];
  count: number;
}

/**
 * Available time slot
 */
export interface AvailableSlot {
  date: string;
  time: string;
  available: boolean;
  capacity: number;
  bookings: number;
}

/**
 * Output for check_availability tool
 */
export interface CheckAvailabilityOutput {
  service: string;
  date: string;
  slots: AvailableSlot[];
}

/**
 * Output for create_appointment tool
 */
export interface CreateAppointmentOutput {
  appointmentId: number;
  service: string;
  date: string;
  time: string;
  status: string;
}

/**
 * Output for create_ticket tool
 */
export interface CreateTicketOutput {
  ticketId: number;
  category: string;
  status: string;
  created_at: string;
}

// ===== TYPED TOOL CALL/RESULT UNIONS =====

/**
 * Discriminated union of all tool calls
 */
export type AnyToolCall =
  | ToolCall<'search_kb', SearchKbInput>
  | ToolCall<'check_availability', CheckAvailabilityInput>
  | ToolCall<'create_appointment', CreateAppointmentInput>
  | ToolCall<'create_ticket', CreateTicketInput>;

/**
 * Discriminated union of all tool results
 */
export type AnyToolResult =
  | ToolResult<SearchKbOutput>
  | ToolResult<CheckAvailabilityOutput>
  | ToolResult<CreateAppointmentOutput>
  | ToolResult<CreateTicketOutput>;

// ===== CONVERSATION TRACE TYPES =====

/**
 * Extended message with tool calls
 */
export interface TraceMessage {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tool_calls?: Array<{
    id: number;
    tool_name: string;
    tool_input: any;
    tool_output: any;
    timestamp: string;
  }>;
}

/**
 * Full conversation trace with messages
 */
export interface Trace {
  id: number;
  student_id: number;
  cohort_id: number | null;
  channel: 'sms' | 'webchat';
  started_at: string;
  ended_at: string | null;
  status: 'active' | 'ended';
  archived: number;
  messages: TraceMessage[];
}

// ===== POLICY RULE TYPES =====

/**
 * Policy violation type
 */
export type PolicyViolationType =
  | 'handoff_required'
  | 'invalid_time_slot'
  | 'out_of_bounds_date'
  | 'service_not_found'
  | 'capacity_exceeded';

/**
 * Policy violation result
 */
export interface PolicyViolation {
  type: PolicyViolationType;
  message: string;
  severity: 'error' | 'warning';
  context?: any;
}

/**
 * Policy check result
 */
export interface PolicyCheckResult {
  valid: boolean;
  violations: PolicyViolation[];
}

// ===== TEST CASE TYPES =====

/**
 * Test case category
 */
export type TestCaseCategory =
  | 'policy_drift'
  | 'handoff_failure'
  | 'scheduling_violation';

/**
 * Case is an alias for TestCase (used in Step 3 requirements)
 */
export type { TestCase as Case } from '@/lib/db/appDb';

// ===== EVALUATION TYPES =====

/**
 * Code evaluation result
 */
export interface CodeEvalResult {
  result: 'pass' | 'fail' | 'error';
  details: string;
  timestamp: string;
}

/**
 * LLM judge result
 */
export interface LlmJudgeResult {
  result: 'pass' | 'fail';
  reasoning: string;
  timestamp: string;
}

// ===== UTILITY TYPES =====

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * Date range filter
 */
export interface DateRange {
  start: string;
  end: string;
}

/**
 * Generic API response
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
