#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/sanitize-edu-fixture.sh <path-to-html-fixture>

Example:
  scripts/sanitize-edu-fixture.sh tests/fixtures/smlf.dmu.edu/lecture-1.2026-03-21.html
EOF
}

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

target_file="$1"
if [[ ! -f "$target_file" ]]; then
  echo "File not found: $target_file" >&2
  exit 1
fi

tmp_backup="$(mktemp)"
cp "$target_file" "$tmp_backup"

restore_on_error() {
  cp "$tmp_backup" "$target_file"
  rm -f "$tmp_backup"
  echo "Sanitize failed. Original file restored." >&2
}

cleanup() {
  rm -f "$tmp_backup"
}

trap restore_on_error ERR

perl -0777 -i -pe '
  # 1. Moodle Session Keys (sesskey)
  # Found in URLs and JSON config blocks
  s/sesskey=[a-zA-Z0-9]+/sesskey=REDACTED_SESSKEY/g;
  s/"sesskey":"[a-zA-Z0-9]+"/"sesskey":"REDACTED_SESSKEY"/g;

  # 2. User IDs (JSON config and DOM data attributes)
  # Replaces your specific ID (2518) and any others with 0000
  s/"userId":\d+/"userId":0000/g;
  s/data-userid="\d+"/data-userid="0000"/g;
  s/data-user-id="\d+"/data-user-id="0000"/g;

  # 3. Emails (General and Edu)
  # Catches standard emails and protects your edu mail
  s/[A-Za-z0-9._%+-]+\@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/student\@example.edu/g;

  # 4. User Names and Avatar Initials
  # Redacts the Arabic/English name block and the initials inside the avatar tag
  s/title="احمد محمد رمضان حسن ENGELC"/title="Student User"/g;
  s/aria-label="احمد محمد رمضان حسن ENGELC"/aria-label="Student User"/g;
  s/<span class="userinitials[^>]*>.*?<\/span>/<span class="userinitials size-35" title="Student User" aria-label="Student User" role="img">SU<\/span>/g;

  # 5. Generic IP Addresses (Just in case they get logged in JS configs)
  s/\b(?:\d{1,3}\.){3}\d{1,3}\b/0.0.0.0/g;
  
  # 6. Auth tokens / JWTs (If Moodle API payloads get dumped in the DOM later)
  s/"token":"[^"]*"/"token":"REDACTED_TOKEN"/g;
  s/"jwt":"[^"]*"/"jwt":"REDACTED_JWT"/g;
' "$target_file"

trap - ERR
cleanup

echo "Sanitized edu fixture: $target_file"
