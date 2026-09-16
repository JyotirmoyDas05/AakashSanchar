"use client";

/**
 * SolvingOrb - self-contained port of thinking-orbs "solving" (rubik) mode.
 * Canvas + rAF, no external deps. Sphere of dots with Rubik-slice rotations.
 */

import { useEffect, useRef } from "react";

interface Dot {
  x: number;
  y: number;
  z: number;
  r: number;
  white: number;
}

interface Move {
  axis: 0 | 1 | 2;
  lo: number;
  hi: number;
  ang: number;
}

function hashD(a: number, b: number): number {
  const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

function solveCycle(
  time: number,
  count: number,
  slotDur: number,
  rest: number,
): { amount: number[]; active: number } {
  const cyc = 2 * count * slotDur + rest;
  const tc = time % cyc;
  const amount = new Array<number>(count).fill(0);
  let active = -1;
  if (tc < 2 * count * slotDur) {
    const slot = Math.floor(tc / slotDur);
    const p = (tc - slot * slotDur) / slotDur;
    const cl = Math.min(1, p / 0.7);
    const ep = 1 - (1 - cl) ** 3;
    if (slot < count) {
      for (let i = 0; i < slot; i++) amount[i] = 1;
      amount[slot] = ep;
      active = slot;
    } else {
      const u = 2 * count - 1 - slot;
      for (let i = 0; i < u; i++) amount[i] = 1;
      amount[u] = 1 - ep;
      active = u;
    }
  }
  return { amount, active };
}

function applyMoves(
  pt: [number, number, number],
  moves: Move[],
  sc: { amount: number[]; active: number },
): [number, number, number, boolean] {
  let [x, y, z] = pt;
  let inActive = false;
  for (let i = 0; i < moves.length; i++) {
    if (sc.amount[i] <= 0) continue;
    const mv = moves[i];
    const coord = mv.axis === 0 ? x : mv.axis === 1 ? y : z;
    if (coord < mv.lo || coord >= mv.hi) continue;
    if (i === sc.active) inActive = true;
    const a = mv.ang * sc.amount[i];
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    if (mv.axis === 0) {
      const y2 = y * ca - z * sa;
      z = y * sa + z * ca;
      y = y2;
    } else if (mv.axis === 1) {
      const x2 = x * ca + z * sa;
      z = -x * sa + z * ca;
      x = x2;
    } else {
      const x2 = x * ca - y * sa;
      y = x * sa + y * ca;
      x = x2;
    }
  }
  return [x, y, z, inActive];
}

function makeMoves(count: number): Move[] {
  const moves: Move[] = [];
  for (let i = 0; i < count; i++) {
    const axis = Math.floor(hashD(i, 0) * 3) as 0 | 1 | 2;
    const slices = 3;
    const slice = Math.floor(hashD(i, 1) * slices);
    const lo = (slice / slices) * 2 - 1;
    const hi = lo + 2 / slices;
    const dir = hashD(i, 2) > 0.5 ? 1 : -1;
    moves.push({ axis, lo, hi, ang: dir * Math.PI * 0.5 });
  }
  return moves;
}

function buildRubikFrame(time: number, orbR: number, dotBase: number): Dot[] {
  const rows = 8;
  const cols = 16;
  const MOVE_COUNT = 6;
  const SLOT_DUR = 0.55;
  const REST = 0.8;
  const sc = solveCycle(time, MOVE_COUNT, SLOT_DUR, REST);
  const moves = makeMoves(MOVE_COUNT);

  const spinY = time * 0.35;
  const cy = Math.cos(spinY);
  const sy = Math.sin(spinY);

  const dots: Dot[] = [];
  for (let ri = 0; ri < rows; ri++) {
    const lat = (Math.PI * (ri + 0.5)) / rows - Math.PI / 2;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    for (let ci = 0; ci < cols; ci++) {
      const lon = (2 * Math.PI * ci) / cols;
      const cosLon = Math.cos(lon);
      const sinLon = Math.sin(lon);

      let px = cosLat * cosLon;
      let py = sinLat;
      let pz = cosLat * sinLon;

      const [rx, ry, rz, inActive] = applyMoves([px, py, pz], moves, sc);
      px = rx;
      py = ry;
      pz = rz;

      const sx = px * cy + pz * sy;
      const sz = -px * sy + pz * cy;
      px = sx;
      pz = sz;

      const depth = (pz + 1) / 2;
      const white = 0.15 + depth * 0.85;
      const alpha = inActive ? 1 : 0.72;

      dots.push({
        x: px * orbR,
        y: py * orbR,
        z: pz,
        r: dotBase * (0.5 + depth * 0.65),
        white: white * alpha,
      });
    }
  }

  dots.sort((a, b) => a.z - b.z);
  return dots;
}

function paintDots(
  ctx: CanvasRenderingContext2D,
  dots: Dot[],
  cx: number,
  cy: number,
  dark: boolean,
  color: [number, number, number],
) {
  const [r, g, b] = color;
  for (const d of dots) {
    const brightness = dark ? d.white : 1 - d.white * 0.8;
    const alpha = dark
      ? 0.2 + d.white * 0.8
      : 0.15 + (1 - d.white * 0.5) * 0.85;
    ctx.beginPath();
    ctx.arc(cx + d.x, cy + d.y, Math.max(0.3, d.r), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${Math.round(r * brightness)},${Math.round(g * brightness)},${Math.round(b * brightness)},${alpha.toFixed(2)})`;
    ctx.fill();
  }
}

interface Props {
  size?: number;
  color?: [number, number, number];
  dark?: boolean;
}

export function SolvingOrb({
  size = 20,
  color = [34, 211, 238],
  dark = true,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const visRef = useRef(true);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const obs = new IntersectionObserver((entries) => {
      visRef.current = entries[0]?.isIntersecting ?? true;
    });
    obs.observe(canvas);

    const orbR = size * dpr * 0.38;
    const dotBase = size * dpr * 0.045;
    const cx = (size * dpr) / 2;
    const cy = (size * dpr) / 2;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      if (!visRef.current) return;
      const t = performance.now() / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const dots = buildRubikFrame(t, orbR, dotBase);
      paintDots(ctx, dots, cx, cy, dark, color);
    };

    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      obs.disconnect();
    };
  }, [size, dark, color]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, display: "block", flexShrink: 0 }}
      aria-label="Solving..."
      aria-live="polite"
    />
  );
}
