# LibreLec 🔓

Extract high-resolution slides from protected university lecture viewers and save them as compressed, study-ready PDFs.

LibreLec works as a **Chrome Extension** paired with a **Terminal UI** (TUI). The extension reads canvas pixels directly from the browser — no external automation, no headless browsers, no extra downloads. Just your own Chrome and a single npm command.

## Features ✨

- **Canvas Capture**: Reads rendered pixels straight from the viewer's `<canvas>` elements — bypasses disabled download buttons entirely.
- **High Resolution**: Captures slides at native browser resolution for crisp text.
- **Smart Compression**: Each slide is optimized via Sharp (PNG → JPEG, quality 85) before assembly — 70 MB of raw slides becomes a ~2–3 MB PDF.
- **Cross-Platform**: Works on Linux, macOS, and Windows — anywhere Chrome and Node.js run.
- **Step-by-Step TUI**: Guided terminal interface with progress bars, colored output, and keyboard navigation.

---

## 🚀 Getting Started

### 1. Install the CLI

Default (npm):

```bash
npm install -g librelec
```

Optional (GitHub Packages):

```bash
npm config set @a7mddra:registry https://npm.pkg.github.com
npm install -g @a7mddra/librelec
```

### 2. Install the Chrome Extension

1. Download `librelec-extension.zip` from **[GitHub Releases](https://github.com/a7mddra/librelec/releases/download/v0.1.0/librelec-extension.zip)**.
2. Extract the zip file.
3. Open [`chrome://extensions`](chrome://extensions) in your browser.
4. Enable **"Developer mode"** (toggle in the top right).
5. Click **"Load unpacked"** and select the extracted folder.
   _(Note: If Chrome shows any errors on the extension card, you can safely ignore them.)_

### 3. Extract Lectures

1. Open the protected lecture page in Chrome and **log in normally**.
2. In your terminal, run: `librelec`.
3. The TUI will:
   - Wait for the extension to connect.
   - Scan for protected slides.
   - Ask you for a PDF filename.
   - Extract every slide with a progress bar.
   - Compress and merge them into a single PDF.
   - Save to your `~/Documents` folder.

---

## 📦 Architecture

```text
┌─────────────────┐       WebSocket        ┌─────────────────┐
│  Chrome Extension│◄────────────────────►│   Terminal UI     │
│  (canvas reader) │    ws://localhost:27631│  (librelec CLI) │
└─────────────────┘                        └─────────────────┘
        │                                          │
   page-bridge.ts                             Sharp + pdf-lib
   canvas.toDataURL()                      PNG→JPEG → PDF assembly
```

| Package        | Purpose                                                             |
| -------------- | ------------------------------------------------------------------- |
| `packages/ext` | Chrome Extension (MV3) — reads canvas pixels from protected viewers |
| `packages/tui` | Terminal UI — WS server, extraction orchestration, PDF compression  |

---

## 🛠 Development

```bash
# Install dependencies
npm install

# Build both packages
npm run build:ext
npm run build:tui

# Run TUI in dev mode
npm run dev:tui

# Typecheck
npm run tsc:ext
npm run tsc:tui
```

### Releasing

```bash
# Publish current TUI version (npm + GitHub Packages)
npm run publish:tui

# Bump TUI → push commit → publish to npm + GitHub Packages
node scripts/bump.mjs tui 0.2.0

# Bump Extension → push tag → triggers GitHub Release
node scripts/bump.mjs ext 0.2.0
```

---

## ⚠️ Disclaimer

This tool is for **personal study use only**. It helps you access materials you already have legitimate access to through your university login. Please respect your institution's intellectual property and acceptable use policies. Do not distribute copyrighted materials.

## 📄 License

[MIT](LICENSE) © [a7mddra](https://github.com/a7mddra)
