import type {
  DevPilotAnnotationRecord,
  DevPilotRepairRequestRecord,
  DevPilotResolvedSource,
  DevPilotSessionWithAnnotations,
  DevPilotStabilityContextSnapshot,
  DevPilotStabilityItemRecord,
  DevPilotWorkspaceRecord,
} from "../types.js";
import {
  autoDiscoverWorkspaces,
  resolveAnnotationSources,
  resolveStabilitySources,
} from "../source/resolver.js";

type DevPilotTaskType = "annotation" | "stability" | "repair";
type DevPilotAgentIntent = "ui-fix" | "stability-fix" | "mixed-fix";
type DevPilotAgentPriority = "low" | "medium" | "high" | "critical";

export interface DevPilotTaskPacketPageContext {
  title: string;
  url: string;
  pathname: string;
  viewport: { width: number; height: number };
}

export interface DevPilotTaskPacketSummary {
  annotationCount: number;
  stabilityCount: number;
  totalIssueCount: number;
  sourceHitCount: number;
  resolvedSourceCount: number;
}

export interface DevPilotTaskPacketTask {
  type: DevPilotTaskType;
  title: string;
  description: string;
  desiredOutcome: string;
}

export interface DevPilotTaskPacketEvidence {
  annotations: Array<{
    id: string;
    index: number;
    kind: string;
    status: string;
    comment: string;
    elementName: string;
    elementPath: string;
    selectedText?: string;
    nearbyText?: string;
    relatedElements?: string[];
    matchCount?: number;
    pageX: number;
    pageY: number;
    rect: { left: number; top: number; width: number; height: number };
    createdAt: number;
    updatedAt: number;
    context?: DevPilotAnnotationRecord["context"];
    sourceHits: string[];
    resolvedSources?: DevPilotResolvedSource[];
  }>;
  stabilityItems?: Array<{
    id: string;
    index: number;
    title: string;
    status: string;
    severity: string;
    symptom: string;
    reproSteps?: string;
    impact?: string;
    signals?: string;
    fixGoal?: string;
    context: DevPilotStabilityContextSnapshot;
    createdAt: number;
    updatedAt: number;
    resolvedSources?: DevPilotResolvedSource[];
  }>;
}

export interface DevPilotTaskPacketAgentBrief {
  version: "1";
  intent: DevPilotAgentIntent;
  priority: DevPilotAgentPriority;
  changeScope: "targeted";
  executionMode: "safe-minimal-change";
  primaryTargets: string[];
  acceptanceCriteria: string[];
  constraints: string[];
  suggestedSteps: string[];
  suggestedSearchQueries: string[];
  outputContract: string[];
}

export interface DevPilotTaskPacketContext {
  viewport: { width: number; height: number };
  platform?: string;
  language?: string;
  screen?: { width: number; height: number };
  referrer?: string;
}

export interface DevPilotTaskPacket {
  schema: "devpilot.task-packet/v2";
  generatedAt: string;
  page: DevPilotTaskPacketPageContext;
  summary: DevPilotTaskPacketSummary;
  task: DevPilotTaskPacketTask;
  agent: DevPilotTaskPacketAgentBrief;
  evidence: DevPilotTaskPacketEvidence;
  sourceHits?: string[];
  resolvedSources?: DevPilotResolvedSource[];
  context?: DevPilotTaskPacketContext;
}

export interface DevPilotSessionTaskPacketResult {
  packet: DevPilotTaskPacket;
  repairRequests: Array<{
    id: string;
    status: string;
    title: string;
    severity?: string;
    prompt: string;
    requestedBy: "human" | "agent";
    createdAt: number;
    updatedAt: number;
    stabilityItemId?: string;
  }>;
}

export interface BuildSessionTaskPacketOptions {
  includeClosed?: boolean;
  workspaces?: DevPilotWorkspaceRecord[];
}

function normalizeInlineText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function isOpenAnnotation(annotation: DevPilotAnnotationRecord): boolean {
  return annotation.status === "pending" || annotation.status === "acknowledged";
}

function isOpenStabilityItem(item: DevPilotStabilityItemRecord): boolean {
  return item.status === "open" || item.status === "diagnosing";
}

function isOpenRepairRequest(request: DevPilotRepairRequestRecord): boolean {
  return request.status === "requested" || request.status === "accepted";
}

function computeSourceHitsFromAnnotation(annotation: DevPilotAnnotationRecord): string[] {
  const hits = new Set<string>();
  const ctx = annotation.context;

  ctx?.componentHints?.forEach((name) => {
    hits.add(`component:${name}`);
    hits.add(`candidate:src/components/${name}.tsx`);
    hits.add(`candidate:src/${name}.tsx`);
    hits.add(`candidate:app/components/${name}.tsx`);
    hits.add(`candidate:pages/${name}.tsx`);
  });

  ctx?.sourceHints?.forEach((file) => hits.add(`file:${file}`));

  return Array.from(hits).slice(0, 12);
}

function inferAgentIntent(
  annotationCount: number,
  stabilityCount: number,
): DevPilotAgentIntent {
  if (annotationCount > 0 && stabilityCount > 0) {
    return "mixed-fix";
  }
  if (stabilityCount > 0) {
    return "stability-fix";
  }
  return "ui-fix";
}

function inferAgentPriority(
  annotations: DevPilotAnnotationRecord[],
  stabilityItems: DevPilotStabilityItemRecord[],
  repairRequests: DevPilotRepairRequestRecord[],
): DevPilotAgentPriority {
  if (
    stabilityItems.some((item) => item.severity === "critical") ||
    repairRequests.some((request) => request.severity === "critical")
  ) {
    return "critical";
  }
  if (
    stabilityItems.some((item) => item.severity === "high") ||
    repairRequests.some((request) => request.severity === "high") ||
    annotations.length >= 4
  ) {
    return "high";
  }
  if (stabilityItems.length > 0 || repairRequests.length > 0 || annotations.length >= 2) {
    return "medium";
  }
  return "low";
}

function buildTitle(
  pathname: string,
  annotationCount: number,
  stabilityCount: number,
  repairCount: number,
): string {
  if (repairCount > 0) {
    return `Handle ${repairCount} repair request${repairCount === 1 ? "" : "s"} on ${pathname}`;
  }
  if (stabilityCount > 0 && annotationCount > 0) {
    return `Fix ${annotationCount + stabilityCount} issues on ${pathname}`;
  }
  if (stabilityCount > 0) {
    return `Fix ${stabilityCount} stability issue${stabilityCount === 1 ? "" : "s"} on ${pathname}`;
  }
  return `Fix ${annotationCount} annotation${annotationCount === 1 ? "" : "s"} on ${pathname}`;
}

function buildDescription(
  annotationCount: number,
  stabilityCount: number,
  repairRequests: DevPilotRepairRequestRecord[],
): string {
  const parts: string[] = [];

  if (annotationCount > 0) {
    parts.push(`${annotationCount} open annotation${annotationCount === 1 ? "" : "s"}`);
  }
  if (stabilityCount > 0) {
    parts.push(`${stabilityCount} open stability issue${stabilityCount === 1 ? "" : "s"}`);
  }
  if (repairRequests.length > 0) {
    parts.push(`${repairRequests.length} active repair request${repairRequests.length === 1 ? "" : "s"}`);
  }

  if (parts.length === 0) {
    return "No open items were found in this session.";
  }

  return `This session currently has ${parts.join(", ")} that need attention.`;
}

function buildDesiredOutcome(
  repairRequests: DevPilotRepairRequestRecord[],
  hasStabilityItems: boolean,
): string {
  if (repairRequests.length === 1) {
    return normalizeInlineText(repairRequests[0].prompt);
  }
  if (repairRequests.length > 1) {
    return "Complete the requested repairs described by the open repair requests and supporting evidence.";
  }
  if (hasStabilityItems) {
    return "Resolve the reported stability issues with minimal safe code changes.";
  }
  return "Resolve the reported UI issues with minimal safe code changes.";
}

function buildAcceptanceCriteria(
  annotations: DevPilotAnnotationRecord[],
  stabilityItems: DevPilotStabilityItemRecord[],
  repairRequests: DevPilotRepairRequestRecord[],
  desiredOutcome: string,
): string[] {
  const criteria = new Set<string>();
  criteria.add(normalizeInlineText(desiredOutcome));

  if (annotations.length > 0) {
    criteria.add("The annotated UI issues are fixed in the referenced page regions.");
  }
  if (stabilityItems.length > 0) {
    criteria.add("The referenced runtime failures are resolved or safely handled.");
  }
  if (repairRequests.length > 0) {
    criteria.add("The active repair requests are addressed and their requested outcome is satisfied.");
  }

  criteria.add("No unrelated behavior changes are introduced outside the described scope.");
  return Array.from(criteria);
}

function buildPrimaryTargets(
  annotations: DevPilotTaskPacketEvidence["annotations"],
  stabilityItems: NonNullable<DevPilotTaskPacketEvidence["stabilityItems"]>,
  repairRequests: DevPilotRepairRequestRecord[],
  sourceHits: string[],
  resolvedSources: DevPilotResolvedSource[],
): string[] {
  const targets = new Set<string>();

  annotations.forEach((annotation) => {
    annotation.context?.componentHints?.forEach((name) => targets.add(`component:${name}`));
    targets.add(`selector:${annotation.elementPath}`);
  });

  stabilityItems.forEach((item) => {
    targets.add(`issue:${item.title}`);
  });

  repairRequests.forEach((request) => {
    targets.add(`repair:${request.title}`);
  });

  resolvedSources.forEach((source) => {
    targets.add(`resolved:${source.relativePath}`);
  });

  sourceHits.forEach((hit) => targets.add(hit));
  return Array.from(targets).slice(0, 12);
}

function buildSuggestedSearchQueries(
  annotations: DevPilotTaskPacketEvidence["annotations"],
  stabilityItems: NonNullable<DevPilotTaskPacketEvidence["stabilityItems"]>,
  repairRequests: DevPilotRepairRequestRecord[],
  sourceHits: string[],
  resolvedSources: DevPilotResolvedSource[],
): string[] {
  const queries = new Set<string>();

  sourceHits.slice(0, 6).forEach((hit) => queries.add(hit));
  resolvedSources.slice(0, 6).forEach((source) => queries.add(source.relativePath));

  annotations.forEach((annotation) => {
    annotation.context?.componentHints?.forEach((name) => queries.add(name));
    annotation.context?.selectorCandidates?.slice(0, 2).forEach((candidate) => queries.add(candidate));
    if (annotation.nearbyText) {
      queries.add(normalizeInlineText(annotation.nearbyText).slice(0, 80));
    }
  });

  stabilityItems.forEach((item) => {
    queries.add(item.title);
    queries.add(normalizeInlineText(item.symptom).slice(0, 120));
  });

  repairRequests.forEach((request) => {
    queries.add(request.title);
    queries.add(normalizeInlineText(request.prompt).slice(0, 120));
  });

  return Array.from(queries).filter(Boolean).slice(0, 12);
}

function buildSuggestedSteps(intent: DevPilotAgentIntent): string[] {
  const steps = [
    "Inspect the evidence and confirm which page region, element, or runtime failure is in scope.",
    "Use source hits, selectors, component names, nearby text, and runtime signals to locate the relevant code.",
    "Confirm the exact fix target before editing by matching page structure, copy, and captured context.",
    "Apply the smallest safe change that resolves the issue without widening scope.",
    "Validate the affected flow and summarize changed files, checks performed, and any residual risk.",
  ];

  if (intent !== "ui-fix") {
    steps.splice(
      3,
      0,
      "Trace the failing runtime path first and prefer fixing the root cause over masking the symptom.",
    );
  }

  return steps;
}

function buildConstraints(intent: DevPilotAgentIntent): string[] {
  const constraints = [
    "Prefer targeted edits over refactors unless a refactor is required to safely fix the issue.",
    "Preserve existing behavior outside the reported scope.",
    "Do not change unrelated copy, styling, or network behavior while fixing this task.",
  ];

  if (intent !== "ui-fix") {
    constraints.push("Keep error handling user-safe: recover gracefully instead of silently swallowing failures.");
  }

  return constraints;
}

function buildOutputContract(): string[] {
  return [
    "List the files changed.",
    "Explain how the fix addresses the evidence.",
    "Describe the validation steps you ran or the checks you could not run.",
    "Call out any remaining risks, assumptions, or follow-up work.",
  ];
}

function deriveContextFromStabilityItems(
  items: DevPilotStabilityItemRecord[],
): DevPilotTaskPacketContext | undefined {
  const latestContext = items
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]?.context;

  if (!latestContext) {
    return undefined;
  }

  return {
    viewport: latestContext.viewport,
    platform: latestContext.platform,
    language: latestContext.language,
    screen: latestContext.screen,
    referrer: latestContext.referrer,
  };
}

export function buildSessionTaskPacket(
  session: DevPilotSessionWithAnnotations,
  options: BuildSessionTaskPacketOptions = {},
): DevPilotSessionTaskPacketResult {
  const includeClosed = options.includeClosed ?? false;
  const workspaces = options.workspaces && options.workspaces.length > 0
    ? options.workspaces
    : autoDiscoverWorkspaces();
  const annotations = includeClosed
    ? session.annotations
    : session.annotations.filter(isOpenAnnotation);
  const stabilityItems = includeClosed
    ? session.stabilityItems
    : session.stabilityItems.filter(isOpenStabilityItem);
  const repairRequests = includeClosed
    ? session.repairRequests
    : session.repairRequests.filter(isOpenRepairRequest);

  const exportedAnnotations = annotations.map((annotation, index) => {
    const resolvedSources = resolveAnnotationSources(
      annotation,
      workspaces,
      session.url,
    );
    return {
    id: annotation.id,
    index: index + 1,
    kind: annotation.kind || "element",
    status: annotation.status,
    comment: annotation.comment,
    elementName: annotation.elementName,
    elementPath: annotation.elementPath,
    selectedText: annotation.selectedText,
    nearbyText: annotation.nearbyText,
    relatedElements: annotation.relatedElements,
    matchCount: annotation.matchCount,
    pageX: annotation.pageX,
    pageY: annotation.pageY,
    rect: annotation.rect,
    createdAt: annotation.createdAt,
    updatedAt: annotation.updatedAt,
    context: annotation.context,
    sourceHits: computeSourceHitsFromAnnotation(annotation),
    resolvedSources: resolvedSources.length > 0 ? resolvedSources : undefined,
    };
  });
  const exportedStabilityItems = stabilityItems.map((item, index) => {
    const resolvedSources = resolveStabilitySources(item, workspaces);
    return {
    id: item.id,
    index: index + 1,
    title: item.title,
    status: item.status,
    severity: item.severity,
    symptom: item.symptom,
    reproSteps: item.reproSteps,
    impact: item.impact,
    signals: item.signals,
    fixGoal: item.fixGoal,
    context: item.context,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    resolvedSources: resolvedSources.length > 0 ? resolvedSources : undefined,
    };
  });
  const allSourceHits = Array.from(
    new Set(exportedAnnotations.flatMap((annotation) => annotation.sourceHits)),
  ).slice(0, 12);
  const allResolvedSources = Array.from(
    new Map(
      [...exportedAnnotations, ...exportedStabilityItems]
        .flatMap((item) => item.resolvedSources || [])
        .map((source) => [`${source.filePath}:${source.line || ""}:${source.column || ""}`, source]),
    ).values(),
  ).slice(0, 12);
  const intent = inferAgentIntent(exportedAnnotations.length, exportedStabilityItems.length);
  const priority = inferAgentPriority(annotations, stabilityItems, repairRequests);
  const desiredOutcome = buildDesiredOutcome(repairRequests, exportedStabilityItems.length > 0);

  return {
    packet: {
      schema: "devpilot.task-packet/v2",
      generatedAt: new Date().toISOString(),
      page: {
        title: session.title,
        url: session.url,
        pathname: session.pathname,
        viewport: exportedStabilityItems[0]?.context.viewport || { width: 0, height: 0 },
      },
      summary: {
        annotationCount: exportedAnnotations.length,
        stabilityCount: exportedStabilityItems.length,
        totalIssueCount: exportedAnnotations.length + exportedStabilityItems.length,
        sourceHitCount: allSourceHits.length,
        resolvedSourceCount: allResolvedSources.length,
      },
      task: {
        type: exportedStabilityItems.length > 0 || repairRequests.length > 0 ? "repair" : "annotation",
        title: buildTitle(
          session.pathname,
          exportedAnnotations.length,
          exportedStabilityItems.length,
          repairRequests.length,
        ),
        description: buildDescription(
          exportedAnnotations.length,
          exportedStabilityItems.length,
          repairRequests,
        ),
        desiredOutcome,
      },
      agent: {
        version: "1",
        intent,
        priority,
        changeScope: "targeted",
        executionMode: "safe-minimal-change",
        primaryTargets: buildPrimaryTargets(
          exportedAnnotations,
          exportedStabilityItems,
          repairRequests,
          allSourceHits,
          allResolvedSources,
        ),
        acceptanceCriteria: buildAcceptanceCriteria(
          annotations,
          stabilityItems,
          repairRequests,
          desiredOutcome,
        ),
        constraints: buildConstraints(intent),
        suggestedSteps: buildSuggestedSteps(intent),
        suggestedSearchQueries: buildSuggestedSearchQueries(
          exportedAnnotations,
          exportedStabilityItems,
          repairRequests,
          allSourceHits,
          allResolvedSources,
        ),
        outputContract: buildOutputContract(),
      },
      evidence: {
        annotations: exportedAnnotations,
        stabilityItems: exportedStabilityItems.length > 0 ? exportedStabilityItems : undefined,
      },
      sourceHits: allSourceHits,
      resolvedSources: allResolvedSources.length > 0 ? allResolvedSources : undefined,
      context: deriveContextFromStabilityItems(stabilityItems),
    },
    repairRequests: repairRequests.map((request) => ({
      id: request.id,
      status: request.status,
      title: request.title,
      severity: request.severity,
      prompt: request.prompt,
      requestedBy: request.requestedBy,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      stabilityItemId: request.stabilityItemId,
    })),
  };
}
