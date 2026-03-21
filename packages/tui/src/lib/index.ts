// Copyright 2026 a7mddra
// SPDX-License-Identifier: MIT

// ── UI Color Palette ─────────────────────────────────────────────

export const UI_COLORS = {
  // Purple gradient stops for the logo
  gradientStart: "#a855f7", // purple-400
  gradientMid: "#7c3aed", // violet-600
  gradientEnd: "#6d28d9", // violet-700

  // Semantic
  spinner: "#c084fc", // purple-300
  success: "#4ade80", // green-400
  error: "#f87171", // red-400
  warning: "#fbbf24", // amber-400
  info: "#60a5fa", // blue-400
  muted: "#6b7280", // gray-500
  dimBackground: "#1e1b2e", // dark purple-ish
  text: "#e2e8f0", // slate-200
  highlight: "#e9d5ff", // purple-100
  accent: "#a78bfa", // violet-400
} as const;

// ── ASCII Logo ───────────────────────────────────────────────────

export const LOGO = [
  "██╗     ██╗██████╗ ██████╗ ███████╗██╗     ███████╗ ██████╗",
  "██║     ██║██╔══██╗██╔══██╗██╔════╝██║     ██╔════╝██╔════╝",
  "██║     ██║██████╔╝██████╔╝█████╗  ██║     █████╗  ██║     ",
  "██║     ██║██╔══██╗██╔══██╗██╔══╝  ██║     ██╔══╝  ██║     ",
  "███████╗██║██████╔╝██║  ██║███████╗███████╗███████╗╚██████╗",
  "╚══════╝╚═╝╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝ ╚═════╝",
] as const;

// ── Gradient Helper ──────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function lerpColor(
  from: [number, number, number],
  to: [number, number, number],
  t: number,
): string {
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return rgbToHex(r, g, b);
}

/**
 * Returns an array of hex colors, one per character position,
 * forming a horizontal gradient across `length` characters.
 */
export function gradient(
  length: number,
  stops: string[] = [
    UI_COLORS.gradientStart,
    UI_COLORS.gradientMid,
    UI_COLORS.gradientEnd,
  ],
): string[] {
  if (length <= 1) return [stops[0] ?? "#ffffff"];

  const rgbStops = stops.map(hexToRgb);
  const segmentCount = rgbStops.length - 1;
  const result: string[] = [];

  for (let i = 0; i < length; i++) {
    const t = i / (length - 1);
    const segIdx = Math.min(Math.floor(t * segmentCount), segmentCount - 1);
    const segT = t * segmentCount - segIdx;
    const from = rgbStops[segIdx]!;
    const to = rgbStops[segIdx + 1]!;
    result.push(lerpColor(from, to, segT));
  }

  return result;
}
