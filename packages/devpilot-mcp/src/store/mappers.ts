import type {
  DevPilotAnnotationRecord,
  DevPilotAnnotationReply,
  DevPilotElementContext,
  DevPilotRepairRequestRecord,
  DevPilotSessionRecord,
  DevPilotStabilityItemRecord,
  DevPilotWorkspaceRecord,
} from "../types.js";
import type {
  AnnotationRow,
  RepairRequestRow,
  ReplyRow,
  SessionRow,
  StabilityRow,
  WorkspaceRow,
} from "./row-types.js";

export function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function rowToSession(row: SessionRow): DevPilotSessionRecord {
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

export function rowToWorkspace(row: WorkspaceRow): DevPilotWorkspaceRecord {
  return {
    id: row.id,
    name: row.name,
    rootPath: row.root_path,
    devServerUrls: parseJson<string[]>(row.dev_server_urls_json, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToReply(row: ReplyRow): DevPilotAnnotationReply {
  return {
    id: row.id,
    annotationId: row.annotation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

export function serializeWorkspace(
  workspace: DevPilotWorkspaceRecord,
): Record<string, number | string | null> {
  return {
    id: workspace.id,
    name: workspace.name,
    rootPath: workspace.rootPath,
    devServerUrlsJson:
      workspace.devServerUrls && workspace.devServerUrls.length > 0
        ? JSON.stringify(workspace.devServerUrls)
        : null,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}

export function rowToAnnotation(
  row: AnnotationRow,
  replies: DevPilotAnnotationReply[],
): DevPilotAnnotationRecord {
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
    context: parseJson<DevPilotElementContext | undefined>(
      row.context_json,
      undefined,
    ),
    resolvedAt: row.resolved_at ?? undefined,
    resolvedBy: row.resolved_by ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    deletedBy: row.deleted_by ?? undefined,
    replies,
  };
}

export function serializeAnnotation(
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
    contextJson: annotation.context ? JSON.stringify(annotation.context) : null,
    resolvedAt: annotation.resolvedAt ?? null,
    resolvedBy: annotation.resolvedBy ?? null,
    deletedAt: annotation.deletedAt ?? null,
    deletedBy: annotation.deletedBy ?? null,
  };
}

export function rowToStabilityItem(
  row: StabilityRow,
): DevPilotStabilityItemRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    pathname: row.pathname,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    severity: row.severity,
    title: row.title,
    symptom: row.symptom,
    reproSteps: row.repro_steps ?? undefined,
    impact: row.impact ?? undefined,
    signals: row.signals ?? undefined,
    fixGoal: row.fix_goal ?? undefined,
    context: parseJson(row.context_json, {
      capturedAt: row.created_at,
      title: row.pathname,
      url: row.pathname,
      pathname: row.pathname,
      viewport: { width: 0, height: 0 },
      openAnnotationCount: 0,
      openAnnotationComments: [],
    }),
  };
}

export function serializeStabilityItem(
  item: DevPilotStabilityItemRecord,
): Record<string, number | string | null> {
  return {
    id: item.id,
    sessionId: item.sessionId,
    pathname: item.pathname,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    status: item.status,
    severity: item.severity,
    title: item.title,
    symptom: item.symptom,
    reproSteps: item.reproSteps ?? null,
    impact: item.impact ?? null,
    signals: item.signals ?? null,
    fixGoal: item.fixGoal ?? null,
    contextJson: JSON.stringify(item.context),
  };
}

export function rowToRepairRequest(
  row: RepairRequestRow,
): DevPilotRepairRequestRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    stabilityItemId: row.stability_item_id ?? undefined,
    pathname: row.pathname,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    title: row.title,
    severity: row.severity ?? undefined,
    prompt: row.prompt,
    requestedBy: row.requested_by,
    completedAt: row.completed_at ?? undefined,
    completedBy: row.completed_by ?? undefined,
    resultSummary: row.result_summary ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    actorId: row.actor_id ?? undefined,
  };
}

export function serializeRepairRequest(
  request: DevPilotRepairRequestRecord,
): Record<string, number | string | null> {
  return {
    id: request.id,
    sessionId: request.sessionId,
    stabilityItemId: request.stabilityItemId ?? null,
    pathname: request.pathname,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    status: request.status,
    title: request.title,
    severity: request.severity ?? null,
    prompt: request.prompt,
    requestedBy: request.requestedBy,
    completedAt: request.completedAt ?? null,
    completedBy: request.completedBy ?? null,
    resultSummary: request.resultSummary ?? null,
    idempotencyKey: request.idempotencyKey ?? null,
    actorId: request.actorId ?? null,
  };
}
