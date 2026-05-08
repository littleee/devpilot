import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  isDevPilotClientRequest,
  startAutoObservation,
} from "../observation/collectors";
import {
  createDevPilotStabilityRepairPayload,
  formatDevPilotStabilityRepairMarkdown,
} from "../stability-output";
import { sortStabilityItemsByUpdatedAt } from "../stability/state";
import {
  copyTextToClipboard,
  createScopedId,
  trimObservationText,
} from "../shared/runtime";
import {
  createRemoteRepairRequest,
  deleteRemoteStabilityItem,
  syncRemoteStabilityItem,
  updateRemoteStabilityItem,
} from "../sync";
import type {
  DevPilotAnnotation,
  DevPilotRepairRequest,
  DevPilotRepairRequestRecord,
  DevPilotStabilityItem,
  DevPilotStabilitySeverity,
  DevPilotStabilityStatus,
} from "../types";
import { isOpenDevPilotAnnotationStatus } from "../types";
import { mergeRemoteRepairRequests, sortRepairRequestsByUpdatedAt } from "../repair/state";

const AUTO_OBSERVATION_DEDUPE_MS = 30_000;

function normalizeEndpointForComparison(endpoint: string | undefined): string | null {
  if (!endpoint) {
    return null;
  }

  try {
    return new URL(endpoint, window.location.href).toString().replace(/\/+$/, "");
  } catch {
    return endpoint.replace(/\/+$/, "");
  }
}

function isDevPilotInternalRequest(
  url: string,
  headers: HeadersInit | undefined,
  syncEndpoint: string | undefined,
): boolean {
  if (isDevPilotClientRequest(headers)) {
    return true;
  }

  const normalizedEndpoint = normalizeEndpointForComparison(syncEndpoint);
  if (!normalizedEndpoint) {
    return false;
  }

  try {
    const normalizedUrl = new URL(url, window.location.href).toString();
    return normalizedUrl === normalizedEndpoint || normalizedUrl.startsWith(`${normalizedEndpoint}/`);
  } catch {
    return url === normalizedEndpoint || url.startsWith(`${normalizedEndpoint}/`);
  }
}

export interface UseStabilityOptions {
  stabilityEnabled: boolean;
  pathname: string;
  syncEndpoint: string | undefined;
  currentSessionId: string | null;
  currentSessionIdRef: React.MutableRefObject<string | null>;
  annotationsRef: React.MutableRefObject<DevPilotAnnotation[]>;
  openAnnotations: DevPilotAnnotation[];
  onStabilityObserved?: (item: DevPilotStabilityItem) => void;
  onStabilityStatusChange?: (item: DevPilotStabilityItem) => void;
  onRepairRequest?: (request: DevPilotRepairRequest) => void | Promise<void>;
  onNetworkError?: (message: string) => void;
}

export function useStability(options: UseStabilityOptions) {
  const {
    stabilityEnabled,
    pathname,
    syncEndpoint,
    currentSessionId,
    currentSessionIdRef,
    annotationsRef,
    openAnnotations,
    onStabilityObserved,
    onStabilityStatusChange,
    onRepairRequest,
    onNetworkError,
  } = options;

  const [stabilityItems, setStabilityItems] = useState<DevPilotStabilityItem[]>([]);
  const [stabilityActiveId, setStabilityActiveId] = useState<string | null>(null);
  const [stabilityCopyState, setStabilityCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [repairRequests, setRepairRequests] = useState<DevPilotRepairRequestRecord[]>([]);
  const [repairTargetId, setRepairTargetId] = useState<string | null>(null);
  const [repairState, setRepairState] = useState<"idle" | "requested" | "failed">("idle");
  const observationFingerprintRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!stabilityEnabled) {
      setStabilityItems([]);
      setRepairRequests([]);
      setStabilityActiveId(null);
    }
  }, [pathname, stabilityEnabled]);

  useEffect(() => {
    if (stabilityCopyState === "idle") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setStabilityCopyState("idle");
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [stabilityCopyState]);

  useEffect(() => {
    if (repairState === "idle") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setRepairState("idle");
      setRepairTargetId(null);
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [repairState]);

  useEffect(() => {
    if (!stabilityEnabled) {
      return undefined;
    }
    return startAutoObservation({
      isWithinDevPilotTarget: (target) => {
        if (!(target instanceof Element)) {
          return false;
        }
        return Boolean(
          target.closest("[data-devpilot-root]") || target.closest("[data-devpilot-host]"),
        );
      },
      shouldIgnoreNetworkRequest: ({ url, headers }) =>
        isDevPilotInternalRequest(url, headers, syncEndpoint),
      recordObservedStabilityItem,
    });
    // recordObservedStabilityItem is intentionally omitted to avoid re-registering observers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, stabilityEnabled, syncEndpoint]);

  const openStabilityItems = useMemo(
    () => stabilityItems.filter((item) => item.status !== "resolved"),
    [stabilityItems],
  );

  useEffect(() => {
    if (!stabilityEnabled) {
      return;
    }

    const preferredItems =
      openStabilityItems.length > 0 ? openStabilityItems : stabilityItems;

    if (preferredItems.length === 0) {
      if (stabilityActiveId) {
        setStabilityActiveId(null);
      }
      return;
    }

    if (!stabilityActiveId || !stabilityItems.some((item) => item.id === stabilityActiveId)) {
      setStabilityActiveId(preferredItems[0].id);
    }
  }, [openStabilityItems, stabilityActiveId, stabilityEnabled, stabilityItems]);

  const resolvedStabilityItems = useMemo(
    () => stabilityItems.filter((item) => item.status === "resolved"),
    [stabilityItems],
  );

  const activeStabilityItem = useMemo(
    () => stabilityItems.find((item) => item.id === stabilityActiveId) || null,
    [stabilityItems, stabilityActiveId],
  );

  const activeRepairRequests = useMemo(() => {
    if (!activeStabilityItem) {
      return [];
    }

    return sortRepairRequestsByUpdatedAt(
      repairRequests.filter((request) => request.stabilityItemId === activeStabilityItem.id),
    );
  }, [activeStabilityItem, repairRequests]);

  const latestActiveRepairRequest = activeRepairRequests[0] || null;

  const stabilitySummary = useMemo(() => {
    return {
      open: stabilityItems.filter((item) => item.status === "open").length,
      diagnosing: stabilityItems.filter((item) => item.status === "diagnosing").length,
      resolved: stabilityItems.filter((item) => item.status === "resolved").length,
      critical: stabilityItems.filter((item) => item.severity === "critical").length,
      total: stabilityItems.length,
    };
  }, [stabilityItems]);

  const buildStabilityContext = () => ({
    capturedAt: Date.now(),
    title: document.title || pathname,
    url: window.location.href,
    pathname,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    sessionId: currentSessionId || undefined,
    userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent,
    platform: typeof navigator === "undefined" ? undefined : navigator.platform,
    language: typeof navigator === "undefined" ? undefined : navigator.language,
    screen: typeof window === "undefined" || !window.screen
      ? undefined
      : { width: window.screen.width, height: window.screen.height },
    referrer: typeof document === "undefined" ? undefined : document.referrer,
    openAnnotationCount: openAnnotations.length,
    openAnnotationComments: openAnnotations.slice(0, 5).map((annotation) => {
      return `${annotation.elementName}: ${annotation.comment}`;
    }),
    openAnnotationSummaries: openAnnotations.slice(0, 5).map((annotation) => ({
      elementName: annotation.elementName,
      elementPath: annotation.elementPath,
      comment: annotation.comment,
      kind: annotation.kind,
    })),
  });

  const buildObservationContext = useCallback(() => {
    const currentOpenAnnotations = annotationsRef.current.filter((annotation) =>
      isOpenDevPilotAnnotationStatus(annotation.status),
    );

    return {
      capturedAt: Date.now(),
      title: document.title || pathname,
      url: window.location.href,
      pathname,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      sessionId: currentSessionIdRef.current || undefined,
      userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent,
      platform: typeof navigator === "undefined" ? undefined : navigator.platform,
      language: typeof navigator === "undefined" ? undefined : navigator.language,
      screen: typeof window === "undefined" || !window.screen
        ? undefined
        : { width: window.screen.width, height: window.screen.height },
      referrer: typeof document === "undefined" ? undefined : document.referrer,
      openAnnotationCount: currentOpenAnnotations.length,
      openAnnotationComments: currentOpenAnnotations.slice(0, 5).map((annotation) => {
        return `${annotation.elementName}: ${annotation.comment}`;
      }),
      openAnnotationSummaries: currentOpenAnnotations.slice(0, 5).map((annotation) => ({
        elementName: annotation.elementName,
        elementPath: annotation.elementPath,
        comment: annotation.comment,
        kind: annotation.kind,
      })),
    };
  }, [annotationsRef, currentSessionIdRef, pathname]);

  const recordObservedStabilityItem = useCallback(
    (input: {
      fingerprint: string;
      title: string;
      severity: DevPilotStabilitySeverity;
      symptom: string;
      signals?: string;
      impact?: string;
      reproSteps?: string;
      fixGoal?: string;
    }) => {
      if (!stabilityEnabled) {
        return;
      }

      const now = Date.now();
      const fingerprints = observationFingerprintRef.current;
      for (const [key, timestamp] of fingerprints.entries()) {
        if (now - timestamp > AUTO_OBSERVATION_DEDUPE_MS) {
          fingerprints.delete(key);
        }
      }

      const existingTimestamp = fingerprints.get(input.fingerprint);
      if (existingTimestamp && now - existingTimestamp < AUTO_OBSERVATION_DEDUPE_MS) {
        return;
      }

      fingerprints.set(input.fingerprint, now);

      const nextItem: DevPilotStabilityItem = {
        id: createScopedId("sti_obs"),
        sessionId: currentSessionIdRef.current || undefined,
        pathname,
        createdAt: now,
        updatedAt: now,
        status: "open",
        severity: input.severity,
        title: input.title,
        symptom: trimObservationText(input.symptom, 360),
        reproSteps: input.reproSteps,
        impact: input.impact,
        signals: input.signals,
        fixGoal: input.fixGoal,
        context: buildObservationContext(),
      };

      setStabilityItems((current) => {
        return sortStabilityItemsByUpdatedAt([nextItem, ...current]);
      });
      onStabilityObserved?.(nextItem);

      const sessionId = currentSessionIdRef.current;
      if (syncEndpoint && sessionId) {
        syncRemoteStabilityItem(syncEndpoint, sessionId, nextItem).catch((error) => {
          const message = "[DevPilot] Failed to sync observed stability item";
          console.warn(message, error);
          onNetworkError?.(message);
        });
      }
    },
    [
      buildObservationContext,
      currentSessionIdRef,
      onNetworkError,
      pathname,
      stabilityEnabled,
      syncEndpoint,
    ],
  );

  const handleCopyStabilityItems = async (items: DevPilotStabilityItem[]) => {
    const { createDevPilotTaskPacket, formatDevPilotTaskPacketMarkdown } = await import(
      "../task-packet"
    );

    const annotationCount = openAnnotations.length;
    const stabilityCount = items.length;
    const totalCount = annotationCount + stabilityCount;

    const taskTitle =
      annotationCount > 0
        ? `Fix ${totalCount} issues (${stabilityCount} stability + ${annotationCount} annotation${annotationCount === 1 ? "" : "s"}) on ${pathname}`
        : `Fix ${stabilityCount} stability issue${stabilityCount === 1 ? "" : "s"} on ${pathname}`;

    const description =
      annotationCount > 0
        ? `There are ${stabilityCount} stability issue(s) and ${annotationCount} annotation(s) on this page that need attention.`
        : `There are ${stabilityCount} stability issue(s) on this page that need attention.`;

    const packet = createDevPilotTaskPacket({
      type: annotationCount > 0 ? "repair" : "stability",
      taskTitle,
      description,
      desiredOutcome: "All stability issues are addressed with minimal safe code changes.",
      annotations: openAnnotations,
      stabilityItems: items,
      pathname,
      pageTitle: document.title || "Untitled Page",
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      platform: window.navigator?.platform,
      language: window.navigator?.language,
      screen:
        window.screen
          ? {
              width: window.screen.width,
              height: window.screen.height,
            }
          : undefined,
      referrer: document.referrer || undefined,
    });
    const text = formatDevPilotTaskPacketMarkdown(packet);
    const didCopy = await copyTextToClipboard(text);
    setStabilityCopyState(didCopy ? "copied" : "failed");
  };

  const handleRequestStabilityRepair = async (item: DevPilotStabilityItem) => {
    const payload = createDevPilotStabilityRepairPayload({
      item,
      pathname,
      title: document.title || "Untitled Page",
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      relatedAnnotations: item.context.openAnnotationComments,
    });
    const prompt = formatDevPilotStabilityRepairMarkdown(payload);
    const requestId = createScopedId("req");
    const requestedAt = Date.now();
    const localRequest: DevPilotRepairRequestRecord = {
      id: requestId,
      sessionId: currentSessionId || undefined,
      stabilityItemId: item.id,
      pathname,
      createdAt: requestedAt,
      updatedAt: requestedAt,
      status: "requested",
      title: item.title,
      severity: item.severity,
      prompt,
      requestedBy: "human",
    };
    let succeeded = false;

    try {
      if (onRepairRequest) {
        const request: DevPilotRepairRequest = {
          item,
          prompt,
          endpoint: syncEndpoint,
          sessionId: currentSessionId || undefined,
        };
        await onRepairRequest(request);
        setRepairRequests((current) => mergeRemoteRepairRequests(current, [localRequest]));
        succeeded = true;
      } else if (syncEndpoint && currentSessionId) {
        const remoteRequest = await createRemoteRepairRequest(syncEndpoint, currentSessionId, {
          id: requestId,
          stabilityItemId: item.id,
          pathname,
          title: item.title,
          severity: item.severity,
          prompt,
          requestedBy: "human",
          idempotencyKey: `repair:${item.id}:${Date.now().toString(36)}`,
        });
        setRepairRequests((current) => mergeRemoteRepairRequests(current, [remoteRequest]));
        succeeded = true;
      } else {
        succeeded = await copyTextToClipboard(prompt);
        if (succeeded) {
          setRepairRequests((current) =>
            mergeRemoteRepairRequests(current, [localRequest]),
          );
        }
      }
    } catch (error) {
      const message = "[DevPilot] Failed to trigger repair request";
      console.warn(message, error);
      onNetworkError?.(message);
      succeeded = false;
    }

    setRepairTargetId(item.id);
    setRepairState(succeeded ? "requested" : "failed");

    if (succeeded && item.status === "open") {
      setStabilityItemStatus(item.id, "diagnosing");
    }
  };

  const setStabilityItemStatus = (itemId: string, nextStatus: DevPilotStabilityStatus) => {
    const nextUpdatedAt = Date.now();
    let updatedItem: DevPilotStabilityItem | null = null;
    setStabilityItems((current) =>
      sortStabilityItemsByUpdatedAt(
        current.map((item) => {
          if (item.id === itemId) {
            updatedItem = { ...item, status: nextStatus, updatedAt: nextUpdatedAt };
            return updatedItem;
          }
          return item;
        }),
      ),
    );
    if (updatedItem) {
      onStabilityStatusChange?.(updatedItem);
    }
    setStabilityActiveId(itemId);

    if (syncEndpoint) {
      updateRemoteStabilityItem(syncEndpoint, itemId, {
        status: nextStatus,
        updatedAt: nextUpdatedAt,
      }).catch((error) => {
        const message = "[DevPilot] Failed to update stability status";
        console.warn(message, error);
        onNetworkError?.(message);
      });
    }
  };

  return {
    stabilityItems,
    setStabilityItems,
    stabilityActiveId,
    setStabilityActiveId,
    stabilityCopyState,
    setStabilityCopyState,
    repairRequests,
    setRepairRequests,
    repairTargetId,
    setRepairTargetId,
    repairState,
    setRepairState,
    observationFingerprintRef,
    openStabilityItems,
    resolvedStabilityItems,
    activeStabilityItem,
    stabilitySummary,
    activeRepairRequests,
    latestActiveRepairRequest,
    buildStabilityContext,
    buildObservationContext,
    recordObservedStabilityItem,
    handleCopyStabilityItems,
    handleRequestStabilityRepair,
    setStabilityItemStatus,
  };
}
