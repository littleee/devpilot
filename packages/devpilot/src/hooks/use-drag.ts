import React, { useEffect, useRef } from "react";
import { clampFloatingPosition } from "../shared/runtime";

export interface UseDragOptions {
  setFloatingPosition: (position: { left: number; top: number }) => void;
}

export function useDrag(options: UseDragOptions) {
  const { setFloatingPosition } = options;
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
    moved: boolean;
  } | null>(null);
  const suppressLauncherClickRef = useRef(false);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }

      const nextPosition = clampFloatingPosition(
        {
          left: event.clientX - drag.offsetX,
          top: event.clientY - drag.offsetY,
        },
        drag.width,
        drag.height,
      );

      if (!drag.moved && (Math.abs(event.movementX) > 0 || Math.abs(event.movementY) > 0)) {
        drag.moved = true;
      }

      setFloatingPosition(nextPosition);
    };

    const onPointerUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }

      if (drag.moved) {
        suppressLauncherClickRef.current = true;
      }
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerUp, true);
    return () => {
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerUp, true);
    };
  }, [setFloatingPosition]);

  const startDragging = (event: React.PointerEvent<HTMLElement>, rect: DOMRect) => {
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
    };
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    event.preventDefault();
    event.stopPropagation();
  };

  const resetSuppressLauncherClick = () => {
    suppressLauncherClickRef.current = false;
  };

  return {
    dragRef,
    suppressLauncherClickRef,
    startDragging,
    resetSuppressLauncherClick,
  };
}
