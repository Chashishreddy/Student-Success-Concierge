import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const KB_DB_PATH = process.env.KB_DB_PATH || path.join(DATA_DIR, 'kb.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db: Database | null = null;
let SQL: any = null;

async function initDB() {
  if (db) return db;

  // Initialize SQL.js
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
    });
  }

  // Load existing database or create new one
  if (fs.existsSync(KB_DB_PATH)) {
    const buffer = fs.readFileSync(KB_DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  return db;
}

// Save database to disk
export function saveDb() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(KB_DB_PATH, data);
  }
}

// Get database instance
export async function getDb(): Promise<Database> {
  return await initDB();
}

// ===== SCHEMA =====

export const KB_DB_SCHEMA = `
-- Knowledge base articles table
CREATE TABLE IF NOT EXISTS kb_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for search
CREATE INDEX IF NOT EXISTS idx_kb_articles_title ON kb_articles(title);
CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON kb_articles(category);
`;

// Initialize schema
export async function initSchema() {
  const database = await getDb();
  database.exec(KB_DB_SCHEMA);
  saveDb();
}

// ===== TYPED INTERFACES =====

export interface KBArticle {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string | null; // JSON string
  created_at: string;
  updated_at: string;
}

// ===== HELPER FUNCTIONS =====

/**
 * Search knowledge base articles
 * Simple LIKE-based search across title and content
 */
export async function searchArticles(query: string, limit = 5): Promise<KBArticle[]> {
  const database = await getDb();
  const stmt = database.prepare(`
    SELECT * FROM kb_articles
    WHERE title LIKE ? OR content LIKE ?
    ORDER BY
      CASE
        WHEN title LIKE ? THEN 1
        WHEN content LIKE ? THEN 2
        ELSE 3
      END,
      created_at DESC
    LIMIT ?
  `);

  const searchPattern = `%${query}%`;
  const titlePattern = `%${query}%`;

  stmt.bind([searchPattern, searchPattern, titlePattern, searchPattern, limit]);

  const results: KBArticle[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row as KBArticle);
  }

  stmt.free();
  return results;
}

/**
 * Get articles by category
 */
export async function getArticlesByCategory(category: string): Promise<KBArticle[]> {
  const database = await getDb();
  const stmt = database.prepare('SELECT * FROM kb_articles WHERE category = ? ORDER BY created_at DESC');
  stmt.bind([category]);

  const results: KBArticle[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row as KBArticle);
  }

  stmt.free();
  return results;
}

/**
 * Get all categories
 */
export async function getAllCategories(): Promise<string[]> {
  const database = await getDb();
  const stmt = database.prepare('SELECT DISTINCT category FROM kb_articles ORDER BY category');

  const results: string[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row.category as string);
  }

  stmt.free();
  return results;
}

// Save on process exit
process.on('exit', () => {
  saveDb();
});

process.on('SIGINT', () => {
  saveDb();
  process.exit(0);
});

export default { getDb, saveDb, initSchema };
