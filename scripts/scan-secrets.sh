#!/usr/bin/env bash
set -euo pipefail

# Simple wrapper for running Gitleaks against a local path or a remote repo URL.
# Outputs JSON reports into security/ with timestamped filenames.

usage() {
  echo "Usage: $0 [--history] [--output-dir security] <path-or-git-url>" >&2
  exit 1
}

HISTORY=false
OUT_DIR="security"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --history)
      HISTORY=true
      shift
      ;;
    --output-dir)
      OUT_DIR=${2:-security}
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      TARGET=${1}
      shift
      ;;
  esac
done

if [[ -z "${TARGET:-}" ]]; then
  usage
fi

mkdir -p "${OUT_DIR}" tools

# Resolve gitleaks binary
GL_BIN="./tools/gitleaks-linux-x64"
if [[ ! -x "${GL_BIN}" ]]; then
  GL_VERSION="8.18.4"
  echo "Downloading gitleaks ${GL_VERSION}..."
  curl -fsSL -o tools/gitleaks.tar.gz "https://github.com/gitleaks/gitleaks/releases/download/v${GL_VERSION}/gitleaks_${GL_VERSION}_linux_x64.tar.gz"
  tar -xzf tools/gitleaks.tar.gz -C tools
  mv -f tools/gitleaks "${GL_BIN}" || true
  chmod +x "${GL_BIN}"
fi

timestamp() { date -u +"%Y%m%dT%H%M%SZ"; }

WORKDIR=""
CLEANUP=false

# If TARGET looks like a git URL, clone to a temp directory
if [[ "${TARGET}" =~ ^https?:// || "${TARGET}" =~ \.git$ ]]; then
  WORKDIR=$(mktemp -d)
  CLEANUP=true
  echo "Cloning ${TARGET} to ${WORKDIR}..."
  git clone --depth 1 "${TARGET}" "${WORKDIR}" 1>/dev/null
else
  WORKDIR="${TARGET}"
fi

if [[ ! -d "${WORKDIR}" ]]; then
  echo "Target directory not found: ${WORKDIR}" >&2
  exit 2
fi

NAME=$(basename "${WORKDIR}")
STAMP=$(timestamp)

CURRENT_JSON="${OUT_DIR}/gitleaks-${NAME}-${STAMP}-current.json"
HISTORY_JSON="${OUT_DIR}/gitleaks-${NAME}-${STAMP}-history.json"

echo "Running Gitleaks (current tree) on ${WORKDIR}..."
"${GL_BIN}" detect -s "${WORKDIR}" \
  --report-format json \
  --report-path "${CURRENT_JSON}" \
  --redact \
  --exit-code 0 1>/dev/null || true

if ${HISTORY}; then
  echo "Running Gitleaks (full history) on ${WORKDIR}..."
  # Ensure full history is available when scanning a cloned repo
  if ${CLEANUP}; then
    git -C "${WORKDIR}" fetch --unshallow --tags || true
  fi
  "${GL_BIN}" detect -s "${WORKDIR}" \
    --log-opts="--all" \
    --report-format json \
    --report-path "${HISTORY_JSON}" \
    --redact \
    --exit-code 0 1>/dev/null || true
fi

# Quick summary without jq
summarize() {
  local file="$1"
  if [[ -s "$file" ]]; then
    # Count matches of "RuleID" which appear per finding in gitleaks JSON
    local count
    count=$(grep -o '"RuleID"' "$file" | wc -l | tr -d ' ')
    echo "$file -> findings: ${count}"
  else
    echo "$file -> empty/no findings"
  fi
}

summarize "${CURRENT_JSON}"
${HISTORY} && summarize "${HISTORY_JSON}" || true

${CLEANUP} && rm -rf "${WORKDIR}" || true

echo "Done. Reports are in ${OUT_DIR}/"
