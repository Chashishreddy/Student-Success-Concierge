/**
 * Policy Rules System
 *
 * Implements business rules and constraints for:
 * - Handoff detection (when to escalate to human)
 * - Scheduling constraints (valid dates, times, capacity)
 * - Service availability rules
 */

import appDb from '@/lib/db/appDb';
import type {
  PolicyCheckResult,
  PolicyViolation,
  CreateAppointmentInput,
  TraceMessage,
} from '@/lib/types';

// ===== CONFIGURATION =====

/**
 * Keywords that trigger handoff requirement
 */
const HANDOFF_KEYWORDS = [
  'speak to a person',
  'talk to someone',
  'human',
  'representative',
  'real person',
  'agent',
  'supervisor',
  'manager',
  'emergency',
  'urgent',
  'complaint',
  'lawyer',
  'legal',
];

/**
 * Service-specific handoff triggers
 */
const HANDOFF_CATEGORIES = [
  'financial aid appeal',
  'grade dispute',
  'harassment',
  'discrimination',
  'mental health crisis',
  'title ix',
];

/**
 * Valid services that can be scheduled
 */
const VALID_SERVICES = ['tutoring', 'advising'];

/**
 * Business hours for scheduling
 */
const BUSINESS_HOURS = {
  start: '09:00',
  end: '17:00',
};

/**
 * Maximum days in advance for scheduling
 */
const MAX_ADVANCE_DAYS = 30;

/**
 * Minimum days in advance for scheduling
 */
const MIN_ADVANCE_DAYS = 1;

// ===== HANDOFF DETECTION =====

/**
 * Check if a message requires handoff to human
 *
 * @param message - User message content
 * @returns Policy check result
 */
export function checkHandoffRequired(message: string): PolicyCheckResult {
  const violations: PolicyViolation[] = [];
  const messageLower = message.toLowerCase();

  // Check for handoff keywords
  for (const keyword of HANDOFF_KEYWORDS) {
    if (messageLower.includes(keyword)) {
      violations.push({
        type: 'handoff_required',
        message: `Message contains handoff keyword: "${keyword}"`,
        severity: 'error',
        context: { keyword },
      });
      break; // Only report first match
    }
  }

  // Check for sensitive categories
  for (const category of HANDOFF_CATEGORIES) {
    if (messageLower.includes(category)) {
      violations.push({
        type: 'handoff_required',
        message: `Message mentions sensitive category: "${category}"`,
        severity: 'error',
        context: { category },
      });
      break; // Only report first match
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Check if a conversation requires handoff based on message history
 *
 * @param messages - Conversation message history
 * @returns Policy check result
 */
export function checkConversationHandoff(
  messages: TraceMessage[]
): PolicyCheckResult {
  const violations: PolicyViolation[] = [];

  // Check each user message for handoff triggers
  for (const message of messages) {
    if (message.role === 'user') {
      const result = checkHandoffRequired(message.content);
      if (!result.valid) {
        violations.push(...result.violations);
      }
    }
  }

  // Check conversation length - if too many back-and-forth, suggest handoff
  const userMessages = messages.filter((m) => m.role === 'user');
  if (userMessages.length > 10) {
    violations.push({
      type: 'handoff_required',
      message: 'Conversation has exceeded 10 user messages without resolution',
      severity: 'warning',
      context: { messageCount: userMessages.length },
    });
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

// ===== SCHEDULING CONSTRAINTS =====

/**
 * Validate appointment creation request
 *
 * @param input - Appointment creation parameters
 * @returns Policy check result
 */
export async function validateAppointmentRequest(
  input: CreateAppointmentInput
): Promise<PolicyCheckResult> {
  const violations: PolicyViolation[] = [];
  const { service, date, time } = input;

  // 1. Validate service
  if (!VALID_SERVICES.includes(service.toLowerCase())) {
    violations.push({
      type: 'service_not_found',
      message: `Invalid service: "${service}". Valid services are: ${VALID_SERVICES.join(', ')}`,
      severity: 'error',
      context: { service, validServices: VALID_SERVICES },
    });
  }

  // 2. Validate date format
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(date)) {
    violations.push({
      type: 'out_of_bounds_date',
      message: 'Date must be in YYYY-MM-DD format',
      severity: 'error',
      context: { date },
    });
    // Return early if date format is invalid
    return { valid: false, violations };
  }

  // 3. Validate date is in the future
  const requestedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysDifference = Math.floor(
    (requestedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDifference < MIN_ADVANCE_DAYS) {
    violations.push({
      type: 'out_of_bounds_date',
      message: `Appointments must be scheduled at least ${MIN_ADVANCE_DAYS} day(s) in advance`,
      severity: 'error',
      context: { date, minAdvanceDays: MIN_ADVANCE_DAYS },
    });
  }

  if (daysDifference > MAX_ADVANCE_DAYS) {
    violations.push({
      type: 'out_of_bounds_date',
      message: `Appointments cannot be scheduled more than ${MAX_ADVANCE_DAYS} days in advance`,
      severity: 'error',
      context: { date, maxAdvanceDays: MAX_ADVANCE_DAYS },
    });
  }

  // 4. Validate time format (HH:MM)
  const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timePattern.test(time)) {
    violations.push({
      type: 'invalid_time_slot',
      message: 'Time must be in HH:MM format (24-hour)',
      severity: 'error',
      context: { time },
    });
    // Return early if time format is invalid
    return { valid: false, violations };
  }

  // 5. Validate time is within business hours
  if (time < BUSINESS_HOURS.start || time >= BUSINESS_HOURS.end) {
    violations.push({
      type: 'invalid_time_slot',
      message: `Appointments must be between ${BUSINESS_HOURS.start} and ${BUSINESS_HOURS.end}`,
      severity: 'error',
      context: {
        time,
        businessHours: BUSINESS_HOURS,
      },
    });
  }

  // 6. Check if slot exists and has capacity
  try {
    const db = await appDb.getDb();
    const stmt = db.prepare(`
      SELECT id, max_capacity, current_bookings
      FROM availability_slots
      WHERE service = ? AND date = ? AND time = ?
    `);
    stmt.bind([service, date, time]);

    if (!stmt.step()) {
      violations.push({
        type: 'invalid_time_slot',
        message: `No availability slot exists for ${service} on ${date} at ${time}`,
        severity: 'error',
        context: { service, date, time },
      });
    } else {
      const slot = stmt.getAsObject();
      const maxCapacity = slot.max_capacity as number;
      const currentBookings = slot.current_bookings as number;

      if (currentBookings >= maxCapacity) {
        violations.push({
          type: 'capacity_exceeded',
          message: `Slot is fully booked (${currentBookings}/${maxCapacity})`,
          severity: 'error',
          context: { service, date, time, capacity: maxCapacity, bookings: currentBookings },
        });
      }
    }
    stmt.free();
  } catch (error) {
    violations.push({
      type: 'invalid_time_slot',
      message: `Failed to verify slot availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
      context: { error },
    });
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Check if a date is a weekend
 *
 * @param date - Date string in YYYY-MM-DD format
 * @returns True if weekend
 */
export function isWeekend(date: string): boolean {
  // Parse date components to avoid timezone issues
  const [year, month, day] = date.split('-').map(Number);
  const d = new Date(year, month - 1, day); // month is 0-indexed
  const dayOfWeek = d.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
}

/**
 * Get next available business day from a given date
 *
 * @param fromDate - Starting date in YYYY-MM-DD format
 * @returns Next business day in YYYY-MM-DD format
 */
export function getNextBusinessDay(fromDate: string): string {
  // Parse date components to avoid timezone issues
  const [year, month, day] = fromDate.split('-').map(Number);
  let date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + 1);

  // Format helper
  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  let dateStr = formatDate(date);
  while (isWeekend(dateStr)) {
    date.setDate(date.getDate() + 1);
    dateStr = formatDate(date);
  }

  return dateStr;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Format policy violations for display
 *
 * @param violations - Array of violations
 * @returns Formatted string
 */
export function formatViolations(violations: PolicyViolation[]): string {
  if (violations.length === 0) {
    return 'No violations';
  }

  return violations
    .map((v, i) => `${i + 1}. [${v.severity.toUpperCase()}] ${v.message}`)
    .join('\n');
}

/**
 * Check if any violations are errors (vs warnings)
 *
 * @param violations - Array of violations
 * @returns True if any error-level violations exist
 */
export function hasErrors(violations: PolicyViolation[]): boolean {
  return violations.some((v) => v.severity === 'error');
}

// ===== EXPORTS =====

export default {
  checkHandoffRequired,
  checkConversationHandoff,
  validateAppointmentRequest,
  isWeekend,
  getNextBusinessDay,
  formatViolations,
  hasErrors,
};
