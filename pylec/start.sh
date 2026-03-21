#!/bin/bash
BASEDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$BASEDIR/venv/bin/activate"
python3 "$BASEDIR/librelec.py" "$@"
