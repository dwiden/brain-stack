import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(__dirname, '../../brain-stack.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    priority INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_touched_at TEXT NOT NULL DEFAULT (datetime('now')),
    archived INTEGER NOT NULL DEFAULT 0,
    archived_at TEXT,
    decay_enabled INTEGER NOT NULL DEFAULT 1,
    stale_reset_at TEXT
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  );
`);

// Migrations for existing databases
function migrateColumn(sql: string, columnName: string) {
  try {
    db.exec(sql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes(`duplicate column name: ${columnName}`)) {
      throw error;
    }
  }
}

migrateColumn('ALTER TABLE items ADD COLUMN decay_enabled INTEGER NOT NULL DEFAULT 1', 'decay_enabled');
migrateColumn('ALTER TABLE items ADD COLUMN stale_reset_at TEXT', 'stale_reset_at');

export default db;
