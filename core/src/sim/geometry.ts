import type { Vec2 } from "../types";

// Small math helpers shared by the game session.

export function length(x: number, y: number): number {
  return Math.hypot(x, y);
}

export function normalize(x: number, y: number): Vec2 {
  const l = Math.hypot(x, y);
  return l > 0.0001 ? { x: x / l, y: y / l } : { x: 0, y: 1 };
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
