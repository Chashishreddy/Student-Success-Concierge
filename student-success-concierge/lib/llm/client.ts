// LLM Client Interface with Mock Mode

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ToolCall {
  name: string;
  input: Record<string, any>;
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length';
}

export interface LLMClient {
  chat(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMResponse>;
}

// Mock LLM Implementation (Deterministic)
class MockLLMClient implements LLMClient {
  private responsePatterns = [
    {
      keywords: ['appointment', 'schedule', 'book'],
      tools: ['check_availability', 'create_appointment'],
    },
    {
      keywords: ['policy', 'rules', 'how', 'what', 'when'],
      tools: ['search_kb'],
    },
    {
      keywords: ['help', 'problem', 'issue', 'ticket'],
      tools: ['create_ticket'],
    },
  ];

  async chat(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    const lastMessage = messages[messages.length - 1];
    const userContent = lastMessage.content.toLowerCase();

    // Simulate thinking delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Determine if we should use tools
    if (tools && tools.length > 0) {
      for (const pattern of this.responsePatterns) {
        const hasKeyword = pattern.keywords.some(kw => userContent.includes(kw));
        if (hasKeyword) {
          return this.generateToolCallResponse(userContent, pattern.tools, tools);
        }
      }
    }

    // Default response without tools
    return {
      content: this.generateMockResponse(userContent),
      finishReason: 'stop',
    };
  }

  private generateToolCallResponse(
    userContent: string,
    preferredTools: string[],
    availableTools: ToolDefinition[]
  ): LLMResponse {
    const toolCalls: ToolCall[] = [];

    // Check availability for scheduling requests
    if (preferredTools.includes('check_availability') && userContent.includes('schedule')) {
      const service = this.extractService(userContent);
      const date = this.extractDate(userContent);

      toolCalls.push({
        name: 'check_availability',
        input: {
          service: service || 'Academic Advising',
          date: date || this.getTomorrowDate(),
        },
      });
    }

    // Search KB for policy questions
    if (preferredTools.includes('search_kb') && (userContent.includes('policy') || userContent.includes('how') || userContent.includes('what'))) {
      toolCalls.push({
        name: 'search_kb',
        input: {
          query: userContent.substring(0, 100),
        },
      });
    }

    // Create ticket for help requests
    if (preferredTools.includes('create_ticket') && (userContent.includes('help') || userContent.includes('problem'))) {
      // This should trigger handoff failure tests
      toolCalls.push({
        name: 'create_ticket',
        input: {
          studentId: 1,
          category: 'General',
          summary: userContent.substring(0, 100),
        },
      });
    }

    if (toolCalls.length > 0) {
      return {
        content: 'Let me help you with that.',
        toolCalls,
        finishReason: 'tool_calls',
      };
    }

    return {
      content: this.generateMockResponse(userContent),
      finishReason: 'stop',
    };
  }

  private generateMockResponse(userContent: string): string {
    if (userContent.includes('hello') || userContent.includes('hi')) {
      return "Hello! I'm the Student Success Concierge. I can help you with appointments, answer policy questions, and create support tickets. How can I assist you today?";
    }

    if (userContent.includes('thank')) {
      return "You're welcome! Is there anything else I can help you with?";
    }

    return "I understand you're asking about: " + userContent.substring(0, 50) + "... Let me look into that for you.";
  }

  private extractService(content: string): string | null {
    const services = ['academic advising', 'career counseling', 'tutoring'];
    for (const service of services) {
      if (content.includes(service)) {
        return service.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
    return null;
  }

  private extractDate(content: string): string | null {
    // Simple date extraction (tomorrow, next week, etc.)
    if (content.includes('tomorrow')) {
      return this.getTomorrowDate();
    }
    if (content.includes('today')) {
      return new Date().toISOString().split('T')[0];
    }
    // Look for date patterns like "2026-01-30"
    const dateMatch = content.match(/\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      return dateMatch[0];
    }
    return null;
  }

  private getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
}

// Real LLM Client (OpenAI/Anthropic compatible)
class RealLLMClient implements LLMClient {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor(apiKey: string, apiUrl: string = 'https://api.openai.com/v1/chat/completions', model: string = 'gpt-4') {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.model = model;
  }

  async chat(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    const body: any = {
      model: this.model,
      messages,
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    const result: LLMResponse = {
      content: choice.message.content || '',
      finishReason: choice.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop',
    };

    if (choice.message.tool_calls) {
      result.toolCalls = choice.message.tool_calls.map((tc: any) => ({
        name: tc.function.name,
        input: JSON.parse(tc.function.arguments),
      }));
    }

    return result;
  }
}

// Factory function to create appropriate client
export function createLLMClient(): LLMClient {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log('ℹ️  No API key found, using Mock LLM mode');
    return new MockLLMClient();
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return new RealLLMClient(
      process.env.ANTHROPIC_API_KEY,
      'https://api.anthropic.com/v1/messages',
      'claude-3-5-sonnet-20241022'
    );
  }

  return new RealLLMClient(apiKey);
}
