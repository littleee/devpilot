import type {
  DevPilotAnnotation,
  DevPilotStabilityItem,
} from "./types";
import { getAnnotationKind } from "./output";
import type { DevPilotExportAnnotation } from "./output";
import type {
  DevPilotStabilityExportItem,
} from "./stability-output";

export type DevPilotTaskType = "annotation" | "stability" | "repair";
export type DevPilotAgentIntent = "ui-fix" | "stability-fix" | "mixed-fix";
export type DevPilotAgentPriority = "low" | "medium" | "high" | "critical";
export type DevPilotAgentChangeScope = "targeted";
export type DevPilotAgentExecutionMode = "safe-minimal-change";

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
}

export interface DevPilotTaskPacketTask {
  type: DevPilotTaskType;
  title: string;
  description: string;
  desiredOutcome: string;
}

export interface DevPilotTaskPacketEvidence {
  annotations: DevPilotExportAnnotation[];
  stabilityItems?: DevPilotStabilityExportItem[];
  runtimeSignals?: string[];
}

export interface DevPilotTaskPacketContext {
  viewport: { width: number; height: number };
  platform?: string;
  language?: string;
  screen?: { width: number; height: number };
  referrer?: string;
}

export interface DevPilotTaskPacketAgentBrief {
  version: "1";
  intent: DevPilotAgentIntent;
  priority: DevPilotAgentPriority;
  changeScope: DevPilotAgentChangeScope;
  executionMode: DevPilotAgentExecutionMode;
  primaryTargets: string[];
  acceptanceCriteria: string[];
  constraints: string[];
  suggestedSteps: string[];
  suggestedSearchQueries: string[];
  outputContract: string[];
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
  context?: DevPilotTaskPacketContext;
}

export interface DevPilotTaskPacketOptions {
  type: DevPilotTaskType;
  taskTitle: string;
  description: string;
  desiredOutcome: string;
  annotations: DevPilotAnnotation[];
  stabilityItems?: DevPilotStabilityItem[];
  pathname: string;
  pageTitle?: string;
  url?: string;
  viewport?: { width: number; height: number };
  platform?: string;
  language?: string;
  screen?: { width: number; height: number };
  referrer?: string;
  runtimeSignals?: string[];
}

function normalizeInlineText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function toSentenceCase(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function computeSourceHitsFromAnnotations(annotations: DevPilotExportAnnotation[]): string[] {
  const hits = new Set<string>();
  annotations.forEach((annotation) => {
    const ctx = annotation.context;
    if (ctx?.componentHints) {
      ctx.componentHints.forEach((name: string) => {
        hits.add(`component:${name}`);
        hits.add(`candidate:src/components/${name}.tsx`);
        hits.add(`candidate:src/${name}.tsx`);
        hits.add(`candidate:app/components/${name}.tsx`);
        hits.add(`candidate:pages/${name}.tsx`);
      });
    }
    if (ctx?.sourceHints) {
      ctx.sourceHints.forEach((file: string) => hits.add(`file:${file}`));
    }
    annotation.sourceHits?.forEach((hit: string) => hits.add(hit));
  });
  return Array.from(hits).slice(0, 12);
}

function toExportAnnotation(annotation: DevPilotAnnotation, index: number): DevPilotExportAnnotation {
  return {
    id: annotation.id,
    index: index + 1,
    kind: getAnnotationKind(annotation),
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
    sourceHits: [], // computed later
  };
}

function toExportStabilityItem(item: DevPilotStabilityItem, index: number): DevPilotStabilityExportItem {
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
  };
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
  annotations: DevPilotExportAnnotation[],
  stabilityItems: DevPilotStabilityExportItem[],
): DevPilotAgentPriority {
  if (stabilityItems.some((item) => item.severity === "critical")) {
    return "critical";
  }
  if (
    stabilityItems.some((item) => item.severity === "high") ||
    annotations.length >= 4
  ) {
    return "high";
  }
  if (stabilityItems.length > 0 || annotations.length >= 2) {
    return "medium";
  }
  return "low";
}

function collectPrimaryTargets(
  annotations: DevPilotExportAnnotation[],
  stabilityItems: DevPilotStabilityExportItem[],
  sourceHits: string[],
): string[] {
  const targets = new Set<string>();

  annotations.forEach((annotation) => {
    if (annotation.context?.componentHints?.length) {
      annotation.context.componentHints.forEach((name) => targets.add(`component:${name}`));
    }
    if (annotation.elementPath) {
      targets.add(`selector:${annotation.elementPath}`);
    }
  });

  stabilityItems.forEach((item) => {
    targets.add(`issue:${item.title}`);
    if (item.context.openAnnotationSummaries?.length) {
      item.context.openAnnotationSummaries.forEach((summary) => {
        targets.add(`selector:${summary.elementPath}`);
      });
    }
  });

  sourceHits.forEach((hit) => targets.add(hit));

  return Array.from(targets).slice(0, 12);
}

function buildAcceptanceCriteria(
  annotations: DevPilotExportAnnotation[],
  stabilityItems: DevPilotStabilityExportItem[],
  desiredOutcome: string,
): string[] {
  const criteria = new Set<string>();
  criteria.add(normalizeInlineText(desiredOutcome));

  if (annotations.length > 0) {
    criteria.add("The annotated UI issues are fixed in the referenced page regions.");
    criteria.add("The updated UI still matches the intended element, text, or grouped area called out in the evidence.");
  }

  if (stabilityItems.length > 0) {
    criteria.add("The referenced runtime failures are resolved or safely handled.");
    criteria.add("The user flow no longer breaks when the failing runtime path is exercised.");
  }

  criteria.add("No unrelated behavior changes are introduced outside the described scope.");

  return Array.from(criteria);
}

function buildSuggestedSearchQueries(
  annotations: DevPilotExportAnnotation[],
  stabilityItems: DevPilotStabilityExportItem[],
  sourceHits: string[],
): string[] {
  const queries = new Set<string>();

  sourceHits.slice(0, 6).forEach((hit) => queries.add(hit));

  annotations.forEach((annotation) => {
    annotation.context?.componentHints?.forEach((name) => queries.add(name));
    annotation.context?.selectorCandidates?.slice(0, 2).forEach((candidate) => queries.add(candidate));
    if (annotation.nearbyText) {
      queries.add(normalizeInlineText(annotation.nearbyText).slice(0, 80));
    }
  });

  stabilityItems.forEach((item) => {
    queries.add(item.title);
    if (item.symptom) {
      queries.add(normalizeInlineText(item.symptom).slice(0, 120));
    }
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

export function createDevPilotTaskPacket(options: DevPilotTaskPacketOptions): DevPilotTaskPacket {
  const resolvedViewport = options.viewport || {
    width: typeof window === "undefined" ? 0 : window.innerWidth,
    height: typeof window === "undefined" ? 0 : window.innerHeight,
  };

  const exportAnnotations = options.annotations.map((a, i) => toExportAnnotation(a, i));
  exportAnnotations.forEach((annotation) => {
    annotation.sourceHits = computeSourceHitsFromAnnotations([annotation]);
  });

  const allSourceHits = computeSourceHitsFromAnnotations(exportAnnotations);

  const exportStabilityItems = options.stabilityItems?.map((item, i) =>
    toExportStabilityItem(item, i),
  ) || [];
  const intent = inferAgentIntent(exportAnnotations.length, exportStabilityItems.length);
  const priority = inferAgentPriority(exportAnnotations, exportStabilityItems);
  const acceptanceCriteria = buildAcceptanceCriteria(
    exportAnnotations,
    exportStabilityItems,
    options.desiredOutcome,
  );
  const primaryTargets = collectPrimaryTargets(
    exportAnnotations,
    exportStabilityItems,
    allSourceHits,
  );
  const suggestedSearchQueries = buildSuggestedSearchQueries(
    exportAnnotations,
    exportStabilityItems,
    allSourceHits,
  );

  return {
    schema: "devpilot.task-packet/v2",
    generatedAt: new Date().toISOString(),
    page: {
      title:
        options.pageTitle ||
        (typeof document === "undefined" ? "Untitled Page" : document.title || "Untitled Page"),
      url:
        options.url ||
        (typeof window === "undefined" ? options.pathname : window.location.href),
      pathname: options.pathname,
      viewport: resolvedViewport,
    },
    summary: {
      annotationCount: exportAnnotations.length,
      stabilityCount: exportStabilityItems.length,
      totalIssueCount: exportAnnotations.length + exportStabilityItems.length,
      sourceHitCount: allSourceHits.length,
    },
    task: {
      type: options.type,
      title: options.taskTitle,
      description: options.description,
      desiredOutcome: options.desiredOutcome,
    },
    agent: {
      version: "1",
      intent,
      priority,
      changeScope: "targeted",
      executionMode: "safe-minimal-change",
      primaryTargets,
      acceptanceCriteria,
      constraints: buildConstraints(intent),
      suggestedSteps: buildSuggestedSteps(intent),
      suggestedSearchQueries,
      outputContract: buildOutputContract(),
    },
    evidence: {
      annotations: exportAnnotations,
      stabilityItems: exportStabilityItems.length > 0 ? exportStabilityItems : undefined,
      runtimeSignals: options.runtimeSignals,
    },
    sourceHits: allSourceHits,
    context: {
      viewport: resolvedViewport,
      platform: options.platform,
      language: options.language,
      screen: options.screen,
      referrer: options.referrer,
    },
  };
}

function inferRegionFromAnnotation(
  annotation: DevPilotExportAnnotation,
): string {
  const path = annotation.elementPath.toLowerCase();
  if (path.includes("header")) return "Header";
  if (path.includes("footer")) return "Footer";
  if (path.includes("nav")) return "Navigation";
  if (path.includes("aside") || path.includes("sidebar")) return "Sidebar";
  if (path.includes("main")) return "Main Content";

  const viewportHeight =
    typeof window !== "undefined" ? window.innerHeight : 900;
  const relativeY = annotation.pageY / viewportHeight;
  if (relativeY < 0.15) return "Top Area";
  if (relativeY > 0.85) return "Bottom Area";

  return "Page Body";
}

function getDomDepth(elementPath: string): number {
  return elementPath.split(" > ").length;
}

function buildRegionGroups(
  annotations: DevPilotExportAnnotation[],
): Map<string, DevPilotExportAnnotation[]> {
  const groups = new Map<string, DevPilotExportAnnotation[]>();
  annotations.forEach((annotation) => {
    const region = inferRegionFromAnnotation(annotation);
    const list = groups.get(region) ?? [];
    list.push(annotation);
    groups.set(region, list);
  });
  return groups;
}

const REGION_ORDER = [
  "Header",
  "Navigation",
  "Sidebar",
  "Main Content",
  "Page Body",
  "Top Area",
  "Bottom Area",
  "Footer",
];

function sortRegions(regions: string[]): string[] {
  return [...regions].sort((a, b) => {
    const idxA = REGION_ORDER.indexOf(a);
    const idxB = REGION_ORDER.indexOf(b);
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });
}

function formatAnnotationMarkdown(annotation: DevPilotExportAnnotation): string {
  const lines: string[] = [];
  lines.push(`#### ${annotation.index}. ${normalizeInlineText(annotation.elementName)}`);
  lines.push(`- **Status:** ${annotation.status}`);
  lines.push(`- **Type:** ${annotation.kind || "element"}`);
  lines.push(`- **Path:** \`${normalizeInlineText(annotation.elementPath)}\``);
  lines.push(`- **DOM Depth:** ${getDomDepth(annotation.elementPath)}`);
  lines.push(
    `- **Screen Region:** left ${Math.round(annotation.rect.left)}, top ${Math.round(annotation.rect.top)}, size ${Math.round(annotation.rect.width)}x${Math.round(annotation.rect.height)}`,
  );
  lines.push(
    `- **Page Anchor:** x ${Math.round(annotation.pageX)}, y ${Math.round(annotation.pageY)}`,
  );
  if (annotation.comment) {
    lines.push(`- **Comment:** ${annotation.comment}`);
  }
  if (annotation.selectedText) {
    lines.push(`- **Selected Text:** "${normalizeInlineText(annotation.selectedText)}"`);
  }
  if (annotation.nearbyText) {
    lines.push(`- **Nearby Text:** "${normalizeInlineText(annotation.nearbyText)}"`);
  }
  if (annotation.matchCount) {
    lines.push(`- **Matched Elements:** ${annotation.matchCount}`);
  }
  if (annotation.relatedElements?.length) {
    lines.push(`- **Grouped Elements:** ${annotation.relatedElements.slice(0, 6).join(" | ")}`);
  }
  if (annotation.context?.componentHints?.length) {
    lines.push(`- **Components:** ${annotation.context.componentHints.join(", ")}`);
  }
  if (annotation.context?.selectorCandidates?.length) {
    lines.push(
      `- **Selector Candidates:** ${annotation.context.selectorCandidates
        .slice(0, 5)
        .map((candidate) => `\`${candidate}\``)
        .join(", ")}`,
    );
  }
  if (annotation.context?.cssClasses?.length) {
    lines.push(
      `- **CSS Classes:** \`${annotation.context.cssClasses.slice(0, 6).join(" ")}\``,
    );
  }
  if (annotation.context?.nearbyElements?.length) {
    lines.push(
      `- **Nearby Elements:** ${annotation.context.nearbyElements
        .slice(0, 4)
        .map((item) => `"${normalizeInlineText(item)}"`)
        .join(", ")}`,
    );
  }
  if (annotation.context?.computedStyleSnapshot) {
    const styleEntries = Object.entries(annotation.context.computedStyleSnapshot).slice(0, 6);
    if (styleEntries.length > 0) {
      lines.push(
        `- **Style Snapshot:** ${styleEntries
          .map(([key, value]) => `\`${key}: ${normalizeInlineText(value)}\``)
          .join(", ")}`,
      );
    }
  }
  if (annotation.context?.dataAttributes) {
    const dataEntries = Object.entries(annotation.context.dataAttributes).slice(0, 5);
    if (dataEntries.length > 0) {
      lines.push(
        `- **Data Attributes:** ${dataEntries
          .map(([key, value]) => `\`${key}=${normalizeInlineText(value)}\``)
          .join(", ")}`,
      );
    }
  }
  if (annotation.sourceHits?.length) {
    lines.push(`- **Source Hits:**`);
    annotation.sourceHits.forEach((hit) => lines.push(`  - ${hit}`));
  }
  lines.push("");
  return lines.join("\n");
}

export function formatDevPilotTaskPacketJson(packet: DevPilotTaskPacket): string {
  return JSON.stringify(packet, null, 2);
}

export function formatDevPilotTaskPacketMarkdown(packet: DevPilotTaskPacket): string {
  const lines = [
    `# DevPilot Task Packet`,
    `**Schema:** ${packet.schema}`,
    `**Generated:** ${packet.generatedAt}`,
    ``,
    `## Page Context`,
    `**Page:** ${normalizeInlineText(packet.page.title)}`,
    `**URL:** ${packet.page.url}`,
    `**Path:** ${packet.page.pathname}`,
    `**Viewport:** ${packet.page.viewport.width}x${packet.page.viewport.height}`,
    ``,
    `## Summary`,
    `**Issues:** ${packet.summary.totalIssueCount} total · ${packet.summary.annotationCount} annotation · ${packet.summary.stabilityCount} stability`,
    `**Source Hits:** ${packet.summary.sourceHitCount}`,
    ``,
    `## Task`,
    `**Type:** ${packet.task.type}`,
    `**Title:** ${packet.task.title}`,
    `**Description:** ${packet.task.description}`,
    `**Desired Outcome:** ${packet.task.desiredOutcome}`,
    ``,
    `## Agent Brief`,
    `**Intent:** ${packet.agent.intent}`,
    `**Priority:** ${packet.agent.priority}`,
    `**Change Scope:** ${packet.agent.changeScope}`,
    `**Execution Mode:** ${packet.agent.executionMode}`,
    ``,
  ];

  if (packet.agent.primaryTargets.length > 0) {
    lines.push(`### Primary Targets`);
    packet.agent.primaryTargets.forEach((target) => lines.push(`- ${target}`));
    lines.push("");
  }

  if (packet.agent.acceptanceCriteria.length > 0) {
    lines.push(`### Acceptance Criteria`);
    packet.agent.acceptanceCriteria.forEach((criterion) => lines.push(`- ${criterion}`));
    lines.push("");
  }

  if (packet.agent.constraints.length > 0) {
    lines.push(`### Constraints`);
    packet.agent.constraints.forEach((constraint) => lines.push(`- ${constraint}`));
    lines.push("");
  }

  if (packet.evidence.annotations.length > 0) {
    const groups = buildRegionGroups(packet.evidence.annotations);
    const sortedRegions = sortRegions(Array.from(groups.keys()));

    lines.push(`## Evidence: Annotations (${packet.evidence.annotations.length})`);
    lines.push("");
    lines.push(`Annotations are grouped by inferred page region to help you understand the spatial distribution of issues.`);
    lines.push("");

    sortedRegions.forEach((region) => {
      const items = groups.get(region)!;
      lines.push(`### ${region} (${items.length})`);
      lines.push("");
      items.forEach((annotation) => {
        lines.push(formatAnnotationMarkdown(annotation));
      });
    });
  }

  if (packet.evidence.stabilityItems?.length) {
    lines.push(`## Evidence: Stability Issues (${packet.evidence.stabilityItems.length})`);
    packet.evidence.stabilityItems.forEach((item) => {
      lines.push(`### ${item.index}. ${normalizeInlineText(item.title)}`);
      lines.push(`- **Severity:** ${item.severity}`);
      lines.push(`- **Symptom:** ${item.symptom}`);
      if (item.reproSteps) lines.push(`- **Repro:** ${item.reproSteps}`);
      if (item.fixGoal) lines.push(`- **Fix Goal:** ${item.fixGoal}`);
      lines.push("");
    });
  }

  if (packet.sourceHits && packet.sourceHits.length > 0) {
    lines.push(`## Source Hits`);
    packet.sourceHits.forEach((hit: string) => lines.push(`- ${hit}`));
    lines.push("");
  }

  lines.push(`## Search Hints for AI`);
  if (packet.agent.suggestedSearchQueries.length > 0) {
    packet.agent.suggestedSearchQueries.forEach((query) => {
      lines.push(`- Search for ${query.includes(" ") ? `"${query}"` : `\`${query}\``}`);
    });
  }
  lines.push(`- Start from the source hits first; they are the best candidate files or components.`);
  lines.push(`- If source hits are weak, search by selector candidates, component names, nearby text, and data attributes.`);
  lines.push(`- Use the screen region and grouped element list to confirm you are fixing the intended UI, not a similarly named control elsewhere.`);
  lines.push("");

  lines.push(`## Instructions for AI`);
  packet.agent.suggestedSteps.forEach((step, index) => {
    lines.push(`${index + 1}. ${toSentenceCase(step)}`);
  });
  lines.push("");

  lines.push(`## Output Contract`);
  packet.agent.outputContract.forEach((item) => lines.push(`- ${item}`));

  return lines.join("\n").trim();
}
