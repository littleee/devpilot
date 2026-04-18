import React, { useEffect, useMemo, useRef, useState } from "react";
import { sortAnnotationsByUpdatedAt } from "../annotation/state";
import {
  copyTextToClipboard,
  createId,
  ensurePopupPositionFromPoint,
} from "../shared/runtime";
import { loadAnnotations, saveAnnotations } from "../storage";
import {
  deleteRemoteAnnotation,
  syncRemoteAnnotation,
  updateRemoteAnnotation,
} from "../sync";
import type {
  DevPilotAnnotation,
  DevPilotAnnotationStatus,
  DevPilotMode,
  DevPilotSelection,
} from "../types";
import { isOpenDevPilotAnnotationStatus } from "../types";

export interface UseAnnotationsOptions {
  pathname: string;
  syncEndpoint: string | undefined;
  currentSessionId: string | null;
  currentSessionIdRef: React.MutableRefObject<string | null>;
  annotationsRef: React.MutableRefObject<DevPilotAnnotation[]>;
  setIsOpen: (v: boolean) => void;
  setMode: (mode: DevPilotMode) => void;
  onAnnotationAdd?: (annotation: DevPilotAnnotation) => void;
  onAnnotationUpdate?: (annotation: DevPilotAnnotation) => void;
  onAnnotationDelete?: (annotationId: string) => void;
  onNetworkError?: (message: string) => void;
}

export function useAnnotations(options: UseAnnotationsOptions) {
  const {
    pathname,
    syncEndpoint,
    currentSessionId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    currentSessionIdRef,
    annotationsRef,
    setIsOpen,
    setMode,
    onAnnotationAdd,
    onAnnotationUpdate,
    onAnnotationDelete,
    onNetworkError,
  } = options;

  const [annotations, setAnnotations] = useState<DevPilotAnnotation[]>(() =>
    loadAnnotations(pathname),
  );
  const [selection, setSelection] = useState<DevPilotSelection | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [isTextSelectionPending, setIsTextSelectionPending] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const popupRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingDeletedAnnotationIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    saveAnnotations(pathname, annotations);
  }, [annotations, pathname]);

  useEffect(() => {
    if (copyState === "idle") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyState("idle");
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyState]);

  useEffect(() => {
    if (selection && popupRef.current) {
      popupRef.current.focus();
    }
  }, [selection]);

  const openAnnotations = useMemo(
    () => annotations.filter((item) => isOpenDevPilotAnnotationStatus(item.status)),
    [annotations],
  );

  const activeAnnotation = useMemo(
    () => annotations.find((item) => item.id === activeAnnotationId) || null,
    [annotations, activeAnnotationId],
  );

  const summary = useMemo(() => {
    return {
      open: openAnnotations.length,
      acknowledged: annotations.filter((item) => item.status === "acknowledged").length,
      total: annotations.length,
    };
  }, [annotations, openAnnotations]);

  const getMarkerAnchor = (
    rect: { left: number; top: number; width: number; height: number },
    pageX: number,
    pageY: number,
  ): { left: number; top: number } => {
    const anchoredLeft = rect.left + Math.min(Math.max(rect.width * 0.18, 12), 28);
    const anchoredTop = rect.top - 14;

    return {
      left: Math.max(12, Number.isFinite(rect.left) ? anchoredLeft : pageX - window.scrollX),
      top: Math.max(12, Number.isFinite(rect.top) ? anchoredTop : pageY - window.scrollY - 14),
    };
  };

  const pendingMarkerStyle = selection
    ? getMarkerAnchor(selection.rect, selection.pageX, selection.pageY)
    : null;

  const popupPosition = selection
    ? ensurePopupPositionFromPoint(selection.pageX, selection.pageY, 320, 280)
    : null;

  const editAnnotation = (annotation: DevPilotAnnotation) => {
    setSelection({
      kind: annotation.selectedText
        ? "text"
        : annotation.relatedElements?.length
          ? "area"
          : "element",
      elementName: annotation.elementName,
      elementPath: annotation.elementPath,
      rect: annotation.rect,
      pageX: annotation.pageX,
      pageY: annotation.pageY,
      matchCount: annotation.matchCount,
      selectedText: annotation.selectedText,
      nearbyText: annotation.nearbyText,
      relatedElements: annotation.relatedElements,
      context: annotation.context,
    });
    setDraft(annotation.comment);
    setEditingId(annotation.id);
    setActiveAnnotationId(annotation.id);
  };

  const openAnnotationEditor = (annotation: DevPilotAnnotation) => {
    setIsOpen(true);
    setMode("annotate");
    editAnnotation(annotation);
  };

  const setAnnotationStatus = (
    annotationId: string,
    nextStatus: DevPilotAnnotationStatus,
  ) => {
    if (!isOpenDevPilotAnnotationStatus(nextStatus)) {
      pendingDeletedAnnotationIdsRef.current.add(annotationId);
      annotationsRef.current = annotationsRef.current.filter(
        (item) => item.id !== annotationId,
      );
      setAnnotations((current) => current.filter((item) => item.id !== annotationId));
      if (activeAnnotationId === annotationId) {
        setActiveAnnotationId(null);
      }
      if (editingId === annotationId) {
        setSelection(null);
        setEditingId(null);
        setDraft("");
      }

      onAnnotationDelete?.(annotationId);

      if (syncEndpoint) {
        deleteRemoteAnnotation(syncEndpoint, annotationId).catch((error) => {
          pendingDeletedAnnotationIdsRef.current.delete(annotationId);
          const message = "[DevPilot] Failed to delete resolved annotation";
          console.warn(message, error);
          onNetworkError?.(message);
        });
      }
      return;
    }

    const nextUpdatedAt = Date.now();
    let updatedAnnotation: DevPilotAnnotation | null = null;
    setAnnotations((current) =>
      current.map((item) => {
        if (item.id === annotationId) {
          updatedAnnotation = { ...item, status: nextStatus, updatedAt: nextUpdatedAt };
          return updatedAnnotation;
        }
        return item;
      }),
    );
    if (updatedAnnotation) {
      onAnnotationUpdate?.(updatedAnnotation);
    }
    setActiveAnnotationId(annotationId);

    if (syncEndpoint) {
      updateRemoteAnnotation(syncEndpoint, annotationId, {
        status: nextStatus,
        updatedAt: nextUpdatedAt,
      }).catch((error) => {
        const message = "[DevPilot] Failed to update annotation status";
        console.warn(message, error);
        onNetworkError?.(message);
      });
    }
  };

  const removeAnnotationRecord = (annotationId: string) => {
    pendingDeletedAnnotationIdsRef.current.add(annotationId);
    annotationsRef.current = annotationsRef.current.filter(
      (item) => item.id !== annotationId,
    );
    setAnnotations((current) => current.filter((item) => item.id !== annotationId));
    onAnnotationDelete?.(annotationId);

    if (activeAnnotationId === annotationId) {
      setActiveAnnotationId(null);
    }

    if (editingId === annotationId) {
      setSelection(null);
      setEditingId(null);
      setDraft("");
    }

    if (syncEndpoint) {
      deleteRemoteAnnotation(syncEndpoint, annotationId).catch((error) => {
        pendingDeletedAnnotationIdsRef.current.delete(annotationId);
        const message = "[DevPilot] Failed to delete annotation";
        console.warn(message, error);
        onNetworkError?.(message);
      });
    }
  };

  const buildAnnotationTaskPacketText = async () => {
    const { createDevPilotTaskPacket, formatDevPilotTaskPacketMarkdown } = await import("../task-packet");
    const packet = createDevPilotTaskPacket({
      type: "annotation",
      taskTitle: `Fix ${openAnnotations.length} annotation${openAnnotations.length === 1 ? "" : "s"} on ${pathname}`,
      description: `There are ${openAnnotations.length} open annotation(s) on this page that need attention.`,
      desiredOutcome: "All open annotations are addressed with minimal safe code changes.",
      annotations: openAnnotations,
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
    return formatDevPilotTaskPacketMarkdown(packet);
  };

  const handleCopyAnnotations = async () => {
    const text = await buildAnnotationTaskPacketText();
    const didCopy = await copyTextToClipboard(text);
    setCopyState(didCopy ? "copied" : "failed");
  };

  const handleCopyTaskPacket = async () => {
    const text = await buildAnnotationTaskPacketText();
    const didCopy = await copyTextToClipboard(text);
    setCopyState(didCopy ? "copied" : "failed");
  };

  const handleSave = () => {
    if (!selection || !draft.trim()) {
      return;
    }

    const now = Date.now();
    if (editingId) {
      const existing = annotations.find((item) => item.id === editingId);
      const updatedAnnotation: DevPilotAnnotation = {
        id: editingId,
        pathname,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        kind: selection.kind,
        status: existing?.status || "pending",
        comment: draft.trim(),
        elementName: selection.elementName,
        elementPath: selection.elementPath,
        matchCount: selection.matchCount,
        selectedText: selection.selectedText,
        nearbyText: selection.nearbyText,
        relatedElements: selection.relatedElements,
        pageX: selection.pageX,
        pageY: selection.pageY,
        rect: selection.rect,
        context: selection.context,
      };

      setAnnotations((current) =>
        current.map((item) => (item.id === editingId ? updatedAnnotation : item)),
      );
      setActiveAnnotationId(editingId);
      onAnnotationUpdate?.(updatedAnnotation);

      if (syncEndpoint) {
        updateRemoteAnnotation(syncEndpoint, editingId, updatedAnnotation).catch((error) => {
          const message = "[DevPilot] Failed to update annotation";
          console.warn(message, error);
          onNetworkError?.(message);
        });
      }
    } else {
      const annotation: DevPilotAnnotation = {
        id: createId(),
        pathname,
        createdAt: now,
        updatedAt: now,
        kind: selection.kind,
        status: "pending",
        comment: draft.trim(),
        elementName: selection.elementName,
        elementPath: selection.elementPath,
        matchCount: selection.matchCount,
        selectedText: selection.selectedText,
        nearbyText: selection.nearbyText,
        relatedElements: selection.relatedElements,
        pageX: selection.pageX,
        pageY: selection.pageY,
        rect: selection.rect,
        context: selection.context,
      };
      setAnnotations((current) => sortAnnotationsByUpdatedAt([annotation, ...current]));
      setActiveAnnotationId(annotation.id);
      onAnnotationAdd?.(annotation);

      if (syncEndpoint && currentSessionId) {
        syncRemoteAnnotation(syncEndpoint, currentSessionId, annotation).catch((error) => {
          const message = "[DevPilot] Failed to create remote annotation";
          console.warn(message, error);
          onNetworkError?.(message);
        });
      }
    }

    setSelection(null);
    setEditingId(null);
    setDraft("");
  };

  const handleDelete = () => {
    if (!editingId) {
      setSelection(null);
      setDraft("");
      return;
    }

    removeAnnotationRecord(editingId);
    setSelection(null);
    setEditingId(null);
    setDraft("");
  };

  const handleDeleteAnnotationRecord = (annotation: DevPilotAnnotation) => {
    removeAnnotationRecord(annotation.id);
  };

  return {
    annotations,
    setAnnotations,
    selection,
    setSelection,
    editingId,
    setEditingId,
    draft,
    setDraft,
    activeAnnotationId,
    setActiveAnnotationId,
    isTextSelectionPending,
    setIsTextSelectionPending,
    copyState,
    setCopyState,
    popupRef,
    pendingDeletedAnnotationIdsRef,
    openAnnotations,
    activeAnnotation,
    summary,
    pendingMarkerStyle,
    popupPosition,
    editAnnotation,
    openAnnotationEditor,
    setAnnotationStatus,
    removeAnnotationRecord,
    handleCopyAnnotations,
    handleCopyTaskPacket,
    handleSave,
    handleDelete,
    handleDeleteAnnotationRecord,
  };
}
