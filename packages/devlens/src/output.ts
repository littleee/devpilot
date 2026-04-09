import type {
  DevLensAnnotation,
  DevLensAnnotationStatus,
  DevLensRect,
  DevLensSelectionKind,
} from "./types";
import { isOpenDevLensAnnotationStatus } from "./types";

export interface DevLensExportPageContext {
  title: string;
  url: string;
  pathname: string;
  viewport: {
    width: number;
    height: number;
  };
}

export interface DevLensExportSummary {
  total: number;
  open: number;
  pending: number;
  acknowledged: number;
  resolved: number;
  dismissed: number;
}

export interface DevLensExportAnnotation {
  id: string;
  index: number;
  kind: DevLensSelectionKind;
  status: DevLensAnnotationStatus;
  comment: string;
  elementName: string;
  elementPath: string;
  selectedText?: string;
  nearbyText?: string;
  relatedElements?: string[];
  matchCount?: number;
  pageX: number;
  pageY: number;
  rect: DevLensRect;
  createdAt: number;
  updatedAt: number;
}

export interface DevLensExportPayload {
  schema: "devlens.page-feedback/v1";
  copiedAt: string;
  page: DevLensExportPageContext;
  summary: DevLensExportSummary;
  annotations: DevLensExportAnnotation[];
}

export interface DevLensExportPayloadOptions {
  annotations: DevLensAnnotation[];
  pathname: string;
  title?: string;
  url?: string;
  viewport?: {
    width: number;
    height: number;
  };
  copiedAt?: string;
}

function normalizeInlineText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function getStatusCount(
  annotations: DevLensAnnotation[],
  status: DevLensAnnotationStatus,
): number {
  return annotations.filter((item) => item.status === status).length;
}

export function getAnnotationKind(
  annotation: DevLensAnnotation,
): DevLensSelectionKind {
  if (annotation.kind) {
    return annotation.kind;
  }

  if (annotation.selectedText) {
    return "text";
  }

  if (annotation.relatedElements?.length) {
    return "area";
  }

  return "element";
}

function formatAnnotationKind(kind: DevLensSelectionKind): string {
  switch (kind) {
    case "area":
      return "Area Annotation";
    case "text":
      return "Text Annotation";
    default:
      return "Element Annotation";
  }
}

function createExportSummary(
  annotations: DevLensAnnotation[],
): DevLensExportSummary {
  return {
    total: annotations.length,
    open: annotations.filter((item) => isOpenDevLensAnnotationStatus(item.status))
      .length,
    pending: getStatusCount(annotations, "pending"),
    acknowledged: getStatusCount(annotations, "acknowledged"),
    resolved: getStatusCount(annotations, "resolved"),
    dismissed: getStatusCount(annotations, "dismissed"),
  };
}

function formatAnnotationStatus(status: DevLensAnnotationStatus): string {
  switch (status) {
    case "acknowledged":
      return "acknowledged";
    case "resolved":
      return "resolved";
    case "dismissed":
      return "dismissed";
    default:
      return "pending";
  }
}

function getAnnotationHeading(annotation: DevLensExportAnnotation): string {
  if (annotation.kind === "area") {
    return normalizeInlineText(annotation.elementName);
  }

  const pathTail = annotation.elementPath
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1);

  if (pathTail) {
    return pathTail;
  }

  return normalizeInlineText(annotation.elementName);
}

export function createDevLensExportPayload(
  options: DevLensExportPayloadOptions,
): DevLensExportPayload {
  const {
    annotations,
    pathname,
    title,
    url,
    viewport,
    copiedAt,
  } = options;
  const resolvedViewport = viewport || {
    width: typeof window === "undefined" ? 0 : window.innerWidth,
    height: typeof window === "undefined" ? 0 : window.innerHeight,
  };

  return {
    schema: "devlens.page-feedback/v1",
    copiedAt: copiedAt || new Date().toISOString(),
    page: {
      title:
        title ||
        (typeof document === "undefined" ? "Untitled Page" : document.title || "Untitled Page"),
      url:
        url ||
        (typeof window === "undefined" ? pathname : window.location.href),
      pathname,
      viewport: resolvedViewport,
    },
    summary: createExportSummary(annotations),
    annotations: annotations.map((annotation, index) => ({
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
    })),
  };
}

export function formatDevLensExportJson(
  payload: DevLensExportPayload,
): string {
  return JSON.stringify(payload, null, 2);
}

export function formatDevLensExportMarkdown(
  payload: DevLensExportPayload,
): string {
  const lines = [
    `## Page Feedback: ${payload.page.pathname}`,
    `**Viewport:** ${payload.page.viewport.width}x${payload.page.viewport.height}`,
    `**Page:** ${normalizeInlineText(payload.page.title)}`,
    `**URL:** ${payload.page.url}`,
    `**Annotations:** ${payload.summary.total} total · ${payload.summary.open} open · ${payload.summary.pending} pending · ${payload.summary.acknowledged} acknowledged · ${payload.summary.resolved} resolved · ${payload.summary.dismissed} dismissed`,
    "",
  ];

  payload.annotations.forEach((annotation) => {
    lines.push(`### ${annotation.index}. ${getAnnotationHeading(annotation)}`);
    lines.push(`**Type:** ${formatAnnotationKind(annotation.kind)}`);
    lines.push(`**Status:** ${formatAnnotationStatus(annotation.status)}`);
    lines.push(`**Element:** ${normalizeInlineText(annotation.elementName)}`);
    lines.push(`**Location:** \`${normalizeInlineText(annotation.elementPath)}\``);

    if (annotation.selectedText) {
      lines.push(`**Selected:** "${normalizeInlineText(annotation.selectedText)}"`);
    }

    if (annotation.nearbyText) {
      lines.push(`**Context:** ${normalizeInlineText(annotation.nearbyText)}`);
    }

    if (annotation.kind === "area") {
      lines.push(
        `**Matched elements:** ${annotation.matchCount || annotation.relatedElements?.length || 0}`,
      );
      lines.push(
        `**Area:** ${Math.round(annotation.rect.width)}x${Math.round(annotation.rect.height)}px`,
      );
    }

    if (annotation.relatedElements?.length) {
      lines.push(
        `**Related:** ${annotation.relatedElements
          .map((item) => normalizeInlineText(item))
          .join(" | ")}`,
      );
    }

    lines.push(`**Feedback:** ${annotation.comment.trim()}`);
    lines.push("");
  });

  return lines.join("\n").trim();
}
