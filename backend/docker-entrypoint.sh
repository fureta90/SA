#!/bin/sh
set -e

DB_HOST="${DB_HOST:?DB_HOST no configurado}"
DB_PORT="${DB_PORT:-1433}"
PORT="${PORT:-4001}"

# ─── Esperar SQL Server ────────────────────────────────────────────────────────
echo "[Entrypoint] Esperando SQL Server en ${DB_HOST}:${DB_PORT}..."
RETRIES=30
until nc -z "${DB_HOST}" "${DB_PORT}" 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -eq 0 ]; then
    echo "[Entrypoint] ERROR: No se pudo conectar a SQL Server después de 60 segundos. Abortando."
    exit 1
  fi
  echo "[Entrypoint] SQL Server no disponible, reintentando en 2s... ($RETRIES intentos restantes)"
  sleep 2
done
echo "[Entrypoint] SQL Server listo en ${DB_HOST}:${DB_PORT}"

# ─── Ejecutar migraciones ──────────────────────────────────────────────────────
echo "[Entrypoint] Ejecutando migraciones de base de datos..."
if node dist/database/run-migrations.js; then
  echo "[Entrypoint] Migraciones completadas exitosamente."
else
  echo "[Entrypoint] ERROR: Las migraciones fallaron. Abortando inicio."
  exit 1
fi

# ─── Iniciar aplicación ────────────────────────────────────────────────────────
echo "[Entrypoint] Iniciando aplicación NestJS en puerto ${PORT}..."
exec node dist/main.js
