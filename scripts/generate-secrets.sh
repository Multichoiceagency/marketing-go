#!/usr/bin/env bash
# generate-secrets.sh — Generate secure secrets for all marketing-go services
set -euo pipefail

SECRETS_FILE="$(cd "$(dirname "$0")/.." && pwd)/.secrets"

if [[ -f "$SECRETS_FILE" ]]; then
  echo "⚠️  .secrets already exists. Delete it first to regenerate."
  exit 1
fi

gen() { openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 40; }

cat > "$SECRETS_FILE" <<EOF
# Auto-generated secrets — DO NOT COMMIT
POSTGRES_PASSWORD=$(gen)
REDIS_PASSWORD=$(gen)
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=$(gen)
N8N_ENCRYPTION_KEY=$(gen)
N8N_DB_PASSWORD=$(gen)
TEMPORAL_DB_PASSWORD=$(gen)
POSTIZ_DB_PASSWORD=$(gen)
POSTIZ_JWT_SECRET=$(gen)
POSTIZ_CRYPT_SECRET=$(gen)
EOF

chmod 600 "$SECRETS_FILE"
echo "✅ Secrets written to .secrets"
