import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import type {
  DevPilotAnnotationRecord,
  DevPilotRepairRequestRecord,
  DevPilotSessionRecord,
  DevPilotSessionWithAnnotations,
  DevPilotStabilityItemRecord,
  OpenRepairRequestsResponse,
  OpenStabilityItemsResponse,
  PendingAnnotationsResponse,
} from "./types.js";
import { httpGet, httpPatch, httpPost, setHttpBaseUrl } from "./mcp/http-client.js";
import {
  mapAnnotation,
  mapRepairRequest,
  mapResolvedSource,
  mapSession,
  mapStabilityItem,
  mapWorkspace,
} from "./mcp/mappers.js";
import {
  AnnotationIdSchema,
  GetAgentPlaybookSchema,
  CompleteRepairRequestSchema,
  DismissRepairRequestSchema,
  DismissSchema,
  GetPendingSchema,
  GetSessionSchema,
  GetSessionTaskPacketSchema,
  GetSessionStabilitySchema,
  AutoDiscoverWorkspacesSchema,
  RegisterWorkspaceSchema,
  RepairRequestIdSchema,
  ResolveAnnotationSourceSchema,
  ReplySchema,
  ResolveSchema,
  ResolveStabilitySourceSchema,
  ResolveStabilitySchema,
  SourceSnippetSchema,
  StabilityItemIdSchema,
  TOOLS,
  WatchSchema,
} from "./mcp/tools.js";
import {
  drainOpenRepairRequests,
  drainOpenStabilityItems,
  drainPending,
  watchForAnnotations,
  watchForRepairRequests,
  watchForStabilityItems,
} from "./mcp/watch.js";
import { buildSessionTaskPacket } from "./mcp/task-packet.js";
import {
  buildAgentPlaybookBundle,
  buildAgentWorkflowRecommendation,
} from "./mcp/agent-playbook.js";

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

async function handleTool(name: string, input: unknown) {
  switch (name) {
    case "devpilot_register_workspace": {
      const payload = RegisterWorkspaceSchema.parse(input);
      const response = await httpPost<{ workspace: import("./types.js").DevPilotWorkspaceRecord }>(
        "/workspaces/register",
        payload,
      );
      return toolResult({ workspace: mapWorkspace(response.workspace) });
    }
    case "devpilot_list_workspaces": {
      const response = await httpGet<{ workspaces: import("./types.js").DevPilotWorkspaceRecord[] }>(
        "/workspaces",
      );
      return toolResult({ workspaces: response.workspaces.map(mapWorkspace) });
    }
    case "devpilot_auto_discover_workspaces": {
      const payload = AutoDiscoverWorkspacesSchema.parse(input);
      const response = await httpPost<{
        workspaces: import("./types.js").DevPilotWorkspaceRecord[];
        persisted: boolean;
      }>("/workspaces/auto-discover", payload);
      return toolResult({
        persisted: response.persisted,
        workspaces: response.workspaces.map(mapWorkspace),
      });
    }
    case "devpilot_list_sessions": {
      const sessions = await httpGet<DevPilotSessionRecord[]>("/sessions");
      return toolResult({ sessions: sessions.map(mapSession) });
    }
    case "devpilot_get_session": {
      const { sessionId } = GetSessionSchema.parse(input);
      const session = await httpGet<DevPilotSessionWithAnnotations>(
        `/sessions/${sessionId}`,
      );
      return toolResult({
        session: mapSession(session),
        annotations: session.annotations.map(mapAnnotation),
        stabilityItems: session.stabilityItems.map(mapStabilityItem),
        repairRequests: session.repairRequests.map(mapRepairRequest),
      });
    }
    case "devpilot_get_session_task_packet": {
      const { sessionId, includeClosed } = GetSessionTaskPacketSchema.parse(input);
      const session = await httpGet<DevPilotSessionWithAnnotations>(
        `/sessions/${sessionId}`,
      );
      const workspaceResponse = await httpGet<{
        workspaces: import("./types.js").DevPilotWorkspaceRecord[];
      }>("/workspaces");
      const { packet, repairRequests } = buildSessionTaskPacket(session, {
        includeClosed,
        workspaces: workspaceResponse.workspaces,
      });
      const workflow = buildAgentWorkflowRecommendation({
        sessionId,
        session: {
          id: session.id,
          title: session.title,
          pathname: session.pathname,
          url: session.url,
        },
        packet,
        repairRequests,
      });
      return toolResult({
        session: mapSession(session),
        packet,
        repairRequests,
        workflow,
      });
    }
    case "devpilot_get_agent_playbook": {
      const {
        sessionId,
        mode,
        includeClosed,
        includePromptTemplate,
      } = GetAgentPlaybookSchema.parse(input);

      if (!sessionId) {
        return toolResult(
          buildAgentPlaybookBundle({
            mode,
            includePromptTemplate,
          }),
        );
      }

      const session = await httpGet<DevPilotSessionWithAnnotations>(
        `/sessions/${sessionId}`,
      );
      const workspaceResponse = await httpGet<{
        workspaces: import("./types.js").DevPilotWorkspaceRecord[];
      }>("/workspaces");
      const { packet, repairRequests } = buildSessionTaskPacket(session, {
        includeClosed,
        workspaces: workspaceResponse.workspaces,
      });

      return toolResult({
        session: mapSession(session),
        packet,
        repairRequests,
        ...buildAgentPlaybookBundle({
          mode,
          includePromptTemplate,
          sessionContext: {
            sessionId,
            session: {
              id: session.id,
              title: session.title,
              pathname: session.pathname,
              url: session.url,
            },
            packet,
            repairRequests,
          },
        }),
      });
    }
    case "devpilot_get_pending": {
      const { sessionId } = GetPendingSchema.parse(input);
      const pending = await httpGet<PendingAnnotationsResponse>(
        `/sessions/${sessionId}/pending`,
      );
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
    case "devpilot_list_stability_items": {
      const response = await httpGet<OpenStabilityItemsResponse>("/stability/open");
      return toolResult({
        count: response.count,
        items: response.items.map(mapStabilityItem),
      });
    }
    case "devpilot_get_session_stability_items": {
      const { sessionId } = GetSessionStabilitySchema.parse(input);
      const response = await httpGet<OpenStabilityItemsResponse>(
        `/sessions/${sessionId}/stability`,
      );
      return toolResult({
        count: response.count,
        items: response.items.map(mapStabilityItem),
      });
    }
    case "devpilot_get_stability_item": {
      const { stabilityItemId } = StabilityItemIdSchema.parse(input);
      const item = await httpGet<DevPilotStabilityItemRecord>(
        `/stability/${stabilityItemId}`,
      );
      return toolResult({ item: mapStabilityItem(item) });
    }
    case "devpilot_list_repair_requests": {
      const response = await httpGet<OpenRepairRequestsResponse>(
        "/repair-requests/open",
      );
      return toolResult({
        count: response.count,
        requests: response.items.map(mapRepairRequest),
      });
    }
    case "devpilot_get_repair_request": {
      const { repairRequestId } = RepairRequestIdSchema.parse(input);
      const request = await httpGet<DevPilotRepairRequestRecord>(
        `/repair-requests/${repairRequestId}`,
      );
      return toolResult({ request: mapRepairRequest(request) });
    }
    case "devpilot_resolve_annotation_source": {
      const payload = ResolveAnnotationSourceSchema.parse(input);
      const response = await httpPost<{ annotationId: string; matches: import("./types.js").DevPilotResolvedSource[] }>(
        "/sources/resolve/annotation",
        payload,
      );
      return toolResult({
        annotationId: response.annotationId,
        matches: response.matches.map(mapResolvedSource),
      });
    }
    case "devpilot_resolve_stability_source": {
      const payload = ResolveStabilitySourceSchema.parse(input);
      const response = await httpPost<{ stabilityItemId: string; matches: import("./types.js").DevPilotResolvedSource[] }>(
        "/sources/resolve/stability",
        payload,
      );
      return toolResult({
        stabilityItemId: response.stabilityItemId,
        matches: response.matches.map(mapResolvedSource),
      });
    }
    case "devpilot_get_source_snippet": {
      const payload = SourceSnippetSchema.parse(input);
      const response = await httpPost<{ snippet: import("./types.js").DevPilotSourceSnippet }>(
        "/sources/snippet",
        payload,
      );
      return toolResult({ snippet: response.snippet });
    }
    case "devpilot_acknowledge": {
      const { annotationId } = AnnotationIdSchema.parse(input);
      const annotation = await httpPatch<DevPilotAnnotationRecord>(
        `/annotations/${annotationId}`,
        {
          status: "acknowledged",
        },
      );
      return toolResult({ acknowledged: true, annotation: mapAnnotation(annotation) });
    }
    case "devpilot_resolve": {
      const { annotationId, summary } = ResolveSchema.parse(input);
      const annotation = await httpPatch<DevPilotAnnotationRecord>(
        `/annotations/${annotationId}`,
        {
          status: "resolved",
          resolvedBy: "agent",
        },
      );
      if (summary) {
        await httpPost(`/annotations/${annotationId}/thread`, {
          role: "agent",
          content: summary,
        });
      }
      return toolResult({
        resolved: true,
        annotation: mapAnnotation(annotation),
        summary,
      });
    }
    case "devpilot_dismiss": {
      const { annotationId, reason } = DismissSchema.parse(input);
      const annotation = await httpPatch<DevPilotAnnotationRecord>(
        `/annotations/${annotationId}`,
        {
          status: "dismissed",
          resolvedBy: "agent",
        },
      );
      await httpPost(`/annotations/${annotationId}/thread`, {
        role: "agent",
        content: reason,
      });
      return toolResult({
        dismissed: true,
        annotation: mapAnnotation(annotation),
        reason,
      });
    }
    case "devpilot_reply": {
      const { annotationId, message } = ReplySchema.parse(input);
      const annotation = await httpPost<DevPilotAnnotationRecord>(
        `/annotations/${annotationId}/thread`,
        {
          role: "agent",
          content: message,
        },
      );
      return toolResult({ replied: true, annotation: mapAnnotation(annotation) });
    }
    case "devpilot_diagnose_stability_item": {
      const { stabilityItemId } = StabilityItemIdSchema.parse(input);
      const item = await httpPatch<DevPilotStabilityItemRecord>(
        `/stability/${stabilityItemId}`,
        {
          status: "diagnosing",
        },
      );
      return toolResult({ diagnosing: true, item: mapStabilityItem(item) });
    }
    case "devpilot_resolve_stability_item": {
      const { stabilityItemId } = ResolveStabilitySchema.parse(input);
      const item = await httpPatch<DevPilotStabilityItemRecord>(
        `/stability/${stabilityItemId}`,
        {
          status: "resolved",
        },
      );
      return toolResult({ resolved: true, item: mapStabilityItem(item) });
    }
    case "devpilot_accept_repair_request": {
      const { repairRequestId } = RepairRequestIdSchema.parse(input);
      const request = await httpPatch<DevPilotRepairRequestRecord>(
        `/repair-requests/${repairRequestId}`,
        {
          status: "accepted",
        },
      );
      return toolResult({ accepted: true, request: mapRepairRequest(request) });
    }
    case "devpilot_complete_repair_request": {
      const { repairRequestId, summary } = CompleteRepairRequestSchema.parse(input);
      const request = await httpPatch<DevPilotRepairRequestRecord>(
        `/repair-requests/${repairRequestId}`,
        {
          status: "completed",
          completedBy: "agent",
          resultSummary: summary,
        },
      );
      return toolResult({
        completed: true,
        request: mapRepairRequest(request),
        summary,
      });
    }
    case "devpilot_dismiss_repair_request": {
      const { repairRequestId, reason } = DismissRepairRequestSchema.parse(input);
      const request = await httpPatch<DevPilotRepairRequestRecord>(
        `/repair-requests/${repairRequestId}`,
        {
          status: "dismissed",
          completedBy: "agent",
          resultSummary: reason,
        },
      );
      return toolResult({
        dismissed: true,
        request: mapRepairRequest(request),
        reason,
      });
    }
    case "devpilot_watch_annotations": {
      const { sessionId, batchWindowSeconds, timeoutSeconds } =
        WatchSchema.parse(input);
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
    case "devpilot_watch_stability_items": {
      const { sessionId, batchWindowSeconds, timeoutSeconds } =
        WatchSchema.parse(input);
      const openItems = await drainOpenStabilityItems(sessionId);
      if (openItems.items.length > 0) {
        return toolResult({
          count: openItems.count,
          items: openItems.items.map(mapStabilityItem),
        });
      }

      const result = await watchForStabilityItems(
        sessionId,
        batchWindowSeconds * 1000,
        timeoutSeconds * 1000,
      );

      if (result.type === "items") {
        return toolResult({
          count: result.items.length,
          items: result.items.map(mapStabilityItem),
        });
      }

      if (result.type === "timeout") {
        return toolResult({
          count: 0,
          items: [],
          message: `No new open stability items within ${timeoutSeconds} seconds`,
        });
      }

      throw new Error(result.message);
    }
    case "devpilot_watch_repair_requests": {
      const { sessionId, batchWindowSeconds, timeoutSeconds } =
        WatchSchema.parse(input);
      const openRequests = await drainOpenRepairRequests(sessionId);
      if (openRequests.items.length > 0) {
        return toolResult({
          count: openRequests.count,
          requests: openRequests.items.map(mapRepairRequest),
        });
      }

      const result = await watchForRepairRequests(
        sessionId,
        batchWindowSeconds * 1000,
        timeoutSeconds * 1000,
      );

      if (result.type === "requests") {
        return toolResult({
          count: result.requests.length,
          requests: result.requests.map(mapRepairRequest),
        });
      }

      if (result.type === "timeout") {
        return toolResult({
          count: 0,
          requests: [],
          message: `No new open repair requests within ${timeoutSeconds} seconds`,
        });
      }

      throw new Error(result.message);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function startMcpServer(
  baseUrl = "http://localhost:5213",
): Promise<Server> {
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
