#!/bin/sh
DBHOST="${DB_HOST:-sqlserver}"
DBPORT="${DB_PORT:-1433}"

echo "Esperando a que SQL Server esté listo en ${DBHOST}:${DBPORT}..."
until nc -z "$DBHOST" "$DBPORT"; do
  sleep 2
done
echo "SQL Server listo, arrancando backend..."
npm run start:prod
