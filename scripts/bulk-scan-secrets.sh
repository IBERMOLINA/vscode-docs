#!/usr/bin/env bash
set -euo pipefail

# Bulk secret scan wrapper.
# Usage:
#   scripts/bulk-scan-secrets.sh [--output-dir security] <path-or-url> [<path-or-url> ...]
#   scripts/bulk-scan-secrets.sh --file repos.txt [--output-dir security]
#
# Each target can be a local path or a git URL. For each, we run
# scripts/scan-secrets.sh with --history and place timestamped reports
# under the output directory.

usage() {
  echo "Usage: $0 [--file list.txt] [--output-dir security] <path-or-url>..." >&2
  exit 1
}

OUT_DIR="security"
LIST_FILE=""
declare -a TARGETS

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file)
      LIST_FILE=${2:-}
      shift 2
      ;;
    --output-dir)
      OUT_DIR=${2:-security}
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      TARGETS+=("$1")
      shift
      ;;
  esac
done

if [[ -n "$LIST_FILE" ]]; then
  if [[ ! -f "$LIST_FILE" ]]; then
    echo "List file not found: $LIST_FILE" >&2
    exit 2
  fi
  # Read non-empty, non-comment lines
  while IFS= read -r line; do
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    TARGETS+=("$line")
  done < "$LIST_FILE"
fi

if [[ ${#TARGETS[@]} -eq 0 ]]; then
  usage
fi

mkdir -p "$OUT_DIR"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCAN_SH="$SCRIPT_DIR/scan-secrets.sh"

if [[ ! -x "$SCAN_SH" ]]; then
  echo "Missing or not executable: $SCAN_SH" >&2
  exit 3
}

echo "Starting bulk scan for ${#TARGETS[@]} target(s)..."
for t in "${TARGETS[@]}"; do
  echo "---\nScanning: $t"
  # Pass through output dir; scan-secrets.sh creates timestamped names.
  bash "$SCAN_SH" --history --output-dir "$OUT_DIR" "$t" || true
done

echo "\nBulk scan complete. See $OUT_DIR/ for reports."
