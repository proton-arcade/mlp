#!/usr/bin/env pwsh
# Self-hosted Mixt — one-shot installer (PowerShell port of install.sh).
#
# Usage (interactive):
#   .\install.ps1
#
# Usage (one-liner, like curl|sh):
#   irm https://raw.githubusercontent.com/proton-arcade/mlp/main/install.ps1 | iex
#   (when piped through iex, params can't be passed; use env vars below)
#
# What this does, in order:
#   1. Checks that docker (with the compose plugin) exists.
#   2. Creates ./mixt-selfhosted/ (override with $env:MIXT_DIR).
#   3. Downloads docker-compose.yml + caddy/Caddyfile from the OSS repo.
#   4. Generates fresh secrets and writes .env + mixt/config/config.json.
#   5. Runs `docker compose up -d` and prints where the admin password is kept.
#
# Re-running in an already-initialised directory is a no-op for config
# (it won't clobber existing .env / config.json) and just refreshes the
# compose file + brings the stack up. Set MIXT_FORCE=1 to overwrite.
#
# Tunable env vars (or pass as -Parameters when running the file directly):
#   MIXT_DIR     install directory                       (default: ./mixt-selfhosted)
#   MIXT_URL     base URL to fetch docker-compose.yml    (default: GitHub raw, main branch)
#   MIXT_DOMAIN  domain Mixt will serve on              (default: localhost)
#   MIXT_PORT    HTTP port for Caddy                     (default: 80)
#   MIXT_FORCE   set to 1 to overwrite existing .env / config.json

[CmdletBinding()]
param(
    [string]$MixtDir    = $(if ($env:MIXT_DIR)    { $env:MIXT_DIR }         else { 'mixt-selfhosted' }),
    [string]$MixtUrl    = $(if ($env:MIXT_URL)    { $env:MIXT_URL }         else { 'https://raw.githubusercontent.com/proton-arcade/mlp/main' }),
    [string]$MixtDomain = $(if ($env:MIXT_DOMAIN) { $env:MIXT_DOMAIN }      else { 'localhost' }),
    [int]   $MixtPort   = $(if ($env:MIXT_PORT)   { [int]$env:MIXT_PORT }   else { 80 }),
    [switch]$Force       = $($env:MIXT_FORCE -eq '1')
)

$ErrorActionPreference = 'Stop'

function Write-Log  { param($Msg) Write-Host "[mixt-install] $Msg" -ForegroundColor Cyan }
function Write-Warn { param($Msg) Write-Host "[mixt-install] $Msg" -ForegroundColor Yellow }
function Die        { param($Msg) Write-Host "[mixt-install] $Msg" -ForegroundColor Red; exit 1 }

function Test-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Die "missing required command: $Name"
    }
}

function New-HexSecret {
    param([int]$Bytes)
    $buf = New-Object byte[] $Bytes
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($buf) } finally { $rng.Dispose() }
    # BitConverter is portable across PS 5.1 and 7+ (ToHexString is 7+ only).
    return [System.BitConverter]::ToString($buf).Replace('-', '').ToLowerInvariant()
}

function Write-Utf8NoBomLF {
    param([string]$Path, [string]$Content)
    $full = if ([System.IO.Path]::IsPathRooted($Path)) { $Path } else { Join-Path (Get-Location) $Path }
    $lf   = $Content -replace "`r`n", "`n"
    [System.IO.File]::WriteAllText($full, $lf, (New-Object System.Text.UTF8Encoding $false))
}

# ── Step 1: dependency check ────────────────────────────────────────
Write-Log 'checking dependencies'
Test-Command docker
# curl + openssl aren't required on Windows; PowerShell + .NET cover both.

$null = & docker compose version 2>&1
if ($LASTEXITCODE -ne 0) {
    Die "docker compose plugin not found — install Docker Desktop (or enable the v2 compose plugin)"
}

# ── Step 2: install dir ─────────────────────────────────────────────
$null = New-Item -ItemType Directory -Force -Path $MixtDir
Set-Location $MixtDir
$null = New-Item -ItemType Directory -Force -Path 'mixt/config', 'mixt/data', 'mixt/data/caddy', 'mixt/tls'
Write-Log "install dir: $((Get-Location).Path)"

# ── Step 3: docker-compose.yml + Caddy config ──────────────────────
Write-Log "downloading docker-compose.yml from $MixtUrl"
try {
    Invoke-WebRequest -Uri "$MixtUrl/docker-compose.yml" -OutFile 'docker-compose.yml' -UseBasicParsing
} catch {
    Die "could not fetch $MixtUrl/docker-compose.yml — $_"
}

# The Caddyfile is domain-agnostic — it answers on every Host and leaves
# the subdomain routing to Mixt — so there's nothing to template in.
Write-Log "downloading caddy/Caddyfile from $MixtUrl"
$null = New-Item -ItemType Directory -Force -Path 'caddy'
# If the path was previously auto-created as a directory by a failed
# `compose up`, remove it so we can write the file there.
if (Test-Path 'caddy/Caddyfile' -PathType Container) {
    Remove-Item 'caddy/Caddyfile' -Recurse -Force
}
try {
    Invoke-WebRequest -Uri "$MixtUrl/caddy/Caddyfile" -OutFile 'caddy/Caddyfile' -UseBasicParsing
} catch {
    Die "could not fetch $MixtUrl/caddy/Caddyfile — $_"
}

# ── Step 4: secrets, .env, config.json ──────────────────────────────
$writeConfig = $true
if ((Test-Path '.env') -and (Test-Path 'mixt/config/config.json') -and -not $Force) {
    Write-Log ".env + config.json already present — keeping existing secrets (MIXT_FORCE=1 or -Force to overwrite)"
    $writeConfig = $false
}

if ($writeConfig) {
    Write-Log 'generating secrets'
    $mariadbRootPw = New-HexSecret 32
    $mariadbPw     = New-HexSecret 32
    $s3SecretKey   = New-HexSecret 32
    # Two JWT secrets: $jwtSecret is verify-only for legacy v1 tokens
    # already in circulation; $jwtSecretV2 signs every new token.
    $jwtSecret     = New-HexSecret 64
    $jwtSecretV2   = New-HexSecret 64
    $urlSigSecret  = New-HexSecret 64

    $envContent = @"
HTTP_PORT=$MixtPort
# HTTPS_PORT=443     # uncomment after enabling TLS in caddy/Caddyfile
#                    # (see "Step 3 — TLS" in doc/self-hosting.md)

MARIADB_ROOT_PASSWORD=$mariadbRootPw
MARIADB_DATABASE=mixt
MARIADB_USER=mixt
MARIADB_PASSWORD=$mariadbPw

S3_ACCESS_KEY=mixt
S3_SECRET_KEY=$s3SecretKey
S3_BUCKET=mixt-local
"@
    Write-Utf8NoBomLF -Path '.env' -Content $envContent

    Write-Log 'writing mixt/config/config.json'
    $config = [ordered]@{
        domain                         = $MixtDomain
        protocol                       = 'http'
        pub_port                       = $MixtPort
        env                            = 'prod'
        static_hosting_domain          = "site.$MixtDomain"
        static_hosting_domain_alt      = "host.$MixtDomain"
        private_app_hosting_domain     = "app.$MixtDomain"
        private_app_hosting_domain_alt = "dev.$MixtDomain"
        jwt_secret                     = $jwtSecret
        jwt_secret_v2                  = $jwtSecretV2
        allow_v1_tokens                = $true
        url_signature_secret           = $urlSigSecret
        database = [ordered]@{
            engine         = 'mysql'
            host           = 'mariadb'
            port           = 3306
            user           = 'mixt'
            password       = $mariadbPw
            database       = 'mixt'
            migrationPaths = @('/opt/mixt/dist/src/backend/clients/database/migrations/mysql')
        }
        redis = [ordered]@{
            startupNodes = @(
                [ordered]@{ host = 'valkey'; port = 6379 }
            )
            tls = $false
        }
        dynamo = [ordered]@{
            endpoint        = 'http://dynamo:8000'
            bootstrapTables = $true
            aws = [ordered]@{
                access_key = 'fake'
                secret_key = 'fake'
                region     = 'us-east-1'
            }
        }
        s3 = [ordered]@{
            s3Config = [ordered]@{
                endpoint        = 'http://s3:9000'
                publicEndpoint  = "http://s3.$MixtDomain"
                accessKeyId     = 'mixt'
                secretAccessKey = $s3SecretKey
                region          = 'us-east-1'
                forcePathStyle  = $true
            }
        }
        s3_bucket = 'mixt-local'
        s3_region = 'us-east-1'
        providers = [ordered]@{
            ollama = [ordered]@{ enabled = $false }
        }
        trust_proxy = 1
    }
    $configJson = $config | ConvertTo-Json -Depth 10
    Write-Utf8NoBomLF -Path 'mixt/config/config.json' -Content $configJson
}

# ── Step 5: bring it up ─────────────────────────────────────────────
Write-Log 'docker compose up -d'
& docker compose up -d
if ($LASTEXITCODE -ne 0) { Die 'docker compose up failed' }

Write-Log ''
Write-Log 'stack starting. first boot takes ~30s while MariaDB initialises.'
Write-Log 'follow mixt logs:'
Write-Log "    cd $MixtDir; docker compose logs -f mixt"
Write-Log ''
Write-Log "open http://${MixtDomain}:${MixtPort} once the mixt container is healthy."
Write-Log 'the admin password is the "password" value in admin/admin.json inside the mixt container:'
Write-Log "    cd $MixtDir; docker compose exec mixt cat /opt/mixt/admin/admin.json"
