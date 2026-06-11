#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CACHE_ROOT="${CACHE_ROOT:-/data/toby/ai-workbench/cache}"
PUB_CACHE="$CACHE_ROOT/alpha-receipt-flutter-pub"
GRADLE_CACHE="$CACHE_ROOT/alpha-receipt-gradle"

mkdir -p "$ROOT/dist" "$PUB_CACHE" "$GRADLE_CACHE"

docker run --rm \
  -v "$ROOT/mobile:/work" \
  -v "$PUB_CACHE:/root/.pub-cache" \
  -v "$GRADLE_CACHE:/root/.gradle" \
  -w /work \
  ghcr.io/cirruslabs/flutter:stable \
  bash -lc 'flutter pub get && flutter build apk --debug'

cp "$ROOT/mobile/build/app/outputs/flutter-apk/app-debug.apk" \
   "$ROOT/dist/alpha-receipt-scanner-debug.apk"

stat -c 'APK: %n %s bytes' "$ROOT/dist/alpha-receipt-scanner-debug.apk"
sha256sum "$ROOT/dist/alpha-receipt-scanner-debug.apk"
