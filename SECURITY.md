# Security Policy

## Educational Purpose

LibreLec is developed strictly for **educational purposes** and personal study needs — enabling students to use accessibility tools (like NotebookLM, iPad annotation apps, or offline readers) with lecture materials they already have legitimate access to.

## Disclaimer

- **Use at your own risk.** The authors are not responsible for how you use this tool.
- This tool facilitates access to materials you **already have legal access to** (via your university login) but cannot download locally due to technical restrictions in the viewer.
- Please respect your institution's Acceptable Use Policy (AUP) and copyright regulations.
- The authors are not liable for any account suspensions or academic disciplinary actions resulting from misuse.

## How It Works

The Chrome Extension reads pixel data from `<canvas>` elements rendered by the university's PDF viewer. It does **not** modify, intercept, or decrypt any content — it simply captures what is already visually displayed on your screen.

## Reporting Vulnerabilities

If you find a security vulnerability in the code or dependencies, please open an issue on the repository.

**Do not** report "this tool captures rendered canvas content" as a vulnerability — that is the intended functionality.

## Supported Versions

Only the latest version published to npm (`librelec@latest`) and the latest GitHub Release are supported.
