// Copyright 2026 a7mddra
// SPDX-License-Identifier: MIT

import { WebSocketServer, WebSocket } from "ws";

const WS_PORT = 27631;

export type WsState = {
  server: WebSocketServer;
  client: WebSocket | null;
  port: number;
};

type ResponseHandler = {
  resolve: (data: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

let wsState: WsState | null = null;
let pendingResponse: ResponseHandler | null = null;
let onConnect: (() => void) | null = null;
let onDisconnect: (() => void) | null = null;
let onMessage: ((data: unknown) => void) | null = null;

// ── Start / Stop ─────────────────────────────────────────────────

export function startWsServer(callbacks: {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (data: unknown) => void;
}): WsState {
  onConnect = callbacks.onConnect ?? null;
  onDisconnect = callbacks.onDisconnect ?? null;
  onMessage = callbacks.onMessage ?? null;

  const server = new WebSocketServer({ port: WS_PORT });

  wsState = { server, client: null, port: WS_PORT };

  server.on("connection", (socket) => {
    wsState!.client = socket;
    onConnect?.();

    socket.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString()) as unknown;

        // If there's a pending request, resolve it
        if (pendingResponse) {
          clearTimeout(pendingResponse.timer);
          pendingResponse.resolve(data);
          pendingResponse = null;
        }

        onMessage?.(data);
      } catch {
        // ignore bad JSON
      }
    });

    socket.on("close", () => {
      wsState!.client = null;
      onDisconnect?.();
    });
  });

  return wsState;
}

export function stopWsServer(): void {
  if (pendingResponse) {
    clearTimeout(pendingResponse.timer);
    pendingResponse.reject(new Error("Server shutting down"));
    pendingResponse = null;
  }
  wsState?.client?.close();
  wsState?.server.close();
  wsState = null;
}

// ── Send Command + Await Response ────────────────────────────────

export function sendCommand<T = unknown>(
  cmd: object,
  timeoutMs = 60_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!wsState?.client || wsState.client.readyState !== WebSocket.OPEN) {
      reject(new Error("No active WebSocket connection"));
      return;
    }

    // Cancel any previous pending
    if (pendingResponse) {
      clearTimeout(pendingResponse.timer);
      pendingResponse.reject(new Error("Superseded by new command"));
    }

    const timer = setTimeout(() => {
      pendingResponse = null;
      reject(new Error(`Command timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    pendingResponse = {
      resolve: resolve as (data: unknown) => void,
      reject,
      timer,
    };

    wsState.client.send(JSON.stringify(cmd));
  });
}

export function isConnected(): boolean {
  return wsState?.client?.readyState === WebSocket.OPEN;
}

export function getPort(): number {
  return WS_PORT;
}
