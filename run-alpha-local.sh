#!/usr/bin/env bash
set -euo pipefail

APP_NAME="alpha-receipt-scanner"
REDIS_NAME="alpha-receipt-redis"
NETWORK="alpha-receipts-net"
IMAGE="alpha-receipt-scanner:local"
PORT="${PORT:-18080}"
DATA_ROOT="${DATA_ROOT:-/data/toby/alpha-receipt-scanner}"

mkdir -p "$DATA_ROOT/data" "$DATA_ROOT/sqlite" "$DATA_ROOT/logs"

docker network create "$NETWORK" >/dev/null 2>&1 || true

docker rm -f "$REDIS_NAME" >/dev/null 2>&1 || true
docker run -d --name "$REDIS_NAME" --network "$NETWORK" redis:alpine >/dev/null

docker rm -f "$APP_NAME" >/dev/null 2>&1 || true
docker run -d \
  --name "$APP_NAME" \
  --network "$NETWORK" \
  -p "$PORT:80" \
  -e ENCRYPTION_KEY="${ENCRYPTION_KEY:-alpha-local-encryption-key-change-before-prod}" \
  -e SECRET_KEY="${SECRET_KEY:-alpha-local-secret-key-change-before-prod}" \
  -e DB_ENGINE="sqlite" \
  -e DB_FILENAME="alpha-receipts.db" \
  -e REDIS_HOST="$REDIS_NAME" \
  -e REDIS_PORT="6379" \
  -v "$DATA_ROOT/data:/app/receipt-wrangler-api/data" \
  -v "$DATA_ROOT/sqlite:/app/receipt-wrangler-api/sqlite" \
  -v "$DATA_ROOT/logs:/app/receipt-wrangler-api/logs" \
  "$IMAGE" >/dev/null

printf 'Alpha Receipt Scanner running: http://127.0.0.1:%s/\n' "$PORT"
docker ps --filter name=alpha-receipt --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
