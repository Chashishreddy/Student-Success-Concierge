import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const APP_DB_PATH = process.env.APP_DB_PATH || path.join(DATA_DIR, 'app.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Create database connection
const db = new Database(APP_DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// ===== SCHEMA =====

export const APP_DB_SCHEMA = `
-- Students table
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  service TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  channel TEXT NOT NULL,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  status TEXT DEFAULT 'active',
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Tool calls table
CREATE TABLE IF NOT EXISTS tool_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  tool_name TEXT NOT NULL,
  tool_input TEXT NOT NULL,
  tool_output TEXT NOT NULL,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- Availability slots table
CREATE TABLE IF NOT EXISTS availability_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  available INTEGER DEFAULT 1,
  max_capacity INTEGER DEFAULT 1,
  current_bookings INTEGER DEFAULT 0
);

-- Test cases table
CREATE TABLE IF NOT EXISTS test_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  conversation_id INTEGER,
  expected_behavior TEXT NOT NULL,
  eval_code TEXT NOT NULL,
  llm_judge_rubric TEXT,
  human_label TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Evaluation results table
CREATE TABLE IF NOT EXISTS eval_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_case_id INTEGER NOT NULL,
  conversation_id INTEGER NOT NULL,
  code_eval_result TEXT NOT NULL,
  code_eval_details TEXT NOT NULL,
  llm_judge_result TEXT,
  llm_judge_reasoning TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_case_id) REFERENCES test_cases(id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Conversation notes table (open coding)
CREATE TABLE IF NOT EXISTS conversation_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Tags table (axial coding)
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  description TEXT
);

-- Conversation tags table
CREATE TABLE IF NOT EXISTS conversation_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (tag_id) REFERENCES tags(id),
  UNIQUE(conversation_id, tag_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_student ON conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_message ON tool_calls(message_id);
CREATE INDEX IF NOT EXISTS idx_appointments_student ON appointments(student_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_availability_date ON availability_slots(date, service);
`;

// Initialize schema
export function initSchema() {
  db.exec(APP_DB_SCHEMA);
}

// ===== TYPED INTERFACES =====

export interface Student {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

export interface Appointment {
  id: number;
  student_id: number;
  service: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Ticket {
  id: number;
  student_id: number;
  category: string;
  summary: string;
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
}

export interface Conversation {
  id: number;
  student_id: number;
  channel: 'sms' | 'webchat';
  started_at: string;
  ended_at: string | null;
  status: 'active' | 'ended';
}

export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ToolCall {
  id: number;
  message_id: number;
  tool_name: string;
  tool_input: string;
  tool_output: string;
  timestamp: string;
}

export interface AvailabilitySlot {
  id: number;
  service: string;
  date: string;
  time: string;
  available: number;
  max_capacity: number;
  current_bookings: number;
}

export interface TestCase {
  id: number;
  name: string;
  description: string;
  category: 'policy_drift' | 'handoff_failure' | 'scheduling_violation';
  conversation_id: number | null;
  expected_behavior: string;
  eval_code: string;
  llm_judge_rubric: string | null;
  human_label: 'pass' | 'fail' | null;
  created_at: string;
}

export interface EvalResult {
  id: number;
  test_case_id: number;
  conversation_id: number;
  code_eval_result: 'pass' | 'fail' | 'error';
  code_eval_details: string;
  llm_judge_result: 'pass' | 'fail' | null;
  llm_judge_reasoning: string | null;
  timestamp: string;
}

export interface ConversationNote {
  id: number;
  conversation_id: number;
  note: string;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

export interface ConversationTag {
  id: number;
  conversation_id: number;
  tag_id: number;
  created_at: string;
}

export default db;
