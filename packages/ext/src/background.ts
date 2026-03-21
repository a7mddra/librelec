import type { ExtResponse, TuiCommand } from "./protocol";
import { WS_URL } from "./protocol";

let ws: WebSocket | null = null;
let reconnectDelay = 500;
const MAX_RECONNECT_DELAY = 3_000;
const CONTENT_SCRIPT_RETRIES = 5;
const CONTENT_SCRIPT_RETRY_DELAY = 1_500;

// ── Find the active .edu tab ─────────────────────────────────────

async function findEduTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ url: "*://*.sml4.dmu.edu.eg/*" });
  return tabs.find((t) => t.active) ?? tabs[0] ?? null;
}

// ── Inject content script programmatically ───────────────────────

async function injectContentScript(tabId: number): Promise<void> {
  console.log("[libre-lec] injecting content script programmatically...");
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    // Give it a moment to set up listeners + inject page-bridge
    await new Promise((r) => setTimeout(r, 1_000));
    console.log("[libre-lec] content script injected ✓");
  } catch (e) {
    console.warn(
      "[libre-lec] programmatic injection failed:",
      e instanceof Error ? e.message : String(e),
    );
  }
}

// ── Send a message to content script with retries ────────────────

async function sendToContentScript(
  tabId: number,
  command: TuiCommand,
): Promise<ExtResponse> {
  let injected = false;

  for (let attempt = 1; attempt <= CONTENT_SCRIPT_RETRIES; attempt++) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, command);
      return response as ExtResponse;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isNotReady =
        msg.includes("Receiving end does not exist") ||
        msg.includes("Could not establish connection");

      if (isNotReady && attempt < CONTENT_SCRIPT_RETRIES) {
        // On first failure, try programmatic injection
        if (!injected) {
          await injectContentScript(tabId);
          injected = true;
          continue;
        }

        console.log(
          `[libre-lec] content script not ready, retry ${attempt}/${CONTENT_SCRIPT_RETRIES}...`,
        );
        await new Promise((r) => setTimeout(r, CONTENT_SCRIPT_RETRY_DELAY));
        continue;
      }
      throw e;
    }
  }
  throw new Error("Unreachable");
}

// ── Handle incoming TUI commands ─────────────────────────────────

async function handleTuiCommand(raw: string): Promise<void> {
  let command: TuiCommand;
  try {
    command = JSON.parse(raw) as TuiCommand;
  } catch {
    console.warn("[libre-lec] bad JSON from TUI:", raw);
    return;
  }

  // ping is handled locally — no need to involve content scripts
  if (command.cmd === "ping") {
    const tab = await findEduTab();
    const response: ExtResponse = {
      cmd: "pong",
      tab: {
        title: tab?.title ?? "(no .edu tab found)",
        url: tab?.url ?? "",
      },
    };
    send(response);
    return;
  }

  // Everything else gets forwarded to the content script
  const tab = await findEduTab();
  if (!tab?.id) {
    send({ cmd: "error", message: "No .edu tab found." });
    return;
  }

  try {
    const response = await sendToContentScript(tab.id, command);
    send(response);
  } catch (e) {
    send({
      cmd: "error",
      message: `Failed to reach content script: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}

// ── WebSocket management ─────────────────────────────────────────

function send(data: ExtResponse): void {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function connect(): void {
  console.log(`[libre-lec] connecting to ${WS_URL}...`);

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log("[libre-lec] connected ✓");
    reconnectDelay = 500; // reset backoff
  };

  ws.onmessage = (event) => {
    handleTuiCommand(event.data as string);
  };

  ws.onclose = () => {
    console.log(
      `[libre-lec] disconnected — retrying in ${reconnectDelay / 1000}s`,
    );
    ws = null;
    setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

// ── Boot ─────────────────────────────────────────────────────────

connect();
