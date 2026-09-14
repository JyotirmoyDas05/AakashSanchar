"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * The eight edge/corner grips shared by FloatingWindow and RegionWindow.
 * North and west drags move the window as they shrink it, so the opposite
 * edge stays put. Render as a sibling of the window body, inside a
 * position:fixed/absolute container.
 */
interface ResizeHandlesProps {
  size: { width: number; height: number };
  position: { x: number; y: number };
  setSize: (s: { width: number; height: number }) => void;
  setPosition: (p: { x: number; y: number }) => void;
  onInteractingChange?: (interacting: boolean) => void;
  minWidth?: number;
  minHeight?: number;
}

export default function ResizeHandles({
  size,
  position,
  setSize,
  setPosition,
  onInteractingChange,
  minWidth = 280,
  minHeight = 200,
}: ResizeHandlesProps) {
  const isResizing = useRef(false);
  const direction = useRef("");
  const start = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const onMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      const dir = direction.current;

      let newW = startSize.current.width;
      let newH = startSize.current.height;
      let newX = startPos.current.x;
      let newY = startPos.current.y;

      if (dir.includes("e")) {
        newW = Math.max(minWidth, startSize.current.width + dx);
      } else if (dir.includes("w")) {
        newW = Math.max(minWidth, startSize.current.width - dx);
        newX = startPos.current.x + (startSize.current.width - newW);
      }

      if (dir.includes("s")) {
        newH = Math.max(minHeight, startSize.current.height + dy);
      } else if (dir.includes("n")) {
        newH = Math.max(minHeight, startSize.current.height - dy);
        newY = startPos.current.y + (startSize.current.height - newH);
      }

      setSize({ width: newW, height: newH });
      setPosition({ x: newX, y: newY });
    },
    [minWidth, minHeight, setSize, setPosition],
  );

  const onUp = useCallback(() => {
    if (isResizing.current) {
      isResizing.current = false;
      onInteractingChange?.(false);
    }
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  }, [onMove, onInteractingChange]);

  const onDown = (e: React.MouseEvent, dir: string) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    onInteractingChange?.(true);
    direction.current = dir;
    start.current = { x: e.clientX, y: e.clientY };
    startSize.current = { width: size.width, height: size.height };
    startPos.current = { x: position.x, y: position.y };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  useEffect(
    () => () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    },
    [onMove, onUp],
  );

  const grip = (dir: string, className: string) => (
    <div
      key={dir}
      data-resize-handle="true"
      onMouseDown={(e) => onDown(e, dir)}
      className={className}
    />
  );

  return (
    <>
      {grip("n", "absolute top-0 left-3 right-3 h-2 cursor-n-resize z-30")}
      {grip("s", "absolute bottom-0 left-3 right-3 h-2 cursor-s-resize z-30")}
      {grip("w", "absolute top-3 bottom-3 left-0 w-2 cursor-w-resize z-30")}
      {grip("e", "absolute top-3 bottom-3 right-0 w-2 cursor-e-resize z-30")}
      {grip("nw", "absolute top-0 left-0 w-3.5 h-3.5 cursor-nw-resize z-40")}
      {grip("ne", "absolute top-0 right-0 w-3.5 h-3.5 cursor-ne-resize z-40")}
      {grip("sw", "absolute bottom-0 left-0 w-3.5 h-3.5 cursor-sw-resize z-40")}
      {grip(
        "se",
        "absolute bottom-0 right-0 w-3.5 h-3.5 cursor-se-resize z-40",
      )}
    </>
  );
}
