#!/usr/bin/env bash
# deploy-coolify.sh — Deploy all marketing-go services to Coolify
# Prerequisites: jq, curl    |    Run generate-secrets.sh first
set -euo pipefail

# ──────────────────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────────────────
COOLIFY_BASE="https://coolify.exryinnovationlab.com"
COOLIFY_TOKEN="11|vFoCYyOmaJ9qV91tYiDqRG4QJQcfba84GfFAT4ned8542463"
SERVER_UUID="x40okgws8ws04gok8s4swkc0"
PROJECT_UUID="o08wog040cwsgs08owk04c4k"
ENV_NAME="production"
DOMAIN="exryinnovationlab.com"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS_FILE="$ROOT/.secrets"
ENV_FILE="$ROOT/.env.local"

# ──────────────────────────────────────────────────────────
# Guards
# ──────────────────────────────────────────────────────────
command -v jq   >/dev/null 2>&1 || { echo "❌  jq required: brew install jq"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "❌  curl required"; exit 1; }
[[ -f "$SECRETS_FILE" ]] || { echo "❌  .secrets not found — run: bash scripts/generate-secrets.sh"; exit 1; }

# shellcheck source=/dev/null
source "$SECRETS_FILE"

# ──────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────
coolify_post() {
  local path="$1" body="$2"
  curl -sf -X POST \
    -H "Authorization: Bearer $COOLIFY_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$body" \
    "$COOLIFY_BASE/api/v1$path"
}

create_service() {
  local name="$1" description="$2" compose="$3"
  # Coolify requires docker_compose_raw to be base64-encoded
  local compose_b64
  compose_b64=$(printf '%s' "$compose" | base64)
  coolify_post /services "$(jq -n \
    --arg srv     "$SERVER_UUID" \
    --arg prj     "$PROJECT_UUID" \
    --arg env     "$ENV_NAME" \
    --arg name    "$name" \
    --arg desc    "$description" \
    --arg compose "$compose_b64" \
    '{
      server_uuid:        $srv,
      project_uuid:       $prj,
      environment_name:   $env,
      name:               $name,
      description:        $desc,
      docker_compose_raw: $compose,
      instant_deploy:     true
    }'
  )"
}

get_uuid() { jq -r '.uuid // .data.uuid // empty'; }

aenv() { printf '%s\n' "$1" >> "$ENV_FILE"; }
section() { printf '\n▶  %s\n' "$1"; }

# ──────────────────────────────────────────────────────────
# Init .env.local
# ──────────────────────────────────────────────────────────
cat > "$ENV_FILE" <<ENVHEADER
# marketing-go — generated $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# ⚠️  DO NOT COMMIT — this file is gitignored

COOLIFY_URL=https://coolify.exryinnovationlab.com/project/${PROJECT_UUID}/environment/x80o8oockkk8wos0088cog8g
COOLIFY_TOKEN=${COOLIFY_TOKEN}

ENVHEADER

# ──────────────────────────────────────────────────────────
# 1. PostgreSQL (main app DB)
# ──────────────────────────────────────────────────────────
section "Creating PostgreSQL (postgres:16-alpine)"

PG_UUID=$(coolify_post /databases/postgresql "$(jq -n \
  --arg srv "$SERVER_UUID" \
  --arg prj "$PROJECT_UUID" \
  --arg env "$ENV_NAME" \
  --arg pw  "$POSTGRES_PASSWORD" \
  '{
    server_uuid:       $srv,
    project_uuid:      $prj,
    environment_name:  $env,
    name:              "marketing-go-postgres",
    description:       "Main PostgreSQL for marketing-go",
    postgres_db:       "marketing_go",
    postgres_user:     "marketing_go",
    postgres_password: $pw,
    image:             "postgres:16-alpine",
    is_public:         false,
    instant_deploy:    true
  }'
)" | get_uuid)

echo "   ✅ uuid: $PG_UUID"
aenv "# ── PostgreSQL ──────────────────────────────────────"
aenv "DATABASE_URL=postgresql://marketing_go:${POSTGRES_PASSWORD}@marketing-go-postgres:5432/marketing_go"
aenv "DIRECT_URL=postgresql://marketing_go:${POSTGRES_PASSWORD}@marketing-go-postgres:5432/marketing_go"
aenv "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}"
aenv ""

# ──────────────────────────────────────────────────────────
# 2. Redis (cache + BullMQ)
# ──────────────────────────────────────────────────────────
section "Creating Redis (redis:7-alpine)"

REDIS_UUID=$(coolify_post /databases/redis "$(jq -n \
  --arg srv "$SERVER_UUID" \
  --arg prj "$PROJECT_UUID" \
  --arg env "$ENV_NAME" \
  --arg pw  "$REDIS_PASSWORD" \
  '{
    server_uuid:      $srv,
    project_uuid:     $prj,
    environment_name: $env,
    name:             "marketing-go-redis",
    description:      "Redis cache + BullMQ queues",
    image:            "redis:7-alpine",
    redis_password:   $pw,
    is_public:        false,
    instant_deploy:   true
  }'
)" | get_uuid)

echo "   ✅ uuid: $REDIS_UUID"
aenv "# ── Redis ───────────────────────────────────────────"
aenv "REDIS_URL=redis://:${REDIS_PASSWORD}@marketing-go-redis:6379"
aenv "REDIS_PASSWORD=${REDIS_PASSWORD}"
aenv ""

# ──────────────────────────────────────────────────────────
# 3. MinIO  (production S3-compatible storage)
# ──────────────────────────────────────────────────────────
section "Creating MinIO (minio/minio:RELEASE.2025-02-28)"

MINIO_COMPOSE=$(cat <<COMPOSE
services:
  minio:
    image: minio/minio:RELEASE.2025-02-28T09-55-16Z
    restart: always
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: "${MINIO_ROOT_USER}"
      MINIO_ROOT_PASSWORD: "${MINIO_ROOT_PASSWORD}"
      MINIO_BROWSER_REDIRECT_URL: "https://minio.${DOMAIN}"
    volumes:
      - minio-data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

volumes:
  minio-data:
COMPOSE
)

MINIO_UUID=$(create_service \
  "marketing-go-minio" \
  "S3-compatible object storage" \
  "$MINIO_COMPOSE" | get_uuid)

echo "   ✅ uuid: $MINIO_UUID"
echo "   🌐 Console: https://minio.${DOMAIN}"
echo "   🌐 API:     https://storage.${DOMAIN}"
aenv "# ── MinIO / S3 ──────────────────────────────────────"
aenv "S3_ENDPOINT=https://storage.${DOMAIN}"
aenv "S3_CONSOLE_URL=https://minio.${DOMAIN}"
aenv "S3_ACCESS_KEY=${MINIO_ROOT_USER}"
aenv "S3_SECRET_KEY=${MINIO_ROOT_PASSWORD}"
aenv "S3_BUCKET=marketing-go"
aenv "S3_REGION=eu-west-1"
aenv ""

# ──────────────────────────────────────────────────────────
# 4. n8n  (with PostgreSQL backend — production grade)
# ──────────────────────────────────────────────────────────
section "Creating n8n (n8nio/n8n:latest + postgres:16-alpine)"

N8N_COMPOSE=$(cat <<COMPOSE
services:
  n8n-postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: "${N8N_DB_PASSWORD}"
      POSTGRES_DB: n8n
    volumes:
      - n8n-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U n8n"]
      interval: 10s
      timeout: 5s
      retries: 5

  n8n:
    image: n8nio/n8n:latest
    restart: always
    depends_on:
      n8n-postgres:
        condition: service_healthy
    environment:
      N8N_HOST: "n8n.${DOMAIN}"
      N8N_PORT: "5678"
      N8N_PROTOCOL: "https"
      WEBHOOK_URL: "https://n8n.${DOMAIN}"
      GENERIC_TIMEZONE: "Europe/Amsterdam"
      N8N_ENCRYPTION_KEY: "${N8N_ENCRYPTION_KEY}"
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: n8n-postgres
      DB_POSTGRESDB_PORT: "5432"
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_USER: n8n
      DB_POSTGRESDB_PASSWORD: "${N8N_DB_PASSWORD}"
      N8N_USER_MANAGEMENT_DISABLED: "false"
      N8N_DIAGNOSTICS_ENABLED: "false"
      N8N_VERSION_NOTIFICATIONS_ENABLED: "false"
    volumes:
      - n8n-data:/home/node/.n8n
    ports:
      - "5678:5678"

volumes:
  n8n-postgres-data:
  n8n-data:
COMPOSE
)

N8N_UUID=$(create_service \
  "marketing-go-n8n" \
  "Workflow automation for marketing-go" \
  "$N8N_COMPOSE" | get_uuid)

echo "   ✅ uuid: $N8N_UUID"
echo "   🌐 https://n8n.${DOMAIN}"
aenv "# ── n8n ─────────────────────────────────────────────"
aenv "N8N_URL=https://n8n.${DOMAIN}"
aenv "N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}"
aenv "# Set after first login → Settings → API → Create API Key:"
aenv "N8N_API_KEY="
aenv ""

# ──────────────────────────────────────────────────────────
# 5. Temporal  (auto-setup + PostgreSQL + UI)
# ──────────────────────────────────────────────────────────
section "Creating Temporal (temporalio/auto-setup:1.24 + ui:2.31)"

TEMPORAL_COMPOSE=$(cat <<COMPOSE
services:
  temporal-postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: temporal
      POSTGRES_PASSWORD: "${TEMPORAL_DB_PASSWORD}"
      POSTGRES_DB: temporal
    volumes:
      - temporal-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U temporal"]
      interval: 10s
      timeout: 5s
      retries: 5

  temporal:
    image: temporalio/auto-setup:1.24.2
    restart: always
    depends_on:
      temporal-postgres:
        condition: service_healthy
    environment:
      DB: postgresql
      DB_PORT: "5432"
      POSTGRES_USER: temporal
      POSTGRES_PWD: "${TEMPORAL_DB_PASSWORD}"
      POSTGRES_SEEDS: temporal-postgres
      TEMPORAL_ADDRESS: "0.0.0.0:7233"
      TEMPORAL_BROADCAST_ADDRESS: "temporal"
      NUM_HISTORY_SHARDS: "512"
    ports:
      - "7233:7233"
    healthcheck:
      test: ["CMD", "tctl", "--address", "temporal:7233", "cluster", "health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s

  temporal-ui:
    image: temporalio/ui:2.31.2
    restart: always
    depends_on:
      - temporal
    environment:
      TEMPORAL_ADDRESS: "temporal:7233"
      TEMPORAL_CORS_ORIGINS: "https://temporal.${DOMAIN}"
      TEMPORAL_UI_PORT: "8080"
    ports:
      - "8080:8080"

volumes:
  temporal-postgres-data:
COMPOSE
)

TEMPORAL_UUID=$(create_service \
  "marketing-go-temporal" \
  "Temporal workflow orchestration" \
  "$TEMPORAL_COMPOSE" | get_uuid)

echo "   ✅ uuid: $TEMPORAL_UUID"
echo "   🌐 UI: https://temporal.${DOMAIN}"
aenv "# ── Temporal ────────────────────────────────────────"
aenv "TEMPORAL_ADDRESS=marketing-go-temporal:7233"
aenv "TEMPORAL_UI_URL=https://temporal.${DOMAIN}"
aenv "TEMPORAL_NAMESPACE=default"
aenv "TEMPORAL_DB_PASSWORD=${TEMPORAL_DB_PASSWORD}"
aenv ""

# ──────────────────────────────────────────────────────────
# 6. Postiz  (social media scheduler, self-contained)
# ──────────────────────────────────────────────────────────
section "Creating Postiz (ghcr.io/gitroomhq/postiz-app:latest)"

POSTIZ_COMPOSE=$(cat <<COMPOSE
services:
  postiz-postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: postiz
      POSTGRES_PASSWORD: "${POSTIZ_DB_PASSWORD}"
      POSTGRES_DB: postiz
    volumes:
      - postiz-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postiz"]
      interval: 10s
      timeout: 5s
      retries: 5

  postiz-redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - postiz-redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  postiz:
    image: ghcr.io/gitroomhq/postiz-app:latest
    restart: always
    depends_on:
      postiz-postgres:
        condition: service_healthy
      postiz-redis:
        condition: service_healthy
    environment:
      MAIN_URL: "https://postiz.${DOMAIN}"
      FRONTEND_URL: "https://postiz.${DOMAIN}"
      NEXT_PUBLIC_BACKEND_URL: "https://postiz.${DOMAIN}/api"
      BACKEND_INTERNAL_URL: "http://localhost:3000"
      JWT_SECRET: "${POSTIZ_JWT_SECRET}"
      DATABASE_URL: "postgresql://postiz:${POSTIZ_DB_PASSWORD}@postiz-postgres:5432/postiz"
      REDIS_URL: "redis://postiz-redis:6379"
      IS_GENERAL: "true"
      STORAGE_PROVIDER: local
      UPLOAD_DIRECTORY: /uploads
      NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY: /uploads
      CRYPT_SECRET: "${POSTIZ_CRYPT_SECRET}"
    volumes:
      - postiz-uploads:/uploads
    ports:
      - "3000:3000"

volumes:
  postiz-postgres-data:
  postiz-redis-data:
  postiz-uploads:
COMPOSE
)

POSTIZ_UUID=$(create_service \
  "marketing-go-postiz" \
  "Social media scheduler" \
  "$POSTIZ_COMPOSE" | get_uuid)

echo "   ✅ uuid: $POSTIZ_UUID"
echo "   🌐 https://postiz.${DOMAIN}"
aenv "# ── Postiz ──────────────────────────────────────────"
aenv "POSTIZ_URL=https://postiz.${DOMAIN}"
aenv "POSTIZ_JWT_SECRET=${POSTIZ_JWT_SECRET}"
aenv "POSTIZ_CRYPT_SECRET=${POSTIZ_CRYPT_SECRET}"
aenv "POSTIZ_DB_PASSWORD=${POSTIZ_DB_PASSWORD}"
aenv ""

# ──────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅  All services deployed — marketing-go / production"
echo "════════════════════════════════════════════════════════"
echo ""
printf "  %-12s  %s\n" "PostgreSQL" "internal → marketing-go-postgres:5432"
printf "  %-12s  %s\n" "Redis"      "internal → marketing-go-redis:6379"
printf "  %-12s  %s\n" "MinIO"      "https://minio.${DOMAIN}  |  https://storage.${DOMAIN}"
printf "  %-12s  %s\n" "n8n"        "https://n8n.${DOMAIN}"
printf "  %-12s  %s\n" "Temporal"   "https://temporal.${DOMAIN}"
printf "  %-12s  %s\n" "Postiz"     "https://postiz.${DOMAIN}"
echo ""
echo "  🔐 Dashboard: https://coolify.exryinnovationlab.com/project/${PROJECT_UUID}"
echo "  📄 Env vars:  .env.local"
echo ""
echo "  ⚠️  After services are healthy (2-3 min):"
echo "     1. MinIO console → create bucket 'marketing-go' → set public read policy"
echo "     2. n8n → Settings → API → create key → paste into N8N_API_KEY in .env.local"
echo "     3. Postiz → register first admin account"
echo "     4. Temporal → create namespace 'marketing-go'"
echo ""
