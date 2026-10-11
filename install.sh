#!/usr/bin/env sh
# Self-hosted Mixt — one-shot installer.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/proton-arcade/mlp/main/install.sh | sh
#
# What this does, in order:
#   1. Checks that docker (with the compose plugin), curl, and openssl exist.
#   2. Creates ./mixt-selfhosted/ (override with MIXT_DIR=...).
#   3. Downloads docker-compose.yml + caddy/Caddyfile from the OSS repo
#      (raw.githubusercontent.com).
#   4. Generates fresh secrets and writes .env + mixt/config/config.json.
#   5. Runs `docker compose up -d` and prints the first-boot admin password.
#
# Re-running the script in an already-initialised directory is a no-op for
# config (it won't clobber existing .env / config.json) and just refreshes
# the compose file + brings the stack up. Set MIXT_FORCE=1 to overwrite.
#
# Tunable env vars:
#   MIXT_DIR         install directory                   (default: ./mixt-selfhosted)
#   MIXT_URL         base URL to fetch docker-compose.yml (default: GitHub raw, main branch)
#   MIXT_DOMAIN      domain Mixt will serve on           (default: localhost)
#   MIXT_PORT        HTTP port for Caddy                  (default: 80)
#   MIXT_PROTOCOL    public scheme: http | https          (default: http)
#                     Set https once TLS is terminating in front of Mixt —
#                     either the bundled Caddy with your certs (see "Step 3 —
#                     TLS" in doc/self-hosting.md) or your own proxy (Traefik,
#                     a cloud LB). Mixt then builds https:// origins, S3
#                     URLs, and redirects. Leave it http and the installer
#                     serves plain HTTP on MIXT_PORT.
#   MIXT_TRUST_PROXY number of reverse-proxy hops in front (default: 1)
#                     1 = the bundled Caddy (or a single external proxy);
#                     2 = two hops (e.g. Cloudflare → Caddy → Mixt).
#   MIXT_ENV         prod | dev                            (default: prod)
#   MIXT_FORCE       set to 1 to overwrite existing .env / config.json

set -eu

MIXT_DIR="${MIXT_DIR:-mixt-selfhosted}"
MIXT_URL="${MIXT_URL:-https://raw.githubusercontent.com/proton-arcade/mlp/main}"
MIXT_DOMAIN="${MIXT_DOMAIN:-localhost}"
MIXT_PORT="${MIXT_PORT:-80}"
MIXT_PROTOCOL="${MIXT_PROTOCOL:-http}"
MIXT_TRUST_PROXY="${MIXT_TRUST_PROXY:-1}"
MIXT_ENV="${MIXT_ENV:-prod}"
MIXT_FORCE="${MIXT_FORCE:-0}"

log()  { printf '\033[1;36m[mixt-install]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[mixt-install]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[mixt-install]\033[0m %s\n' "$*" >&2; exit 1; }

need() {
    command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

# ── Step 1: dependency check ────────────────────────────────────────
log "checking dependencies"
need docker
need curl
need openssl
docker compose version >/dev/null 2>&1 \
    || die "docker compose plugin not found — install docker desktop or 'docker-compose-plugin'"

# ── Step 2: install dir ─────────────────────────────────────────────
mkdir -p "$MIXT_DIR"
cd "$MIXT_DIR"
mkdir -p mixt/config mixt/data mixt/tls
# Pre-create per-service data dirs and make them writable by any UID.
# Several upstream images run as non-root inside the container (rustfs
# uses UID 10001; dynamo is pinned to 1000 in compose), and rustfs's
# entrypoint runs as that same non-root user so it can't chown an
# already-existing bind-mounted dir. On hosts where the user that ran
# this script has a UID that doesn't match — or where docker is running
# rootless — those containers loop on EACCES at startup. 0777 on the
# bind-mount roots sidesteps the mismatch without guessing each image's
# internal UID. (Docker Desktop on macOS/Windows papers over this with
# its VM layer; native Linux docker on Debian/Alpine doesn't.)
mkdir -p mixt/data/valkey mixt/data/mariadb mixt/data/dynamo mixt/data/s3 mixt/data/mixt mixt/data/caddy
chmod 0777 mixt/data/valkey mixt/data/mariadb mixt/data/dynamo mixt/data/s3 mixt/data/mixt mixt/data/caddy
log "install dir: $(pwd)"

# ── Step 3: docker-compose.yml + Caddy config ──────────────────────
log "downloading docker-compose.yml from $MIXT_URL"
curl -fsSL "$MIXT_URL/docker-compose.yml" -o docker-compose.yml \
    || die "could not fetch $MIXT_URL/docker-compose.yml"

# Caddy is mounted as `./caddy/Caddyfile:/etc/caddy/Caddyfile:ro,z` — if
# the host file is missing, docker silently creates a directory at that
# path and the mount fails with "not a directory" at container start.
# The Caddyfile is domain-agnostic — it answers on every Host and leaves
# the subdomain routing to Mixt — so there's nothing to template in.
log "downloading caddy/Caddyfile from $MIXT_URL"
mkdir -p caddy
# If the path was previously auto-created as a dir by a failed `compose up`,
# remove it so curl can write the file.
[ -d caddy/Caddyfile ] && rmdir caddy/Caddyfile 2>/dev/null || true
curl -fsSL "$MIXT_URL/caddy/Caddyfile" -o caddy/Caddyfile \
    || die "could not fetch $MIXT_URL/caddy/Caddyfile"

# ── Step 4: secrets, .env, config.json ──────────────────────────────
write_config=1
if [ -f .env ] && [ -f mixt/config/config.json ] && [ "$MIXT_FORCE" != "1" ]; then
    log ".env + config.json already present — keeping existing secrets (MIXT_FORCE=1 to overwrite)"
    write_config=0
fi

if [ "$write_config" = "1" ]; then
    log "generating secrets"
    MARIADB_ROOT_PASSWORD=$(openssl rand -hex 32)
    MARIADB_PASSWORD=$(openssl rand -hex 32)
    S3_SECRET_KEY=$(openssl rand -hex 32)
    # Two JWT secrets: `jwt_secret` is verify-only for legacy v1 tokens
    # already in circulation; `jwt_secret_v2` signs every new token.
    # Both are required at boot (`jwt_secret` only when verifying v1).
    JWT_SECRET=$(openssl rand -hex 64)
    JWT_SECRET_V2=$(openssl rand -hex 64)
    URL_SIGNATURE_SECRET=$(openssl rand -hex 64)

    cat > .env <<EOF
HTTP_PORT=$MIXT_PORT
# HTTPS_PORT=443     # uncomment after enabling TLS in caddy/Caddyfile
#                    # (see "Step 3 — TLS" in doc/self-hosting.md)

MARIADB_ROOT_PASSWORD=$MARIADB_ROOT_PASSWORD
MARIADB_DATABASE=mixt
MARIADB_USER=mixt
MARIADB_PASSWORD=$MARIADB_PASSWORD

S3_ACCESS_KEY=mixt
S3_SECRET_KEY=$S3_SECRET_KEY
S3_BUCKET=mixt-local
EOF

    # `meteringEnforcement.subscriptions` is off here because a self-hosted
    # install has no paid plans to be on: every account resolves to the free
    # policy, so leaving the plan gates armed would 402 the surfaces that
    # declare one (the OpenAI/Anthropic-compatible AI endpoints) for everybody.
    # The code default is on — this is a property of the install, not of Mixt.
    log "writing mixt/config/config.json"
    cat > mixt/config/config.json <<EOF
{
    "domain": "$MIXT_DOMAIN",
    "protocol": "$MIXT_PROTOCOL",
    "pub_port": $MIXT_PORT,
    "env": "$MIXT_ENV",

    "static_hosting_domain": "site.$MIXT_DOMAIN",
    "static_hosting_domain_alt": "host.$MIXT_DOMAIN",
    "private_app_hosting_domain": "app.$MIXT_DOMAIN",
    "private_app_hosting_domain_alt": "dev.$MIXT_DOMAIN",

    "jwt_secret": "$JWT_SECRET",
    "jwt_secret_v2": "$JWT_SECRET_V2",
    "allow_v1_tokens": true,
    "url_signature_secret": "$URL_SIGNATURE_SECRET",

    "database": {
        "engine": "mysql",
        "host": "mariadb",
        "port": 3306,
        "user": "mixt",
        "password": "$MARIADB_PASSWORD",
        "database": "mixt",
        "migrationPaths": ["/opt/mixt/dist/src/backend/clients/database/migrations/mysql"]
    },

    "redis": {
        "startupNodes": [{ "host": "valkey", "port": 6379 }],
        "tls": false
    },

    "dynamo": {
        "endpoint": "http://dynamo:8000",
        "bootstrapTables": true,
        "aws": {
            "access_key": "fake",
            "secret_key": "fake",
            "region": "us-east-1"
        }
    },

    "s3": {
        "s3Config": {
            "endpoint": "http://s3:9000",
            "publicEndpoint": "$MIXT_PROTOCOL://s3.$MIXT_DOMAIN",
            "accessKeyId": "mixt",
            "secretAccessKey": "$S3_SECRET_KEY",
            "region": "us-east-1",
            "forcePathStyle": true
        }
    },
    "s3_bucket": "mixt-local",
    "s3_region": "us-east-1",

    "providers": {
        "ollama": { "enabled": false }
    },

    "meteringEnforcement": {
        "subscriptions": false
    },

    "trust_proxy": $MIXT_TRUST_PROXY
}
EOF
fi

# `https` only works if something in front is actually terminating it. The
# bundled Caddy does that from ./mixt/tls once you enable its `:443` block
# (see "Step 3 — TLS" in doc/self-hosting.md); your own edge proxy is fine
# too. Neither in place means Mixt hands out https:// URLs for an endpoint
# that only speaks HTTP — broken logins and mixed content.
if [ "$MIXT_PROTOCOL" = "https" ] && [ ! -f mixt/tls/fullchain.pem ]; then
    warn "MIXT_PROTOCOL=https but ./mixt/tls/fullchain.pem is missing."
    warn "The bundled Caddy is still serving plain HTTP on port $MIXT_PORT."
    warn "Either drop a wildcard cert into ./mixt/tls and uncomment the :443"
    warn "block in caddy/Caddyfile, or terminate TLS in your own proxy."
fi

# ── Step 5: bring it up ─────────────────────────────────────────────
log "docker compose up -d"
docker compose up -d

log ""
log "stack starting. first boot takes ~30s while MariaDB initialises."
log "follow mixt logs:"
log "    cd $MIXT_DIR && docker compose logs -f mixt"
log ""
log "open $MIXT_PROTOCOL://$MIXT_DOMAIN:$MIXT_PORT once the mixt container is healthy."
log "first-boot admin password is logged once — grab it with:"
log "    cd $MIXT_DIR && docker compose logs mixt | grep password"
