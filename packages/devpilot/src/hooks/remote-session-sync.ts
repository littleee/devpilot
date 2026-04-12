import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

import { mergeRemoteAnnotations } from "../annotation/state";
import { mergeRemoteRepairRequests } from "../repair/state";
import { mergeRemoteStabilityItems } from "../stability/state";
import { clearSessionId, loadSessionId, saveSessionId } from "../storage";
import {
  deleteRemoteAnnotation,
  ensureRemoteSession,
  getRemoteSession,
  syncRemoteAnnotation,
  syncRemoteStabilityItem,
  updateRemoteAnnotation,
  updateRemoteStabilityItem,
} from "../sync";
import type {
  DevPilotAnnotation,
  DevPilotRepairRequestRecord,
  DevPilotStabilityItem,
} from "../types";
import { isOpenDevPilotAnnotationStatus } from "../types";

const SESSION_EVENT_TYPES = [
  "session.created",
  "session.updated",
  "annotation.created",
  "annotation.updated",
  "annotation.deleted",
  "stability.created",
  "stability.updated",
  "stability.deleted",
  "repair-request.created",
  "repair-request.updated",
  "thread.message",
] as const;

type UseRemoteSessionSyncArgs = {
  pathname: string;
  syncEndpoint?: string;
  stabilityEnabled: boolean;
  annotations: DevPilotAnnotation[];
  stabilityItems: DevPilotStabilityItem[];
  pendingDeletedAnnotationIdsRef: MutableRefObject<Set<string>>;
  setAnnotations: Dispatch<SetStateAction<DevPilotAnnotation[]>>;
  setStabilityItems: Dispatch<SetStateAction<DevPilotStabilityItem[]>>;
  setRepairRequests: Dispatch<SetStateAction<DevPilotRepairRequestRecord[]>>;
};

type UseRemoteSessionSyncResult = {
  currentSessionId: string | null;
  currentSessionIdRef: MutableRefObject<string | null>;
  annotationsRef: MutableRefObject<DevPilotAnnotation[]>;
  sseStatus: "disabled" | "connecting" | "connected" | "reconnecting";
};

function mergeIfChanged<T>(current: T[], next: T[]): T[] {
  return JSON.stringify(next) === JSON.stringify(current) ? current : next;
}

export function useRemoteSessionSync({
  pathname,
  syncEndpoint,
  stabilityEnabled,
  annotations,
  stabilityItems,
  pendingDeletedAnnotationIdsRef,
  setAnnotations,
  setStabilityItems,
  setRepairRequests,
}: UseRemoteSessionSyncArgs): UseRemoteSessionSyncResult {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() =>
    loadSessionId(pathname),
  );
  const [sseStatus, setSseStatus] = useState<
    "disabled" | "connecting" | "connected" | "reconnecting"
  >(syncEndpoint ? "connecting" : "disabled");
  const annotationsRef = useRef<DevPilotAnnotation[]>(annotations);
  const stabilityItemsRef = useRef<DevPilotStabilityItem[]>(stabilityItems);
  const currentSessionIdRef = useRef<string | null>(currentSessionId);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  useEffect(() => {
    stabilityItemsRef.current = stabilityItems;
  }, [stabilityItems]);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    if (!syncEndpoint) {
      setSseStatus("disabled");
      clearSessionId(pathname);
      setCurrentSessionId(null);
      setRepairRequests([]);
      return;
    }

    setSseStatus("connecting");
    let cancelled = false;

    ensureRemoteSession(syncEndpoint, {
      pageKey: `${window.location.origin}${pathname}`,
      pathname,
      url: window.location.href,
      title: document.title || pathname,
    })
      .then((session) => {
        if (cancelled) {
          return;
        }

        setCurrentSessionId(session.id);
        saveSessionId(pathname, session.id);
      })
      .catch((error) => {
        console.warn("[DevPilot] Failed to ensure remote session:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, setRepairRequests, syncEndpoint]);

  useEffect(() => {
    if (!syncEndpoint || !currentSessionId) {
      return;
    }

    setSseStatus("connecting");
    let cancelled = false;
    let syncing = false;
    let queuedRefresh = false;
    let shouldPushLocalChanges = false;
    let eventSource: EventSource | null = null;
    let fallbackIntervalId: number | null = null;

    const applyRemoteSession = (
      remoteSession: Awaited<ReturnType<typeof getRemoteSession>>,
    ) => {
      const deletedAnnotationIds = pendingDeletedAnnotationIdsRef.current;
      const visibleRemoteAnnotations = remoteSession.annotations.filter(
        (annotation) =>
          isOpenDevPilotAnnotationStatus(annotation.status) &&
          !deletedAnnotationIds.has(annotation.id),
      );

      for (const deletedAnnotationId of Array.from(deletedAnnotationIds)) {
        if (!remoteSession.annotations.some((annotation) => annotation.id === deletedAnnotationId)) {
          deletedAnnotationIds.delete(deletedAnnotationId);
        }
      }

      setAnnotations((current) =>
        mergeIfChanged(current, mergeRemoteAnnotations(current, visibleRemoteAnnotations)),
      );

      if (stabilityEnabled) {
        setStabilityItems((current) =>
          mergeIfChanged(current, mergeRemoteStabilityItems(current, remoteSession.stabilityItems)),
        );
      }

      setRepairRequests((current) =>
        mergeIfChanged(current, mergeRemoteRepairRequests(current, remoteSession.repairRequests || [])),
      );
    };

    const pushLocalChangesToRemote = async (
      remoteSession: Awaited<ReturnType<typeof getRemoteSession>>,
    ) => {
      const deletedAnnotationIds = pendingDeletedAnnotationIdsRef.current;
      const localAnnotationsSnapshot = annotationsRef.current.filter(
        (annotation) =>
          isOpenDevPilotAnnotationStatus(annotation.status) &&
          !deletedAnnotationIds.has(annotation.id),
      );
      const localStabilitySnapshot = stabilityItemsRef.current;
      const remoteAnnotationsById = new Map(
        remoteSession.annotations.map((annotation) => [annotation.id, annotation]),
      );
      const remoteStabilityById = new Map(
        remoteSession.stabilityItems.map((item) => [item.id, item]),
      );

      let pushedLocalChanges = false;

      for (const annotation of localAnnotationsSnapshot) {
        const remote = remoteAnnotationsById.get(annotation.id);
        if (!remote) {
          await syncRemoteAnnotation(syncEndpoint, currentSessionId, annotation);
          pushedLocalChanges = true;
          continue;
        }

        if (
          isOpenDevPilotAnnotationStatus(remote.status) &&
          annotation.updatedAt > remote.updatedAt
        ) {
          await updateRemoteAnnotation(syncEndpoint, annotation.id, annotation);
          pushedLocalChanges = true;
        }
      }

      for (const remoteAnnotation of remoteSession.annotations) {
        if (!deletedAnnotationIds.has(remoteAnnotation.id)) {
          continue;
        }

        await deleteRemoteAnnotation(syncEndpoint, remoteAnnotation.id).catch((error) => {
          console.warn("[DevPilot] Failed to reconcile deleted annotation:", error);
        });
        pushedLocalChanges = true;
      }

      if (stabilityEnabled) {
        for (const item of localStabilitySnapshot) {
          const remote = remoteStabilityById.get(item.id);
          if (!remote) {
            await syncRemoteStabilityItem(syncEndpoint, currentSessionId, item);
            pushedLocalChanges = true;
            continue;
          }

          if (item.updatedAt > remote.updatedAt) {
            await updateRemoteStabilityItem(syncEndpoint, item.id, item);
            pushedLocalChanges = true;
          }
        }
      }

      if (!pushedLocalChanges) {
        return remoteSession;
      }

      return getRemoteSession(syncEndpoint, currentSessionId);
    };

    const refreshSession = async (pushLocal = false) => {
      shouldPushLocalChanges = shouldPushLocalChanges || pushLocal;
      if (syncing) {
        queuedRefresh = true;
        return;
      }

      syncing = true;

      try {
        let remoteSession = await getRemoteSession(syncEndpoint, currentSessionId);
        if (cancelled) {
          return;
        }

        if (shouldPushLocalChanges) {
          shouldPushLocalChanges = false;
          remoteSession = await pushLocalChangesToRemote(remoteSession);
          if (cancelled) {
            return;
          }
        }

        applyRemoteSession(remoteSession);
      } catch (error) {
        console.warn("[DevPilot] Failed to sync DevPilot session state:", error);
      } finally {
        syncing = false;

        if (!cancelled && queuedRefresh) {
          queuedRefresh = false;
          void refreshSession(false);
        }
      }
    };

    void refreshSession(true);

    if (typeof EventSource !== "undefined") {
      eventSource = new EventSource(
        `${syncEndpoint}/sessions/${currentSessionId}/events`,
      );

      eventSource.onopen = () => {
        setSseStatus("connected");
      };

      const handleStreamEvent = () => {
        void refreshSession(false);
      };

      SESSION_EVENT_TYPES.forEach((eventType) => {
        eventSource?.addEventListener(eventType, handleStreamEvent);
      });

      eventSource.onerror = () => {
        setSseStatus("reconnecting");
        // Let the browser auto-reconnect; we only refresh local state opportunistically.
        void refreshSession(false);
      };
    } else {
      fallbackIntervalId = window.setInterval(() => {
        void refreshSession(false);
      }, 2500);
    }

    return () => {
      cancelled = true;
      eventSource?.close();
      if (fallbackIntervalId !== null) {
        window.clearInterval(fallbackIntervalId);
      }
    };
  }, [
    currentSessionId,
    setAnnotations,
    setRepairRequests,
    setStabilityItems,
    stabilityEnabled,
    syncEndpoint,
  ]);

  return {
    currentSessionId,
    currentSessionIdRef,
    annotationsRef,
    sseStatus,
  };
}
