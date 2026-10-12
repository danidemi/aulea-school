# syntax=docker/dockerfile:1

# Single image: Express API + built React client.
# Build context: this folder (aulea-platform/).
#   docker build -t aulea-platform \
#     --build-arg GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD) \
#     --build-arg GIT_COMMIT_SHA=$(git rev-parse --short HEAD) \
#     --build-arg GIT_COMMIT_TIMESTAMP=$(git log -1 --format=%cI -- .) \
#     --build-arg GIT_DIRTY=$(test -n "$(git status --porcelain -- .)" && echo true || echo false) .
#
# Connecting to a PostgreSQL database
# -----------------------------------
# The image contains no database and no DB settings. The DB is configured at
# run time (not build time) through ONE environment variable:
#
#   DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DBNAME
#
# The app fails to start if DATABASE_URL is missing. On startup it applies
# the pending Drizzle migrations (./drizzle) to that database, then serves.
# The DB user therefore needs rights to create and alter tables in the schema.
# The same database also stores the login sessions (connect-pg-simple).
#
# Examples:
#   docker run -p 3000:3000 \
#     -e DATABASE_URL=postgres://aulea:secret@db.example.com:5432/aulea \
#     -e SESSION_SECRET=<long random value> \
#     -e APP_BASE_URL=https://aulea.example.com \
#     -e SMTP_HOST=smtp.example.com -e SMTP_PORT=587 \
#     aulea-platform
#
#   Docker secrets / mounted file (keeps the password out of `docker inspect`):
#     -e DATABASE_URL_FILE=/run/secrets/database_url
#   The entrypoint (docker/entrypoint.sh) reads the file into DATABASE_URL.
#   Set DATABASE_URL or DATABASE_URL_FILE, never both. See
#   docker-compose.prod.example.yml for a complete setup.
#
# Notes:
#   - HOST must be reachable from inside the container. For a DB on the Docker
#     host use host.docker.internal (add --add-host=host.docker.internal:host-gateway
#     on Linux). In Compose, use the service name of the postgres container.
#   - URL-encode special characters in the password (e.g. @ -> %40, / -> %2F).
#   - TLS: the client is node-postgres, which reads `?sslmode=require` from the
#     URL. Example: postgres://user:pass@host:5432/db?sslmode=require
#   - Other variables the app needs besides the DB: SESSION_SECRET,
#     APP_BASE_URL, SMTP_HOST, SMTP_PORT (optional: SMTP_USER, SMTP_PASSWORD,
#     SMTP_SECURE, SMTP_FROM, PORT). Each also accepts the *_FILE form.

ARG NODE_VERSION=22

# ---- client: build the React bundle -------------------------------------
FROM node:${NODE_VERSION}-alpine AS client-build
ARG GIT_BRANCH=unknown
ARG GIT_COMMIT_SHA=unknown
ARG GIT_COMMIT_TIMESTAMP=
ARG GIT_DIRTY=false
ENV GIT_BRANCH=$GIT_BRANCH GIT_COMMIT_SHA=$GIT_COMMIT_SHA \
    GIT_COMMIT_TIMESTAMP=$GIT_COMMIT_TIMESTAMP GIT_DIRTY=$GIT_DIRTY
WORKDIR /build/client
COPY client/package.json client/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY client/ ./
RUN npm run build

# ---- server: compile TypeScript ------------------------------------------
FROM node:${NODE_VERSION}-alpine AS server-build
ARG GIT_BRANCH=unknown
ARG GIT_COMMIT_SHA=unknown
ARG GIT_COMMIT_TIMESTAMP=
ARG GIT_DIRTY=false
ENV GIT_BRANCH=$GIT_BRANCH GIT_COMMIT_SHA=$GIT_COMMIT_SHA \
    GIT_COMMIT_TIMESTAMP=$GIT_COMMIT_TIMESTAMP GIT_DIRTY=$GIT_DIRTY
WORKDIR /build/server
COPY server/package.json server/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY server/ ./
# `npm run build` = tsc -b + postbuild (writes dist/version.json)
RUN npm run build

# ---- server: production dependencies only --------------------------------
FROM node:${NODE_VERSION}-alpine AS server-deps
WORKDIR /build/server
COPY server/package.json server/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# ---- runtime ---------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime
# tini: proper PID 1 (signal forwarding, zombie reaping)
RUN apk add --no-cache tini
ENV NODE_ENV=production PORT=3000
# Layout matters: app.ts resolves ../../client/dist from server/dist, and
# migrations are read from ./drizzle relative to the working directory.
WORKDIR /app/server
COPY --from=server-deps  --chown=root:root /build/server/node_modules ./node_modules
COPY --from=server-build --chown=root:root /build/server/dist ./dist
COPY --from=server-build --chown=root:root /build/server/drizzle ./drizzle
COPY --from=server-build --chown=root:root /build/server/package.json ./package.json
COPY --from=client-build --chown=root:root /build/client/dist /app/client/dist
COPY --chown=root:root --chmod=755 docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# App files are root-owned and read-only to the app; the `node` user (uid 1000,
# shipped with the base image) only needs to read them.
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/index.js"]
