import initSqlJs, { Database } from 'sql.js';
import { APP_DB_SCHEMA, KB_DB_SCHEMA } from './schema';
import fs from 'fs';
import path from 'path';

let appDb: Database | null = null;
let kbDb: Database | null = null;
let SQL: any = null;

const DATA_DIR = path.join(process.cwd(), 'data');
const APP_DB_PATH = path.join(DATA_DIR, 'app.db');
const KB_DB_PATH = path.join(DATA_DIR, 'kb.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function initSQL() {
  if (!SQL) {
    // In Node.js, use local file path; in browser, use CDN
    const isNode = typeof window === 'undefined';
    SQL = await initSqlJs({
      locateFile: (file) => isNode
        ? path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file)
        : `https://sql.js.org/dist/${file}`,
    });
  }
  return SQL;
}

export async function getAppDb(): Promise<Database> {
  if (appDb) return appDb;

  const sql = await initSQL();

  // Load existing database or create new one
  if (fs.existsSync(APP_DB_PATH)) {
    const buffer = fs.readFileSync(APP_DB_PATH);
    appDb = new sql.Database(buffer);
  } else {
    appDb = new sql.Database();
    appDb.exec(APP_DB_SCHEMA);
    saveAppDb();
  }

  return appDb;
}

export async function getKbDb(): Promise<Database> {
  if (kbDb) return kbDb;

  const sql = await initSQL();

  // Load existing database or create new one
  if (fs.existsSync(KB_DB_PATH)) {
    const buffer = fs.readFileSync(KB_DB_PATH);
    kbDb = new sql.Database(buffer);
  } else {
    kbDb = new sql.Database();
    kbDb.exec(KB_DB_SCHEMA);
    saveKbDb();
  }

  return kbDb;
}

export function saveAppDb() {
  if (appDb) {
    const data = appDb.export();
    fs.writeFileSync(APP_DB_PATH, data);
  }
}

export function saveKbDb() {
  if (kbDb) {
    const data = kbDb.export();
    fs.writeFileSync(KB_DB_PATH, data);
  }
}

// Helper to convert sql.js result to objects
export function resultToObjects<T>(result: any[]): T[] {
  if (!result || result.length === 0) return [];

  const [first] = result;
  if (!first.values || first.values.length === 0) return [];

  return first.values.map((row: any[]) => {
    const obj: any = {};
    first.columns.forEach((col: string, idx: number) => {
      obj[col] = row[idx];
    });
    return obj as T;
  });
}

// Close databases on process exit
process.on('exit', () => {
  saveAppDb();
  saveKbDb();
  appDb?.close();
  kbDb?.close();
});

process.on('SIGINT', () => {
  saveAppDb();
  saveKbDb();
  appDb?.close();
  kbDb?.close();
  process.exit(0);
});
