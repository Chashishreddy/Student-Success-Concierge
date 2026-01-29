/**
 * Tools Tests
 *
 * Tests for all tool implementations and the dispatcher
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { runTool, getAvailableTools, isValidTool } from '@/lib/tools';
import type {
  SearchKbInput,
  CheckAvailabilityInput,
  CreateAppointmentInput,
  CreateTicketInput,
} from '@/lib/types';
import { initTestDatabases } from './testUtils';

// Initialize test databases before all tests
beforeAll(async () => {
  await initTestDatabases();
});

describe('Tool Dispatcher', () => {
  it('should list available tools', () => {
    const tools = getAvailableTools();
    expect(tools).toContain('search_kb');
    expect(tools).toContain('check_availability');
    expect(tools).toContain('create_appointment');
    expect(tools).toContain('create_ticket');
    expect(tools.length).toBe(4);
  });

  it('should validate tool names', () => {
    expect(isValidTool('search_kb')).toBe(true);
    expect(isValidTool('invalid_tool')).toBe(false);
  });

  it('should reject invalid tool name', async () => {
    const result = await runTool({
      tool: 'invalid_tool' as any,
      input: {},
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown tool');
  });

  it('should reject missing input', async () => {
    const result = await runTool({
      tool: 'search_kb',
      input: null as any,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('input is required');
  });
});

describe('search_kb Tool', () => {
  it('should search KB articles by query', async () => {
    const input: SearchKbInput = {
      query: 'financial aid',
      limit: 5,
    };

    const result = await runTool({
      tool: 'search_kb',
      input,
    });

    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
    expect(result.output.articles).toBeDefined();
    expect(result.output.count).toBeGreaterThan(0);
    expect(result.output.articles[0].title).toContain('Financial Aid');
  });

  it('should filter by category', async () => {
    const input: SearchKbInput = {
      query: 'aid',
      category: 'financial_aid',
      limit: 5,
    };

    const result = await runTool({
      tool: 'search_kb',
      input,
    });

    expect(result.success).toBe(true);
    expect(result.output.articles.every((a: any) => a.category === 'financial_aid')).toBe(
      true
    );
  });

  it('should respect limit parameter', async () => {
    const input: SearchKbInput = {
      query: 'aid',
      limit: 1,
    };

    const result = await runTool({
      tool: 'search_kb',
      input,
    });

    expect(result.success).toBe(true);
    expect(result.output.articles.length).toBeLessThanOrEqual(1);
  });

  it('should reject empty query', async () => {
    const input: SearchKbInput = {
      query: '',
    };

    const result = await runTool({
      tool: 'search_kb',
      input,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Query parameter is required');
  });

  it('should return empty results for non-matching query', async () => {
    const input: SearchKbInput = {
      query: 'xyznonexistent',
    };

    const result = await runTool({
      tool: 'search_kb',
      input,
    });

    expect(result.success).toBe(true);
    expect(result.output.count).toBe(0);
  });
});

describe('check_availability Tool', () => {
  it('should check availability for specific date', async () => {
    const input: CheckAvailabilityInput = {
      service: 'tutoring',
      date: '2026-02-15',
    };

    const result = await runTool({
      tool: 'check_availability',
      input,
    });

    expect(result.success).toBe(true);
    expect(result.output.service).toBe('tutoring');
    expect(result.output.date).toBe('2026-02-15');
    expect(result.output.slots.length).toBeGreaterThan(0);
  });

  it('should check specific time slot', async () => {
    const input: CheckAvailabilityInput = {
      service: 'tutoring',
      date: '2026-02-15',
      time: '10:00',
    };

    const result = await runTool({
      tool: 'check_availability',
      input,
    });

    expect(result.success).toBe(true);
    expect(result.output.slots.length).toBe(1);
    expect(result.output.slots[0].time).toBe('10:00');
    expect(result.output.slots[0].available).toBe(true);
  });

  it('should detect fully booked slot', async () => {
    const input: CheckAvailabilityInput = {
      service: 'tutoring',
      date: '2026-02-15',
      time: '11:00',
    };

    const result = await runTool({
      tool: 'check_availability',
      input,
    });

    expect(result.success).toBe(true);
    expect(result.output.slots[0].available).toBe(false);
    expect(result.output.slots[0].bookings).toBe(5);
  });

  it('should reject invalid date format', async () => {
    const input: CheckAvailabilityInput = {
      service: 'tutoring',
      date: '02/15/2026',
    };

    const result = await runTool({
      tool: 'check_availability',
      input,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('YYYY-MM-DD format');
  });

  it('should reject missing service', async () => {
    const input: CheckAvailabilityInput = {
      service: '',
      date: '2026-02-15',
    };

    const result = await runTool({
      tool: 'check_availability',
      input,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Service parameter is required');
  });
});

describe('create_appointment Tool', () => {
  it('should create appointment successfully', async () => {
    const input: CreateAppointmentInput = {
      studentId: 1,
      service: 'tutoring',
      date: '2026-02-15',
      time: '10:00',
    };

    const result = await runTool({
      tool: 'create_appointment',
      input,
    });

    expect(result.success).toBe(true);
    expect(result.output.appointmentId).toBeGreaterThan(0);
    expect(result.output.service).toBe('tutoring');
    expect(result.output.status).toBe('scheduled');
  });

  it('should reject appointment for non-existent student', async () => {
    const input: CreateAppointmentInput = {
      studentId: 9999,
      service: 'tutoring',
      date: '2026-02-15',
      time: '10:00',
    };

    const result = await runTool({
      tool: 'create_appointment',
      input,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Student with ID 9999 not found');
  });

  it('should reject appointment for fully booked slot', async () => {
    const input: CreateAppointmentInput = {
      studentId: 1,
      service: 'tutoring',
      date: '2026-02-15',
      time: '11:00',
    };

    const result = await runTool({
      tool: 'create_appointment',
      input,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('fully booked');
  });

  it('should reject appointment for non-existent slot', async () => {
    const input: CreateAppointmentInput = {
      studentId: 1,
      service: 'tutoring',
      date: '2026-12-31',
      time: '10:00',
    };

    const result = await runTool({
      tool: 'create_appointment',
      input,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No availability slot found');
  });

  it('should validate date format', async () => {
    const input: CreateAppointmentInput = {
      studentId: 1,
      service: 'tutoring',
      date: '15-02-2026',
      time: '10:00',
    };

    const result = await runTool({
      tool: 'create_appointment',
      input,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('YYYY-MM-DD format');
  });
});

describe('create_ticket Tool', () => {
  it('should create ticket successfully', async () => {
    const input: CreateTicketInput = {
      studentId: 1,
      category: 'technical',
      summary: 'Cannot access online portal',
    };

    const result = await runTool({
      tool: 'create_ticket',
      input,
    });

    expect(result.success).toBe(true);
    expect(result.output.ticketId).toBeGreaterThan(0);
    expect(result.output.category).toBe('technical');
    expect(result.output.status).toBe('open');
  });

  it('should accept valid ticket categories', async () => {
    const categories = ['technical', 'academic', 'financial', 'administrative', 'other'];

    for (const category of categories) {
      const input: CreateTicketInput = {
        studentId: 1,
        category,
        summary: 'Test ticket',
      };

      const result = await runTool({
        tool: 'create_ticket',
        input,
      });

      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid category', async () => {
    const input: CreateTicketInput = {
      studentId: 1,
      category: 'invalid_category',
      summary: 'Test ticket',
    };

    const result = await runTool({
      tool: 'create_ticket',
      input,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid category');
  });

  it('should reject empty summary', async () => {
    const input: CreateTicketInput = {
      studentId: 1,
      category: 'technical',
      summary: '',
    };

    const result = await runTool({
      tool: 'create_ticket',
      input,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Summary parameter is required');
  });

  it('should reject summary over 500 characters', async () => {
    const input: CreateTicketInput = {
      studentId: 1,
      category: 'technical',
      summary: 'a'.repeat(501),
    };

    const result = await runTool({
      tool: 'create_ticket',
      input,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('500 characters or less');
  });

  it('should reject ticket for non-existent student', async () => {
    const input: CreateTicketInput = {
      studentId: 9999,
      category: 'technical',
      summary: 'Test ticket',
    };

    const result = await runTool({
      tool: 'create_ticket',
      input,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Student with ID 9999 not found');
  });
});
