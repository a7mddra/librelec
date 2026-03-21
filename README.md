# LibreLec 🔓

`LibreLec` is a Python tool designed to extract high-resolution slides from protected university viewers (like PDF.js with DRM wrappers). It "hijacks" the browser canvas to reconstruct the document as a clean, local PDF, enabling you to study using modern tools like Google NotebookLM, iPad annotation apps, or simply offline.

## Features ✨

- **Canvas Hijack Protocol**: Captures the raw rendered pixels, bypassing disabled download buttons.
- **Retina Quality**: Uses a 2.5x device scale factor to ensure text remains crisp for OCR and AI processing.
- **Smart Auto-Discovery**: Detects DRM protection frames automatically.
- **Manual Login**: You log in securely with your own hands; the bot simply takes over once you're in.
- **Batch Friendly**: Smart naming (`Lec1`, `Lec2`, etc.) for extracting a whole semester quickly.

---

## 🚀 Getting Started

### 🐧 Linux / macOS

We have a one-click setup script that handles the virtual environment (`venv`) and dependencies.

1.  **Open your terminal** in the project folder.
2.  **Run the setup script**:
    ```bash
    chmod +x setup_env.sh
    ./setup_env.sh
    ```
3.  **Launch the tool**:
    ```bash
    ./start.sh
    ```

### 🪟 Windows

1.  **Create a Virtual Environment**:

    ```cmd
    python -m venv venv
    ```

2.  **Activate it**:

    ```cmd
    venv\Scripts\activate
    ```

3.  **Run the Installer**:
    This script will install all dependencies (including `nest_asyncio`) and the Chromium browser engine.

    ```cmd
    python setup.py
    ```

4.  **Run the Tool**:
    ```cmd
    python librelec.py
    ```

---

## 📖 How to Use

1.  **Launch `LibreLec`**.
2.  Select **PDF Document** from the menu.
3.  Paste your university's login URL (defaults to DMU SML4).
4.  A browser window will open. **Log in manually**.
5.  Navigate to the page with the locked PDF viewer.
6.  Return to the terminal and press `ENTER`.
7.  The tool will:
    - Find the PDF frame.
    - Count the pages.
    - Scan each page at high resolution.
    - Merge them into a PDF in your `Documents` folder.

## ⚠️ Disclaimer

This tool is for **personal study use only**. Please respect your university's intellectual property and acceptable use policies. Don't distribute copyrighted materials.
