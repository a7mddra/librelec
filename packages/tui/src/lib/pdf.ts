// Copyright 2026 a7mddra
// SPDX-License-Identifier: MIT

import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, homedir, platform } from "node:os";

// ── Temp Directory ───────────────────────────────────────────────

let tempDir: string | null = null;

export function getTempDir(): string {
  if (!tempDir) {
    const base = tmpdir();
    tempDir = join(base, `librelec-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
}

// ── Output Directory (OS-aware) ──────────────────────────────────

export function getOutputDir(): string {
  const home = homedir();
  const os = platform();

  const candidates: string[] = [];

  if (os === "win32") {
    // Windows: Documents > Desktop > home
    candidates.push(join(home, "Documents"), join(home, "Desktop"), home);
  } else if (os === "darwin") {
    // macOS: Documents > Desktop > home
    candidates.push(join(home, "Documents"), join(home, "Desktop"), home);
  } else {
    // Linux: Documents > Desktop > home
    candidates.push(join(home, "Documents"), join(home, "Desktop"), home);
  }

  // Fallback
  candidates.push(process.cwd(), tmpdir());

  for (const dir of candidates) {
    try {
      mkdirSync(dir, { recursive: true });
      return dir;
    } catch {
      continue;
    }
  }

  return tmpdir();
}

// ── Save Slide PNG ───────────────────────────────────────────────

export function saveSlideFromDataUrl(
  dataUrl: string,
  slideIndex: number,
): string {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  const buffer = Buffer.from(base64, "base64");
  const dir = getTempDir();
  const path = join(dir, `slide_${String(slideIndex).padStart(3, "0")}.png`);
  writeFileSync(path, buffer);
  return path;
}

// ── Compress Single Image ────────────────────────────────────────

export async function compressImage(pngPath: string): Promise<Buffer> {
  const img = sharp(pngPath);
  const metadata = await img.metadata();

  let pipeline = sharp(pngPath);

  // Resize if wider than 2000px (presentation slides don't need 4K)
  if (metadata.width && metadata.width > 2000) {
    pipeline = pipeline.resize({ width: 2000, withoutEnlargement: true });
  }

  // Convert to JPEG quality 85 — iLovePDF-tier compression
  // Preserves text sharpness, drops ~95% file size vs raw PNG
  return pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
}

// ── Assemble PDF ─────────────────────────────────────────────────

export async function assemblePdf(
  pdfName: string,
  onProgress?: (current: number, total: number) => void,
): Promise<{ path: string; sizeBytes: number }> {
  const dir = getTempDir();
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".png"))
    .sort();

  const total = files.length;
  const pdfDoc = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const pngPath = join(dir, files[i]!);

    // Compress PNG → JPEG buffer via Sharp
    const jpegBuffer = await compressImage(pngPath);

    // Embed in PDF
    const jpegImage = await pdfDoc.embedJpg(jpegBuffer);
    const { width, height } = jpegImage.scale(1);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(jpegImage, { x: 0, y: 0, width, height });

    onProgress?.(i + 1, total);
  }

  const pdfBytes = await pdfDoc.save();
  const outputDir = getOutputDir();

  // Sanitize filename
  const safeName =
    pdfName.replace(/[^a-zA-Z0-9\s\-_\u0600-\u06FF]/g, "").trim() || "lecture";

  const outputPath = join(outputDir, `${safeName}.pdf`);
  writeFileSync(outputPath, pdfBytes);

  return { path: outputPath, sizeBytes: pdfBytes.length };
}

// ── Cleanup ──────────────────────────────────────────────────────

export function cleanupTemp(): void {
  if (tempDir) {
    try {
      const { rmSync } = require("node:fs") as typeof import("node:fs");
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
    tempDir = null;
  }
}
