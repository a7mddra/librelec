// ── librelec  ·  Content Script ─────────────────────────────────
// Runs in the ISOLATED content-script world on matched .edu pages.
// Bridges chrome.runtime messages ↔ window.postMessage (page world).

import type { BridgeEnvelope, TuiCommand } from "./protocol";
import { MSG_SOURCE } from "./protocol";

// ── 1. Inject page-bridge.js into the MAIN world ────────────────

const script = document.createElement("script");
script.src = chrome.runtime.getURL("page-bridge.js");
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);

// ── 2. chrome.runtime → page-bridge (background sends us a command) ──

chrome.runtime.onMessage.addListener(
  (
    message: TuiCommand,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => {
    // We need to hold sendResponse open until the page-bridge replies.
    // Set up a one-time listener for the reply.
    const onBridgeReply = (event: MessageEvent): void => {
      const data = event.data as BridgeEnvelope | undefined;
      if (
        !data ||
        data.source !== MSG_SOURCE ||
        data.direction !== "from-bridge"
      ) {
        return;
      }

      window.removeEventListener("message", onBridgeReply);
      sendResponse(data.payload);
    };

    window.addEventListener("message", onBridgeReply);

    // Forward command to page-bridge
    const envelope: BridgeEnvelope = {
      source: MSG_SOURCE,
      direction: "to-bridge",
      payload: message,
    };
    window.postMessage(envelope, "*");

    // Return true to signal async sendResponse
    return true;
  },
);

console.log("[librelec] content script loaded");
