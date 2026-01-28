/**
 * check_availability Tool
 *
 * Checks availability for a specific service and date/time
 */

import appDb from '@/lib/db/appDb';
import type {
  CheckAvailabilityInput,
  CheckAvailabilityOutput,
  ToolResult,
  AvailableSlot,
} from '@/lib/types';

/**
 * Check availability for appointments
 *
 * @param input - Availability check parameters
 * @returns Tool result with available slots
 */
export async function checkAvailability(
  input: CheckAvailabilityInput
): Promise<ToolResult<CheckAvailabilityOutput>> {
  try {
    const { service, date, time } = input;

    // Validate input
    if (!service || service.trim().length === 0) {
      return {
        success: false,
        error: 'Service parameter is required',
      };
    }

    if (!date || date.trim().length === 0) {
      return {
        success: false,
        error: 'Date parameter is required',
      };
    }

    // Validate date format (YYYY-MM-DD)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(date)) {
      return {
        success: false,
        error: 'Date must be in YYYY-MM-DD format',
      };
    }

    const db = await appDb.getDb();

    // If time is specified, check that specific slot
    if (time) {
      const stmt = db.prepare(`
        SELECT date, time, available, max_capacity, current_bookings
        FROM availability_slots
        WHERE service = ? AND date = ? AND time = ?
      `);
      stmt.bind([service, date, time]);

      const slots: AvailableSlot[] = [];
      if (stmt.step()) {
        const row = stmt.getAsObject();
        slots.push({
          date: row.date as string,
          time: row.time as string,
          available: (row.current_bookings as number) < (row.max_capacity as number),
          capacity: row.max_capacity as number,
          bookings: row.current_bookings as number,
        });
      }
      stmt.free();

      if (slots.length === 0) {
        return {
          success: false,
          error: `No availability slot found for ${service} on ${date} at ${time}`,
        };
      }

      return {
        success: true,
        output: {
          service,
          date,
          slots,
        },
      };
    }

    // Otherwise, get all slots for that service and date
    const stmt = db.prepare(`
      SELECT date, time, available, max_capacity, current_bookings
      FROM availability_slots
      WHERE service = ? AND date = ?
      ORDER BY time
    `);
    stmt.bind([service, date]);

    const slots: AvailableSlot[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      slots.push({
        date: row.date as string,
        time: row.time as string,
        available: (row.current_bookings as number) < (row.max_capacity as number),
        capacity: row.max_capacity as number,
        bookings: row.current_bookings as number,
      });
    }
    stmt.free();

    if (slots.length === 0) {
      return {
        success: false,
        error: `No availability slots found for ${service} on ${date}`,
      };
    }

    return {
      success: true,
      output: {
        service,
        date,
        slots,
      },
    };
  } catch (error) {
    console.error('Error in check_availability tool:', error);
    return {
      success: false,
      error: `Failed to check availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
