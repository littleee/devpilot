import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import type {
  DevPilotAnnotationRecord,
  DevPilotAnnotationReply,
  DevPilotAnnotationStatus,
  DevPilotEnsureSessionInput,
  DevPilotSessionRecord,
  DevPilotSessionWithAnnotations,
  DevPilotSelectionKind,
} from "./types.js";

const DEFAULT_DB_DIR = path.join(os.homedir(), ".devpilot");
const DEFAULT_DB_PATH = path.join(DEFAULT_DB_DIR, "devpilot-mcp.sqlite");

type SessionRow = {
  id: string;
  page_key: string;
  pathname: string;
  url: string;
  title: string;
  status: "active" | "closed";
  created_at: number;
  updated_at: number;
};

type AnnotationRow = {
  id: string;
  session_id: string;
  pathname: string;
  created_at: number;
  updated_at: number;
  kind: DevPilotSelectionKind | null;
  status: DevPilotAnnotationStatus;
  comment: string;
  element_name: string;
  element_path: string;
  match_count: number | null;
  selected_text: string | null;
  nearby_text: string | null;
  related_elements: string | null;
  page_x: number;
  page_y: number;
  rect_json: string;
  resolved_at: number | null;
  resolved_by: "human" | "agent" | null;
};

type ReplyRow = {
  id: string;
  annotation_id: string;
  role: "human" | "agent";
  content: string;
  created_at: number;
};

function ensureDbPath(dbPath: string): void {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function initDatabase(db: Database.Database): void {
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
      resolved_at INTEGER,
      resolved_by TEXT,
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

    CREATE INDEX IF NOT EXISTS idx_sessions_page_key ON sessions(page_key);
    CREATE INDEX IF NOT EXISTS idx_annotations_session_id ON annotations(session_id);
    CREATE INDEX IF NOT EXISTS idx_annotations_status ON annotations(status);
    CREATE INDEX IF NOT EXISTS idx_replies_annotation_id ON annotation_replies(annotation_id);
  `);
}

function rowToSession(row: SessionRow): DevPilotSessionRecord {
  return {
    id: row.id,
    pageKey: row.page_key,
    pathname: row.pathname,
    url: row.url,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createStore(dbPath = DEFAULT_DB_PATH) {
  ensureDbPath(dbPath);
  const db = new Database(dbPath);
  initDatabase(db);

  const statements = {
    getSessionById: db.prepare("SELECT * FROM sessions WHERE id = ?"),
    getSessionByPageKey: db.prepare("SELECT * FROM sessions WHERE page_key = ?"),
    listSessions: db.prepare("SELECT * FROM sessions ORDER BY updated_at DESC"),
    insertSession: db.prepare(`
      INSERT INTO sessions (id, page_key, pathname, url, title, status, created_at, updated_at)
      VALUES (@id, @pageKey, @pathname, @url, @title, @status, @createdAt, @updatedAt)
    `),
    updateSession: db.prepare(`
      UPDATE sessions
      SET pathname = @pathname, url = @url, title = @title, updated_at = @updatedAt
      WHERE id = @id
    `),
    touchSession: db.prepare(`
      UPDATE sessions
      SET updated_at = @updatedAt
      WHERE id = @id
    `),
    getAnnotationById: db.prepare("SELECT * FROM annotations WHERE id = ?"),
    getAnnotationsBySession: db.prepare(`
      SELECT * FROM annotations
      WHERE session_id = ?
      ORDER BY updated_at DESC, created_at DESC
    `),
    getPendingBySession: db.prepare(`
      SELECT * FROM annotations
      WHERE session_id = ? AND status IN ('pending', 'acknowledged')
      ORDER BY updated_at DESC, created_at DESC
    `),
    getPendingAll: db.prepare(`
      SELECT * FROM annotations
      WHERE status IN ('pending', 'acknowledged')
      ORDER BY updated_at DESC, created_at DESC
    `),
    insertAnnotation: db.prepare(`
      INSERT INTO annotations (
        id, session_id, pathname, created_at, updated_at, kind, status, comment,
        element_name, element_path, match_count, selected_text, nearby_text,
        related_elements, page_x, page_y, rect_json, resolved_at, resolved_by
      ) VALUES (
        @id, @sessionId, @pathname, @createdAt, @updatedAt, @kind, @status, @comment,
        @elementName, @elementPath, @matchCount, @selectedText, @nearbyText,
        @relatedElements, @pageX, @pageY, @rectJson, @resolvedAt, @resolvedBy
      )
    `),
    updateAnnotation: db.prepare(`
      UPDATE annotations SET
        pathname = @pathname,
        updated_at = @updatedAt,
        kind = @kind,
        status = @status,
        comment = @comment,
        element_name = @elementName,
        element_path = @elementPath,
        match_count = @matchCount,
        selected_text = @selectedText,
        nearby_text = @nearbyText,
        related_elements = @relatedElements,
        page_x = @pageX,
        page_y = @pageY,
        rect_json = @rectJson,
        resolved_at = @resolvedAt,
        resolved_by = @resolvedBy
      WHERE id = @id
    `),
    deleteAnnotation: db.prepare("DELETE FROM annotations WHERE id = ?"),
    deleteRepliesByAnnotation: db.prepare("DELETE FROM annotation_replies WHERE annotation_id = ?"),
    getRepliesByAnnotation: db.prepare(`
      SELECT * FROM annotation_replies
      WHERE annotation_id = ?
      ORDER BY created_at ASC
    `),
    insertReply: db.prepare(`
      INSERT INTO annotation_replies (id, annotation_id, role, content, created_at)
      VALUES (@id, @annotationId, @role, @content, @createdAt)
    `),
  };

  function rowToReply(row: ReplyRow): DevPilotAnnotationReply {
    return {
      id: row.id,
      annotationId: row.annotation_id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
    };
  }

  function rowToAnnotation(row: AnnotationRow): DevPilotAnnotationRecord {
    return {
      id: row.id,
      sessionId: row.session_id,
      pathname: row.pathname,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      kind: row.kind || undefined,
      status: row.status,
      comment: row.comment,
      elementName: row.element_name,
      elementPath: row.element_path,
      matchCount: row.match_count ?? undefined,
      selectedText: row.selected_text ?? undefined,
      nearbyText: row.nearby_text ?? undefined,
      relatedElements: parseJson<string[]>(row.related_elements, []),
      pageX: row.page_x,
      pageY: row.page_y,
      rect: parseJson(row.rect_json, {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
      }),
      resolvedAt: row.resolved_at ?? undefined,
      resolvedBy: row.resolved_by ?? undefined,
      replies: (statements.getRepliesByAnnotation.all(row.id) as ReplyRow[]).map(rowToReply),
    };
  }

  function serializeAnnotation(
    annotation: DevPilotAnnotationRecord,
  ): Record<string, number | string | null> {
    return {
      id: annotation.id,
      sessionId: annotation.sessionId,
      pathname: annotation.pathname,
      createdAt: annotation.createdAt,
      updatedAt: annotation.updatedAt,
      kind: annotation.kind ?? null,
      status: annotation.status,
      comment: annotation.comment,
      elementName: annotation.elementName,
      elementPath: annotation.elementPath,
      matchCount: annotation.matchCount ?? null,
      selectedText: annotation.selectedText ?? null,
      nearbyText: annotation.nearbyText ?? null,
      relatedElements:
        annotation.relatedElements && annotation.relatedElements.length > 0
          ? JSON.stringify(annotation.relatedElements)
          : null,
      pageX: annotation.pageX,
      pageY: annotation.pageY,
      rectJson: JSON.stringify(annotation.rect),
      resolvedAt: annotation.resolvedAt ?? null,
      resolvedBy: annotation.resolvedBy ?? null,
    };
  }

  function getSessionById(id: string): DevPilotSessionRecord | null {
    const row = statements.getSessionById.get(id) as SessionRow | undefined;
    return row ? rowToSession(row) : null;
  }

  function getAnnotationById(id: string): DevPilotAnnotationRecord | null {
    const row = statements.getAnnotationById.get(id) as AnnotationRow | undefined;
    return row ? rowToAnnotation(row) : null;
  }

  function touchSession(sessionId: string): void {
    statements.touchSession.run({
      id: sessionId,
      updatedAt: Date.now(),
    });
  }

  function updateAnnotationRecord(
    id: string,
    input: Partial<Omit<DevPilotAnnotationRecord, "id" | "sessionId" | "replies">>,
  ): DevPilotAnnotationRecord | null {
    const existing = getAnnotationById(id);
    if (!existing) {
      return null;
    }

    const nextStatus = input.status ?? existing.status;
    const isClosed = nextStatus === "resolved" || nextStatus === "dismissed";
    const next: DevPilotAnnotationRecord = {
      ...existing,
      ...input,
      id,
      sessionId: existing.sessionId,
      pathname: input.pathname ?? existing.pathname,
      status: nextStatus,
      updatedAt: input.updatedAt ?? Date.now(),
      resolvedAt:
        input.resolvedAt !== undefined
          ? input.resolvedAt
          : isClosed
            ? existing.resolvedAt ?? Date.now()
            : undefined,
      resolvedBy:
        input.resolvedBy !== undefined
          ? input.resolvedBy
          : isClosed
            ? existing.resolvedBy
            : undefined,
      replies: existing.replies,
    };

    statements.updateAnnotation.run(serializeAnnotation(next));
    touchSession(existing.sessionId);
    return getAnnotationById(id);
  }

  return {
    getDbPath(): string {
      return dbPath;
    },
    ensureSession(input: DevPilotEnsureSessionInput): DevPilotSessionRecord {
      const existing = statements.getSessionByPageKey.get(input.pageKey) as SessionRow | undefined;
      const now = Date.now();

      if (existing) {
        statements.updateSession.run({
          id: existing.id,
          pathname: input.pathname,
          url: input.url,
          title: input.title,
          updatedAt: now,
        });
        return getSessionById(existing.id)!;
      }

      const session: DevPilotSessionRecord = {
        id: createId("session"),
        pageKey: input.pageKey,
        pathname: input.pathname,
        url: input.url,
        title: input.title,
        status: "active",
        createdAt: now,
        updatedAt: now,
      };

      statements.insertSession.run({
        id: session.id,
        pageKey: session.pageKey,
        pathname: session.pathname,
        url: session.url,
        title: session.title,
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      });

      return session;
    },
    listSessions(): DevPilotSessionRecord[] {
      return (statements.listSessions.all() as SessionRow[]).map(rowToSession);
    },
    getSession(id: string): DevPilotSessionRecord | null {
      return getSessionById(id);
    },
    getSessionWithAnnotations(id: string): DevPilotSessionWithAnnotations | null {
      const session = getSessionById(id);
      if (!session) {
        return null;
      }

      const annotations = (statements.getAnnotationsBySession.all(id) as AnnotationRow[]).map(
        rowToAnnotation,
      );
      return {
        ...session,
        annotations,
      };
    },
    addAnnotation(
      sessionId: string,
      input: Omit<DevPilotAnnotationRecord, "sessionId" | "replies">,
    ): DevPilotAnnotationRecord | null {
      const session = getSessionById(sessionId);
      if (!session) {
        return null;
      }

      const annotation: DevPilotAnnotationRecord = {
        ...input,
        sessionId,
        status: input.status ?? "pending",
        replies: [],
      };

      statements.insertAnnotation.run(serializeAnnotation(annotation));
      touchSession(sessionId);
      return getAnnotationById(annotation.id);
    },
    updateAnnotation(
      id: string,
      input: Partial<Omit<DevPilotAnnotationRecord, "id" | "sessionId" | "replies">>,
    ): DevPilotAnnotationRecord | null {
      return updateAnnotationRecord(id, input);
    },
    updateAnnotationStatus(
      id: string,
      status: DevPilotAnnotationStatus,
      resolvedBy?: "human" | "agent",
    ): DevPilotAnnotationRecord | null {
      return updateAnnotationRecord(id, {
        status,
        updatedAt: Date.now(),
        resolvedAt:
          status === "resolved" || status === "dismissed" ? Date.now() : undefined,
        resolvedBy:
          status === "resolved" || status === "dismissed"
            ? resolvedBy || "agent"
            : undefined,
      });
    },
    deleteAnnotation(id: string): DevPilotAnnotationRecord | null {
      const existing = getAnnotationById(id);
      if (!existing) {
        return null;
      }

      statements.deleteRepliesByAnnotation.run(id);
      statements.deleteAnnotation.run(id);
      touchSession(existing.sessionId);
      return existing;
    },
    addReply(
      annotationId: string,
      role: "human" | "agent",
      content: string,
    ): DevPilotAnnotationRecord | null {
      const annotation = getAnnotationById(annotationId);
      if (!annotation) {
        return null;
      }

      statements.insertReply.run({
        id: createId("reply"),
        annotationId,
        role,
        content,
        createdAt: Date.now(),
      });
      touchSession(annotation.sessionId);
      return getAnnotationById(annotationId);
    },
    getAnnotation(id: string): DevPilotAnnotationRecord | null {
      return getAnnotationById(id);
    },
    getPendingAnnotations(sessionId: string): DevPilotAnnotationRecord[] {
      return (statements.getPendingBySession.all(sessionId) as AnnotationRow[]).map(rowToAnnotation);
    },
    getAllPendingAnnotations(): DevPilotAnnotationRecord[] {
      return (statements.getPendingAll.all() as AnnotationRow[]).map(rowToAnnotation);
    },
    close(): void {
      db.close();
    },
  };
}

export type DevPilotStore = ReturnType<typeof createStore>;
