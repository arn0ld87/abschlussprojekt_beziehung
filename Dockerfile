# Runtime-Baseline (M0 #31): Die Container-Laufzeit ist bewusst Bun 1.3.
# Das Image enthaelt kein Node-Binary; Bun 1.3 deckt die Node-24-kompatible
# API-Flaeche ab, die der Next-16-Standalone-Server und der bun-native
# Healthcheck (fetch) benoetigen. engines.node >= 24.0.0 gilt fuer Host-CI
# und lokale Entwicklung und wird in .github/workflows/ci.yml gepinned.
FROM oven/bun:1.3 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.3 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1.3 AS runner
WORKDIR /app
ENV NODE_ENV=production
# Der Next-Standalone-Server bindet sonst an den Docker-Container-Hostnamen
# (HOSTNAME ist im Container gesetzt); 0.0.0.0 macht den Healthcheck auf
# localhost und das Port-Mapping gleichermassen erreichbar.
ENV HOSTNAME=0.0.0.0
COPY --from=build --chown=bun:bun /app/.next/standalone ./dist
COPY --from=build --chown=bun:bun /app/public ./public
COPY --from=build --chown=bun:bun /app/drizzle ./drizzle
COPY --from=build --chown=bun:bun /app/scripts ./scripts
USER bun
EXPOSE 3000
CMD ["bun", "run", "dist/server.js"]
