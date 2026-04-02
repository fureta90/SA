# ─── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias primero (cache layer)
COPY package*.json ./
RUN npm ci

# Copiar fuentes y compilar
COPY . .
RUN npm run build

# ─── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

# netcat para wait en entrypoint + wget para healthcheck
RUN apk add --no-cache netcat-openbsd wget

WORKDIR /app

# Instalar SOLO dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar código compilado desde builder
COPY --from=builder /app/dist ./dist

# Entrypoint (espera BD + corre migraciones + arranca app)
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Directorio para uploads persistentes (montar como volumen)
RUN mkdir -p /app/uploads

# Usuario no-root por seguridad
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT:-4001}/api-backend" > /dev/null || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
