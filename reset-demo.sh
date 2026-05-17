#!/bin/bash
# ── Reset Demo — Sistema de Parqueo USPG ─────────────────────────────────────
# Limpia sesiones, pagos, reservas y logs de prueba.
# Deja intactos: usuarios, vehículos, espacios, tarifas y configuración.
# Uso: ./reset-demo.sh

DATABASE_URL="postgresql://postgres:admin123@localhost:5432/parqueo_db"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║     Reset Demo — Sistema de Parqueo USPG         ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${YELLOW}⚠  Esto borrará sesiones, pagos, reservas y logs.${RESET}"
echo -e "  ${YELLOW}   Usuarios, vehículos y espacios NO se tocan.${RESET}"
echo ""
echo -ne "  ¿Continuar? [s/N] → "
read -r confirm
if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
  echo -e "\n  ${YELLOW}Cancelado.${RESET}\n"
  exit 0
fi

echo ""

run() {
  local label="$1"
  local sql="$2"
  echo -ne "  ${label}..."
  result=$(psql "$DATABASE_URL" -c "$sql" 2>&1)
  if [ $? -eq 0 ]; then
    echo -e " ${GREEN}✓${RESET}"
  else
    echo -e " ${RED}✗ Error: $result${RESET}"
  fi
}

run "Limpiando pagos             " 'DELETE FROM "Payment";'
run "Limpiando sesiones          " 'DELETE FROM "ParkingSession";'
run "Limpiando reservas          " 'DELETE FROM "Reservation";'
run "Limpiando logs de auditoría " 'DELETE FROM "AuditLog";'
run "Limpiando logs de barrera   " 'DELETE FROM "BarrierLog";'
run "Limpiando QRs de visitantes " 'DELETE FROM "VisitorQR";'
run "Limpiando notificaciones    " 'DELETE FROM "Notification";'
run "Liberando todos los espacios" 'UPDATE "ParkingSpace" SET status = '"'"'AVAILABLE'"'"';'

echo ""
echo -e "  ${GREEN}✓ Demo lista. Todos los espacios disponibles.${RESET}"
echo -e "  ${GREEN}  Usuarios y vehículos del seed intactos.${RESET}"
echo ""
