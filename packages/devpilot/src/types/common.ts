import type { DevPilotAnnotationStatus } from "./annotations";
import type {
  DevPilotRepairRequest,
} from "./repair";

export type DevPilotMode = "annotate" | "stability";

export type DevPilotSelectionKind = "element" | "text" | "area";

export interface DevPilotRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DevPilotElementContext {
  cssClasses?: string[];
  selectorCandidates?: string[];
  nearbyElements?: string[];
  computedStyleSnapshot?: Record<string, string>;
  componentHints?: string[];
  sourceHints?: string[];
  dataAttributes?: Record<string, string>;
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
  context?: DevPilotElementContext;
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
  context?: DevPilotElementContext;
}

export interface DevPilotFeatureFlags {
  stability?: boolean;
  mcp?: boolean;
}

export interface ResolvedDevPilotFeatureFlags {
  stability: boolean;
  mcp: boolean;
}

export function resolveDevPilotFeatures(
  features: DevPilotFeatureFlags | undefined,
  endpoint?: string,
): ResolvedDevPilotFeatureFlags {
  return {
    stability: features?.stability ?? false,
    mcp: features?.mcp ?? Boolean(endpoint),
  };
}

export interface DevPilotConnectionState {
  endpoint?: string;
  status: "disabled" | "connecting" | "connected" | "reconnecting" | "error";
  sessionId?: string | null;
}

export interface DevPilotMountOptions {
  endpoint?: string;
  defaultOpen?: boolean;
  features?: DevPilotFeatureFlags;
  onAnnotationAdd?: (annotation: DevPilotAnnotation) => void;
  onAnnotationUpdate?: (annotation: DevPilotAnnotation) => void;
  onAnnotationDelete?: (annotationId: string) => void;
  onStabilityObserved?: (item: import("./stability").DevPilotStabilityItem) => void;
  onStabilityStatusChange?: (item: import("./stability").DevPilotStabilityItem) => void;
  onSessionCreated?: (sessionId: string) => void;
  onConnectionStateChange?: (state: DevPilotConnectionState) => void;
  onRepairRequest?: (
    request: DevPilotRepairRequest,
  ) => void | Promise<void>;
}

export interface DevPilotController {
  destroy: () => void;
}
