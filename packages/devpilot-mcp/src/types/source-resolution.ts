export type DevPilotSourceResolutionStrategy =
  | "absolute-path"
  | "workspace-relative"
  | "workspace-url"
  | "basename-search"
  | "component-search"
  | "route-entry"
  | "signal-search";

export interface DevPilotSourceSnippet {
  filePath: string;
  startLine: number;
  endLine: number;
  line: number;
  contextLines: number;
  content: string;
}

export interface DevPilotResolvedSource {
  workspaceId: string;
  workspaceName: string;
  workspaceRoot: string;
  filePath: string;
  relativePath: string;
  line?: number;
  column?: number;
  confidence: number;
  strategy: DevPilotSourceResolutionStrategy;
  reason: string;
}
