import fs from "node:fs";
import path from "node:path";

import type { DevPilotWorkspaceRecord } from "../types.js";

const WORKSPACE_MARKERS = [
  "package.json",
  "pnpm-workspace.yaml",
  "turbo.json",
  "pyproject.toml",
  "go.mod",
  "Cargo.toml",
  ".git",
] as const;

function pathExists(targetPath: string): boolean {
  try {
    fs.accessSync(targetPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function isDirectory(targetPath: string): boolean {
  try {
    return fs.statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
}

function looksLikeWorkspaceRoot(targetPath: string): boolean {
  return WORKSPACE_MARKERS.some((marker) => pathExists(path.join(targetPath, marker)));
}

function normalizeStartPath(startPath: string): string {
  const resolved = path.resolve(startPath);
  if (isDirectory(resolved)) {
    return resolved;
  }
  return path.dirname(resolved);
}

function inferWorkspaceName(rootPath: string): string {
  return path.basename(rootPath) || rootPath;
}

function toWorkspaceRecord(rootPath: string): DevPilotWorkspaceRecord {
  const now = Date.now();
  return {
    id: `workspace_discovered_${Buffer.from(rootPath).toString("base64url").slice(0, 12)}`,
    name: inferWorkspaceName(rootPath),
    rootPath,
    devServerUrls: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function discoverWorkspaceCandidates(
  startPaths: string[] = [process.cwd()],
): DevPilotWorkspaceRecord[] {
  const discovered = new Map<string, DevPilotWorkspaceRecord>();

  startPaths
    .filter(Boolean)
    .map(normalizeStartPath)
    .forEach((initialPath) => {
      let current = initialPath;

      while (true) {
        if (looksLikeWorkspaceRoot(current) && !discovered.has(current)) {
          discovered.set(current, toWorkspaceRecord(current));
        }

        const parent = path.dirname(current);
        if (parent === current) {
          break;
        }
        current = parent;
      }
    });

  return Array.from(discovered.values()).sort((a, b) =>
    a.rootPath.length - b.rootPath.length,
  );
}
