import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  HOST_ATTR,
  ROOT_ATTR,
  toRect,
  describeAreaDraftPreview,
} from "./annotation/area-selection";
import { getAnnotationKind } from "./output";
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
import { loadFloatingPosition, saveFloatingPosition } from "./storage";
import {
  AnnotateIcon,
  CollapseIcon,
  DevPilotGlyph,
  SettingsIcon,
  SessionIcon,
  StabilityIcon,
} from "./ui/icons";
import { SettingsPanel } from "./ui/settings-panel";
import { SessionPanel } from "./ui/session-panel";
import { StabilityPanel } from "./ui/stability-panel";
import type {
  DevPilotAnnotation,
  DevPilotMode,
  DevPilotMountOptions,
  DevPilotRect,
} from "./types";
import { resolveDevPilotFeatures } from "./types";
import { styles } from "./styles.css";

function stopEditableEventPropagation(event: React.SyntheticEvent<HTMLElement>): void {
  event.stopPropagation();
}

function DevPilotApp({
  defaultOpen = false,
  endpoint,
  features,
  onRepairRequest,
}: DevPilotMountOptions) {
  const pathname = window.location.pathname || "/";
  const resolvedFeatures = useMemo(
    () => resolveDevPilotFeatures(features, endpoint),
    [endpoint, features],
  );
  const stabilityEnabled = resolvedFeatures.stability;
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
    onNetworkError: setNetworkError,
  });

  const stabilityHook = useStability({
    stabilityEnabled,
    pathname,
    syncEndpoint,
    currentSessionId: null,
    currentSessionIdRef,
    annotationsRef,
    openAnnotations: annotationsHook.openAnnotations,
    onRepairRequest,
    onNetworkError: setNetworkError,
  });

  const { currentSessionId, sseStatus } = useRemoteSessionSync({
    pathname,
    syncEndpoint,
    stabilityEnabled,
    annotations: annotationsHook.annotations,
    stabilityItems: stabilityHook.stabilityItems,
    pendingDeletedAnnotationIdsRef: annotationsHook.pendingDeletedAnnotationIdsRef,
    setAnnotations: annotationsHook.setAnnotations,
    setStabilityItems: stabilityHook.setStabilityItems,
    setRepairRequests: stabilityHook.setRepairRequests,
    annotationsRef,
    currentSessionIdRef,
  });

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
    if (mode !== "session") {
      return;
    }
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
    mode,
  ]);

  useEffect(() => {
    if (!stabilityEnabled && mode === "stability") {
      setMode("annotate");
    }
  }, [mode, stabilityEnabled]);

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

  const areaDraftPreview = useMemo(
    () => (areaSelection.areaDraftRect ? describeAreaDraftPreview(areaSelection.areaDraftRect) : null),
    [areaSelection.areaDraftRect],
  );

  const activeFocusAnnotation =
    !annotationsHook.selection && isOpen && mode === "session"
      ? annotationsHook.activeAnnotation
      : null;
  const activeFocusRect =
    activeFocusAnnotation &&
    (annotationViewportRects.get(activeFocusAnnotation.id) || activeFocusAnnotation.rect);

  const togglePanelMode = (nextMode: DevPilotMode) => {
    setIsSettingsOpen(false);
    if (nextMode === "stability" && !stabilityEnabled) {
      setMode("annotate");
      return;
    }
    setMode((current) => (current === nextMode ? "annotate" : nextMode));
  };

  const toggleSettingsPanel = () => {
    setIsSettingsOpen((current) => !current);
  };

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
            {areaDraftPreview?.matchCount ? ` · ${areaDraftPreview.matchCount} 个元素` : ""}
          </div>
        </>
      ) : null}

      {annotationsHook.selection?.kind === "area" ? (
        <div
          className="dl-area-selection-focus"
          style={{
            left: annotationsHook.selection.rect.left,
            top: annotationsHook.selection.rect.top,
            width: annotationsHook.selection.rect.width,
            height: annotationsHook.selection.rect.height,
          }}
        />
      ) : null}

      {activeFocusAnnotation ? (
        <>
          <div
            className="dl-active-focus"
            data-kind={getAnnotationKind(activeFocusAnnotation)}
            style={{
              left: activeFocusRect?.left,
              top: activeFocusRect?.top,
              width: activeFocusRect?.width,
              height: activeFocusRect?.height,
            }}
          />
          <div
            className="dl-active-focus-label"
            data-kind={getAnnotationKind(activeFocusAnnotation)}
            style={{
              left: Math.max(12, activeFocusRect?.left || activeFocusAnnotation.rect.left),
              top: Math.max(
                12,
                (activeFocusRect?.top || activeFocusAnnotation.rect.top) - 32,
              ),
            }}
          >
            {getAnnotationKind(activeFocusAnnotation) === "area"
              ? `${activeFocusAnnotation.matchCount || activeFocusAnnotation.relatedElements?.length || 0} 个元素`
              : activeFocusAnnotation.elementName}
          </div>
        </>
      ) : null}

      {annotationsHook.openAnnotations.map((annotation, index) => (
        <button
          key={annotation.id}
          className="dl-marker"
          data-kind={getAnnotationKind(annotation)}
          data-status={annotation.status}
          data-active={annotation.id === annotationsHook.activeAnnotationId && mode === "session"}
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
                {annotation.matchCount || annotation.relatedElements?.length || index + 1}
              </span>
            </>
          ) : (
            index + 1
          )}
        </button>
      ))}

      {annotationsHook.selection && annotationsHook.pendingMarkerStyle ? (
        <button
          className="dl-marker"
          data-kind={annotationsHook.selection.kind}
          data-pending="true"
          style={annotationsHook.pendingMarkerStyle}
          title={
            annotationsHook.selection.kind === "area" ? "待提交区域标注" : "待提交标注"
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
                ? "编辑标注"
                : annotationsHook.selection.kind === "area"
                  ? "添加区域标注"
                  : "添加标注"}
            </h3>
            <span className="dl-popup-hint">Cmd/Ctrl + Enter</span>
          </div>
          <span className="dl-popup-section-label">
            {annotationsHook.selection.kind === "area"
              ? `选中区域 · ${annotationsHook.selection.matchCount || annotationsHook.selection.relatedElements?.length || 0} 个元素`
              : "当前元素"}
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
                ? "描述这个区域或多个组件需要修改什么"
                : "描述这个页面元素需要修改什么"
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
                取消
              </button>
              {annotationsHook.editingId ? (
                <button
                  className="dl-popup-action"
                  data-kind="danger"
                  onClick={annotationsHook.handleDelete}
                >
                  删除
                </button>
              ) : null}
            </div>
            <div className="dl-popup-actions-right">
              <button
                className="dl-popup-action"
                data-kind="primary"
                onClick={annotationsHook.handleSave}
              >
                {annotationsHook.editingId ? "保存" : "添加"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isOpen && !isSettingsOpen && mode === "session" ? (
        <SessionPanel
          panelLeft={panelLeft}
          panelBottom={panelBottom}
          copyState={annotationsHook.copyState}
          summary={annotationsHook.summary}
          annotations={annotationsHook.annotations}
          openAnnotations={annotationsHook.openAnnotations}
          activeAnnotationId={annotationsHook.activeAnnotationId}
          activeAnnotation={annotationsHook.activeAnnotation}
          onCopy={() => {
            void annotationsHook.handleCopyAnnotations();
          }}
          onClose={() => setMode("annotate")}
          onSelectAnnotation={annotationsHook.setActiveAnnotationId}
          onOpenAnnotationEditor={annotationsHook.openAnnotationEditor}
          onSetAnnotationStatus={annotationsHook.setAnnotationStatus}
          onDeleteAnnotation={annotationsHook.handleDeleteAnnotationRecord}
        />
      ) : null}

      {isOpen && isSettingsOpen ? (
        <SettingsPanel
          panelLeft={panelLeft}
          panelBottom={panelBottom}
          syncEndpoint={syncEndpoint}
          sessionId={currentSessionId}
          sseStatus={sseStatus}
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
            title="拖拽工具条"
          >
            <DevPilotGlyph />
          </span>
          <button
            className="dl-toolbar-button"
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
          {stabilityEnabled ? (
            <button
              className="dl-toolbar-button"
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
            className="dl-toolbar-button"
            data-active={!isSettingsOpen && mode === "session"}
            onClick={() => togglePanelMode("session")}
          >
            <SessionIcon />
          </button>
          <button
            className="dl-toolbar-icon-button"
            data-kind="secondary"
            data-active={isSettingsOpen}
            onClick={toggleSettingsPanel}
            title="设置"
          >
            <SettingsIcon />
          </button>
          <div className="dl-toolbar-divider" />
          <button
            className="dl-toolbar-icon-button"
            data-kind="secondary"
            onClick={() => {
              setIsSettingsOpen(false);
              setIsOpen(false);
            }}
            title="收起"
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
          title="打开 DevPilot"
        >
          <DevPilotGlyph />
          {annotationsHook.summary.open > 0 ? (
            <span className="dl-launcher-badge">{annotationsHook.summary.open}</span>
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

      {stabilityEnabled && isOpen && !isSettingsOpen && mode === "stability" ? (
        <StabilityPanel
          panelLeft={panelLeft}
          panelBottom={panelBottom}
          autoObservationEnabled={stabilityHook.autoObservationEnabled}
          stabilityCopyState={stabilityHook.stabilityCopyState}
          openStabilityItems={stabilityHook.openStabilityItems}
          resolvedStabilityItems={stabilityHook.resolvedStabilityItems}
          stabilitySummary={stabilityHook.stabilitySummary}
          isStabilityComposerOpen={stabilityHook.isStabilityComposerOpen}
          stabilityEditingId={stabilityHook.stabilityEditingId}
          stabilityDraft={stabilityHook.stabilityDraft}
          stabilityActiveId={stabilityHook.stabilityActiveId}
          activeStabilityItem={stabilityHook.activeStabilityItem}
          latestActiveRepairRequest={stabilityHook.latestActiveRepairRequest}
          repairTargetId={stabilityHook.repairTargetId}
          repairState={stabilityHook.repairState}
          onToggleObservation={() =>
            stabilityHook.setAutoObservationEnabled((current) => !current)
          }
          onCopyOpenItems={() => {
            void stabilityHook.handleCopyStabilityItems(stabilityHook.openStabilityItems);
          }}
          onOpenComposer={stabilityHook.openStabilityComposer}
          onClose={() => setMode("annotate")}
          onDraftChange={stabilityHook.handleStabilityDraftChange}
          onResetComposer={stabilityHook.resetStabilityComposer}
          onDeleteComposerItem={stabilityHook.handleDeleteStabilityItem}
          onSaveStabilityItem={stabilityHook.handleSaveStabilityItem}
          onSelectStabilityItem={stabilityHook.setStabilityActiveId}
          onCopyStabilityItem={(item) => {
            void stabilityHook.handleCopyStabilityItems([item]);
          }}
          onRequestRepair={(item) => {
            void stabilityHook.handleRequestStabilityRepair(item);
          }}
          onSetStabilityItemStatus={stabilityHook.setStabilityItemStatus}
          onDeleteStabilityItem={stabilityHook.handleDeleteStabilityItemRecord}
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

export function DevPilotShell(props: DevPilotMountOptions) {
  return <DevPilotApp {...props} />;
}
