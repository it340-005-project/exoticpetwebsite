#!/bin/bash
# Build the noarch RPM from this repository. Run on Fedora.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NAME=exotic-pets-site
VERSION=1.0.0
SOURCE_DIR="${HOME}/rpmbuild/SOURCES"
STAGING="$(mktemp -d)"
DEST="${STAGING}/${NAME}-${VERSION}"

cleanup() {
  rm -rf "$STAGING"
}
trap cleanup EXIT

mkdir -p "$SOURCE_DIR" "$DEST/nginx" "$DEST/packaging"

find . -maxdepth 1 -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' \) -exec cp -a {} "$DEST/" \;
cp -a nginx/exoticpets.conf.template "$DEST/nginx/"
cp -a packaging/apply-nginx-conf.sh "$DEST/packaging/"
cp -a packaging/prepare-nginx.sh "$DEST/packaging/"
cp -a .env.example "$DEST/"

tar -C "$STAGING" -czf "${SOURCE_DIR}/${NAME}-${VERSION}.tar.gz" "${NAME}-${VERSION}"
rpmbuild -bb packaging/exotic-pets-site.spec

echo "RPM:"
find "${HOME}/rpmbuild/RPMS" -name "${NAME}-${VERSION}-*.rpm" -print
