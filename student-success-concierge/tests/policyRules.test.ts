/**
 * Policy Rules Tests
 *
 * Tests for handoff detection and scheduling constraints
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  checkHandoffRequired,
  checkConversationHandoff,
  validateAppointmentRequest,
  isWeekend,
  getNextBusinessDay,
  formatViolations,
  hasErrors,
} from '@/lib/policyRules';
import type { TraceMessage, CreateAppointmentInput } from '@/lib/types';
import { initTestDatabases } from './testUtils';

// Initialize test database before all tests
beforeAll(async () => {
  await initTestDatabases();
});

describe('Handoff Detection', () => {
  it('should detect handoff keyword "human"', () => {
    const result = checkHandoffRequired('I need to talk to a human');
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].type).toBe('handoff_required');
  });

  it('should detect handoff keyword "supervisor"', () => {
    const result = checkHandoffRequired('Can I speak to a supervisor?');
    expect(result.valid).toBe(false);
    expect(result.violations[0].message).toContain('supervisor');
  });

  it('should detect sensitive category "harassment"', () => {
    const result = checkHandoffRequired(
      'I want to report harassment in my dorm'
    );
    expect(result.valid).toBe(false);
    expect(result.violations[0].message).toContain('harassment');
  });

  it('should pass normal messages', () => {
    const result = checkHandoffRequired(
      'I need help scheduling a tutoring appointment'
    );
    expect(result.valid).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  it('should be case-insensitive', () => {
    const result = checkHandoffRequired('I NEED A HUMAN');
    expect(result.valid).toBe(false);
  });
});

describe('Conversation Handoff', () => {
  it('should detect handoff in conversation history', () => {
    const messages: TraceMessage[] = [
      {
        id: 1,
        conversation_id: 1,
        role: 'user',
        content: 'Hello',
        timestamp: '2026-01-28T10:00:00Z',
      },
      {
        id: 2,
        conversation_id: 1,
        role: 'assistant',
        content: 'Hi! How can I help?',
        timestamp: '2026-01-28T10:00:01Z',
      },
      {
        id: 3,
        conversation_id: 1,
        role: 'user',
        content: 'I need to talk to a real person',
        timestamp: '2026-01-28T10:00:10Z',
      },
    ];

    const result = checkConversationHandoff(messages);
    expect(result.valid).toBe(false);
    expect(result.violations[0].type).toBe('handoff_required');
  });

  it('should warn on long conversations', () => {
    const messages: TraceMessage[] = Array.from({ length: 22 }, (_, i) => ({
      id: i + 1,
      conversation_id: 1,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: 'Message ' + (i + 1),
      timestamp: `2026-01-28T10:${String(i).padStart(2, '0')}:00Z`,
    }));

    const result = checkConversationHandoff(messages);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.severity === 'warning')).toBe(true);
  });
});

describe('Scheduling Constraints', () => {
  it('should validate correct appointment request', async () => {
    const input: CreateAppointmentInput = {
      studentId: 1,
      service: 'tutoring',
      date: '2026-02-15',
      time: '10:00',
    };

    const result = await validateAppointmentRequest(input);
    expect(result.valid).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  it('should reject invalid service', async () => {
    const input: CreateAppointmentInput = {
      studentId: 1,
      service: 'invalid_service',
      date: '2026-02-15',
      time: '10:00',
    };

    const result = await validateAppointmentRequest(input);
    expect(result.valid).toBe(false);
    expect(result.violations[0].type).toBe('service_not_found');
  });

  it('should reject invalid date format', async () => {
    const input: CreateAppointmentInput = {
      studentId: 1,
      service: 'tutoring',
      date: '02/15/2026',
      time: '10:00',
    };

    const result = await validateAppointmentRequest(input);
    expect(result.valid).toBe(false);
    expect(result.violations[0].type).toBe('out_of_bounds_date');
  });

  it('should reject time outside business hours', async () => {
    const input: CreateAppointmentInput = {
      studentId: 1,
      service: 'tutoring',
      date: '2026-02-15',
      time: '20:00',
    };

    const result = await validateAppointmentRequest(input);
    expect(result.valid).toBe(false);
    expect(result.violations[0].type).toBe('invalid_time_slot');
  });

  it('should reject invalid time format', async () => {
    const input: CreateAppointmentInput = {
      studentId: 1,
      service: 'tutoring',
      date: '2026-02-15',
      time: '10:00 AM',
    };

    const result = await validateAppointmentRequest(input);
    expect(result.valid).toBe(false);
    expect(result.violations[0].type).toBe('invalid_time_slot');
  });

  it('should reject date too far in future', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 60);
    const dateStr = futureDate.toISOString().split('T')[0];

    const input: CreateAppointmentInput = {
      studentId: 1,
      service: 'tutoring',
      date: dateStr,
      time: '10:00',
    };

    const result = await validateAppointmentRequest(input);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.type === 'out_of_bounds_date')).toBe(
      true
    );
  });
});

describe('Utility Functions', () => {
  it('should detect weekends correctly', () => {
    expect(isWeekend('2026-01-31')).toBe(true); // Saturday
    expect(isWeekend('2026-02-01')).toBe(true); // Sunday
    expect(isWeekend('2026-02-02')).toBe(false); // Monday
  });

  it('should get next business day', () => {
    const nextDay = getNextBusinessDay('2026-01-30'); // Friday
    expect(nextDay).toBe('2026-02-02'); // Monday (skips weekend)
  });

  it('should format violations', () => {
    const formatted = formatViolations([
      {
        type: 'handoff_required',
        message: 'Test violation',
        severity: 'error',
      },
    ]);
    expect(formatted).toContain('ERROR');
    expect(formatted).toContain('Test violation');
  });

  it('should detect error violations', () => {
    const violations = [
      { type: 'handoff_required' as const, message: 'Error', severity: 'error' as const },
      { type: 'handoff_required' as const, message: 'Warning', severity: 'warning' as const },
    ];
    expect(hasErrors(violations)).toBe(true);
  });

  it('should detect no errors when only warnings', () => {
    const violations = [
      { type: 'handoff_required' as const, message: 'Warning', severity: 'warning' as const },
    ];
    expect(hasErrors(violations)).toBe(false);
  });
});
