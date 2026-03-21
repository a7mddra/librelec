// Copyright 2026 a7mddra
// SPDX-License-Identifier: MIT

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { SpinnerText } from "./components/SpinnerText";
import { UI_COLORS, LOGO, gradient } from "./lib";
import { startWsServer, stopWsServer, sendCommand, getPort } from "./lib/ws";
import { saveSlideFromDataUrl, assemblePdf, cleanupTemp } from "./lib/pdf";

// ── BiDi Text Helper ─────────────────────────────────────────────
// Wrap text in Unicode LRI (Left-to-Right Isolate) so the terminal's
// BiDi algorithm treats it as a single directional run and doesn't
// reorder surrounding LTR content.
const LRI = "\u2066";
const PDI = "\u2069";
function bidi(text: string | undefined): string {
  if (!text) return "";
  return `${LRI}${text}${PDI}`;
}

// ── Types ────────────────────────────────────────────────────────

type Step =
  | "idle"
  | "connected"
  | "scanning"
  | "scanned"
  | "extracting"
  | "assembling"
  | "done"
  | "error";

type TabInfo = { title: string; url: string };
type ScanResult = { cmd: string; pageCount: number; title: string };
type ExtractResult = { cmd: string; page: number; dataUrl: string };
type ErrorResult = { cmd: string; message: string };

// ── Gradient Logo Component ──────────────────────────────────────

const GradientLogo = (): React.JSX.Element => {
  const maxLen = Math.max(...LOGO.map((l) => l.length));
  const colors = gradient(maxLen);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {LOGO.map((line, lineIdx) => (
        <Text key={lineIdx}>
          {[...line].map((char, charIdx) => (
            <Text key={charIdx} color={colors[charIdx]}>
              {char}
            </Text>
          ))}
        </Text>
      ))}
    </Box>
  );
};

// ── Progress Bar ─────────────────────────────────────────────────

const ProgressBar = ({
  current,
  total,
  width = 30,
}: {
  current: number;
  total: number;
  width?: number;
}): React.JSX.Element => {
  const pct = total > 0 ? current / total : 0;
  const filled = Math.round(pct * width);
  const empty = width - filled;

  return (
    <Text>
      <Text color={UI_COLORS.accent}>{"█".repeat(filled)}</Text>
      <Text color={UI_COLORS.muted}>{"░".repeat(empty)}</Text>
      <Text color={UI_COLORS.text}>
        {" "}
        {current}/{total}{" "}
      </Text>
      <Text color={UI_COLORS.spinner}>{Math.round(pct * 100)}%</Text>
    </Text>
  );
};

// ── App ──────────────────────────────────────────────────────────

export const App = (): React.JSX.Element => {
  const { exit } = useApp();

  const [step, setStep] = useState<Step>("idle");
  const [tabInfo, setTabInfo] = useState<TabInfo | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [docTitle, setDocTitle] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [extractProgress, setExtractProgress] = useState({
    current: 0,
    total: 0,
  });
  const [assembleProgress, setAssembleProgress] = useState({
    current: 0,
    total: 0,
  });
  const [resultPath, setResultPath] = useState("");
  const [resultSize, setResultSize] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [idleSeconds, setIdleSeconds] = useState(0);

  // ── Idle timer: count seconds while waiting for connection ──

  useEffect(() => {
    if (step !== "idle") {
      setIdleSeconds(0);
      return;
    }

    const timer = setInterval(() => {
      setIdleSeconds((prev) => prev + 1);
    }, 1_000);

    return () => clearInterval(timer);
  }, [step]);

  // ── Boot: Start WS server ──────────────────────────────────

  useEffect(() => {
    startWsServer({
      onConnect: () => {
        setStep("connected");
      },
      onDisconnect: () => {
        // Only reset if we're not in the middle of work
        setStep((prev) => {
          if (prev === "done" || prev === "error") return prev;
          return "idle";
        });
        setTabInfo(null);
      },
    });

    return () => stopWsServer();
  }, []);

  // ── On connect: auto-ping for tab info ─────────────────────

  useEffect(() => {
    if (step !== "connected") return;

    const ping = async () => {
      try {
        const res = await sendCommand<{ cmd: string; tab: TabInfo }>({
          cmd: "ping",
        });
        if (res.tab?.title) {
          setTabInfo(res.tab);
        }
      } catch {
        // extension might not be ready, ignore
      }
    };

    ping();
  }, [step]);

  // ── Extraction pipeline ────────────────────────────────────

  const startExtraction = useCallback(async () => {
    setStep("scanning");

    try {
      // Step 1: Scan
      const scanRes = await sendCommand<ScanResult | ErrorResult>({
        cmd: "scan",
      });

      if ("message" in scanRes) {
        throw new Error(scanRes.message);
      }

      setPageCount(scanRes.pageCount);
      setDocTitle(scanRes.title);

      if (scanRes.pageCount === 0) {
        throw new Error("No slides found — is a protected PDF loaded?");
      }

      setStep("scanned");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  }, []);

  const startExtracting = useCallback(async () => {
    setStep("extracting");
    const total = pageCount;
    setExtractProgress({ current: 0, total });

    try {
      for (let page = 1; page <= total; page++) {
        const res = await sendCommand<ExtractResult | ErrorResult>({
          cmd: "extract",
          page,
        });

        if ("message" in res) {
          throw new Error(`Page ${page}: ${res.message}`);
        }

        saveSlideFromDataUrl(res.dataUrl, page);
        setExtractProgress({ current: page, total });
      }

      // Step 2: Assemble PDF
      setStep("assembling");
      setAssembleProgress({ current: 0, total });

      const result = await assemblePdf(pdfName, (current, t) => {
        setAssembleProgress({ current, total: t });
      });

      setResultPath(result.path);
      const sizeMB = (result.sizeBytes / (1024 * 1024)).toFixed(1);
      setResultSize(`${sizeMB} MB`);

      cleanupTemp();
      setStep("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  }, [pageCount, pdfName]);

  // ── Key input handling ─────────────────────────────────────

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      cleanupTemp();
      stopWsServer();
      exit();
      return;
    }

    if (step === "connected") {
      if (key.return) {
        startExtraction();
      }
    }

    if (step === "scanned") {
      if (key.return && pdfName.trim()) {
        startExtracting();
      } else if (key.backspace || key.delete) {
        setPdfName((prev) => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta && !key.return) {
        setPdfName((prev) => prev + input);
      }
    }

    if (step === "done" || step === "error") {
      if (key.return) {
        // Reset for another extraction
        setStep("connected");
        setPdfName("");
        setExtractProgress({ current: 0, total: 0 });
        setAssembleProgress({ current: 0, total: 0 });
        setResultPath("");
        setResultSize("");
        setErrorMsg("");
      }

      if (input === "q") {
        cleanupTemp();
        stopWsServer();
        exit();
      }
    }
  });

  // ── Render ─────────────────────────────────────────────────

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <GradientLogo />

      {/* Status line */}
      <Box marginBottom={1}>
        <Text color={UI_COLORS.muted}> ws://localhost:{getPort()}</Text>
      </Box>

      {/* Step: Idle */}
      {step === "idle" && (
        <Box flexDirection="column">
          <Box>
            <SpinnerText color={UI_COLORS.spinner} />
            <Text color={UI_COLORS.text}> Waiting for Chrome extension...</Text>
            <Text color={UI_COLORS.muted}> ({idleSeconds}s)</Text>
          </Box>
          {idleSeconds >= 90 && (
            <Box marginLeft={2} marginTop={1} flexDirection="column">
              <Text color={UI_COLORS.warning}>⚠ Taking too long?</Text>
              <Text color={UI_COLORS.muted}>
                {"  "}Try reloading the extension in chrome://extensions
              </Text>
              <Text color={UI_COLORS.muted}>
                {"  "}or refresh the university page.
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Step: Connected */}
      {step === "connected" && (
        <Box flexDirection="column">
          <Box>
            <Text color={UI_COLORS.success}>✓</Text>
            <Text color={UI_COLORS.text}> Chrome connected</Text>
          </Box>
          {tabInfo && (
            <Box marginLeft={2} marginTop={0}>
              <Text color={UI_COLORS.muted}>{bidi(tabInfo.title)}</Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text color={UI_COLORS.accent}>▸ </Text>
            <Text color={UI_COLORS.highlight}>
              Press ENTER to scan for slides
            </Text>
          </Box>
        </Box>
      )}

      {/* Step: Scanning */}
      {step === "scanning" && (
        <Box>
          <SpinnerText color={UI_COLORS.spinner} />
          <Text color={UI_COLORS.text}> Scanning for protected slides...</Text>
        </Box>
      )}

      {/* Step: Scanned — filename prompt */}
      {step === "scanned" && (
        <Box flexDirection="column">
          <Box>
            <Text color={UI_COLORS.success}>✓</Text>
            <Text color={UI_COLORS.text}>
              {" "}
              Found{" "}
              <Text color={UI_COLORS.accent} bold>
                {pageCount}
              </Text>{" "}
              slides
            </Text>
          </Box>
          <Box marginLeft={2}>
            <Text color={UI_COLORS.muted}>{bidi(docTitle)}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={UI_COLORS.accent}>▸ </Text>
            <Text color={UI_COLORS.text}>PDF name: </Text>
            <Text color={UI_COLORS.highlight} bold>
              {pdfName || "…"}
            </Text>
            <Text color={UI_COLORS.muted}>.pdf</Text>
          </Box>
          <Box marginTop={0} marginLeft={2}>
            <Text color={UI_COLORS.muted}>type a name, then press ENTER</Text>
          </Box>
        </Box>
      )}

      {/* Step: Extracting */}
      {step === "extracting" && (
        <Box flexDirection="column">
          <Box>
            <SpinnerText color={UI_COLORS.spinner} />
            <Text color={UI_COLORS.text}>
              {" "}
              Extracting slide{" "}
              <Text color={UI_COLORS.accent} bold>
                {extractProgress.current}
              </Text>
              /{extractProgress.total}
            </Text>
          </Box>
          <Box marginLeft={2} marginTop={0}>
            <ProgressBar
              current={extractProgress.current}
              total={extractProgress.total}
            />
          </Box>
        </Box>
      )}

      {/* Step: Assembling */}
      {step === "assembling" && (
        <Box flexDirection="column">
          <Box>
            <SpinnerText color={UI_COLORS.spinner} />
            <Text color={UI_COLORS.text}>
              {" "}
              Building PDF — compressing{" "}
              <Text color={UI_COLORS.accent} bold>
                {assembleProgress.current}
              </Text>
              /{assembleProgress.total}
            </Text>
          </Box>
          <Box marginLeft={2} marginTop={0}>
            <ProgressBar
              current={assembleProgress.current}
              total={assembleProgress.total}
            />
          </Box>
        </Box>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <Box flexDirection="column">
          <Box>
            <Text color={UI_COLORS.success} bold>
              ✓ PDF saved!
            </Text>
          </Box>
          <Box marginLeft={2} marginTop={0}>
            <Text color={UI_COLORS.text}>{resultPath}</Text>
          </Box>
          <Box marginLeft={2}>
            <Text color={UI_COLORS.muted}>Size: {resultSize}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={UI_COLORS.accent}>▸ </Text>
            <Text color={UI_COLORS.highlight}>ENTER</Text>
            <Text color={UI_COLORS.muted}> extract another </Text>
            <Text color={UI_COLORS.accent}>▸ </Text>
            <Text color={UI_COLORS.highlight}>Q</Text>
            <Text color={UI_COLORS.muted}> quit</Text>
          </Box>
        </Box>
      )}

      {/* Step: Error */}
      {step === "error" && (
        <Box flexDirection="column">
          <Box>
            <Text color={UI_COLORS.error} bold>
              ✗ Error
            </Text>
          </Box>
          <Box marginLeft={2}>
            <Text color={UI_COLORS.error}>{errorMsg}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={UI_COLORS.accent}>▸ </Text>
            <Text color={UI_COLORS.highlight}>ENTER</Text>
            <Text color={UI_COLORS.muted}> retry </Text>
            <Text color={UI_COLORS.accent}>▸ </Text>
            <Text color={UI_COLORS.highlight}>Q</Text>
            <Text color={UI_COLORS.muted}> quit</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};
