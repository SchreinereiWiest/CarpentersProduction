#!/usr/bin/env bash
set -euo pipefail

readonly SOURCE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly MODULE_SOURCE="${SOURCE_DIR}/module/carpenters"
readonly DIST_DIR="${SOURCE_DIR}/dist"
readonly VERSION="$(sed -n 's:.*<version>\([^<]*\)</version>.*:\1:p' "${MODULE_SOURCE}/module.xml" | head -n 1)"

if [[ -z "${VERSION}" ]]; then
  echo "Keine Modulversion in module.xml gefunden." >&2
  exit 1
fi

readonly TEMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf -- "${TEMP_DIR}"
}
trap cleanup EXIT

install -d -m 0755 "${TEMP_DIR}/carpenters/bin" "${TEMP_DIR}/carpenters/config" "${DIST_DIR}"
cp -a "${MODULE_SOURCE}/." "${TEMP_DIR}/carpenters/"
install -m 0755 "${SOURCE_DIR}/adapter.py" "${TEMP_DIR}/carpenters/bin/adapter.py"
install -m 0644 "${SOURCE_DIR}/adapter.env.example" "${TEMP_DIR}/carpenters/config/adapter.env.example"
install -m 0644 "${SOURCE_DIR}/README.md" "${TEMP_DIR}/carpenters/README.md"
chmod 0755 "${TEMP_DIR}/carpenters/bin/run-adapter.sh"

readonly ARCHIVE="${DIST_DIR}/carpenters-${VERSION}.tar.gz"
tar \
  --sort=name \
  --mtime='UTC 2020-01-01' \
  --owner=0 \
  --group=0 \
  --numeric-owner \
  -czf "${ARCHIVE}" \
  -C "${TEMP_DIR}" \
  carpenters

(
  cd -- "${DIST_DIR}"
  sha256sum "$(basename -- "${ARCHIVE}")" > "$(basename -- "${ARCHIVE}").sha256"
)
echo "FreePBX-Modul erstellt: ${ARCHIVE}"
echo "Prüfsumme: ${ARCHIVE}.sha256"
