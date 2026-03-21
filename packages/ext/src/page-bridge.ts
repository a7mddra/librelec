// ── Libre-Lec  ·  Page Bridge ────────────────────────────────────
// Injected into the MAIN page world by content.ts.
// Has full DOM + canvas access — this is where the actual scraping happens.

import type { BridgeEnvelope, ExtResponse, TuiCommand } from "./protocol";
import { MSG_SOURCE, SELECTORS, VIEWER_KEYWORDS } from "./protocol";

// ── Helpers ──────────────────────────────────────────────────────

function reply(payload: ExtResponse): void {
  const envelope: BridgeEnvelope = {
    source: MSG_SOURCE,
    direction: "from-bridge",
    payload,
  };
  window.postMessage(envelope, "*");
}

function error(message: string): void {
  reply({ cmd: "error", message });
}

/**
 * Resolves the DRM viewer document.
 *
 * Strategy 1 — look for #pdfprotect-iframe and use its contentDocument.
 * Strategy 2 — if we're already inside the viewer (direct URL), use document.
 */
function resolveViewerDoc(): Document | null {
  // Strategy 1: iframe on the Moodle page
  const iframe = document.querySelector<HTMLIFrameElement>(
    SELECTORS.iframeProtect,
  );
  if (iframe) {
    try {
      const doc = iframe.contentDocument;
      if (doc) return doc;
    } catch {
      // cross-origin — can't access contentDocument
    }
  }

  // Strategy 2: check if current page IS the viewer
  const url = window.location.href;
  for (const kw of VIEWER_KEYWORDS) {
    if (url.includes(kw)) return document;
  }

  // Strategy 3: check all iframes href for viewer keywords
  const iframes = document.querySelectorAll("iframe");
  for (const f of iframes) {
    const src = f.getAttribute("src") || "";
    for (const kw of VIEWER_KEYWORDS) {
      if (src.includes(kw)) {
        try {
          if (f.contentDocument) return f.contentDocument;
        } catch {
          // cross-origin
        }
      }
    }
  }

  return null;
}

// ── Command Handlers ─────────────────────────────────────────────

function handleScan(): void {
  const doc = resolveViewerDoc();
  if (!doc) {
    error("Could not locate DRM viewer in this page.");
    return;
  }

  const pages = doc.querySelectorAll(SELECTORS.page);
  reply({
    cmd: "scan:result",
    pageCount: pages.length,
    title: document.title,
  });
}

function handleExtract(page: number): void {
  const doc = resolveViewerDoc();
  if (!doc) {
    error("Could not locate DRM viewer in this page.");
    return;
  }

  const pages = doc.querySelectorAll(SELECTORS.page);
  const target = pages[page - 1]; // 1-indexed
  if (!target) {
    error(`Page ${page} not found (total: ${pages.length}).`);
    return;
  }

  // Scroll into view so lazy-rendered canvases paint
  target.scrollIntoView({ behavior: "instant", block: "center" });

  // Wait for canvas to render (pdf.js paints async after scroll)
  const waitForCanvas = (): void => {
    const canvas = target.querySelector<HTMLCanvasElement>(SELECTORS.canvas);
    if (!canvas || canvas.width === 0) {
      // Retry in 300ms — pdf.js might still be rendering
      setTimeout(waitForCanvas, 300);
      return;
    }

    // Give it a beat for hi-DPI rendering to finish
    setTimeout(() => {
      try {
        const dataUrl = canvas.toDataURL("image/png");
        reply({ cmd: "extract:result", page, dataUrl });
      } catch (e) {
        error(
          `canvas.toDataURL failed for page ${page}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }, 500);
  };

  waitForCanvas();
}

// ── Message Listener ─────────────────────────────────────────────

window.addEventListener("message", (event: MessageEvent) => {
  const data = event.data as BridgeEnvelope | undefined;
  if (!data || data.source !== MSG_SOURCE || data.direction !== "to-bridge") {
    return;
  }

  const cmd = data.payload as TuiCommand;
  switch (cmd.cmd) {
    case "scan":
      handleScan();
      break;
    case "extract":
      handleExtract(cmd.page);
      break;
    default:
      // ping is handled by background.ts directly — should never reach here
      break;
  }
});

console.log("[libre-lec] page-bridge injected");
