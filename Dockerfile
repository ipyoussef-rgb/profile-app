# syntax=docker/dockerfile:1.7

# =============================================================================
# deps-prod: install only `dependencies` so the runtime image carries
# the prisma CLI's full transitive closure (effect, @prisma/config etc.)
# without dragging in TypeScript / ESLint / @types/* from devDependencies.
# Next.js's standalone trace omits the prisma CLI's transitive deps, so
# `prisma db push` at startup needs this complete tree to resolve.
# =============================================================================
FROM gitlab.kobil.com:4567/development/devops/base-images/nodejs22-micro:1.3.4 AS deps-prod

SHELL ["/bin/bash", "-o", "pipefail", "-c"]
USER root
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,uid=0 npm ci --omit=dev --ignore-scripts

USER 1001

# =============================================================================
# builder: install ALL deps, generate Prisma client, compile Next.js,
# produce .next/standalone
# =============================================================================
FROM gitlab.kobil.com:4567/development/devops/base-images/nodejs22-micro:1.3.4 AS builder

SHELL ["/bin/bash", "-o", "pipefail", "-c"]
USER root
WORKDIR /usr/src/app

# Cache the npm package store across builds. BuildKit reuses it when
# package-lock.json hasn't changed, cutting rebuild time noticeably.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,uid=0 npm ci

# Prisma generate runs against a dummy URL: it only needs the schema
# to emit the typed client. The real DATABASE_URL arrives at runtime.
COPY prisma ./prisma/
COPY prisma.config.ts ./
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

COPY . .

ENV NODE_ENV=production
RUN npm run build

USER 1001

# =============================================================================
# runner: Next.js standalone server.js + traced files, plus the
# production node_modules from `deps-prod` so the prisma CLI we run
# from `docker-entrypoint.sh` resolves all of its transitive deps,
# plus the Prisma generated client output from the builder. ~120 MB.
# =============================================================================
FROM gitlab.kobil.com:4567/development/devops/base-images/nodejs22-micro:1.3.4 AS runner

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Metadata populated by ci-library docker-multiarch at build time.
ARG BUILD_DATE
ARG VERSION
ARG NAME
ARG VCS_REF
ARG VCS_URL

LABEL org.opencontainers.image.title="${NAME}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.source="${VCS_URL}" \
      org.opencontainers.image.url="${VCS_URL}" \
      org.opencontainers.image.vendor="KOBIL"

USER 1001
WORKDIR /usr/src/app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Pull in the production-only node_modules first so the runner has the
# full prisma-CLI dep tree. Then layer the standalone server / static /
# public / prisma assets on top: the standalone overlays its own
# server.js + .next runtime files into the same `node_modules` view.
COPY --from=deps-prod --chown=1001:0 /usr/src/app/node_modules            ./node_modules
COPY --from=builder   --chown=1001:0 /usr/src/app/node_modules/.prisma    ./node_modules/.prisma
COPY --from=builder   --chown=1001:0 /usr/src/app/node_modules/@prisma    ./node_modules/@prisma
COPY --from=builder   --chown=1001:0 /usr/src/app/.next/standalone        ./
COPY --from=builder   --chown=1001:0 /usr/src/app/.next/static            ./.next/static
COPY --from=builder   --chown=1001:0 /usr/src/app/public                  ./public
COPY --from=builder   --chown=1001:0 /usr/src/app/prisma                  ./prisma
COPY --from=builder   --chown=1001:0 /usr/src/app/prisma.config.ts        ./
COPY --chown=1001:0 docker-entrypoint.sh ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
