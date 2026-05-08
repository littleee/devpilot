import path from "node:path";

import Database from "better-sqlite3";

import type {
  DevPilotRegisterWorkspaceInput,
  DevPilotWorkspaceRecord,
} from "../types.js";
import {
  createId,
  rowToWorkspace,
  serializeWorkspace,
} from "./mappers.js";
import type { WorkspaceRow } from "./row-types.js";

function normalizeWorkspaceRootPath(rootPath: string): string {
  return path.resolve(rootPath);
}

function inferWorkspaceName(rootPath: string): string {
  return path.basename(rootPath) || rootPath;
}

export function createWorkspaceRepository(db: Database.Database) {
  const statements = {
    getById: db.prepare("SELECT * FROM workspaces WHERE id = ?"),
    getByRootPath: db.prepare("SELECT * FROM workspaces WHERE root_path = ?"),
    list: db.prepare("SELECT * FROM workspaces ORDER BY updated_at DESC, created_at DESC"),
    insert: db.prepare(`
      INSERT INTO workspaces (id, name, root_path, dev_server_urls_json, created_at, updated_at)
      VALUES (@id, @name, @rootPath, @devServerUrlsJson, @createdAt, @updatedAt)
    `),
    update: db.prepare(`
      UPDATE workspaces
      SET name = @name, dev_server_urls_json = @devServerUrlsJson, updated_at = @updatedAt
      WHERE id = @id
    `),
  };

  function getWorkspaceById(id: string): DevPilotWorkspaceRecord | null {
    const row = statements.getById.get(id) as WorkspaceRow | undefined;
    return row ? rowToWorkspace(row) : null;
  }

  function listWorkspaces(): DevPilotWorkspaceRecord[] {
    return (statements.list.all() as WorkspaceRow[]).map(rowToWorkspace);
  }

  function registerWorkspace(
    input: DevPilotRegisterWorkspaceInput,
  ): DevPilotWorkspaceRecord {
    const normalizedRootPath = normalizeWorkspaceRootPath(input.rootPath);
    const existing = statements.getByRootPath.get(normalizedRootPath) as WorkspaceRow | undefined;
    const now = Date.now();

    if (existing) {
      const next: DevPilotWorkspaceRecord = {
        id: existing.id,
        name: input.name?.trim() || existing.name || inferWorkspaceName(normalizedRootPath),
        rootPath: normalizedRootPath,
        devServerUrls:
          input.devServerUrls?.filter(Boolean) || rowToWorkspace(existing).devServerUrls,
        createdAt: existing.created_at,
        updatedAt: now,
      };

      statements.update.run(serializeWorkspace(next));
      return getWorkspaceById(existing.id)!;
    }

    const workspace: DevPilotWorkspaceRecord = {
      id: createId("workspace"),
      name: input.name?.trim() || inferWorkspaceName(normalizedRootPath),
      rootPath: normalizedRootPath,
      devServerUrls: input.devServerUrls?.filter(Boolean) || [],
      createdAt: now,
      updatedAt: now,
    };

    statements.insert.run(serializeWorkspace(workspace));
    return workspace;
  }

  return {
    getWorkspaceById,
    listWorkspaces,
    registerWorkspace,
  };
}
