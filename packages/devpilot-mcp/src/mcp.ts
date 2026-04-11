import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import type {
  DevPilotAnnotationRecord,
  DevPilotSessionRecord,
  DevPilotSessionWithAnnotations,
  PendingAnnotationsResponse,
} from "./types.js";

let httpBaseUrl = "http://localhost:5213";

function setHttpBaseUrl(nextUrl: string): void {
  httpBaseUrl = nextUrl;
}

async function httpGet<T>(path: string): Promise<T> {
  const response = await fetch(`${httpBaseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

async function httpPatch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${httpBaseUrl}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

async function httpPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${httpBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

const GetSessionSchema = z.object({
  sessionId: z.string().describe("The session ID to inspect"),
});

const GetPendingSchema = z.object({
  sessionId: z.string().describe("The session ID to get pending annotations for"),
});

const AnnotationIdSchema = z.object({
  annotationId: z.string().describe("The annotation ID to update"),
});

const ResolveSchema = z.object({
  annotationId: z.string().describe("The annotation ID to resolve"),
  summary: z.string().optional().describe("Optional summary of what was changed"),
});

const DismissSchema = z.object({
  annotationId: z.string().describe("The annotation ID to dismiss"),
  reason: z.string().describe("Reason for dismissing the annotation"),
});

const ReplySchema = z.object({
  annotationId: z.string().describe("The annotation ID to reply to"),
  message: z.string().describe("Reply content for the annotation thread"),
});

const WatchSchema = z.object({
  sessionId: z.string().optional().describe("Optional session ID to scope the watch"),
  batchWindowSeconds: z.number().min(1).max(60).optional().default(10),
  timeoutSeconds: z.number().min(1).max(300).optional().default(120),
});

export const TOOLS = [
  {
    name: "devpilot_list_sessions",
    description: "List all DevPilot sessions currently stored in the local bridge",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "devpilot_get_session",
    description: "Get a session with all annotations and replies",
    inputSchema: {
      type: "object" as const,
      properties: {
        sessionId: { type: "string", description: "The session ID to inspect" },
      },
      required: ["sessionId"],
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
];

function toolResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function mapAnnotation(annotation: DevPilotAnnotationRecord) {
  return {
    id: annotation.id,
    sessionId: annotation.sessionId,
    pathname: annotation.pathname,
    kind: annotation.kind || "element",
    status: annotation.status,
    comment: annotation.comment,
    elementName: annotation.elementName,
    elementPath: annotation.elementPath,
    matchCount: annotation.matchCount,
    selectedText: annotation.selectedText,
    nearbyText: annotation.nearbyText,
    relatedElements: annotation.relatedElements || [],
    rect: annotation.rect,
    pageX: annotation.pageX,
    pageY: annotation.pageY,
    createdAt: annotation.createdAt,
    updatedAt: annotation.updatedAt,
    resolvedAt: annotation.resolvedAt,
    resolvedBy: annotation.resolvedBy,
    replies: annotation.replies || [],
  };
}

function mapSession(session: DevPilotSessionRecord) {
  return {
    id: session.id,
    pageKey: session.pageKey,
    pathname: session.pathname,
    title: session.title,
    url: session.url,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

type DevPilotWatchResult =
  | { type: "annotations"; annotations: DevPilotAnnotationRecord[] }
  | { type: "timeout" }
  | { type: "error"; message: string };

async function drainPending(
  sessionId: string | undefined,
): Promise<PendingAnnotationsResponse> {
  return sessionId
    ? httpGet<PendingAnnotationsResponse>(`/sessions/${sessionId}/pending`)
    : httpGet<PendingAnnotationsResponse>("/pending");
}

function watchForAnnotations(
  sessionId: string | undefined,
  batchWindowMs: number,
  timeoutMs: number,
): Promise<DevPilotWatchResult> {
  return new Promise((resolve) => {
    let aborted = false;
    const controller = new AbortController();
    let batchTimer: ReturnType<typeof setTimeout> | null = null;
    const collected = new Map<string, DevPilotAnnotationRecord>();

    const cleanup = () => {
      aborted = true;
      controller.abort();
      if (batchTimer) {
        clearTimeout(batchTimer);
      }
      clearTimeout(timeoutId);
    };

    const finishWithAnnotations = () => {
      cleanup();
      resolve({
        type: "annotations",
        annotations: Array.from(collected.values()),
      });
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      resolve({ type: "timeout" });
    }, timeoutMs);

    const sseUrl = sessionId
      ? `${httpBaseUrl}/sessions/${sessionId}/events?agent=true`
      : `${httpBaseUrl}/events?agent=true`;

    fetch(sseUrl, {
      signal: controller.signal,
      headers: {
        Accept: "text/event-stream",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          cleanup();
          resolve({
            type: "error",
            message: `HTTP server returned ${response.status}: ${response.statusText}`,
          });
          return;
        }

        if (!response.body) {
          cleanup();
          resolve({ type: "error", message: "No response body from SSE endpoint" });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!aborted) {
          const { done, value } = await reader.read();
          if (done) {
            if (!aborted) {
              if (collected.size > 0) {
                finishWithAnnotations();
              } else {
                cleanup();
                resolve({
                  type: "error",
                  message: "SSE connection closed unexpectedly. The devpilot-mcp server may have restarted.",
                });
              }
            }
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() || "";

          for (const chunk of chunks) {
            const lines = chunk
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean);

            const dataLine = lines.find((line) => line.startsWith("data: "));
            if (!dataLine) {
              continue;
            }

            try {
              const event = JSON.parse(dataLine.slice(6)) as {
                type: string;
                sequence?: number;
                sessionId: string;
                payload?: DevPilotAnnotationRecord;
              };

              if (event.type !== "annotation.created") {
                continue;
              }

              if (event.sequence === 0) {
                continue;
              }

              if (!event.payload) {
                continue;
              }

              if (event.payload.status !== "pending" && event.payload.status !== "acknowledged") {
                continue;
              }

              collected.set(event.payload.id, event.payload);

              if (!batchTimer) {
                batchTimer = setTimeout(() => {
                  finishWithAnnotations();
                }, batchWindowMs);
              }
            } catch {
              // Ignore malformed SSE events.
            }
          }
        }
      })
      .catch((error) => {
        if (aborted) {
          return;
        }

        cleanup();
        const message = error instanceof Error ? error.message : "Unknown connection error";
        if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
          resolve({
            type: "error",
            message: `Cannot connect to HTTP server at ${httpBaseUrl}. Is devpilot-mcp running?`,
          });
          return;
        }

        if (message.toLowerCase().includes("abort")) {
          resolve({ type: "timeout" });
          return;
        }

        resolve({ type: "error", message: `Connection error: ${message}` });
      });
  });
}

async function handleTool(name: string, input: unknown) {
  switch (name) {
    case "devpilot_list_sessions": {
      const sessions = await httpGet<DevPilotSessionRecord[]>("/sessions");
      return toolResult({ sessions: sessions.map(mapSession) });
    }
    case "devpilot_get_session": {
      const { sessionId } = GetSessionSchema.parse(input);
      const session = await httpGet<DevPilotSessionWithAnnotations>(`/sessions/${sessionId}`);
      return toolResult({
        session: mapSession(session),
        annotations: session.annotations.map(mapAnnotation),
      });
    }
    case "devpilot_get_pending": {
      const { sessionId } = GetPendingSchema.parse(input);
      const pending = await httpGet<PendingAnnotationsResponse>(`/sessions/${sessionId}/pending`);
      return toolResult({
        count: pending.count,
        annotations: pending.annotations.map(mapAnnotation),
      });
    }
    case "devpilot_get_all_pending": {
      const pending = await httpGet<PendingAnnotationsResponse>("/pending");
      return toolResult({
        count: pending.count,
        annotations: pending.annotations.map(mapAnnotation),
      });
    }
    case "devpilot_acknowledge": {
      const { annotationId } = AnnotationIdSchema.parse(input);
      const annotation = await httpPatch<DevPilotAnnotationRecord>(`/annotations/${annotationId}`, {
        status: "acknowledged",
      });
      return toolResult({ acknowledged: true, annotation: mapAnnotation(annotation) });
    }
    case "devpilot_resolve": {
      const { annotationId, summary } = ResolveSchema.parse(input);
      const annotation = await httpPatch<DevPilotAnnotationRecord>(`/annotations/${annotationId}`, {
        status: "resolved",
        resolvedBy: "agent",
      });
      if (summary) {
        await httpPost(`/annotations/${annotationId}/thread`, {
          role: "agent",
          content: summary,
        });
      }
      return toolResult({ resolved: true, annotation: mapAnnotation(annotation), summary });
    }
    case "devpilot_dismiss": {
      const { annotationId, reason } = DismissSchema.parse(input);
      const annotation = await httpPatch<DevPilotAnnotationRecord>(`/annotations/${annotationId}`, {
        status: "dismissed",
        resolvedBy: "agent",
      });
      await httpPost(`/annotations/${annotationId}/thread`, {
        role: "agent",
        content: reason,
      });
      return toolResult({ dismissed: true, annotation: mapAnnotation(annotation), reason });
    }
    case "devpilot_reply": {
      const { annotationId, message } = ReplySchema.parse(input);
      const annotation = await httpPost<DevPilotAnnotationRecord>(`/annotations/${annotationId}/thread`, {
        role: "agent",
        content: message,
      });
      return toolResult({ replied: true, annotation: mapAnnotation(annotation) });
    }
    case "devpilot_watch_annotations": {
      const { sessionId, batchWindowSeconds, timeoutSeconds } = WatchSchema.parse(input);
      const pending = await drainPending(sessionId);
      if (pending.annotations.length > 0) {
        return toolResult({
          count: pending.count,
          annotations: pending.annotations.map(mapAnnotation),
        });
      }

      const result = await watchForAnnotations(
        sessionId,
        batchWindowSeconds * 1000,
        timeoutSeconds * 1000,
      );

      if (result.type === "annotations") {
        return toolResult({
          count: result.annotations.length,
          annotations: result.annotations.map(mapAnnotation),
        });
      }

      if (result.type === "timeout") {
        return toolResult({
          count: 0,
          annotations: [],
          message: `No new open annotations within ${timeoutSeconds} seconds`,
        });
      }

      throw new Error(result.message);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function startMcpServer(baseUrl = "http://localhost:5213"): Promise<Server> {
  setHttpBaseUrl(baseUrl);

  const server = new Server(
    {
      name: "devpilot-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    handleTool(request.params.name, request.params.arguments || {}),
  );

  await server.connect(new StdioServerTransport());
  console.error(`[devpilot-mcp] MCP server started on stdio (HTTP: ${baseUrl})`);
  return server;
}
