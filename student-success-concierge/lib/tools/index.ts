/**
 * Tool Dispatcher
 *
 * Central routing for all tool calls with type safety
 */

import { searchKb } from './search_kb';
import { checkAvailability } from './check_availability';
import { createAppointment } from './create_appointment';
import { createTicket } from './create_ticket';

import type {
  ToolName,
  ToolCall,
  ToolResult,
  SearchKbInput,
  SearchKbOutput,
  CheckAvailabilityInput,
  CheckAvailabilityOutput,
  CreateAppointmentInput,
  CreateAppointmentOutput,
  CreateTicketInput,
  CreateTicketOutput,
} from '@/lib/types';

/**
 * Tool function type mapping
 */
type ToolFunction<TInput, TOutput> = (
  input: TInput
) => Promise<ToolResult<TOutput>>;

/**
 * Tool registry mapping tool names to their implementations
 */
const toolRegistry: {
  search_kb: ToolFunction<SearchKbInput, SearchKbOutput>;
  check_availability: ToolFunction<CheckAvailabilityInput, CheckAvailabilityOutput>;
  create_appointment: ToolFunction<CreateAppointmentInput, CreateAppointmentOutput>;
  create_ticket: ToolFunction<CreateTicketInput, CreateTicketOutput>;
} = {
  search_kb: searchKb,
  check_availability: checkAvailability,
  create_appointment: createAppointment,
  create_ticket: createTicket,
};

/**
 * Run a tool by name with typed input/output
 *
 * @param toolCall - Tool call with name and input
 * @returns Promise resolving to tool result
 */
export async function runTool<TName extends ToolName>(
  toolCall: ToolCall<TName>
): Promise<ToolResult> {
  const { tool, input } = toolCall;

  // Validate tool name
  if (!tool || typeof tool !== 'string') {
    return {
      success: false,
      error: 'Tool name is required and must be a string',
    };
  }

  // Check if tool exists
  if (!(tool in toolRegistry)) {
    return {
      success: false,
      error: `Unknown tool: ${tool}. Available tools: ${Object.keys(toolRegistry).join(', ')}`,
    };
  }

  // Validate input
  if (!input || typeof input !== 'object') {
    return {
      success: false,
      error: 'Tool input is required and must be an object',
    };
  }

  try {
    // Dispatch to appropriate tool
    const toolFunction = toolRegistry[tool] as ToolFunction<any, any>;
    const result = await toolFunction(input);
    return result;
  } catch (error) {
    console.error(`Error running tool ${tool}:`, error);
    return {
      success: false,
      error: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get list of available tool names
 */
export function getAvailableTools(): ToolName[] {
  return Object.keys(toolRegistry) as ToolName[];
}

/**
 * Check if a tool name is valid
 */
export function isValidTool(toolName: string): toolName is ToolName {
  return toolName in toolRegistry;
}

// Export individual tools for direct use if needed
export { searchKb } from './search_kb';
export { checkAvailability } from './check_availability';
export { createAppointment } from './create_appointment';
export { createTicket } from './create_ticket';

// Export types
export type {
  ToolName,
  ToolCall,
  ToolResult,
  SearchKbInput,
  SearchKbOutput,
  CheckAvailabilityInput,
  CheckAvailabilityOutput,
  CreateAppointmentInput,
  CreateAppointmentOutput,
  CreateTicketInput,
  CreateTicketOutput,
} from '@/lib/types';
