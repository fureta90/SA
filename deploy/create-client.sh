#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# create-client.sh — Crea un nuevo cliente en el sistema multi-tenant
#
# Uso: ./create-client.sh <nombre-cliente> <dominio>
# Ejemplo: ./create-client.sh empresa-abc empresa-abc.tudominio.com
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

# ─── Colores para output ───────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC}    $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}      $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}    $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC}   $*" >&2; }

# ─── Argumentos ───────────────────────────────────────────────────────────────
CLIENT_NAME="${1:-}"
DOMAIN="${2:-}"

if [[ -z "$CLIENT_NAME" || -z "$DOMAIN" ]]; then
  log_error "Uso: $0 <nombre-cliente> <dominio>"
  log_error "Ejemplo: $0 empresa-abc empresa-abc.tudominio.com"
  exit 1
fi

# ─── Validaciones ─────────────────────────────────────────────────────────────
if [[ ! "$CLIENT_NAME" =~ ^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$ ]]; then
  log_error "CLIENT_NAME debe ser: minúsculas, números y guiones, entre 3-32 caracteres"
  log_error "Ejemplos válidos: empresa-abc, cliente01, mi-empresa-2024"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="${SCRIPT_DIR}/clients/${CLIENT_NAME}"
TEMPLATE_DIR="${SCRIPT_DIR}/template"

if [[ -d "$CLIENT_DIR" ]]; then
  log_error "El cliente '${CLIENT_NAME}' ya existe en: ${CLIENT_DIR}"
  log_warn "Para recrearlo: rm -rf ${CLIENT_DIR} && $0 ${CLIENT_NAME} ${DOMAIN}"
  exit 1
fi

if [[ ! -f "${TEMPLATE_DIR}/docker-compose.yml" ]]; then
  log_error "Template no encontrado en: ${TEMPLATE_DIR}/docker-compose.yml"
  exit 1
fi

# Verificar que openssl esté disponible
if ! command -v openssl &>/dev/null; then
  log_error "openssl es necesario para generar contraseñas seguras"
  exit 1
fi

# ─── Crear directorio del cliente ─────────────────────────────────────────────
log_info "Creando cliente: ${CLIENT_NAME} → ${DOMAIN}"
mkdir -p "$CLIENT_DIR"

# Copiar docker-compose template (sin modificar, lee variables de .env)
cp "${TEMPLATE_DIR}/docker-compose.yml" "${CLIENT_DIR}/docker-compose.yml"
log_success "docker-compose.yml copiado"

# ─── Generar secretos seguros ──────────────────────────────────────────────────
log_info "Generando secretos..."
REDIS_PASSWORD="$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)"
JWT_SECRET="$(openssl rand -base64 48)"
DB_PASSWORD="$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9!@#' | head -c 24)"
DB_NAME="$(echo "${CLIENT_NAME}" | tr '-' '_')_db"

# ─── Generar .env desde template ──────────────────────────────────────────────
sed \
  -e "s|%%CLIENT_NAME%%|${CLIENT_NAME}|g" \
  -e "s|%%DOMAIN%%|${DOMAIN}|g" \
  -e "s|%%REDIS_PASSWORD%%|${REDIS_PASSWORD}|g" \
  -e "s|%%JWT_SECRET%%|${JWT_SECRET}|g" \
  -e "s|%%DB_PASSWORD%%|${DB_PASSWORD}|g" \
  -e "s|%%DB_NAME%%|${DB_NAME}|g" \
  "${TEMPLATE_DIR}/.env.example" > "${CLIENT_DIR}/.env"

log_success ".env generado con secretos únicos"

# ─── Crear placeholder para gcs-key.json ──────────────────────────────────────
touch "${CLIENT_DIR}/gcs-key.json"
log_warn "Reemplazar ${CLIENT_DIR}/gcs-key.json con las credenciales reales de Google Cloud"

# ─── Agregar .gitignore de seguridad ──────────────────────────────────────────
cat > "${CLIENT_DIR}/.gitignore" << 'EOF'
# Nunca commitear secretos del cliente
.env
gcs-key.json
EOF
log_success ".gitignore creado (protege .env y gcs-key.json)"

# ─── Output final ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Cliente '${CLIENT_NAME}' creado exitosamente${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BLUE}Directorio:${NC}  ${CLIENT_DIR}"
echo -e "  ${BLUE}Dominio:${NC}     https://${DOMAIN}"
echo -e "  ${BLUE}Base de datos:${NC} ${DB_NAME}"
echo ""
echo -e "${YELLOW}Pasos siguientes:${NC}"
echo ""
echo -e "  ${YELLOW}1.${NC} Editar ${CLIENT_DIR}/.env y completar los campos CHANGE_ME:"
echo -e "     • MAIL_USER, MAIL_PASS"
echo -e "     • SPEECH_PRODUCER_URL, SPEECH_ANALYZE_TOKEN"
echo -e "     • BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD"
echo -e "     • MSSQL_PID (Developer/Express/Standard según licencia)"
echo ""
echo -e "  ${YELLOW}2.${NC} Colocar credenciales GCS:"
echo -e "     cp /ruta/a/tu-clave.json ${CLIENT_DIR}/gcs-key.json"
echo ""
echo -e "  ${YELLOW}3.${NC} Asegurarse de que las imágenes Docker están disponibles:"
echo -e "     docker images | grep findcontrol"
echo ""
echo -e "  ${YELLOW}4.${NC} Levantar el cliente (SQL Server + Redis + Backend + Frontend):"
echo -e "     cd ${CLIENT_DIR}"
echo -e "     docker compose -p ${CLIENT_NAME} up -d"
echo ""
echo -e "     El backend espera a SQL Server, crea la BD '${DB_NAME}' y ejecuta"
echo -e "     las migraciones automáticamente antes de arrancar."
echo ""
echo -e "  ${YELLOW}5.${NC} Ver logs de arranque:"
echo -e "     docker compose -p ${CLIENT_NAME} logs -f backend"
echo ""
echo -e "  ${YELLOW}6.${NC} Después del primer login: deshabilitar bootstrap admin en .env:"
echo -e "     BOOTSTRAP_ADMIN_ENABLED=false"
echo -e "     docker compose -p ${CLIENT_NAME} up -d backend"
echo ""
