export type DevPilotMode = "annotate" | "stability" | "session";

export type DevPilotAnnotationStatus =
  | "pending"
  | "acknowledged"
  | "resolved"
  | "dismissed";

export const DEVPILOT_OPEN_ANNOTATION_STATUSES = [
  "pending",
  "acknowledged",
] as const;

export const DEVPILOT_CLOSED_ANNOTATION_STATUSES = [
  "resolved",
  "dismissed",
] as const;

export const DEVPILOT_ANNOTATION_STATUSES = [
  ...DEVPILOT_OPEN_ANNOTATION_STATUSES,
  ...DEVPILOT_CLOSED_ANNOTATION_STATUSES,
] as const;

export function isDevPilotAnnotationStatus(
  value: unknown,
): value is DevPilotAnnotationStatus {
  return (
    typeof value === "string" &&
    DEVPILOT_ANNOTATION_STATUSES.includes(
      value as DevPilotAnnotationStatus,
    )
  );
}

export function isOpenDevPilotAnnotationStatus(
  status: DevPilotAnnotationStatus,
): boolean {
  return (
    DEVPILOT_OPEN_ANNOTATION_STATUSES as readonly DevPilotAnnotationStatus[]
  ).includes(status);
}

export function isClosedDevPilotAnnotationStatus(
  status: DevPilotAnnotationStatus,
): boolean {
  return (
    DEVPILOT_CLOSED_ANNOTATION_STATUSES as readonly DevPilotAnnotationStatus[]
  ).includes(status);
}

export type DevPilotSelectionKind = "element" | "text" | "area";

export interface DevPilotRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DevPilotSelection {
  kind: DevPilotSelectionKind;
  elementName: string;
  elementPath: string;
  rect: DevPilotRect;
  pageX: number;
  pageY: number;
  matchCount?: number;
  selectedText?: string;
  nearbyText?: string;
  relatedElements?: string[];
}

export interface DevPilotAnnotation {
  id: string;
  pathname: string;
  createdAt: number;
  updatedAt: number;
  kind?: DevPilotSelectionKind;
  status: DevPilotAnnotationStatus;
  comment: string;
  elementName: string;
  elementPath: string;
  matchCount?: number;
  selectedText?: string;
  nearbyText?: string;
  relatedElements?: string[];
  pageX: number;
  pageY: number;
  rect: DevPilotRect;
}

export interface DevPilotMountOptions {
  endpoint?: string;
  defaultOpen?: boolean;
}

export interface DevPilotController {
  destroy: () => void;
}
