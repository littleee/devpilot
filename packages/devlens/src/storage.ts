import {
  isDevLensAnnotationStatus,
  type DevLensAnnotation,
  type DevLensAnnotationStatus,
} from "./types";

const ANNOTATION_PREFIX = "devlens.annotations:";
const POSITION_KEY = "devlens.position";

export interface DevLensFloatingPosition {
  left: number;
  top: number;
}

function normalizeAnnotationStatus(value: unknown): DevLensAnnotationStatus {
  return isDevLensAnnotationStatus(value) ? value : "pending";
}

function normalizeAnnotation(
  annotation: DevLensAnnotation,
): DevLensAnnotation {
  return {
    ...annotation,
    status: normalizeAnnotationStatus(annotation.status),
  };
}

function getAnnotationKey(pathname: string): string {
  return `${ANNOTATION_PREFIX}${pathname}`;
}

export function loadAnnotations(pathname: string): DevLensAnnotation[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getAnnotationKey(pathname));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as DevLensAnnotation[];
    return Array.isArray(parsed) ? parsed.map(normalizeAnnotation) : [];
  } catch {
    return [];
  }
}

export function saveAnnotations(pathname: string, annotations: DevLensAnnotation[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getAnnotationKey(pathname), JSON.stringify(annotations));
  } catch {
    // Ignore localStorage failures.
  }
}

export function loadFloatingPosition(): DevLensFloatingPosition | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(POSITION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<DevLensFloatingPosition>;
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

export function saveFloatingPosition(position: DevLensFloatingPosition): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(POSITION_KEY, JSON.stringify(position));
  } catch {
    // Ignore localStorage failures.
  }
}
