#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# build-and-deploy.sh — Build de imágenes y deploy a clientes
#
# Uso:
#   ./build-and-deploy.sh staging          → build :staging, deploy solo a staging
#   ./build-and-deploy.sh promote          → promueve :staging a :latest
#   ./build-and-deploy.sh deploy-all       → recrea todos los clientes con :latest
#   ./build-and-deploy.sh deploy empresa-abc → recrea solo ese cliente
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log_info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CLIENTS_DIR="${SCRIPT_DIR}/clients"

BACKEND_IMAGE="findcontrol/speechanalytics"
FRONTEND_IMAGE="findcontrol/speechanalytics-frontend"

# ─── Funciones ────────────────────────────────────────────────────────────────

build_images() {
  local TAG="${1}"
  log_info "Construyendo imágenes con tag ':${TAG}'..."

  docker build \
    --tag "${BACKEND_IMAGE}:${TAG}" \
    --file "${PROJECT_ROOT}/backend/Dockerfile" \
    "${PROJECT_ROOT}/backend"
  log_success "Backend: ${BACKEND_IMAGE}:${TAG}"

  docker build \
    --tag "${FRONTEND_IMAGE}:${TAG}" \
    --file "${PROJECT_ROOT}/frontend/Dockerfile" \
    "${PROJECT_ROOT}/frontend"
  log_success "Frontend: ${FRONTEND_IMAGE}:${TAG}"
}

promote_to_latest() {
  log_info "Promoviendo :staging → :latest..."

  # Verificar que existan las imágenes staging
  if ! docker image inspect "${BACKEND_IMAGE}:staging" &>/dev/null; then
    log_error "No existe ${BACKEND_IMAGE}:staging — ejecuta primero: $0 staging"
    exit 1
  fi

  docker tag "${BACKEND_IMAGE}:staging"  "${BACKEND_IMAGE}:latest"
  docker tag "${FRONTEND_IMAGE}:staging" "${FRONTEND_IMAGE}:latest"
  log_success "Imágenes promovidas a :latest"
}

deploy_client() {
  local CLIENT="${1}"
  local CLIENT_DIR="${CLIENTS_DIR}/${CLIENT}"

  if [[ ! -f "${CLIENT_DIR}/docker-compose.yml" ]]; then
    log_error "Cliente '${CLIENT}' no encontrado en ${CLIENT_DIR}"
    return 1
  fi

  log_info "Desplegando cliente: ${CLIENT}..."

  # --force-recreate: fuerza recrear contenedores aunque el compose no cambie,
  # necesario cuando la imagen local fue reemplazada con el mismo tag (:latest)
  docker compose \
    -p "${CLIENT}" \
    -f "${CLIENT_DIR}/docker-compose.yml" \
    up -d --force-recreate --remove-orphans

  log_success "Cliente '${CLIENT}' actualizado"
}

deploy_all_clients() {
  local SKIP="${1:-staging}"  # staging no se toca con deploy-all por defecto

  log_info "Desplegando todos los clientes (excepto '${SKIP}')..."
  local COUNT=0

  for CLIENT_DIR in "${CLIENTS_DIR}"/*/; do
    [[ -f "${CLIENT_DIR}/docker-compose.yml" ]] || continue
    local CLIENT
    CLIENT="$(basename "${CLIENT_DIR}")"

    if [[ "${CLIENT}" == "${SKIP}" ]]; then
      log_warn "Omitiendo '${CLIENT}' (staging)"
      continue
    fi

    deploy_client "${CLIENT}"
    COUNT=$((COUNT + 1))
  done

  log_success "Deploy completado: ${COUNT} cliente(s) actualizados"
}

# ─── Main ─────────────────────────────────────────────────────────────────────

COMMAND="${1:-help}"

case "${COMMAND}" in

  staging)
    # Build con tag :staging + deploy solo al cliente 'staging'
    build_images "staging"
    echo ""
    deploy_client "staging"
    echo ""
    log_success "Staging listo. Probá en https://staging.tudominio.com"
    log_info "Cuando estés conforme: $0 promote && $0 deploy-all"
    ;;

  promote)
    # Promover :staging a :latest (sin rebuild)
    promote_to_latest
    echo ""
    log_warn "Las imágenes :latest fueron actualizadas pero los clientes siguen corriendo"
    log_info "Para aplicar: $0 deploy-all"
    ;;

  deploy-all)
    # Recrear todos los clientes con la imagen :latest actual
    deploy_all_clients "staging"
    ;;

  deploy)
    # Recrear un cliente específico
    CLIENT="${2:?Uso: $0 deploy <nombre-cliente>}"
    deploy_client "${CLIENT}"
    ;;

  full-deploy)
    # Build staging + promote + deploy-all en un solo comando
    log_warn "Full deploy: build → promote → deploy-all"
    read -rp "¿Continuar? (s/N): " CONFIRM
    [[ "${CONFIRM}" =~ ^[sS]$ ]] || { log_warn "Cancelado."; exit 0; }

    build_images "staging"
    promote_to_latest
    deploy_all_clients "staging"
    ;;

  *)
    echo ""
    echo "Uso: $0 <comando>"
    echo ""
    echo "  staging          Build :staging + deploy al cliente staging"
    echo "  promote          Promueve :staging → :latest"
    echo "  deploy-all       Recrea todos los clientes (excepto staging) con :latest"
    echo "  deploy <name>    Recrea un cliente específico"
    echo "  full-deploy      Build + promote + deploy-all interactivo"
    echo ""
    ;;
esac
