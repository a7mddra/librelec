/**
 * Page Bridge Test
 *
 * Tests the full pipeline: WS → background → content → page-bridge → canvas.
 * Sends a "scan" to discover pages, then "extract" page 1 and saves it as test.png.
 *
 * Prerequisites:
 *   1. Extension loaded unpacked from packages/ext/dist/
 *   2. Chrome has a tab open on a sml4.dmu.edu.eg page with a protected PDF visible
 *
 * Run: npm run test:page-bridge
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WS_PORT = 27631;
const TIMEOUT_MS = 120_000; // 2 minutes — generous for WS backoff reconnect

interface ScanResult {
  cmd: "scan:result";
  pageCount: number;
  title: string;
}

interface ExtractResult {
  cmd: "extract:result";
  page: number;
  dataUrl: string;
}

interface ErrorResult {
  cmd: "error";
  message: string;
}

type Response = ScanResult | ExtractResult | ErrorResult;

function sendAndWait(
  ws: import("ws").WebSocket,
  command: object,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Response timed out")),
      TIMEOUT_MS,
    );

    ws.once("message", (raw) => {
      clearTimeout(timeout);
      resolve(JSON.parse(raw.toString()) as Response);
    });

    ws.send(JSON.stringify(command));
  });
}

async function run(): Promise<void> {
  return new Promise((outerResolve, outerReject) => {
    const globalTimeout = setTimeout(() => {
      wss.close();
      outerReject(
        new Error(
          `Timed out after ${TIMEOUT_MS / 1000}s — no connection from extension.`,
        ),
      );
    }, TIMEOUT_MS);

    console.log(
      `\n⏳ Waiting for extension to connect on ws://127.0.0.1:${WS_PORT}...`,
    );
    console.log(
      `   (Chrome must have the extension loaded + a protected lecture page open)\n`,
    );

    const wss = new WebSocketServer({ port: WS_PORT });

    wss.on("connection", async (ws) => {
      clearTimeout(globalTimeout);
      console.log("✓ Extension connected!\n");

      try {
        // ── Step 1: Scan ──────────────────────────────
        console.log("  → Sending scan...");
        const scanRes = await sendAndWait(ws, { cmd: "scan" });

        if (scanRes.cmd === "error") {
          throw new Error(`scan failed: ${scanRes.message}`);
        }

        if (scanRes.cmd !== "scan:result") {
          throw new Error(`Unexpected response: ${JSON.stringify(scanRes)}`);
        }

        console.log(
          `  ✓ Scan: ${scanRes.pageCount} pages found — "${scanRes.title}"`,
        );

        if (scanRes.pageCount === 0) {
          throw new Error(
            "No pages found — is a protected PDF loaded in the browser?",
          );
        }

        // ── Step 2: Extract page 1 ────────────────────
        console.log("  → Extracting page 1...");
        const extractRes = await sendAndWait(ws, { cmd: "extract", page: 1 });

        if (extractRes.cmd === "error") {
          throw new Error(`extract failed: ${extractRes.message}`);
        }

        if (extractRes.cmd !== "extract:result") {
          throw new Error(
            `Unexpected response: ${JSON.stringify(extractRes)}`,
          );
        }

        if (!extractRes.dataUrl.startsWith("data:image/png;base64,")) {
          throw new Error(
            `dataUrl doesn't start with expected prefix: ${extractRes.dataUrl.slice(0, 40)}...`,
          );
        }

        // ── Step 3: Save to test.png ──────────────────
        const base64 = extractRes.dataUrl.replace(
          "data:image/png;base64,",
          "",
        );
        const buffer = Buffer.from(base64, "base64");
        const outPath = resolve(__dirname, "..", "test.png");
        writeFileSync(outPath, buffer);

        console.log(`\n── Result ────────────────────────────────`);
        console.log(`  Page:     ${extractRes.page}`);
        console.log(`  Size:     ${(buffer.length / 1024).toFixed(1)} KB`);
        console.log(`  Saved to: ${outPath}`);
        console.log(`──────────────────────────────────────────\n`);

        if (buffer.length < 100) {
          throw new Error("Image is suspiciously small — probably empty.");
        }

        console.log("✓ PASS — page-bridge extraction working!\n");

        ws.close();
        wss.close(() => outerResolve());
      } catch (err) {
        ws.close();
        wss.close(() => outerReject(err));
      }
    });

    wss.on("error", (err) => {
      clearTimeout(globalTimeout);
      outerReject(new Error(`WS server error: ${err.message}`));
    });
  });
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n✗", (err as Error).message);
    process.exit(1);
  });
