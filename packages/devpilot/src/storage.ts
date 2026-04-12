import {
  isDevPilotAnnotationStatus,
  isOpenDevPilotAnnotationStatus,
  type DevPilotAnnotation,
  type DevPilotAnnotationStatus,
  isDevPilotStabilitySeverity,
  isDevPilotStabilityStatus,
  type DevPilotStabilityItem,
  type DevPilotStabilitySeverity,
  type DevPilotStabilityStatus,
} from "./types";

const ANNOTATION_PREFIX = "devpilot.annotations:";
const STABILITY_PREFIX = "devpilot.stability:";
const OBSERVATION_PREFIX = "devpilot.observation:";
const POSITION_KEY = "devpilot.position";
const SESSION_PREFIX = "devpilot.session:";

export interface DevPilotFloatingPosition {
  left: number;
  top: number;
}

function normalizeAnnotationStatus(value: unknown): DevPilotAnnotationStatus {
  return isDevPilotAnnotationStatus(value) ? value : "pending";
}

function normalizeAnnotation(
  annotation: DevPilotAnnotation,
): DevPilotAnnotation {
  return {
    ...annotation,
    status: normalizeAnnotationStatus(annotation.status),
  };
}

function getAnnotationKey(pathname: string): string {
  return `${ANNOTATION_PREFIX}${pathname}`;
}

function getStabilityKey(pathname: string): string {
  return `${STABILITY_PREFIX}${pathname}`;
}

function getSessionKey(pathname: string): string {
  return `${SESSION_PREFIX}${pathname}`;
}

function getObservationKey(pathname: string): string {
  return `${OBSERVATION_PREFIX}${pathname}`;
}

function normalizeStabilityStatus(value: unknown): DevPilotStabilityStatus {
  return isDevPilotStabilityStatus(value) ? value : "open";
}

function normalizeStabilitySeverity(value: unknown): DevPilotStabilitySeverity {
  return isDevPilotStabilitySeverity(value) ? value : "high";
}

function normalizeStabilityItem(
  item: DevPilotStabilityItem,
): DevPilotStabilityItem {
  return {
    ...item,
    status: normalizeStabilityStatus(item.status),
    severity: normalizeStabilitySeverity(item.severity),
    context: {
      ...item.context,
      openAnnotationComments: Array.isArray(item.context?.openAnnotationComments)
        ? item.context.openAnnotationComments.filter((entry) => typeof entry === "string")
        : [],
    },
  };
}

export function loadAnnotations(pathname: string): DevPilotAnnotation[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getAnnotationKey(pathname));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as DevPilotAnnotation[];
    return Array.isArray(parsed)
      ? parsed
          .map(normalizeAnnotation)
          .filter((annotation) => isOpenDevPilotAnnotationStatus(annotation.status))
      : [];
  } catch {
    return [];
  }
}

export function saveAnnotations(pathname: string, annotations: DevPilotAnnotation[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      getAnnotationKey(pathname),
      JSON.stringify(
        annotations.filter((annotation) =>
          isOpenDevPilotAnnotationStatus(annotation.status),
        ),
      ),
    );
  } catch {
    // Ignore localStorage failures.
  }
}

export function loadStabilityItems(pathname: string): DevPilotStabilityItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getStabilityKey(pathname));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as DevPilotStabilityItem[];
    return Array.isArray(parsed) ? parsed.map(normalizeStabilityItem) : [];
  } catch {
    return [];
  }
}

export function saveStabilityItems(
  pathname: string,
  items: DevPilotStabilityItem[],
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getStabilityKey(pathname), JSON.stringify(items));
  } catch {
    // Ignore localStorage failures.
  }
}

export function loadSessionId(pathname: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(getSessionKey(pathname));
  } catch {
    return null;
  }
}

export function loadObservationEnabled(pathname: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(getObservationKey(pathname)) === "true";
  } catch {
    return false;
  }
}

export function saveObservationEnabled(pathname: string, enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getObservationKey(pathname), String(enabled));
  } catch {
    // Ignore localStorage failures.
  }
}

export function saveSessionId(pathname: string, sessionId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getSessionKey(pathname), sessionId);
  } catch {
    // Ignore localStorage failures.
  }
}

export function clearSessionId(pathname: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(getSessionKey(pathname));
  } catch {
    // Ignore localStorage failures.
  }
}

export function loadFloatingPosition(): DevPilotFloatingPosition | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(POSITION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<DevPilotFloatingPosition>;
    if (
      typeof parsed?.left === "number" &&
      Number.isFinite(parsed.left) &&
      typeof parsed?.top === "number" &&
      Number.isFinite(parsed.top)
    ) {
      return { left: parsed.left, top: parsed.top };
    }
  } catch {
    // Ignore localStorage failures.
  }

  return null;
}

export function saveFloatingPosition(position: DevPilotFloatingPosition): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(POSITION_KEY, JSON.stringify(position));
  } catch {
    // Ignore localStorage failures.
  }
}
