import fs from "node:fs";
import path from "node:path";

import type {
  DevPilotAnnotationRecord,
  DevPilotResolvedSource,
  DevPilotSourceSnippet,
  DevPilotSourceResolutionStrategy,
  DevPilotStabilityItemRecord,
  DevPilotWorkspaceRecord,
} from "../types.js";
import { discoverWorkspaceCandidates } from "./workspace-discovery.js";

const SOURCE_FILE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".vue",
  ".svelte",
]);

const IGNORED_DIRS = new Set([
  ".git",
  ".hg",
  ".next",
  ".nuxt",
  ".turbo",
  ".yarn",
  "coverage",
  "dist",
  "build",
  "node_modules",
  "out",
  "tmp",
]);

const DEFAULT_MAX_RESULTS = 5;
const workspaceFileCache = new Map<string, { expiresAt: number; files: string[] }>();

type ParsedSourceReference = {
  raw: string;
  pathText: string;
  line?: number;
  column?: number;
  url?: string;
};

function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function directoryExists(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function isLikelySourceFile(filePath: string): boolean {
  return SOURCE_FILE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function normalizePathSlashes(value: string): string {
  return value.replace(/\\/g, "/");
}

function stripLineAndColumn(value: string): ParsedSourceReference {
  const normalized = value.trim();
  const match = normalized.match(/^(.*?)(?::(\d+))?(?::(\d+))?$/);
  if (!match) {
    return { raw: normalized, pathText: normalized };
  }

  const [, pathText, line, column] = match;
  return {
    raw: normalized,
    pathText: pathText || normalized,
    line: line ? Number.parseInt(line, 10) : undefined,
    column: column ? Number.parseInt(column, 10) : undefined,
  };
}

function parseSourceReference(value: string): ParsedSourceReference | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const withoutPrefix = trimmed.startsWith("file:") ? trimmed.slice(5) : trimmed;
  const parsed = stripLineAndColumn(withoutPrefix);
  let candidate = parsed.pathText.trim();
  let url: string | undefined;

  if (candidate.startsWith("/@fs/")) {
    candidate = candidate.slice(4);
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate)) {
    url = candidate;
    try {
      const parsedUrl = new URL(candidate);
      if (parsedUrl.protocol === "file:") {
        candidate = decodeURIComponent(parsedUrl.pathname);
      } else {
        candidate = decodeURIComponent(parsedUrl.pathname);
      }
    } catch {
      // Keep the original candidate if URL parsing fails.
    }
  }

  candidate = candidate
    .replace(/^webpack:\/\//, "")
    .replace(/^vite:\/\//, "")
    .replace(/^file:\/\//, "")
    .replace(/[?#].*$/, "");

  if (!candidate) {
    return null;
  }

  return {
    raw: trimmed,
    pathText: normalizePathSlashes(candidate),
    line: parsed.line,
    column: parsed.column,
    url,
  };
}

function getWorkspaceFiles(workspaceRoot: string): string[] {
  const normalizedRoot = path.resolve(workspaceRoot);
  const cached = workspaceFileCache.get(normalizedRoot);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.files;
  }

  const files: string[] = [];
  const queue = [normalizedRoot];

  while (queue.length > 0) {
    const current = queue.pop()!;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    entries.forEach((entry) => {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          queue.push(entryPath);
        }
        return;
      }

      if (entry.isFile() && isLikelySourceFile(entryPath)) {
        files.push(entryPath);
      }
    });
  }

  workspaceFileCache.set(normalizedRoot, {
    files,
    expiresAt: Date.now() + 30_000,
  });

  return files;
}

function dedupeResolvedSources(
  sources: DevPilotResolvedSource[],
  maxResults: number,
): DevPilotResolvedSource[] {
  const byPath = new Map<string, DevPilotResolvedSource>();

  sources
    .sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return a.filePath.localeCompare(b.filePath);
    })
    .forEach((source) => {
      const key = source.filePath;
      if (!byPath.has(key)) {
        byPath.set(key, source);
      }
    });

  return Array.from(byPath.values()).slice(0, maxResults);
}

function toResolvedSource(
  workspace: DevPilotWorkspaceRecord,
  filePath: string,
  strategy: DevPilotSourceResolutionStrategy,
  confidence: number,
  reason: string,
  line?: number,
  column?: number,
): DevPilotResolvedSource {
  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceRoot: workspace.rootPath,
    filePath,
    relativePath: normalizePathSlashes(path.relative(workspace.rootPath, filePath)),
    line,
    column,
    confidence,
    strategy,
    reason,
  };
}

function matchWorkspacesForUrl(
  workspaces: DevPilotWorkspaceRecord[],
  url?: string,
): DevPilotWorkspaceRecord[] {
  if (!url) {
    return workspaces;
  }

  const matching = workspaces.filter((workspace) =>
    (workspace.devServerUrls || []).some((prefix) => url.startsWith(prefix)),
  );

  return matching.length > 0 ? matching : workspaces;
}

function uniqWorkspaces(workspaces: DevPilotWorkspaceRecord[]): DevPilotWorkspaceRecord[] {
  return Array.from(
    new Map(
      workspaces.map((workspace) => [path.resolve(workspace.rootPath), workspace]),
    ).values(),
  );
}

function getCandidateWorkspaces(
  workspaces: DevPilotWorkspaceRecord[],
  url?: string,
  discoveryStartPaths: string[] = [process.cwd()],
): DevPilotWorkspaceRecord[] {
  const explicit = workspaces.length > 0 ? workspaces : discoverWorkspaceCandidates(discoveryStartPaths);
  return uniqWorkspaces(matchWorkspacesForUrl(explicit, url));
}

function tryResolveExactReference(
  reference: ParsedSourceReference,
  workspaces: DevPilotWorkspaceRecord[],
): DevPilotResolvedSource[] {
  const results: DevPilotResolvedSource[] = [];

  const absoluteCandidate = path.isAbsolute(reference.pathText)
    ? path.resolve(reference.pathText)
    : null;

  if (absoluteCandidate && fileExists(absoluteCandidate)) {
    const workspace = workspaces.find((item) =>
      normalizePathSlashes(absoluteCandidate).startsWith(
        normalizePathSlashes(path.resolve(item.rootPath)) + "/",
      ) || path.resolve(item.rootPath) === absoluteCandidate,
    );

    if (workspace) {
      results.push(
        toResolvedSource(
          workspace,
          absoluteCandidate,
          "absolute-path",
          1,
          `Matched absolute source hint ${reference.raw}`,
          reference.line,
          reference.column,
        ),
      );
    }
  }

  workspaces.forEach((workspace) => {
    const normalizedRoot = path.resolve(workspace.rootPath);
    const workspaceRelativePath = reference.pathText.startsWith("/")
      ? reference.pathText.slice(1)
      : reference.pathText;
    const directCandidate = path.resolve(normalizedRoot, workspaceRelativePath);
    if (fileExists(directCandidate)) {
      results.push(
        toResolvedSource(
          workspace,
          directCandidate,
          reference.url ? "workspace-url" : "workspace-relative",
          reference.url ? 0.98 : 0.96,
          reference.url
            ? `Resolved source URL ${reference.raw} inside workspace`
            : `Resolved source hint ${reference.raw} inside workspace`,
          reference.line,
          reference.column,
        ),
      );
    }
  });

  return results;
}

function findFilesByBasename(
  workspace: DevPilotWorkspaceRecord,
  basename: string,
  maxResults: number,
): string[] {
  const files = getWorkspaceFiles(workspace.rootPath);
  return files.filter((filePath) => path.basename(filePath) === basename).slice(0, maxResults);
}

function findComponentFiles(
  workspace: DevPilotWorkspaceRecord,
  componentName: string,
  maxResults: number,
): string[] {
  const componentBasenames = SOURCE_FILE_EXTENSIONS.size
    ? Array.from(SOURCE_FILE_EXTENSIONS).map((extension) => `${componentName}${extension}`)
    : [];
  const files = getWorkspaceFiles(workspace.rootPath);
  return files.filter((filePath) => componentBasenames.includes(path.basename(filePath))).slice(0, maxResults);
}

function resolveFromSourceHints(
  sourceHints: string[],
  workspaces: DevPilotWorkspaceRecord[],
  maxResults: number,
): DevPilotResolvedSource[] {
  const results: DevPilotResolvedSource[] = [];

  sourceHints.forEach((hint) => {
    const reference = parseSourceReference(hint);
    if (!reference) {
      return;
    }

    results.push(...tryResolveExactReference(reference, workspaces));

    if (results.length >= maxResults) {
      return;
    }

    const basename = path.basename(reference.pathText);
    if (!basename) {
      return;
    }

    workspaces.forEach((workspace) => {
      findFilesByBasename(workspace, basename, maxResults).forEach((filePath) => {
        results.push(
          toResolvedSource(
            workspace,
            filePath,
            "basename-search",
            0.72,
            `Matched source hint basename ${basename}`,
            reference.line,
            reference.column,
          ),
        );
      });
    });
  });

  return dedupeResolvedSources(results, maxResults);
}

function resolveFromComponentHints(
  componentHints: string[],
  workspaces: DevPilotWorkspaceRecord[],
  maxResults: number,
): DevPilotResolvedSource[] {
  const results: DevPilotResolvedSource[] = [];

  componentHints.forEach((componentName) => {
    workspaces.forEach((workspace) => {
      findComponentFiles(workspace, componentName, maxResults).forEach((filePath) => {
        results.push(
          toResolvedSource(
            workspace,
            filePath,
            "component-search",
            0.7,
            `Matched component hint ${componentName}`,
          ),
        );
      });
    });
  });

  return dedupeResolvedSources(results, maxResults);
}

function normalizeRoutePath(routePath: string): string[] {
  return routePath
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function getUrlPathname(url: string | undefined, fallbackPathname: string): string {
  if (!url) {
    return fallbackPathname;
  }

  try {
    return new URL(url).pathname || fallbackPathname;
  } catch {
    return fallbackPathname;
  }
}

function findRouteEntryCandidates(
  workspace: DevPilotWorkspaceRecord,
  routePath: string,
  maxResults: number,
): DevPilotResolvedSource[] {
  const segments = normalizeRoutePath(routePath);
  if (segments.length === 0) {
    return [];
  }

  const files = getWorkspaceFiles(workspace.rootPath);
  const routeSuffix = segments.join("/");
  const slugLeaf = segments[segments.length - 1];
  const exactPatterns = new Set([
    `pages/${routeSuffix}.tsx`,
    `pages/${routeSuffix}.ts`,
    `src/pages/${routeSuffix}.tsx`,
    `src/pages/${routeSuffix}.ts`,
    `app/${routeSuffix}/page.tsx`,
    `app/${routeSuffix}/page.ts`,
    `src/app/${routeSuffix}/page.tsx`,
    `src/app/${routeSuffix}/page.ts`,
    `routes/${routeSuffix}.tsx`,
    `routes/${routeSuffix}.ts`,
    `src/routes/${routeSuffix}.tsx`,
    `src/routes/${routeSuffix}.ts`,
    `app/${routeSuffix}/index.tsx`,
    `src/app/${routeSuffix}/index.tsx`,
    `pages/${routeSuffix}/index.tsx`,
    `src/pages/${routeSuffix}/index.tsx`,
  ].map((pattern) => normalizePathSlashes(pattern)));

  const scored = files
    .map((filePath) => {
      const relativePath = normalizePathSlashes(path.relative(workspace.rootPath, filePath));
      let confidence = 0;
      let reason = "";

      if (exactPatterns.has(relativePath)) {
        confidence = 0.86;
        reason = `Matched route ${routePath} to entry file ${relativePath}`;
      } else if (
        relativePath.includes(`/${slugLeaf}.`) ||
        relativePath.endsWith(`/${slugLeaf}/page.tsx`) ||
        relativePath.endsWith(`/${slugLeaf}/page.ts`) ||
        relativePath.endsWith(`/${slugLeaf}/index.tsx`) ||
        relativePath.endsWith(`/${slugLeaf}/index.ts`)
      ) {
        confidence = 0.58;
        reason = `Matched route leaf ${slugLeaf} to candidate file ${relativePath}`;
      }

      return confidence > 0
        ? toResolvedSource(workspace, filePath, "route-entry", confidence, reason)
        : null;
    })
    .filter((item): item is DevPilotResolvedSource => Boolean(item))
    .sort((a, b) => b.confidence - a.confidence);

  return scored.slice(0, maxResults);
}

function resolveFromRoutePath(
  routePath: string | undefined,
  workspaces: DevPilotWorkspaceRecord[],
  maxResults: number,
): DevPilotResolvedSource[] {
  if (!routePath) {
    return [];
  }

  const results: DevPilotResolvedSource[] = [];
  workspaces.forEach((workspace) => {
    results.push(...findRouteEntryCandidates(workspace, routePath, maxResults));
  });

  return dedupeResolvedSources(results, maxResults);
}

function extractSourceHintsFromSignals(signals?: string): string[] {
  if (!signals) {
    return [];
  }

  const hints = new Set<string>();
  const lines = signals.split("\n").map((line) => line.trim()).filter(Boolean);

  lines.forEach((line) => {
    if (line.startsWith("file=") || line.startsWith("url=")) {
      hints.add(line.slice(line.indexOf("=") + 1));
    }

    if (line.startsWith("stack=")) {
      const stack = line.slice("stack=".length);
      const matches = stack.match(
        /((?:https?:\/\/|file:\/\/|webpack:\/\/\/|vite:\/\/\/)[^\s)]+|\/[^\s):]+\.(?:tsx?|jsx?|mjs|cjs|vue|svelte)(?::\d+){0,2}|[A-Za-z]:\\[^\s):]+\.(?:tsx?|jsx?|mjs|cjs|vue|svelte)(?::\d+){0,2}|(?:src|app|pages|packages|lib|components)\/[^\s):]+\.(?:tsx?|jsx?|mjs|cjs|vue|svelte)(?::\d+){0,2})/g,
      );
      matches?.forEach((match) => hints.add(match));
    }
  });

  return Array.from(hints);
}

export function resolveAnnotationSources(
  annotation: DevPilotAnnotationRecord,
  workspaces: DevPilotWorkspaceRecord[],
  pageUrl?: string,
  maxResults = DEFAULT_MAX_RESULTS,
): DevPilotResolvedSource[] {
  const scopedWorkspaces = getCandidateWorkspaces(workspaces, pageUrl);
  const sourceHints = annotation.context?.sourceHints || [];
  const componentHints = annotation.context?.componentHints || [];

  const exactMatches = resolveFromSourceHints(sourceHints, scopedWorkspaces, maxResults);
  if (exactMatches.length >= maxResults) {
    return exactMatches.slice(0, maxResults);
  }

  const componentMatches = resolveFromComponentHints(
    componentHints,
    scopedWorkspaces,
    maxResults,
  );
  const routeMatches = resolveFromRoutePath(
    getUrlPathname(pageUrl, annotation.pathname),
    scopedWorkspaces,
    maxResults,
  );

  return dedupeResolvedSources(
    [...exactMatches, ...componentMatches, ...routeMatches],
    maxResults,
  );
}

export function resolveStabilitySources(
  item: DevPilotStabilityItemRecord,
  workspaces: DevPilotWorkspaceRecord[],
  maxResults = DEFAULT_MAX_RESULTS,
): DevPilotResolvedSource[] {
  const scopedWorkspaces = getCandidateWorkspaces(workspaces, item.context.url);
  const signalHints = extractSourceHintsFromSignals(item.signals);
  const exactMatches = resolveFromSourceHints(signalHints, scopedWorkspaces, maxResults);
  const routeMatches = resolveFromRoutePath(
    getUrlPathname(item.context.url, item.pathname),
    scopedWorkspaces,
    maxResults,
  );
  return dedupeResolvedSources(
    [
      ...exactMatches.map((match) => ({
        ...match,
        strategy: match.strategy === "basename-search" ? "signal-search" : match.strategy,
        reason: `Resolved from runtime signals: ${match.reason}`,
      })),
      ...routeMatches,
    ],
    maxResults,
  );
}

export function createSourceSnippet(
  filePath: string,
  line = 1,
  contextLines = 4,
): DevPilotSourceSnippet {
  const resolvedFilePath = path.resolve(filePath);
  if (!fileExists(resolvedFilePath)) {
    throw new Error(`Source file not found: ${resolvedFilePath}`);
  }

  const raw = fs.readFileSync(resolvedFilePath, "utf8");
  const allLines = raw.split(/\r?\n/);
  const safeLine = Math.min(Math.max(1, line), Math.max(1, allLines.length));
  const startLine = Math.max(1, safeLine - contextLines);
  const endLine = Math.min(allLines.length, safeLine + contextLines);

  return {
    filePath: resolvedFilePath,
    startLine,
    endLine,
    line: safeLine,
    contextLines,
    content: allLines.slice(startLine - 1, endLine).join("\n"),
  };
}

export function validateWorkspaceRoot(rootPath: string): string {
  const normalized = path.resolve(rootPath);
  if (!directoryExists(normalized)) {
    throw new Error(`Workspace root does not exist: ${normalized}`);
  }
  return normalized;
}

export function autoDiscoverWorkspaces(
  startPaths: string[] = [process.cwd()],
): DevPilotWorkspaceRecord[] {
  return discoverWorkspaceCandidates(startPaths);
}
