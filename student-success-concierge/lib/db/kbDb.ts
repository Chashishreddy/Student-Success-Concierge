import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const KB_DB_PATH = process.env.KB_DB_PATH || path.join(DATA_DIR, 'kb.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Create database connection
const db = new Database(KB_DB_PATH);

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
export function initSchema() {
  db.exec(KB_DB_SCHEMA);
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
export function searchArticles(query: string, limit = 5): KBArticle[] {
  const stmt = db.prepare(`
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

  return stmt.all(searchPattern, searchPattern, titlePattern, searchPattern, limit) as KBArticle[];
}

/**
 * Get articles by category
 */
export function getArticlesByCategory(category: string): KBArticle[] {
  const stmt = db.prepare('SELECT * FROM kb_articles WHERE category = ? ORDER BY created_at DESC');
  return stmt.all(category) as KBArticle[];
}

/**
 * Get all categories
 */
export function getAllCategories(): string[] {
  const stmt = db.prepare('SELECT DISTINCT category FROM kb_articles ORDER BY category');
  return stmt.all().map((row: any) => row.category);
}

export default db;
