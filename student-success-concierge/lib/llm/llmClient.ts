/**
 * LLM Client Abstraction
 *
 * Provides a unified interface for calling different LLM providers
 * Supports: Anthropic, OpenAI, and Mock mode (for testing without API keys)
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface ToolResult {
  tool_call_id: string;
  content: string;
}

export interface LLMResponse {
  content: string;
  tool_calls?: ToolCall[];
  stop_reason?: 'end_turn' | 'tool_use' | 'max_tokens';
}

export interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'mock';
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMClient {
  call(params: {
    system?: string;
    messages: Message[];
    tools?: ToolDefinition[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<LLMResponse>;

  /** Get the model name for tracing (optional) */
  getModelName?(): string;

  /** Get the provider name for tracing (optional) */
  getProvider?(): string;
}

/**
 * Mock LLM Client
 * Returns deterministic responses based on message patterns
 * Used for testing and when no API key is available
 */
export class MockLLMClient implements LLMClient {
  getModelName(): string {
    return 'mock-model';
  }

  getProvider(): string {
    return 'mock';
  }

  async call(params: {
    system?: string;
    messages: Message[];
    tools?: ToolDefinition[];
  }): Promise<LLMResponse> {
    const lastMessage = params.messages[params.messages.length - 1];
    const userMessage = lastMessage.content.toLowerCase();

    // Detect patterns and return appropriate responses

    // 1. Greeting patterns
    if (userMessage.match(/^(hi|hello|hey)/)) {
      return {
        content: "Hello! I'm the Student Success Concierge. How can I help you today?",
        stop_reason: 'end_turn',
      };
    }

    // 2. Hours/schedule questions -> search_kb
    if (userMessage.match(/hours|open|schedule|available/)) {
      if (params.tools?.some((t) => t.name === 'search_kb')) {
        return {
          content: '',
          tool_calls: [
            {
              id: 'mock_tool_1',
              name: 'search_kb',
              input: { query: 'office hours' },
            },
          ],
          stop_reason: 'tool_use',
        };
      }
      return {
        content: 'Our office is open Monday through Friday, 9 AM to 5 PM.',
        stop_reason: 'end_turn',
      };
    }

    // 3. Appointment/scheduling requests -> check_availability + create_appointment
    if (userMessage.match(/appointment|schedule|book|meeting/)) {
      // First round: check availability
      if (!params.messages.some((m) => m.content.includes('available slots'))) {
        if (params.tools?.some((t) => t.name === 'check_availability')) {
          return {
            content: '',
            tool_calls: [
              {
                id: 'mock_tool_2',
                name: 'check_availability',
                input: { service: 'tutoring', date: '2026-02-15' },
              },
            ],
            stop_reason: 'tool_use',
          };
        }
      }
      // Second round: create appointment
      return {
        content: "I've scheduled your appointment for February 15th at 2:00 PM.",
        stop_reason: 'end_turn',
      };
    }

    // 4. Help/question requests -> search_kb
    if (userMessage.match(/help|question|about|what is|how do/)) {
      if (params.tools?.some((t) => t.name === 'search_kb')) {
        return {
          content: '',
          tool_calls: [
            {
              id: 'mock_tool_3',
              name: 'search_kb',
              input: { query: userMessage.slice(0, 50) },
            },
          ],
          stop_reason: 'tool_use',
        };
      }
    }

    // 5. Handoff requests -> create_ticket
    if (userMessage.match(/\b(human|person|supervisor|real)\b|speak\s+(to|with)|talk\s+(to|with)/i)) {
      // Check if we've already gotten tool results
      const hasToolResults = params.messages.some((m) => m.content.includes('Tool result'));

      if (!hasToolResults && params.tools?.some((t) => t.name === 'create_ticket')) {
        return {
          content: '',
          tool_calls: [
            {
              id: 'mock_tool_4',
              name: 'create_ticket',
              input: {
                studentId: 1,
                category: 'general',
                summary: 'Student requested human assistance',
              },
            },
          ],
          stop_reason: 'tool_use',
        };
      }
      return {
        content: "I've created a ticket for you. A staff member will reach out soon.",
        stop_reason: 'end_turn',
      };
    }

    // 6. Default response
    return {
      content: "I understand you're asking about that. Let me help you with your request.",
      stop_reason: 'end_turn',
    };
  }
}

/**
 * Anthropic LLM Client
 * Uses Claude API with tool calling support
 */
export class AnthropicLLMClient implements LLMClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'claude-sonnet-4-5-20250929') {
    this.apiKey = apiKey;
    this.model = model;
  }

  getModelName(): string {
    return this.model;
  }

  getProvider(): string {
    return 'anthropic';
  }

  async call(params: {
    system?: string;
    messages: Message[];
    tools?: ToolDefinition[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<LLMResponse> {
    // Convert messages to Anthropic format (no system role in messages)
    const anthropicMessages = params.messages.map((m) => ({
      role: m.role === 'system' ? 'user' : m.role,
      content: m.content,
    }));

    const body: any = {
      model: this.model,
      max_tokens: params.maxTokens || 4096,
      temperature: params.temperature ?? 0.7,
      messages: anthropicMessages,
    };

    if (params.system) {
      body.system = params.system;
    }

    if (params.tools && params.tools.length > 0) {
      body.tools = params.tools;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Parse response
    const content = data.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    const toolCalls = data.content
      .filter((block: any) => block.type === 'tool_use')
      .map((block: any) => ({
        id: block.id,
        name: block.name,
        input: block.input,
      }));

    return {
      content,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      stop_reason: data.stop_reason,
    };
  }
}

/**
 * OpenAI LLM Client
 * Uses GPT-4 with function calling support
 */
export class OpenAILLMClient implements LLMClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o') {
    this.apiKey = apiKey;
    this.model = model;
  }

  getModelName(): string {
    return this.model;
  }

  getProvider(): string {
    return 'openai';
  }

  async call(params: {
    system?: string;
    messages: Message[];
    tools?: ToolDefinition[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<LLMResponse> {
    // Convert to OpenAI format
    const openaiMessages: any[] = [];

    if (params.system) {
      openaiMessages.push({ role: 'system', content: params.system });
    }

    openaiMessages.push(
      ...params.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
    );

    const body: any = {
      model: this.model,
      messages: openaiMessages,
      max_tokens: params.maxTokens || 4096,
      temperature: params.temperature ?? 0.7,
    };

    if (params.tools && params.tools.length > 0) {
      body.tools = params.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      }));
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('OpenAI API error body:', errorBody);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    const message = data.choices[0].message;

    const toolCalls = message.tool_calls?.map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments),
    }));

    return {
      content: message.content || '',
      tool_calls: toolCalls,
      stop_reason: data.choices[0].finish_reason === 'tool_calls' ? 'tool_use' : 'end_turn',
    };
  }
}

/**
 * Create LLM Client
 * Factory function to create the appropriate client based on config
 */
export function createLLMClient(config: LLMConfig): LLMClient {
  if (config.provider === 'mock') {
    return new MockLLMClient();
  }

  if (config.provider === 'anthropic') {
    if (!config.apiKey) {
      throw new Error('API key required for Anthropic provider');
    }
    return new AnthropicLLMClient(config.apiKey, config.model);
  }

  if (config.provider === 'openai') {
    if (!config.apiKey) {
      throw new Error('API key required for OpenAI provider');
    }
    return new OpenAILLMClient(config.apiKey, config.model);
  }

  throw new Error(`Unknown provider: ${config.provider}`);
}

/**
 * Get LLM Client from environment
 * Automatically selects provider based on available API keys
 * Falls back to mock mode if no keys are available
 */
export function getLLMClient(): LLMClient {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (anthropicKey) {
    return createLLMClient({
      provider: 'anthropic',
      apiKey: anthropicKey,
      model: process.env.ANTHROPIC_MODEL,
    });
  }

  if (openaiKey) {
    return createLLMClient({
      provider: 'openai',
      apiKey: openaiKey,
      model: process.env.OPENAI_MODEL,
    });
  }

  console.warn('No API keys found. Using mock LLM client.');
  return createLLMClient({ provider: 'mock' });
}
