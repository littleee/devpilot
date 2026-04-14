import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { startAutoObservation } from "../observation/collectors";
import {
  createDevPilotStabilityExportPayload,
  createDevPilotStabilityRepairPayload,
  formatDevPilotStabilityExportMarkdown,
  formatDevPilotStabilityRepairMarkdown,
} from "../stability-output";
import {
  DevPilotStabilityDraft,
  getDefaultStabilityDraft,
  sortStabilityItemsByUpdatedAt,
} from "../stability/state";
import {
  copyTextToClipboard,
  createScopedId,
  trimObservationText,
} from "../shared/runtime";
import {
  loadObservationEnabled,
  loadStabilityItems,
  saveObservationEnabled,
  saveStabilityItems,
} from "../storage";
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
import { isDevPilotStabilitySeverity, isOpenDevPilotAnnotationStatus } from "../types";
import { mergeRemoteRepairRequests, sortRepairRequestsByUpdatedAt } from "../repair/state";

const AUTO_OBSERVATION_DEDUPE_MS = 30_000;

export interface UseStabilityOptions {
  stabilityEnabled: boolean;
  pathname: string;
  syncEndpoint: string | undefined;
  currentSessionId: string | null;
  currentSessionIdRef: React.MutableRefObject<string | null>;
  annotationsRef: React.MutableRefObject<DevPilotAnnotation[]>;
  openAnnotations: DevPilotAnnotation[];
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
    onRepairRequest,
    onNetworkError,
  } = options;

  const [stabilityItems, setStabilityItems] = useState<DevPilotStabilityItem[]>(
    () => (stabilityEnabled ? loadStabilityItems(pathname) : []),
  );
  const [stabilityEditingId, setStabilityEditingId] = useState<string | null>(null);
  const [stabilityActiveId, setStabilityActiveId] = useState<string | null>(null);
  const [stabilityDraft, setStabilityDraft] = useState<DevPilotStabilityDraft>(
    getDefaultStabilityDraft,
  );
  const [isStabilityComposerOpen, setIsStabilityComposerOpen] = useState(false);
  const [stabilityCopyState, setStabilityCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [repairRequests, setRepairRequests] = useState<DevPilotRepairRequestRecord[]>([]);
  const [repairTargetId, setRepairTargetId] = useState<string | null>(null);
  const [repairState, setRepairState] = useState<"idle" | "requested" | "failed">("idle");
  const [autoObservationEnabled, setAutoObservationEnabled] = useState(() =>
    stabilityEnabled ? loadObservationEnabled(pathname) : false,
  );
  const observationFingerprintRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!stabilityEnabled) {
      return;
    }
    saveStabilityItems(pathname, stabilityItems);
  }, [pathname, stabilityEnabled, stabilityItems]);

  useEffect(() => {
    if (!stabilityEnabled) {
      return;
    }

    saveObservationEnabled(pathname, autoObservationEnabled);
  }, [autoObservationEnabled, pathname, stabilityEnabled]);

  useEffect(() => {
    if (!stabilityEnabled) {
      setAutoObservationEnabled(false);
      setRepairRequests([]);
      return;
    }

    setStabilityItems(loadStabilityItems(pathname));
    setAutoObservationEnabled(loadObservationEnabled(pathname));
    setRepairRequests([]);
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
    if (!stabilityEnabled || !autoObservationEnabled) {
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
      recordObservedStabilityItem,
    });
    // recordObservedStabilityItem is intentionally omitted to avoid re-registering observers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoObservationEnabled, pathname, stabilityEnabled, syncEndpoint]);

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

  const resetStabilityComposer = () => {
    setStabilityDraft(getDefaultStabilityDraft());
    setStabilityEditingId(null);
    setIsStabilityComposerOpen(false);
  };

  const openStabilityComposer = (item?: DevPilotStabilityItem) => {
    if (!item) {
      setStabilityDraft(getDefaultStabilityDraft());
      setStabilityEditingId(null);
      setIsStabilityComposerOpen(true);
      return;
    }

    setStabilityDraft({
      title: item.title,
      severity: item.severity,
      symptom: item.symptom,
      reproSteps: item.reproSteps || "",
      impact: item.impact || "",
      signals: item.signals || "",
      fixGoal: item.fixGoal || "",
    });
    setStabilityEditingId(item.id);
    setStabilityActiveId(item.id);
    setIsStabilityComposerOpen(true);
  };

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
    openAnnotationCount: openAnnotations.length,
    openAnnotationComments: openAnnotations.slice(0, 5).map((annotation) => {
      return `${annotation.elementName}: ${annotation.comment}`;
    }),
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
      openAnnotationCount: currentOpenAnnotations.length,
      openAnnotationComments: currentOpenAnnotations.slice(0, 5).map((annotation) => {
        return `${annotation.elementName}: ${annotation.comment}`;
      }),
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
      if (!stabilityEnabled || !autoObservationEnabled) {
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
      autoObservationEnabled,
      buildObservationContext,
      currentSessionIdRef,
      onNetworkError,
      pathname,
      stabilityEnabled,
      syncEndpoint,
    ],
  );

  const handleCopyStabilityItems = async (items: DevPilotStabilityItem[]) => {
    const payload = createDevPilotStabilityExportPayload({
      items,
      pathname,
      title: document.title || "Untitled Page",
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });
    const text = formatDevPilotStabilityExportMarkdown(payload);
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
        });
        setRepairRequests((current) => mergeRemoteRepairRequests(current, [remoteRequest]));
        succeeded = true;
      } else {
        setRepairRequests((current) => mergeRemoteRepairRequests(current, [localRequest]));
        succeeded = await copyTextToClipboard(prompt);
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
    setStabilityItems((current) =>
      sortStabilityItemsByUpdatedAt(
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: nextStatus,
                updatedAt: nextUpdatedAt,
              }
            : item,
        ),
      ),
    );
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

  const handleSaveStabilityItem = () => {
    if (!stabilityDraft.title.trim() || !stabilityDraft.symptom.trim()) {
      return;
    }

    const now = Date.now();
    const existing = stabilityEditingId
      ? stabilityItems.find((item) => item.id === stabilityEditingId)
      : null;
    const nextItem: DevPilotStabilityItem = {
      id: stabilityEditingId || `sti_${createScopedId("id")}`,
      sessionId: existing?.sessionId || currentSessionId || undefined,
      pathname,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      status: existing?.status || "open",
      severity: isDevPilotStabilitySeverity(stabilityDraft.severity)
        ? stabilityDraft.severity
        : "high",
      title: stabilityDraft.title.trim(),
      symptom: stabilityDraft.symptom.trim(),
      reproSteps: stabilityDraft.reproSteps.trim() || undefined,
      impact: stabilityDraft.impact.trim() || undefined,
      signals: stabilityDraft.signals.trim() || undefined,
      fixGoal: stabilityDraft.fixGoal.trim() || undefined,
      context: buildStabilityContext(),
    };

    setStabilityItems((current) => {
      const next = stabilityEditingId
        ? current.map((item) => (item.id === stabilityEditingId ? nextItem : item))
        : [nextItem, ...current];
      return sortStabilityItemsByUpdatedAt(next);
    });
    setStabilityActiveId(nextItem.id);

    if (syncEndpoint && currentSessionId) {
      const syncPromise = stabilityEditingId
        ? updateRemoteStabilityItem(syncEndpoint, nextItem.id, nextItem)
        : syncRemoteStabilityItem(syncEndpoint, currentSessionId, nextItem);
      syncPromise.catch((error) => {
        const message = "[DevPilot] Failed to sync stability item";
        console.warn(message, error);
        onNetworkError?.(message);
      });
    }

    resetStabilityComposer();
  };

  const handleDeleteStabilityItem = () => {
    if (!stabilityEditingId) {
      resetStabilityComposer();
      return;
    }

    setStabilityItems((current) => current.filter((item) => item.id !== stabilityEditingId));

    if (stabilityActiveId === stabilityEditingId) {
      setStabilityActiveId(null);
    }

    if (syncEndpoint) {
      deleteRemoteStabilityItem(syncEndpoint, stabilityEditingId).catch((error) => {
        const message = "[DevPilot] Failed to delete stability item";
        console.warn(message, error);
        onNetworkError?.(message);
      });
    }

    resetStabilityComposer();
  };

  const handleDeleteStabilityItemRecord = (item: DevPilotStabilityItem) => {
    setStabilityItems((current) => current.filter((entry) => entry.id !== item.id));
    if (stabilityActiveId === item.id) {
      setStabilityActiveId(null);
    }
    if (stabilityEditingId === item.id) {
      resetStabilityComposer();
    }
    if (syncEndpoint) {
      deleteRemoteStabilityItem(syncEndpoint, item.id).catch((error) => {
        const message = "[DevPilot] Failed to delete stability item";
        console.warn(message, error);
        onNetworkError?.(message);
      });
    }
  };

  const handleStabilityDraftChange = (
    field: keyof DevPilotStabilityDraft,
    value: string | DevPilotStabilitySeverity,
  ) => {
    setStabilityDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return {
    stabilityItems,
    setStabilityItems,
    stabilityEditingId,
    setStabilityEditingId,
    stabilityActiveId,
    setStabilityActiveId,
    stabilityDraft,
    setStabilityDraft,
    isStabilityComposerOpen,
    setIsStabilityComposerOpen,
    stabilityCopyState,
    setStabilityCopyState,
    repairRequests,
    setRepairRequests,
    repairTargetId,
    setRepairTargetId,
    repairState,
    setRepairState,
    autoObservationEnabled,
    setAutoObservationEnabled,
    observationFingerprintRef,
    openStabilityItems,
    resolvedStabilityItems,
    activeStabilityItem,
    stabilitySummary,
    activeRepairRequests,
    latestActiveRepairRequest,
    resetStabilityComposer,
    openStabilityComposer,
    buildStabilityContext,
    buildObservationContext,
    recordObservedStabilityItem,
    handleCopyStabilityItems,
    handleRequestStabilityRepair,
    setStabilityItemStatus,
    handleSaveStabilityItem,
    handleDeleteStabilityItem,
    handleDeleteStabilityItemRecord,
    handleStabilityDraftChange,
  };
}
