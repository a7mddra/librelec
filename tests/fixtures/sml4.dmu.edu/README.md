# sml4.dmu.edu.eg HTML Fixtures

Purpose: store captured sml4.dmu.edu.eg HTML snapshots used by parser/selector tests.

## Naming

Use:

- `<page>.<YYYY-MM-DD>.html`

Example:

- `lecture-1.2026-03-21.html`

## Capture Metadata

When adding a new fixture, note in commit message or PR:

- source URL
- capture date/time
- account context

## Usage

- Prefer deterministic parser tests against these fixtures.
- Keep multiple dated snapshots when sml4.dmu.edu.eg layout changes.

## Security Note

These files can include session and account context data from page scripts.
If repository visibility is public/shared, sanitize sensitive values before commit.

Recommended redaction checklist:

- replace real usernames with stable placeholders
- remove emails, IP addresses, and CSRF/session tokens
- redact JWT/API keys (`intercom`, `adyen`, `paypal`, etc.)
- replace stable account identifiers (user IDs, UUIDs, game IDs) with dummy values
- keep DOM structure, class names, and pdf nodes intact for parser tests
