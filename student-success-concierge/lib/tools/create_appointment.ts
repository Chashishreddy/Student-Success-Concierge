/**
 * create_appointment Tool
 *
 * Creates a new appointment for a student
 */

import appDb from '@/lib/db/appDb';
import type {
  CreateAppointmentInput,
  CreateAppointmentOutput,
  ToolResult,
} from '@/lib/types';

/**
 * Create a new appointment
 *
 * @param input - Appointment creation parameters
 * @returns Tool result with created appointment details
 */
export async function createAppointment(
  input: CreateAppointmentInput
): Promise<ToolResult<CreateAppointmentOutput>> {
  try {
    const { studentId, service, date, time } = input;

    // Validate input
    if (!studentId || studentId <= 0) {
      return {
        success: false,
        error: 'Valid student ID is required',
      };
    }

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

    if (!time || time.trim().length === 0) {
      return {
        success: false,
        error: 'Time parameter is required',
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

    // Check if student exists
    const studentStmt = db.prepare('SELECT id FROM students WHERE id = ?');
    studentStmt.bind([studentId]);
    const studentExists = studentStmt.step();
    studentStmt.free();

    if (!studentExists) {
      return {
        success: false,
        error: `Student with ID ${studentId} not found`,
      };
    }

    // Check if slot exists and is available
    const slotStmt = db.prepare(`
      SELECT id, available, max_capacity, current_bookings
      FROM availability_slots
      WHERE service = ? AND date = ? AND time = ?
    `);
    slotStmt.bind([service, date, time]);

    if (!slotStmt.step()) {
      slotStmt.free();
      return {
        success: false,
        error: `No availability slot found for ${service} on ${date} at ${time}`,
      };
    }

    const slot = slotStmt.getAsObject();
    const slotId = slot.id as number;
    const maxCapacity = slot.max_capacity as number;
    const currentBookings = slot.current_bookings as number;
    slotStmt.free();

    // Check capacity
    if (currentBookings >= maxCapacity) {
      return {
        success: false,
        error: `Slot is fully booked (${currentBookings}/${maxCapacity})`,
      };
    }

    // Create appointment
    const insertStmt = db.prepare(`
      INSERT INTO appointments (student_id, service, date, time, status)
      VALUES (?, ?, ?, ?, 'scheduled')
    `);
    insertStmt.bind([studentId, service, date, time]);
    insertStmt.step();
    insertStmt.free();

    // Get the newly created appointment ID
    const lastIdStmt = db.prepare('SELECT last_insert_rowid() as id');
    lastIdStmt.step();
    const appointmentId = lastIdStmt.getAsObject().id as number;
    lastIdStmt.free();

    // Update slot bookings
    const updateStmt = db.prepare(`
      UPDATE availability_slots
      SET current_bookings = current_bookings + 1
      WHERE id = ?
    `);
    updateStmt.bind([slotId]);
    updateStmt.step();
    updateStmt.free();

    // Save database
    appDb.saveDb();

    return {
      success: true,
      output: {
        appointmentId,
        service,
        date,
        time,
        status: 'scheduled',
      },
    };
  } catch (error) {
    console.error('Error in create_appointment tool:', error);
    return {
      success: false,
      error: `Failed to create appointment: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
