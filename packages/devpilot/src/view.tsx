import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  HOST_ATTR,
  ROOT_ATTR,
  toRect,
  describeAreaDraftPreview,
} from "./annotation/area-selection";
import { getAnnotationKind } from "./output";
import { I18nProvider, useI18n } from "./i18n";
import { isDevPilotLocale, type DevPilotLocale } from "./i18n/dict";
import { useRemoteSessionSync } from "./hooks/remote-session-sync";
import { useAnnotations } from "./hooks/use-annotations";
import { useStability } from "./hooks/use-stability";
import { useAreaSelection } from "./hooks/use-area-selection";
import { useDrag } from "./hooks/use-drag";
import { useScrollTick } from "./shared/hooks";
import {
  clampFloatingPosition,
  getDefaultFloatingPosition,
} from "./shared/runtime";
import {
  loadFloatingPosition,
  saveFloatingPosition,
  loadStabilityCopilotEnabled,
  saveStabilityCopilotEnabled,
  loadLocale,
  saveLocale,
} from "./storage";
import {
  AnnotateIcon,
  CheckIcon,
  CollapseIcon,
  CopyIcon,
  DevPilotGlyph,
  SettingsIcon,
  StabilityIcon,
} from "./ui/icons";
import { SettingsPanel } from "./ui/settings-panel";
import { StabilityPanel } from "./ui/stability-panel";
import type {
  DevPilotAnnotation,
  DevPilotMode,
  DevPilotMountOptions,
  DevPilotRect,
} from "./types";
import { resolveDevPilotFeatures, isOpenDevPilotAnnotationStatus } from "./types";
import { styles } from "./styles.css";

function stopEditableEventPropagation(event: React.SyntheticEvent<HTMLElement>): void {
  event.stopPropagation();
}

function DevPilotContent({
  defaultOpen = false,
  endpoint,
  features,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
  onStabilityObserved,
  onStabilityStatusChange,
  onSessionCreated,
  onConnectionStateChange,
  onRepairRequest,
}: DevPilotMountOptions) {
  const { t } = useI18n();
  const pathname = window.location.pathname || "/";
  const resolvedFeatures = useMemo(
    () => resolveDevPilotFeatures(features, endpoint),
    [endpoint, features],
  );
  const [stabilityCopilotEnabled, setStabilityCopilotEnabled] = useState(() =>
    loadStabilityCopilotEnabled() ?? resolvedFeatures.stability,
  );
  const syncEndpoint = resolvedFeatures.mcp ? endpoint : undefined;

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [mode, setMode] = useState<DevPilotMode>("annotate");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [floatingPosition, setFloatingPosition] = useState(() =>
    loadFloatingPosition() || getDefaultFloatingPosition(),
  );
  const [networkError, setNetworkError] = useState<string | null>(null);

  useEffect(() => {
    if (!networkError) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => {
      setNetworkError(null);
    }, 3000);
    return () => window.clearTimeout(timeoutId);
  }, [networkError]);

  const toolbarRef = useRef<HTMLDivElement | HTMLButtonElement | null>(null);
  const scrollTick = useScrollTick();
  const annotationsRef = useRef<DevPilotAnnotation[]>([]);
  const currentSessionIdRef = useRef<string | null>(null);


  const annotationsHook = useAnnotations({
    pathname,
    syncEndpoint,
    currentSessionId: null,
    currentSessionIdRef,
    annotationsRef,
    setIsOpen,
    setMode,
    onAnnotationAdd,
    onAnnotationUpdate,
    onAnnotationDelete,
    onNetworkError: setNetworkError,
  });

  const stabilityHook = useStability({
    stabilityEnabled: stabilityCopilotEnabled,
    pathname,
    syncEndpoint,
    currentSessionId: null,
    currentSessionIdRef,
    annotationsRef,
    openAnnotations: annotationsHook.openAnnotations,
    onStabilityObserved,
    onStabilityStatusChange,
    onRepairRequest,
    onNetworkError: setNetworkError,
  });

  const { currentSessionId, sseStatus } = useRemoteSessionSync({
    pathname,
    syncEndpoint,
    stabilityEnabled: stabilityCopilotEnabled,
    annotations: annotationsHook.annotations,
    stabilityItems: stabilityHook.stabilityItems,
    pendingDeletedAnnotationIdsRef: annotationsHook.pendingDeletedAnnotationIdsRef,
    setAnnotations: annotationsHook.setAnnotations,
    setRepairRequests: stabilityHook.setRepairRequests,
    annotationsRef,
    currentSessionIdRef,
    onSessionCreated,
    onConnectionStateChange,
  });

  const openAnnotationsRef = useRef(annotationsHook.openAnnotations);
  openAnnotationsRef.current = annotationsHook.openAnnotations;
  const selectionRef = useRef(annotationsHook.selection);
  selectionRef.current = annotationsHook.selection;

  useEffect(() => {
    let rafId: number;

    const syncPositions = () => {
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      openAnnotationsRef.current.forEach((annotation) => {
        const marker = document.querySelector(
          `[data-devpilot-marker-id="${annotation.id}"]`,
        );
        if (!(marker instanceof HTMLElement)) {
          return;
        }

        let rect: DevPilotRect;
        if (annotation.kind !== "area") {
          try {
            const liveElement = document.querySelector(annotation.elementPath);
            if (
              liveElement instanceof HTMLElement &&
              !liveElement.closest(`[${ROOT_ATTR}]`) &&
              !liveElement.closest(`[${HOST_ATTR}]`)
            ) {
              const liveRect = toRect(liveElement.getBoundingClientRect());
              if (liveRect.width > 0 && liveRect.height > 0) {
                rect = liveRect;
              } else {
                rect = {
                  left: annotation.pageX - scrollX,
                  top: annotation.pageY - scrollY,
                  width: annotation.rect.width,
                  height: annotation.rect.height,
                };
              }
            } else {
              rect = {
                left: annotation.pageX - scrollX,
                top: annotation.pageY - scrollY,
                width: annotation.rect.width,
                height: annotation.rect.height,
              };
            }
          } catch {
            rect = {
              left: annotation.pageX - scrollX,
              top: annotation.pageY - scrollY,
              width: annotation.rect.width,
              height: annotation.rect.height,
            };
          }
        } else {
          rect = {
            left: annotation.pageX - scrollX,
            top: annotation.pageY - scrollY,
            width: annotation.rect.width,
            height: annotation.rect.height,
          };
        }

        const anchoredLeft = rect.left + Math.min(Math.max(rect.width * 0.18, 12), 28);
        const anchoredTop = rect.top - 14;
        marker.style.left = `${Math.max(
          12,
          Number.isFinite(rect.left) ? anchoredLeft : annotation.pageX - scrollX,
        )}px`;
        marker.style.top = `${Math.max(
          12,
          Number.isFinite(rect.top) ? anchoredTop : annotation.pageY - scrollY - 14,
        )}px`;
      });

      const selection = selectionRef.current;
      if (selection) {
        const left = selection.pageX - scrollX;
        const top = selection.pageY - scrollY;
        document.querySelectorAll("[data-devpilot-selection-focus]").forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.left = `${left}px`;
            el.style.top = `${top}px`;
          }
        });
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(syncPositions);
    };

    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const areaSelection = useAreaSelection({
    isOpen,
    mode,
    setSelection: annotationsHook.setSelection,
    setDraft: annotationsHook.setDraft,
    setEditingId: annotationsHook.setEditingId,
    setActiveAnnotationId: annotationsHook.setActiveAnnotationId,
    setIsTextSelectionPending: annotationsHook.setIsTextSelectionPending,
  });

  const drag = useDrag({ setFloatingPosition });

  const {
    annotations: hookAnnotations,
    openAnnotations: hookOpenAnnotations,
    activeAnnotationId: hookActiveAnnotationId,
    setActiveAnnotationId: hookSetActiveAnnotationId,
  } = annotationsHook;

  useEffect(() => {
    const preferredAnnotations =
      hookOpenAnnotations.length > 0 ? hookOpenAnnotations : hookAnnotations;
    if (preferredAnnotations.length === 0) {
      if (hookActiveAnnotationId) {
        hookSetActiveAnnotationId(null);
      }
      return;
    }
    if (
      !hookActiveAnnotationId ||
      !hookAnnotations.some((item) => item.id === hookActiveAnnotationId)
    ) {
      hookSetActiveAnnotationId(preferredAnnotations[0].id);
    }
  }, [
    hookActiveAnnotationId,
    hookAnnotations,
    hookOpenAnnotations,
    hookSetActiveAnnotationId,
  ]);

  useEffect(() => {
    if (!stabilityCopilotEnabled && mode === "stability") {
      setMode("annotate");
    }
  }, [mode, stabilityCopilotEnabled]);

  useEffect(() => {
    const syncPosition = () => {
      const node = toolbarRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      setFloatingPosition((current) =>
        clampFloatingPosition(current, rect.width, rect.height),
      );
    };
    syncPosition();
    window.addEventListener("resize", syncPosition);
    return () => window.removeEventListener("resize", syncPosition);
  }, [isOpen]);

  useEffect(() => {
    saveFloatingPosition(floatingPosition);
  }, [floatingPosition]);

  const resolveLiveAnnotationRect = (annotation: DevPilotAnnotation): DevPilotRect => {
    if (annotation.kind !== "area") {
      try {
        const liveElement = document.querySelector(annotation.elementPath);
        if (
          liveElement instanceof HTMLElement &&
          !liveElement.closest(`[${ROOT_ATTR}]`) &&
          !liveElement.closest(`[${HOST_ATTR}]`)
        ) {
          const liveRect = toRect(liveElement.getBoundingClientRect());
          if (liveRect.width > 0 && liveRect.height > 0) {
            return liveRect;
          }
        }
      } catch {
        // Ignore selector resolution issues and fall back to stored coordinates.
      }
    }
    return {
      left: annotation.pageX - window.scrollX,
      top: annotation.pageY - window.scrollY,
      width: annotation.rect.width,
      height: annotation.rect.height,
    };
  };

  const annotationViewportRects = useMemo(
    () => {
      void scrollTick;
      return new Map(
        annotationsHook.annotations.map((annotation) => [
          annotation.id,
          resolveLiveAnnotationRect(annotation),
        ]),
      );
    },
    [annotationsHook.annotations, scrollTick],
  );

  const getMarkerAnchor = (
    rect: DevPilotRect,
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

  const markerStyle = (annotation: DevPilotAnnotation) =>
    getMarkerAnchor(
      annotationViewportRects.get(annotation.id) || annotation.rect,
      annotation.pageX,
      annotation.pageY,
    );

  const selectionViewportRect = useMemo(() => {
    void scrollTick;
    const s = annotationsHook.selection;
    if (!s) return null;
    return {
      left: s.pageX - window.scrollX,
      top: s.pageY - window.scrollY,
      width: s.rect.width,
      height: s.rect.height,
    };
  }, [annotationsHook.selection, scrollTick]);

  const areaDraftPreview = useMemo(
    () => (areaSelection.areaDraftRect ? describeAreaDraftPreview(areaSelection.areaDraftRect) : null),
    [areaSelection.areaDraftRect],
  );

  const annotationMarkerNumbers = useMemo(() => {
    const orderedByCreation = [...annotationsHook.openAnnotations].sort((a, b) => {
      if (a.createdAt !== b.createdAt) {
        return a.createdAt - b.createdAt;
      }

      if (a.updatedAt !== b.updatedAt) {
        return a.updatedAt - b.updatedAt;
      }

      return a.id.localeCompare(b.id);
    });

    return new Map(
      orderedByCreation.map((annotation, index) => [annotation.id, index + 1]),
    );
  }, [annotationsHook.openAnnotations]);

  const activeFocusAnnotation = null;
  const activeFocusRect = null;

  const togglePanelMode = (nextMode: DevPilotMode) => {
    setIsSettingsOpen(false);
    if (nextMode === "stability" && !stabilityCopilotEnabled) {
      setMode("annotate");
      return;
    }
    setMode((current) => (current === nextMode ? "annotate" : nextMode));
  };

  const toggleSettingsPanel = () => {
    setIsSettingsOpen((current) => !current);
  };

  const isConnectionDisconnected =
    Boolean(syncEndpoint) && sseStatus !== "connected";

  const toolbarRect = toolbarRef.current?.getBoundingClientRect();
  const panelWidth = 392;
  const panelLeft = clampFloatingPosition(
    {
      left: (toolbarRect?.left || floatingPosition.left) + (toolbarRect?.width || 44) - panelWidth,
      top: floatingPosition.top,
    },
    panelWidth,
    0,
  ).left;
  const panelBottom = Math.max(16, window.innerHeight - floatingPosition.top + 12);

  return (
    <div className="dl-root" data-devpilot-root="">
      {isOpen && mode === "annotate" && areaSelection.hoverRect ? (
        <div
          className="dl-highlight"
          style={{
            left: areaSelection.hoverRect.left,
            top: areaSelection.hoverRect.top,
            width: areaSelection.hoverRect.width,
            height: areaSelection.hoverRect.height,
          }}
        />
      ) : null}

      {isOpen && mode === "annotate" && areaSelection.areaDraftRect ? (
        <>
          {areaDraftPreview?.matchRects.map((matchRect, index) => (
            <div
              key={`area-match-${index}`}
              className="dl-area-match"
              style={{
                left: matchRect.left,
                top: matchRect.top,
                width: matchRect.width,
                height: matchRect.height,
              }}
            />
          ))}
          <div
            className="dl-area-draft"
            style={{
              left: areaSelection.areaDraftRect.left,
              top: areaSelection.areaDraftRect.top,
              width: areaSelection.areaDraftRect.width,
              height: areaSelection.areaDraftRect.height,
            }}
          />
          <div
            className="dl-area-draft-size"
            style={{
              left: Math.max(12, areaSelection.areaDraftRect.left),
              top: Math.max(12, areaSelection.areaDraftRect.top - 34),
            }}
          >
            {Math.round(areaSelection.areaDraftRect.width)}×
            {Math.round(areaSelection.areaDraftRect.height)}
            {areaDraftPreview?.matchCount ? ` · ${areaDraftPreview.matchCount} ${t("area.elements")}` : ""}
          </div>
        </>
      ) : null}

      {selectionViewportRect && annotationsHook.selection?.kind === "area" ? (
        <div
          className="dl-area-selection-focus"
          data-devpilot-selection-focus=""
          style={{
            left: selectionViewportRect.left,
            top: selectionViewportRect.top,
            width: selectionViewportRect.width,
            height: selectionViewportRect.height,
          }}
        />
      ) : null}

      {selectionViewportRect && annotationsHook.selection?.kind === "text" ? (
        <div
          className="dl-text-selection-focus"
          data-devpilot-selection-focus=""
          style={{
            left: selectionViewportRect.left,
            top: selectionViewportRect.top,
            width: selectionViewportRect.width,
            height: selectionViewportRect.height,
          }}
        />
      ) : null}

      {annotationsHook.openAnnotations.map((annotation) => (
        <button
          key={annotation.id}
          className="dl-marker"
          data-devpilot-marker-id={annotation.id}
          data-kind={getAnnotationKind(annotation)}
          data-status={annotation.status}
          style={markerStyle(annotation)}
          onClick={() => annotationsHook.openAnnotationEditor(annotation)}
          title={annotation.comment}
        >
          {getAnnotationKind(annotation) === "area" ? (
            <>
              <svg viewBox="0 0 12 12" aria-hidden="true" className="dl-marker-icon">
                <rect
                  x="1.25"
                  y="1.25"
                  width="9.5"
                  height="9.5"
                  rx="2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M3 3h2M7 3h2M3 6h6M3 9h2M7 9h2"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="dl-marker-label">
                {annotationMarkerNumbers.get(annotation.id) || 1}
              </span>
            </>
          ) : (
            annotationMarkerNumbers.get(annotation.id) || 1
          )}
        </button>
      ))}

      {annotationsHook.selection && annotationsHook.pendingMarkerStyle && !annotationsHook.editingId ? (
        <button
          className="dl-marker"
          data-kind={annotationsHook.selection.kind}
          data-pending="true"
          style={annotationsHook.pendingMarkerStyle}
          title={
            annotationsHook.selection.kind === "area" ? t("area.pendingArea") : t("area.pending")
          }
        >
          {annotationsHook.selection.kind === "area" ? (
            <>
              <svg viewBox="0 0 12 12" aria-hidden="true" className="dl-marker-icon">
                <rect
                  x="1.25"
                  y="1.25"
                  width="9.5"
                  height="9.5"
                  rx="2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M3 3h2M7 3h2M3 6h6M3 9h2M7 9h2"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="dl-marker-label">
                {annotationsHook.selection.matchCount ||
                  annotationsHook.selection.relatedElements?.length ||
                  1}
              </span>
            </>
          ) : (
            "+"
          )}
        </button>
      ) : null}

      {annotationsHook.selection && annotationsHook.popupPosition ? (
        <div
          className="dl-popup"
          style={{ left: annotationsHook.popupPosition.left, top: annotationsHook.popupPosition.top }}
        >
          <div className="dl-popup-header">
            <h3 className="dl-popup-title">
              {annotationsHook.editingId
                ? t("popup.editAnnotation")
                : annotationsHook.selection.kind === "area"
                  ? t("popup.addAreaAnnotation")
                  : t("popup.addAnnotation")}
            </h3>
            <span className="dl-popup-hint">{t("popup.keyboardHint")}</span>
          </div>
          <span className="dl-popup-section-label">
            {annotationsHook.selection.kind === "area"
              ? `${t("popup.selectedArea")} · ${annotationsHook.selection.matchCount || annotationsHook.selection.relatedElements?.length || 0} ${t("popup.elementCount")}`
              : t("popup.currentElement")}
          </span>
          <p className="dl-popup-meta">
            {annotationsHook.selection.elementName}
            <br />
            {annotationsHook.selection.elementPath}
          </p>
          {annotationsHook.selection.selectedText ? (
            <div className="dl-popup-quote">{annotationsHook.selection.selectedText}</div>
          ) : null}
          {annotationsHook.selection.kind === "area" &&
          annotationsHook.selection.relatedElements?.length ? (
            <div className="dl-detail-chip-list">
              {annotationsHook.selection.relatedElements.map((item) => (
                <span key={item} className="dl-detail-chip">
                  {item}
                </span>
              ))}
            </div>
          ) : null}
          <textarea
            ref={annotationsHook.popupRef}
            className="dl-popup-textarea"
            placeholder={
              annotationsHook.selection.kind === "area"
                ? t("popup.placeholderArea")
                : t("popup.placeholderElement")
            }
            value={annotationsHook.draft}
            onChange={(event) => annotationsHook.setDraft(event.target.value)}
            onBeforeInput={stopEditableEventPropagation}
            onCompositionStart={stopEditableEventPropagation}
            onCompositionUpdate={stopEditableEventPropagation}
            onCompositionEnd={stopEditableEventPropagation}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Escape") {
                annotationsHook.setSelection(null);
                annotationsHook.setEditingId(null);
                annotationsHook.setDraft("");
              }
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                annotationsHook.handleSave();
              }
            }}
            onKeyUp={stopEditableEventPropagation}
            onPaste={stopEditableEventPropagation}
          />
          <div className="dl-popup-actions">
            <div className="dl-popup-actions-left">
              <button
                className="dl-popup-action"
                data-kind="ghost"
                onClick={() => {
                  annotationsHook.setSelection(null);
                  annotationsHook.setEditingId(null);
                  annotationsHook.setDraft("");
                }}
              >
                {t("popup.cancel")}
              </button>
              {annotationsHook.editingId ? (
                <button
                  className="dl-popup-action"
                  data-kind="danger"
                  onClick={annotationsHook.handleDelete}
                >
                  {t("popup.delete")}
                </button>
              ) : null}
            </div>
            <div className="dl-popup-actions-right">
              <button
                className="dl-popup-action"
                data-kind="primary"
                onClick={annotationsHook.handleSave}
              >
                {annotationsHook.editingId ? t("popup.save") : t("popup.add")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isOpen && isSettingsOpen ? (
        <SettingsPanel
          panelLeft={panelLeft}
          panelBottom={panelBottom}
          syncEndpoint={syncEndpoint}
          sessionId={currentSessionId}
          sseStatus={sseStatus}
          stabilityCopilotEnabled={stabilityCopilotEnabled}
          onToggleStabilityCopilot={() => {
            setStabilityCopilotEnabled((current) => {
              const next = !current;
              saveStabilityCopilotEnabled(next);
              return next;
            });
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      ) : null}

      {isOpen ? (
        <div
          ref={(node) => {
            toolbarRef.current = node;
          }}
          className="dl-toolbar"
          style={{ left: floatingPosition.left, top: floatingPosition.top }}
        >
          <span
            className="dl-drag-handle"
            onPointerDown={(event) => {
              const node = toolbarRef.current;
              if (!node) return;
              drag.startDragging(event, node.getBoundingClientRect());
            }}
            title={t("toolbar.dragHandle")}
          >
            <DevPilotGlyph />
          </span>
          <button
            className="dl-toolbar-icon-button"
            data-active={!isSettingsOpen && mode === "annotate"}
            onClick={() => {
              setIsSettingsOpen(false);
              setMode("annotate");
            }}
          >
            <AnnotateIcon />
            {annotationsHook.summary.open > 0 ? (
              <span className="dl-toolbar-count">{annotationsHook.summary.open}</span>
            ) : null}
          </button>
          {stabilityCopilotEnabled ? (
            <button
              className="dl-toolbar-icon-button"
              data-active={!isSettingsOpen && mode === "stability"}
              onClick={() => togglePanelMode("stability")}
            >
              <StabilityIcon />
              {stabilityHook.openStabilityItems.length > 0 ? (
                <span className="dl-toolbar-count">
                  {stabilityHook.openStabilityItems.length}
                </span>
              ) : null}
            </button>
          ) : null}
          <button
            className="dl-toolbar-icon-button"
            data-kind="secondary"
            data-copied={annotationsHook.copyState === "copied"}
            disabled={annotationsHook.openAnnotations.length === 0 && stabilityHook.openStabilityItems.length === 0}
            onClick={() => {
              void annotationsHook.handleCopyTaskPacket(stabilityHook.openStabilityItems);
            }}
            title={annotationsHook.copyState === "copied" ? t("toolbar.copied") : t("toolbar.copyToAI")}
          >
            {annotationsHook.copyState === "copied" ? <CheckIcon /> : <CopyIcon />}
          </button>
          <button
            className="dl-toolbar-icon-button"
            data-kind="secondary"
            data-active={isSettingsOpen}
            onClick={toggleSettingsPanel}
            title={isConnectionDisconnected ? t("toolbar.connectionLost") : t("toolbar.settings")}
          >
            <SettingsIcon />
            {isConnectionDisconnected ? (
              <span className="dl-toolbar-dot" aria-hidden="true" />
            ) : null}
          </button>
          <div className="dl-toolbar-divider" />
          <button
            className="dl-toolbar-icon-button"
            data-kind="secondary"
            onClick={() => {
              setIsSettingsOpen(false);
              setIsOpen(false);
            }}
            title={t("toolbar.collapse")}
          >
            <CollapseIcon />
          </button>
        </div>
      ) : (
        <button
          ref={(node) => {
            toolbarRef.current = node;
          }}
          className="dl-launcher"
          style={{ left: floatingPosition.left, top: floatingPosition.top }}
          onClick={() => {
            if (drag.suppressLauncherClickRef.current) {
              drag.resetSuppressLauncherClick();
              return;
            }
            setIsOpen(true);
          }}
          onPointerDown={(event) => {
            const node = toolbarRef.current;
            if (!node) return;
            drag.startDragging(event, node.getBoundingClientRect());
          }}
          title={t("toolbar.openDevPilot")}
        >
          <DevPilotGlyph />
          {annotationsHook.summary.open + stabilityHook.openStabilityItems.length > 0 ? (
            <span className="dl-launcher-badge">
              {annotationsHook.summary.open + stabilityHook.openStabilityItems.length}
            </span>
          ) : null}
        </button>
      )}

      {networkError ? (
        <div
          className="dl-network-toast"
          style={{
            position: "fixed",
            left: floatingPosition.left,
            top: Math.max(8, floatingPosition.top - 40),
            zIndex: 2147483601,
          }}
        >
          {networkError}
        </div>
      ) : null}

      {stabilityCopilotEnabled && isOpen && !isSettingsOpen && mode === "stability" ? (
        <StabilityPanel
          panelLeft={panelLeft}
          panelBottom={panelBottom}
          openStabilityItems={stabilityHook.openStabilityItems}
          stabilityActiveId={stabilityHook.stabilityActiveId}
          activeStabilityItem={stabilityHook.activeStabilityItem}
          onClose={() => setMode("annotate")}
          onSelectStabilityItem={stabilityHook.setStabilityActiveId}
          onCopyStabilityItem={(item) => {
            void stabilityHook.handleCopyStabilityItems([item]);
          }}
        />
      ) : null}
    </div>
  );
}

export function createDevPilotStyleElement(): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = styles;
  return style;
}

function DevPilotApp({ locale: propLocale, ...props }: DevPilotMountOptions) {
  const [locale, setLocale] = useState<DevPilotLocale>(() => {
    if (isDevPilotLocale(propLocale)) return propLocale;
    const saved = loadLocale();
    return isDevPilotLocale(saved) ? saved : "zh-CN";
  });

  useEffect(() => {
    if (isDevPilotLocale(propLocale) && propLocale !== locale) {
      setLocale(propLocale);
    }
  }, [propLocale]);

  useEffect(() => {
    saveLocale(locale);
  }, [locale]);

  return (
    <I18nProvider locale={locale} setLocale={setLocale}>
      <DevPilotContent {...props} />
    </I18nProvider>
  );
}

export function DevPilotShell(props: DevPilotMountOptions) {
  return <DevPilotApp {...props} />;
}
