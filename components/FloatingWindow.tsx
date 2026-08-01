"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface FloatingWindowProps {
  title: string;
  icon: ReactNode;
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  zIndex?: number;
  onFocus?: () => void;
  theme?: "dark" | "light";
  layoutMode?: "sidebar" | "floating";
  children: ReactNode;
}

export default function FloatingWindow({
  title,
  icon,
  onClose,
  defaultPosition = { x: 80, y: 80 },
  defaultSize = { width: 320, height: 400 },
  zIndex = 1050,
  onFocus,
  theme = "dark",
  layoutMode = "sidebar",
  children,
}: FloatingWindowProps) {
  const isLight = theme === "light";
  const [position, setPosition] = useState(defaultPosition);
  const [size, setSize] = useState(defaultSize);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const isResizing = useRef(false);
  const resizeDirection = useRef<string>("");
  const resizeStart = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0 });

  // Dragging handlers
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPosition({
      x: startPos.current.x + dx,
      y: startPos.current.y + dy,
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      setIsInteracting(false);
    }
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMaximized) return; // Disable dragging when maximized
    if (e.button !== 0) return; // Left click only
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("[data-resize-handle]")
    )
      return;

    isDragging.current = true;
    setIsInteracting(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    startPos.current = { x: position.x, y: position.y };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Resizing handlers
  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const dx = e.clientX - resizeStart.current.x;
    const dy = e.clientY - resizeStart.current.y;

    const minW = 280;
    const minH = 200;

    let newW = startSize.current.width;
    let newH = startSize.current.height;
    let newX = resizeStartPos.current.x;
    let newY = resizeStartPos.current.y;

    const dir = resizeDirection.current;

    if (dir.includes("e")) {
      newW = Math.max(minW, startSize.current.width + dx);
    } else if (dir.includes("w")) {
      const possibleW = startSize.current.width - dx;
      newW = Math.max(minW, possibleW);
      newX = resizeStartPos.current.x + (startSize.current.width - newW);
    }

    if (dir.includes("s")) {
      newH = Math.max(minH, startSize.current.height + dy);
    } else if (dir.includes("n")) {
      const possibleH = startSize.current.height - dy;
      newH = Math.max(minH, possibleH);
      newY = resizeStartPos.current.y + (startSize.current.height - newH);
    }

    setSize({ width: newW, height: newH });
    setPosition({ x: newX, y: newY });
  }, []);

  const handleResizeMouseUp = useCallback(() => {
    if (isResizing.current) {
      isResizing.current = false;
      setIsInteracting(false);
    }
    document.removeEventListener("mousemove", handleResizeMouseMove);
    document.removeEventListener("mouseup", handleResizeMouseUp);
  }, [handleResizeMouseMove]);

  const handleResizeMouseDown = (e: React.MouseEvent, direction: string) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    setIsInteracting(true);
    resizeDirection.current = direction;
    resizeStart.current = { x: e.clientX, y: e.clientY };
    startSize.current = { width: size.width, height: size.height };
    resizeStartPos.current = { x: position.x, y: position.y };

    document.addEventListener("mousemove", handleResizeMouseMove);
    document.addEventListener("mouseup", handleResizeMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousemove", handleResizeMouseMove);
      document.removeEventListener("mouseup", handleResizeMouseUp);
    };
  }, [
    handleMouseMove,
    handleMouseUp,
    handleResizeMouseMove,
    handleResizeMouseUp,
  ]);

  return (
    <div
      onMouseDownCapture={onFocus}
      className={`absolute border font-mono select-none overflow-hidden flex flex-col rounded-lg ${
        isLight
          ? "border-slate-300 bg-white/95 text-slate-900 shadow-xl backdrop-blur-md"
          : "border-brand-border bg-brand-bg/95 text-slate-200 shadow-2xl backdrop-blur-md"
      } ${isInteracting ? "transition-none" : "transition-all duration-150"}`}
      style={
        isMaximized
          ? {
              left: layoutMode === "sidebar" ? "calc(3.5rem + 2rem)" : "2rem",
              top: "2rem",
              width:
                layoutMode === "sidebar"
                  ? "calc(100% - 7.5rem)"
                  : "calc(100% - 4rem)",
              height: "calc(100% - 4rem)",
              zIndex: zIndex + 10,
            }
          : {
              left: `${position.x}px`,
              top: `${position.y}px`,
              width: `${size.width}px`,
              height: `${size.height}px`,
              zIndex: zIndex,
            }
      }
    >
      {/* Title bar */}
      <div
        onMouseDown={handleMouseDown}
        className={`flex items-center justify-between border-b px-3 py-2 shrink-0 cursor-grab active:cursor-grabbing select-none ${
          isLight
            ? "bg-slate-100 border-slate-200"
            : "bg-[#0a0a0a] border-brand-border"
        }`}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span
            className={`text-[10px] font-bold tracking-wider uppercase ${
              isLight ? "text-slate-800" : "text-slate-400"
            }`}
          >
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Maximize Toggle */}
          <button
            type="button"
            onClick={() => setIsMaximized((prev) => !prev)}
            className={`rounded p-1 transition-colors flex items-center justify-center w-6 h-6 ${
              isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                : "text-slate-400 hover:text-white hover:bg-white/10"
            }`}
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <svg
                className="w-2.5 h-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <rect
                  x="8"
                  y="4"
                  width="12"
                  height="12"
                  rx="1"
                  strokeWidth="2"
                />
                <path d="M4 8v10a1 1 0 001 1h10" strokeWidth="2" />
              </svg>
            ) : (
              <svg
                className="w-2.5 h-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="3"
              >
                <rect x="4" y="4" width="16" height="16" rx="1" />
              </svg>
            )}
          </button>
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className={`rounded w-6 h-6 flex items-center justify-center text-xs transition-colors ${
              isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                : "text-slate-400 hover:text-white hover:bg-white/10"
            }`}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main body content */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        {children}
      </div>

      {/* Resize handles (only show if not maximized) */}
      {!isMaximized && (
        <>
          {/* Edges */}
          <div
            data-resize-handle="true"
            onMouseDown={(e) => handleResizeMouseDown(e, "n")}
            className="absolute top-0 left-3 right-3 h-2 cursor-n-resize z-30"
          />
          <div
            data-resize-handle="true"
            onMouseDown={(e) => handleResizeMouseDown(e, "s")}
            className="absolute bottom-0 left-3 right-3 h-2 cursor-s-resize z-30"
          />
          <div
            data-resize-handle="true"
            onMouseDown={(e) => handleResizeMouseDown(e, "w")}
            className="absolute top-3 bottom-3 left-0 w-2 cursor-w-resize z-30"
          />
          <div
            data-resize-handle="true"
            onMouseDown={(e) => handleResizeMouseDown(e, "e")}
            className="absolute top-3 bottom-3 right-0 w-2 cursor-e-resize z-30"
          />

          {/* Corners */}
          <div
            data-resize-handle="true"
            onMouseDown={(e) => handleResizeMouseDown(e, "nw")}
            className="absolute top-0 left-0 w-3.5 h-3.5 cursor-nw-resize z-40"
          />
          <div
            data-resize-handle="true"
            onMouseDown={(e) => handleResizeMouseDown(e, "ne")}
            className="absolute top-0 right-0 w-3.5 h-3.5 cursor-ne-resize z-40"
          />
          <div
            data-resize-handle="true"
            onMouseDown={(e) => handleResizeMouseDown(e, "sw")}
            className="absolute bottom-0 left-0 w-3.5 h-3.5 cursor-sw-resize z-40"
          />
          <div
            data-resize-handle="true"
            onMouseDown={(e) => handleResizeMouseDown(e, "se")}
            className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-se-resize z-40"
          />
        </>
      )}
    </div>
  );
}
