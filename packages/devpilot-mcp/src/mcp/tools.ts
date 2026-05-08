import { z } from "zod";

export const GetSessionSchema = z.object({
  sessionId: z.string().describe("The session ID to inspect"),
});

export const RegisterWorkspaceSchema = z.object({
  rootPath: z.string().describe("Absolute or relative workspace root path on the local machine"),
  name: z.string().optional().describe("Optional friendly workspace name"),
  devServerUrls: z
    .array(z.string())
    .optional()
    .describe("Optional dev server base URLs served by this workspace"),
});

export const AutoDiscoverWorkspacesSchema = z.object({
  startPaths: z
    .array(z.string())
    .optional()
    .describe("Optional starting paths to scan upward from when discovering workspaces"),
  persist: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to persist discovered workspaces in the local store"),
});

export const GetSessionTaskPacketSchema = z.object({
  sessionId: z.string().describe("The session ID to turn into a task packet"),
  includeClosed: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to include resolved or dismissed items in the packet"),
});

export const GetAgentPlaybookSchema = z.object({
  sessionId: z
    .string()
    .optional()
    .describe("Optional session ID used to tailor the playbook and prompt templates"),
  mode: z
    .enum(["critique", "self-driving", "watch"])
    .optional()
    .describe("Optional specific workflow mode to return"),
  includeClosed: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether closed items should be included when building a session-scoped playbook"),
  includePromptTemplate: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to include default system and task prompt templates"),
});

export const GetPendingSchema = z.object({
  sessionId: z.string().describe("The session ID to get pending annotations for"),
});

export const ResolveAnnotationSourceSchema = z.object({
  annotationId: z.string().describe("The annotation ID to resolve to local source files"),
  maxResults: z.number().min(1).max(20).optional().default(5),
});

export const GetSessionStabilitySchema = z.object({
  sessionId: z.string().describe("The session ID to inspect stability items for"),
});

export const ResolveStabilitySourceSchema = z.object({
  stabilityItemId: z.string().describe("The stability item ID to resolve to local source files"),
  maxResults: z.number().min(1).max(20).optional().default(5),
});

export const AnnotationIdSchema = z.object({
  annotationId: z.string().describe("The annotation ID to update"),
});

export const StabilityItemIdSchema = z.object({
  stabilityItemId: z.string().describe("The stability item ID to update"),
});

export const RepairRequestIdSchema = z.object({
  repairRequestId: z.string().describe("The repair request ID to update"),
});

export const ResolveSchema = z.object({
  annotationId: z.string().describe("The annotation ID to resolve"),
  summary: z.string().optional().describe("Optional summary of what was changed"),
});

export const DismissSchema = z.object({
  annotationId: z.string().describe("The annotation ID to dismiss"),
  reason: z.string().describe("Reason for dismissing the annotation"),
});

export const ReplySchema = z.object({
  annotationId: z.string().describe("The annotation ID to reply to"),
  message: z.string().describe("Reply content for the annotation thread"),
});

export const ResolveStabilitySchema = z.object({
  stabilityItemId: z.string().describe("The stability item ID to resolve"),
});

export const CompleteRepairRequestSchema = z.object({
  repairRequestId: z.string().describe("The repair request ID to complete"),
  summary: z.string().optional().describe("Optional summary of what was changed"),
});

export const DismissRepairRequestSchema = z.object({
  repairRequestId: z.string().describe("The repair request ID to dismiss"),
  reason: z.string().describe("Reason for dismissing the repair request"),
});

export const WatchSchema = z.object({
  sessionId: z.string().optional().describe("Optional session ID to scope the watch"),
  batchWindowSeconds: z.number().min(1).max(60).optional().default(10),
  timeoutSeconds: z.number().min(1).max(300).optional().default(120),
});

export const SourceSnippetSchema = z.object({
  filePath: z.string().describe("Absolute local source file path"),
  line: z.number().min(1).optional().default(1),
  contextLines: z.number().min(0).max(20).optional().default(4),
});

export const TOOLS = [
  {
    name: "devpilot_register_workspace",
    description: "Register a local workspace root so DevPilot can resolve browser hints to real source files",
    inputSchema: {
      type: "object" as const,
      properties: {
        rootPath: { type: "string", description: "Absolute or relative workspace root path" },
        name: { type: "string", description: "Optional friendly workspace name" },
        devServerUrls: {
          type: "array",
          items: { type: "string" },
          description: "Optional dev server base URLs served by this workspace",
        },
      },
      required: ["rootPath"],
    },
  },
  {
    name: "devpilot_list_workspaces",
    description: "List registered local workspaces available for source resolution",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "devpilot_auto_discover_workspaces",
    description: "Auto-discover likely local workspace roots by scanning from the current working directory or supplied start paths",
    inputSchema: {
      type: "object" as const,
      properties: {
        startPaths: {
          type: "array",
          items: { type: "string" },
          description: "Optional starting paths to scan upward from",
        },
        persist: {
          type: "boolean",
          description: "Whether to persist discovered workspaces in the local store",
        },
      },
      required: [],
    },
  },
  {
    name: "devpilot_list_sessions",
    description: "List all DevPilot sessions currently stored in the local bridge",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "devpilot_get_session",
    description: "Get raw session data with annotations, replies, stability items, and repair requests",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: { type: "string", description: "The session ID to inspect" },
      },
      required: ["sessionId"],
    },
  },
  {
    name: "devpilot_get_session_task_packet",
    description: "Build an agent-ready devpilot.task-packet/v2 brief for a session's current work",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: { type: "string", description: "The session ID to inspect" },
        includeClosed: {
          type: "boolean",
          description: "Whether to include resolved or dismissed items in the task packet",
        },
      },
      required: ["sessionId"],
    },
  },
  {
    name: "devpilot_get_agent_playbook",
    description: "Get the official DevPilot critique, self-driving, or watch workflow with default prompt templates and tool sequencing",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: {
          type: "string",
          description: "Optional session ID used to tailor the playbook",
        },
        mode: {
          type: "string",
          enum: ["critique", "self-driving", "watch"],
          description: "Optional specific workflow mode to return",
        },
        includeClosed: {
          type: "boolean",
          description: "Whether closed items should be included for session-scoped playbooks",
        },
        includePromptTemplate: {
          type: "boolean",
          description: "Whether to include default system and task prompt templates",
        },
      },
      required: [],
    },
  },
  {
    name: "devpilot_get_pending",
    description: "Get all open annotations for a session",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: { type: "string", description: "The session ID to inspect" },
      },
      required: ["sessionId"],
    },
  },
  {
    name: "devpilot_get_all_pending",
    description: "Get all open annotations across all sessions",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "devpilot_list_stability_items",
    description: "List all open stability items across all sessions",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "devpilot_get_session_stability_items",
    description: "Get all stability items for a session",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: { type: "string", description: "The session ID to inspect" },
      },
      required: ["sessionId"],
    },
  },
  {
    name: "devpilot_get_stability_item",
    description: "Get a single stability item",
    inputSchema: {
      type: "object" as const,
      properties: {
        stabilityItemId: { type: "string", description: "The stability item ID to inspect" },
      },
      required: ["stabilityItemId"],
    },
  },
  {
    name: "devpilot_list_repair_requests",
    description: "List all open repair requests across all sessions",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "devpilot_get_repair_request",
    description: "Get a single repair request",
    inputSchema: {
      type: "object" as const,
      properties: {
        repairRequestId: { type: "string", description: "The repair request ID to inspect" },
      },
      required: ["repairRequestId"],
    },
  },
  {
    name: "devpilot_resolve_annotation_source",
    description: "Resolve an annotation's source hints to verified local files with line and column when available",
    inputSchema: {
      type: "object" as const,
      properties: {
        annotationId: { type: "string", description: "The annotation ID to resolve" },
        maxResults: { type: "number", description: "Maximum number of matches to return" },
      },
      required: ["annotationId"],
    },
  },
  {
    name: "devpilot_resolve_stability_source",
    description: "Resolve a stability item's runtime signals to verified local files with line and column when available",
    inputSchema: {
      type: "object" as const,
      properties: {
        stabilityItemId: { type: "string", description: "The stability item ID to resolve" },
        maxResults: { type: "number", description: "Maximum number of matches to return" },
      },
      required: ["stabilityItemId"],
    },
  },
  {
    name: "devpilot_get_source_snippet",
    description: "Read a focused source snippet around a file path and line number",
    inputSchema: {
      type: "object" as const,
      properties: {
        filePath: { type: "string", description: "Absolute local source file path" },
        line: { type: "number", description: "1-based target line number" },
        contextLines: { type: "number", description: "How many surrounding lines to include" },
      },
      required: ["filePath"],
    },
  },
  {
    name: "devpilot_acknowledge",
    description: "Mark an annotation as acknowledged",
    inputSchema: {
      type: "object" as const,
      properties: {
        annotationId: { type: "string", description: "The annotation ID to acknowledge" },
      },
      required: ["annotationId"],
    },
  },
  {
    name: "devpilot_resolve",
    description: "Mark an annotation as resolved and optionally add a summary reply",
    inputSchema: {
      type: "object" as const,
      properties: {
        annotationId: { type: "string", description: "The annotation ID to resolve" },
        summary: { type: "string", description: "Optional summary of what was fixed" },
      },
      required: ["annotationId"],
    },
  },
  {
    name: "devpilot_dismiss",
    description: "Dismiss an annotation with a reason",
    inputSchema: {
      type: "object" as const,
      properties: {
        annotationId: { type: "string", description: "The annotation ID to dismiss" },
        reason: { type: "string", description: "Why the annotation is being dismissed" },
      },
      required: ["annotationId", "reason"],
    },
  },
  {
    name: "devpilot_reply",
    description: "Add a thread reply to an annotation",
    inputSchema: {
      type: "object" as const,
      properties: {
        annotationId: { type: "string", description: "The annotation ID to reply to" },
        message: { type: "string", description: "Reply content" },
      },
      required: ["annotationId", "message"],
    },
  },
  {
    name: "devpilot_diagnose_stability_item",
    description: "Mark a stability item as diagnosing",
    inputSchema: {
      type: "object" as const,
      properties: {
        stabilityItemId: { type: "string", description: "The stability item ID to mark as diagnosing" },
      },
      required: ["stabilityItemId"],
    },
  },
  {
    name: "devpilot_resolve_stability_item",
    description: "Mark a stability item as resolved",
    inputSchema: {
      type: "object" as const,
      properties: {
        stabilityItemId: { type: "string", description: "The stability item ID to resolve" },
      },
      required: ["stabilityItemId"],
    },
  },
  {
    name: "devpilot_accept_repair_request",
    description: "Mark a repair request as accepted for execution",
    inputSchema: {
      type: "object" as const,
      properties: {
        repairRequestId: { type: "string", description: "The repair request ID to accept" },
      },
      required: ["repairRequestId"],
    },
  },
  {
    name: "devpilot_complete_repair_request",
    description: "Mark a repair request as completed and optionally attach a summary",
    inputSchema: {
      type: "object" as const,
      properties: {
        repairRequestId: { type: "string", description: "The repair request ID to complete" },
        summary: { type: "string", description: "Optional summary of what was changed" },
      },
      required: ["repairRequestId"],
    },
  },
  {
    name: "devpilot_dismiss_repair_request",
    description: "Dismiss a repair request with a reason",
    inputSchema: {
      type: "object" as const,
      properties: {
        repairRequestId: { type: "string", description: "The repair request ID to dismiss" },
        reason: { type: "string", description: "Why the repair request is being dismissed" },
      },
      required: ["repairRequestId", "reason"],
    },
  },
  {
    name: "devpilot_watch_annotations",
    description: "Wait for new open annotations via SSE, then return them as a batch",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: { type: "string", description: "Optional session ID to scope the watch" },
        batchWindowSeconds: { type: "number", description: "Seconds to keep batching after the first new annotation" },
        timeoutSeconds: { type: "number", description: "How long to wait before timing out" },
      },
      required: [],
    },
  },
  {
    name: "devpilot_watch_stability_items",
    description: "Wait for new open stability items via SSE, then return them as a batch",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: { type: "string", description: "Optional session ID to scope the watch" },
        batchWindowSeconds: { type: "number", description: "Seconds to keep batching after the first new stability item" },
        timeoutSeconds: { type: "number", description: "How long to wait before timing out" },
      },
      required: [],
    },
  },
  {
    name: "devpilot_watch_repair_requests",
    description: "Wait for new open repair requests via SSE, then return them as a batch",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: { type: "string", description: "Optional session ID to scope the watch" },
        batchWindowSeconds: { type: "number", description: "Seconds to keep batching after the first new repair request" },
        timeoutSeconds: { type: "number", description: "How long to wait before timing out" },
      },
      required: [],
    },
  },
];
