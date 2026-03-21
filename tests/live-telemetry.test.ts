/**
 * Live Telemetry Test
 *
 * Tests the WebSocket IPC between the Chrome extension and a local process.
 * Starts a WS server, waits for the extension to connect, sends a "ping",
 * and verifies we get back the active .edu tab's title and URL.
 *
 * Prerequisites:
 *   1. Extension loaded unpacked from packages/ext/dist/
 *   2. Chrome has a tab open on sml4.dmu.edu.eg
 *
 * Run: npm run test:live-telemetry
 */

import { WebSocketServer } from "ws";

const WS_PORT = 27631;
const TIMEOUT_MS = 120_000; // 2 minutes — generous for WS backoff reconnect

interface PongResponse {
  cmd: "pong";
  tab: { title: string; url: string };
}

function run(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      wss.close();
      reject(
        new Error(
          `Timed out after ${TIMEOUT_MS / 1000}s — no connection from extension.`,
        ),
      );
    }, TIMEOUT_MS);

    console.log(
      `\n⏳ Waiting for extension to connect on ws://127.0.0.1:${WS_PORT}...`,
    );
    console.log(
      `   (Make sure Chrome has the extension loaded and a .edu tab open)\n`,
    );

    const wss = new WebSocketServer({ port: WS_PORT });

    wss.on("connection", (ws) => {
      console.log("✓ Extension connected!");
      console.log("  → Sending ping...\n");

      ws.send(JSON.stringify({ cmd: "ping" }));

      ws.on("message", (raw) => {
        clearTimeout(timeout);

        const data = JSON.parse(raw.toString()) as PongResponse;

        console.log("── Response ──────────────────────────────");
        console.log(`  cmd:   ${data.cmd}`);
        console.log(`  title: ${data.tab?.title}`);
        console.log(`  url:   ${data.tab?.url}`);
        console.log("──────────────────────────────────────────\n");

        // Assertions
        let passed = true;

        if (data.cmd !== "pong") {
          console.error("✗ FAIL: expected cmd === 'pong', got:", data.cmd);
          passed = false;
        }

        if (!data.tab?.title || data.tab.title === "(no .edu tab found)") {
          console.error(
            "✗ FAIL: no .edu tab detected — is a sml4 page open in Chrome?",
          );
          passed = false;
        }

        if (!data.tab?.url?.includes("sml4.dmu.edu")) {
          console.error(
            "✗ FAIL: URL doesn't contain 'sml4.dmu.edu':",
            data.tab?.url,
          );
          passed = false;
        }

        ws.close();
        wss.close(() => {
          if (passed) {
            console.log("✓ PASS — live telemetry working!\n");
            resolve();
          } else {
            reject(new Error("Assertions failed."));
          }
        });
      });
    });

    wss.on("error", (err) => {
      clearTimeout(timeout);
      reject(new Error(`WS server error: ${err.message}`));
    });
  });
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n✗", (err as Error).message);
    process.exit(1);
  });
