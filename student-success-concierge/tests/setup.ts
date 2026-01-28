/**
 * Test setup file
 *
 * Runs before all tests to set up the testing environment
 */

import { vi } from 'vitest';
import path from 'path';
import fs from 'fs';

// Set up test data directory
const TEST_DATA_DIR = path.join(process.cwd(), 'tests', 'test-data');
if (!fs.existsSync(TEST_DATA_DIR)) {
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
}

// Set environment variables for test databases
process.env.APP_DB_PATH = path.join(TEST_DATA_DIR, 'test-app.db');
process.env.KB_DB_PATH = path.join(TEST_DATA_DIR, 'test-kb.db');

// Clean up test databases before tests
if (fs.existsSync(process.env.APP_DB_PATH)) {
  fs.unlinkSync(process.env.APP_DB_PATH);
}
if (fs.existsSync(process.env.KB_DB_PATH)) {
  fs.unlinkSync(process.env.KB_DB_PATH);
}

// Mock console methods to reduce noise in tests (optional)
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
