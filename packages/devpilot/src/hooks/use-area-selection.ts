import { useEffect, useRef, useState } from "react";
import {
  describeCommittedAreaSelection,
  describeElement,
  isPointInsideRect,
  isWithinDevPilotEvent,
  normalizeRect,
  toRect,
} from "../annotation/area-selection";
import type { DevPilotMode, DevPilotRect, DevPilotSelection } from "../types";

export interface UseAreaSelectionOptions {
  isOpen: boolean;
  mode: DevPilotMode;
  setSelection: (s: DevPilotSelection | null) => void;
  setDraft: (v: string) => void;
  setEditingId: (id: string | null) => void;
  setActiveAnnotationId: (id: string | null) => void;
  setIsTextSelectionPending: (v: boolean) => void;
}

export function useAreaSelection(options: UseAreaSelectionOptions) {
  const {
    isOpen,
    mode,
    setSelection,
    setDraft,
    setEditingId,
    setActiveAnnotationId,
    setIsTextSelectionPending,
  } = options;
  const [hoverRect, setHoverRect] = useState<DevPilotRect | null>(null);
  const [areaDraftRect, setAreaDraftRect] = useState<DevPilotRect | null>(null);
  const areaSelectionRef = useRef<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    dragging: boolean;
  } | null>(null);
  const suppressSelectionClickRef = useRef(false);

  useEffect(() => {
    if (!isOpen || mode !== "annotate") {
      // $FlowFixMe[react-rule-hook]
      setHoverRect(null);
      // $FlowFixMe[react-rule-hook]
      setAreaDraftRect(null);
      areaSelectionRef.current = null;
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
      document.documentElement.style.userSelect = "";
      document.body.style.cursor = "";
      return undefined;
    }

    const resetAreaInteractionState = () => {
      areaSelectionRef.current = null;
      setAreaDraftRect(null);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
      document.documentElement.style.userSelect = "";
      document.body.style.cursor = "";
    };

    const onMouseDown = (event: MouseEvent) => {
      if (areaSelectionRef.current) {
        return;
      }

      if (!event.shiftKey || event.button !== 0 || isWithinDevPilotEvent(event)) {
        return;
      }

      areaSelectionRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        currentX: event.clientX,
        currentY: event.clientY,
        dragging: false,
      };
      event.preventDefault();
      event.stopPropagation();
      document.body.style.userSelect = "none";
      document.body.style.webkitUserSelect = "none";
      document.documentElement.style.userSelect = "none";
      document.body.style.cursor = "crosshair";
      setHoverRect(null);
      setIsTextSelectionPending(false);
    };

    const onMouseMove = (event: MouseEvent) => {
      if (areaSelectionRef.current) {
        areaSelectionRef.current.currentX = event.clientX;
        areaSelectionRef.current.currentY = event.clientY;

        const nextRect = normalizeRect(
          areaSelectionRef.current.startX,
          areaSelectionRef.current.startY,
          event.clientX,
          event.clientY,
        );

        if (nextRect.width > 6 || nextRect.height > 6) {
          areaSelectionRef.current.dragging = true;
          setAreaDraftRect(nextRect);
        }
        event.preventDefault();
        event.stopPropagation();
        setHoverRect(null);
        return;
      }

      if (event.shiftKey) {
        setHoverRect(null);
        return;
      }

      if (isWithinDevPilotEvent(event)) {
        setHoverRect(null);
        return;
      }

      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        setHoverRect(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }

      setHoverRect(toRect(rect));
    };

    const onMouseUp = (event: MouseEvent) => {
      const areaSelection = areaSelectionRef.current;
      if (areaSelection) {
        const finalRect = normalizeRect(
          areaSelection.startX,
          areaSelection.startY,
          areaSelection.currentX,
          areaSelection.currentY,
        );

        areaSelectionRef.current = null;
        resetAreaInteractionState();

        if (areaSelection.dragging && finalRect.width >= 20 && finalRect.height >= 20) {
          const detail = describeCommittedAreaSelection(finalRect);
          setSelection({
            kind: "area",
            elementName: detail.elementName,
            elementPath: detail.elementPath,
            rect: detail.rect,
            pageX: detail.rect.left + window.scrollX,
            pageY: detail.rect.top + window.scrollY,
            matchCount: detail.matchCount,
            nearbyText: detail.nearbyText,
            relatedElements: detail.relatedElements,
          });
          setDraft("");
          setEditingId(null);
          setActiveAnnotationId(null);
          setHoverRect(null);
          setIsTextSelectionPending(false);
          suppressSelectionClickRef.current = true;
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }

      if (areaSelectionRef.current) {
        return;
      }

      const selectedText = window.getSelection()?.toString().trim();
      if (!selectedText) {
        document.body.style.userSelect = "";
        return;
      }

      const range = window.getSelection()?.rangeCount ? window.getSelection()?.getRangeAt(0) : null;
      const rect = range?.getBoundingClientRect();
      const anchorNode = window.getSelection()?.anchorNode;
      const element =
        anchorNode instanceof HTMLElement
          ? anchorNode
          : anchorNode?.parentElement instanceof HTMLElement
            ? anchorNode.parentElement
            : null;

      if (!rect || !element) {
        return;
      }

      const selectionRect = toRect(rect);
      const pointerReleasedInsideSelection = isPointInsideRect(
        { x: event.clientX, y: event.clientY },
        selectionRect,
      );

      if (!pointerReleasedInsideSelection) {
        document.body.style.userSelect = "";
        return;
      }

      const detail = describeElement(element);
      setSelection({
        kind: "text",
        elementName: detail.elementName,
        elementPath: detail.elementPath,
        rect: selectionRect,
        pageX: rect.left + window.scrollX,
        pageY: rect.top + window.scrollY,
        matchCount: 1,
        selectedText,
        nearbyText: detail.nearbyText,
      });
      setDraft("");
      setEditingId(null);
      setIsTextSelectionPending(true);
    };

    const onClick = (event: MouseEvent) => {
      if (isWithinDevPilotEvent(event)) {
        return;
      }

      if (suppressSelectionClickRef.current) {
        suppressSelectionClickRef.current = false;
        return;
      }

      if (event.shiftKey) {
        setHoverRect(null);
        return;
      }

      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }

      const detail = describeElement(target);
      setSelection({
        kind: "element",
        elementName: detail.elementName,
        elementPath: detail.elementPath,
        rect: toRect(rect),
        pageX: event.clientX + window.scrollX,
        pageY: event.clientY + window.scrollY,
        matchCount: 1,
        nearbyText: detail.nearbyText,
      });
      setDraft("");
      setEditingId(null);
      setActiveAnnotationId(null);
    };

    const preventNativeDrag = (event: Event) => {
      if (!areaSelectionRef.current) {
        return;
      }

      event.preventDefault();
    };

    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("mouseup", onMouseUp, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("dragstart", preventNativeDrag, true);
    document.addEventListener("selectstart", preventNativeDrag, true);

    return () => {
      resetAreaInteractionState();
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("mouseup", onMouseUp, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("dragstart", preventNativeDrag, true);
      document.removeEventListener("selectstart", preventNativeDrag, true);
    };
  }, [isOpen, mode, setActiveAnnotationId, setDraft, setEditingId, setIsTextSelectionPending, setSelection]);

  useEffect(() => {
    if (!isOpen || mode !== "annotate" || !areaDraftRect) {
      return undefined;
    }

    const preventScroll = (event: Event) => {
      event.preventDefault();
    };

    window.addEventListener("wheel", preventScroll, { passive: false, capture: true });
    window.addEventListener("touchmove", preventScroll, { passive: false, capture: true });

    return () => {
      window.removeEventListener("wheel", preventScroll, true);
      window.removeEventListener("touchmove", preventScroll, true);
    };
  }, [areaDraftRect, isOpen, mode]);

  return {
    hoverRect,
    setHoverRect,
    areaDraftRect,
    setAreaDraftRect,
    areaSelectionRef,
    suppressSelectionClickRef,
  };
}
