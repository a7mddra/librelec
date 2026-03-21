// ── Libre-Lec  ·  Shared Protocol ────────────────────────────────

/** Default WebSocket port the TUI listens on. */
export const WS_PORT = 27631;

/** WebSocket URL derived from the default port. */
export const WS_URL = `ws://localhost:${WS_PORT}`;

/**
 * Unique source tag appended to every window.postMessage so the
 * content-script can filter out noise from other scripts on the page.
 */
export const MSG_SOURCE = "libre-lec" as const;

// ── CSS Selectors (carried from pylec config.py) ─────────────────

export const SELECTORS = {
  /** Moodle pdfprotect iframe wrapper */
  iframeProtect: "#pdfprotect-iframe",
  /** pdf.js viewer scroll container */
  viewerContainer: "#viewerContainer",
  /** Individual page div inside the viewer */
  page: "#viewer .page",
  /** The <canvas> that holds the rendered slide */
  canvas: ".canvasWrapper canvas",
} as const;

/** URL sub-strings that identify a DRM viewer frame. */
export const VIEWER_KEYWORDS = [
  "pdfjs-drm",
  "viewer.html",
  "content/1/",
  "mod/pdfprotect",
] as const;

// ── TUI → Extension commands ─────────────────────────────────────

export type PingCmd = { cmd: "ping" };
export type ScanCmd = { cmd: "scan" };
export type ExtractCmd = { cmd: "extract"; page: number };

export type TuiCommand = PingCmd | ScanCmd | ExtractCmd;

// ── Extension → TUI responses ────────────────────────────────────

export type PongRes = {
  cmd: "pong";
  tab: { title: string; url: string };
};

export type ScanResult = {
  cmd: "scan:result";
  pageCount: number;
  title: string;
};

export type ExtractResult = {
  cmd: "extract:result";
  page: number;
  dataUrl: string;
};

export type ErrorRes = {
  cmd: "error";
  message: string;
};

export type ExtResponse = PongRes | ScanResult | ExtractResult | ErrorRes;

// ── Internal (content ↔ page-bridge via window.postMessage) ──────

export type BridgeEnvelope = {
  source: typeof MSG_SOURCE;
  direction: "to-bridge" | "from-bridge";
  payload: TuiCommand | ExtResponse;
};
