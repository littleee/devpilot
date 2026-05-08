import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

export const DEFAULT_DB_DIR = path.join(os.homedir(), ".devpilot");
export const DEFAULT_DB_PATH = path.join(DEFAULT_DB_DIR, "devpilot-mcp.sqlite");

export function ensureDbPath(dbPath: string): void {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

export function openDatabase(dbPath: string): Database.Database {
  ensureDbPath(dbPath);
  return new Database(dbPath);
}

type TableInfoRow = {
  name: string;
};

function hasColumn(
  db: Database.Database,
  tableName: string,
  columnName: string,
): boolean {
  const rows = db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as TableInfoRow[];
  return rows.some((row) => row.name === columnName);
}

function ensureColumn(
  db: Database.Database,
  tableName: string,
  columnName: string,
  columnDefinition: string,
): void {
  if (hasColumn(db, tableName, columnName)) {
    return;
  }

  db.exec(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`,
  );
}

export function initDatabase(db: Database.Database): void {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      page_key TEXT NOT NULL UNIQUE,
      pathname TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      root_path TEXT NOT NULL UNIQUE,
      dev_server_urls_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      pathname TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      kind TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      comment TEXT NOT NULL,
      element_name TEXT NOT NULL,
      element_path TEXT NOT NULL,
      match_count INTEGER,
      selected_text TEXT,
      nearby_text TEXT,
      related_elements TEXT,
      page_x REAL NOT NULL,
      page_y REAL NOT NULL,
      rect_json TEXT NOT NULL,
      context_json TEXT,
      resolved_at INTEGER,
      resolved_by TEXT,
      deleted_at INTEGER,
      deleted_by TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS annotation_replies (
      id TEXT PRIMARY KEY,
      annotation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (annotation_id) REFERENCES annotations(id)
    );

    CREATE TABLE IF NOT EXISTS stability_items (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      pathname TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      severity TEXT NOT NULL DEFAULT 'high',
      title TEXT NOT NULL,
      symptom TEXT NOT NULL,
      repro_steps TEXT,
      impact TEXT,
      signals TEXT,
      fix_goal TEXT,
      context_json TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS repair_requests (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      stability_item_id TEXT,
      pathname TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'requested',
      title TEXT NOT NULL,
      severity TEXT,
      prompt TEXT NOT NULL,
      requested_by TEXT NOT NULL DEFAULT 'human',
      completed_at INTEGER,
      completed_by TEXT,
      result_summary TEXT,
      idempotency_key TEXT UNIQUE,
      actor_id TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (stability_item_id) REFERENCES stability_items(id)
    );
  `);

  ensureColumn(db, "annotations", "context_json", "TEXT");
  ensureColumn(db, "repair_requests", "idempotency_key", "TEXT");
  ensureColumn(db, "repair_requests", "actor_id", "TEXT");

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_workspaces_root_path ON workspaces(root_path);
    CREATE INDEX IF NOT EXISTS idx_repair_requests_idempotency ON repair_requests(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_sessions_page_key ON sessions(page_key);
    CREATE INDEX IF NOT EXISTS idx_annotations_session_id ON annotations(session_id);
    CREATE INDEX IF NOT EXISTS idx_annotations_status ON annotations(status);
    CREATE INDEX IF NOT EXISTS idx_replies_annotation_id ON annotation_replies(annotation_id);
    CREATE INDEX IF NOT EXISTS idx_stability_session_id ON stability_items(session_id);
    CREATE INDEX IF NOT EXISTS idx_stability_status ON stability_items(status);
    CREATE INDEX IF NOT EXISTS idx_repair_requests_session_id ON repair_requests(session_id);
    CREATE INDEX IF NOT EXISTS idx_repair_requests_status ON repair_requests(status);
  `);
}
