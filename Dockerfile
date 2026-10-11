# syntax=docker/dockerfile:1.7
#
# OSS Mixt image — multi-arch (linux/amd64, linux/arm64).
#
# Build & push:
#   docker buildx build --platform linux/amd64,linux/arm64 \
#       -t ghcr.io/mixt/mixt:latest --push .
#
# Local single-arch build:
#   docker build -t mixt .
#
# Self-hosters inject configuration by mounting a config.json at
# /etc/mixt/config.json. It is deep-merged over the bundled
# config.default.json, so partial overrides work. Absent file = defaults.

# ---- Build stage ----
FROM node:24-slim AS build

WORKDIR /opt/mixt

# Build toolchain needed for native deps (bcrypt, sharp, better-sqlite3, …).
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ git && \
    rm -rf /var/lib/apt/lists/*

ENV HUSKY=0
ENV npm_config_fund=false
ENV npm_config_audit=false

# ---- Dependency layer ---------------------------------------------------
# Copy ONLY package manifests + lockfile first so the npm-install layer
# stays cached when only source files change.
COPY package.json package-lock.json ./
COPY src/backend/package.json src/backend/
COPY src/gui/package.json src/gui/
COPY src/mixt-js/package.json src/mixt-js/package-lock.json src/mixt-js/
COPY src/worker/package.json src/worker/
COPY src/docs/package.json src/docs/

# extensionSetup.mjs runs as the postinstall hook during npm ci. (No-ops
# unless any packages/mixt/extensions/* gain a package.json.)
COPY tools/extensionSetup.mjs tools/extensionSetup.mjs

RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ---- Source layer -------------------------------------------------------
COPY . .

# Compile backend TS, then build GUI + mixt-js webpack bundles in
# parallel. The GUI/mixt-js bundles are how /dist/bundle.min.{js,css}
# and /sdk/mixt.js fall back to local assets when the kernel-config
# CDN keys are unset.
RUN npm run build:ts
RUN set -e; \
    (cd src/gui && node ./build.js) & gui_pid=$!; \
    (cd src/mixt-js && npm run build) & pjs_pid=$!; \
    wait $gui_pid; \
    wait $pjs_pid

# ---- Runtime stage (slim — no build tools) ----
FROM node:24-slim

WORKDIR /opt/mixt

# git: runtime version probe. wget: HEALTHCHECK.
RUN apt-get update && \
    apt-get install -y --no-install-recommends git wget && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /opt/mixt .

RUN mkdir -p /etc/mixt /var/mixt && \
    chown -R node:node /etc/mixt /var/mixt

# Self-hosters mount their override at this exact path. The v2 loader
# deep-merges it over config.default.json (see backend/index.ts).
ENV MIXT_CONFIG_PATH=/etc/mixt/config.json
ENV NODE_OPTIONS=--enable-source-maps

EXPOSE 4100
# The inbound SMTP receiver, when run from this image with the `smtp` profile.
EXPOSE 2525

USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4100/test || exit 1

CMD ["node", "-r", "./dist/src/backend/telemetry.js", "./dist/src/backend/index.js"]
