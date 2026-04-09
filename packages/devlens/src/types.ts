export type DevLensMode = "annotate" | "stability" | "session";

export type DevLensAnnotationStatus =
  | "pending"
  | "acknowledged"
  | "resolved"
  | "dismissed";

export const DEVLENS_OPEN_ANNOTATION_STATUSES = [
  "pending",
  "acknowledged",
] as const;

export const DEVLENS_CLOSED_ANNOTATION_STATUSES = [
  "resolved",
  "dismissed",
] as const;

export const DEVLENS_ANNOTATION_STATUSES = [
  ...DEVLENS_OPEN_ANNOTATION_STATUSES,
  ...DEVLENS_CLOSED_ANNOTATION_STATUSES,
] as const;

export function isDevLensAnnotationStatus(
  value: unknown,
): value is DevLensAnnotationStatus {
  return (
    typeof value === "string" &&
    DEVLENS_ANNOTATION_STATUSES.includes(
      value as DevLensAnnotationStatus,
    )
  );
}

export function isOpenDevLensAnnotationStatus(
  status: DevLensAnnotationStatus,
): boolean {
  return (
    DEVLENS_OPEN_ANNOTATION_STATUSES as readonly DevLensAnnotationStatus[]
  ).includes(status);
}

export function isClosedDevLensAnnotationStatus(
  status: DevLensAnnotationStatus,
): boolean {
  return (
    DEVLENS_CLOSED_ANNOTATION_STATUSES as readonly DevLensAnnotationStatus[]
  ).includes(status);
}

export type DevLensSelectionKind = "element" | "text" | "area";

export interface DevLensRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DevLensSelection {
  kind: DevLensSelectionKind;
  elementName: string;
  elementPath: string;
  rect: DevLensRect;
  pageX: number;
  pageY: number;
  matchCount?: number;
  selectedText?: string;
  nearbyText?: string;
  relatedElements?: string[];
}

export interface DevLensAnnotation {
  id: string;
  pathname: string;
  createdAt: number;
  updatedAt: number;
  kind?: DevLensSelectionKind;
  status: DevLensAnnotationStatus;
  comment: string;
  elementName: string;
  elementPath: string;
  matchCount?: number;
  selectedText?: string;
  nearbyText?: string;
  relatedElements?: string[];
  pageX: number;
  pageY: number;
  rect: DevLensRect;
}

export interface DevLensMountOptions {
  endpoint?: string;
  defaultOpen?: boolean;
}

export interface DevLensController {
  destroy: () => void;
}
