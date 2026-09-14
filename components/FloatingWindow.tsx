"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ResizeHandles from "./ResizeHandles";

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

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

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

      {!isMaximized && (
        <ResizeHandles
          size={size}
          position={position}
          setSize={setSize}
          setPosition={setPosition}
          onInteractingChange={setIsInteracting}
        />
      )}
    </div>
  );
}
