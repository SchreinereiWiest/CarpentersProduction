#!/usr/bin/env bash
set -euo pipefail

readonly MODULE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
readonly CONFIG_FILE="/var/lib/asterisk/carpenters/freepbx-adapter.env"

if [[ ! -r "${CONFIG_FILE}" ]]; then
  echo "Carpenters-Konfiguration fehlt oder ist für den Asterisk-Benutzer nicht lesbar: ${CONFIG_FILE}" >&2
  exit 2
fi

exec /usr/bin/python3 -I "${MODULE_DIR}/bin/adapter.py" --env-file "${CONFIG_FILE}"
