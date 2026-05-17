#!/bin/bash
# ── Reset Demo — Sistema de Parqueo USPG ─────────────────────────────────────
# Limpia sesiones, pagos, reservas y logs de prueba.
# Deja intactos: usuarios, vehículos, espacios, tarifas y configuración.
# Uso: ./reset-demo.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/webapp/.env.local"

# Cargar DATABASE_URL del .env.local
if [ -f "$ENV_FILE" ]; then
  export $(grep -E '^DATABASE_URL=' "$ENV_FILE" | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo -e "\n  ${RED}✗ No se encontró DATABASE_URL en webapp/.env.local${RESET}\n"
  exit 1
fi

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
echo -ne "  Limpiando base de datos..."

node -e "
const { PrismaClient } = require('$SCRIPT_DIR/webapp/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function main() {
  await prisma.payment.deleteMany();
  await prisma.parkingSession.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.barrierLog.deleteMany();
  await prisma.visitorQR.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.parkingSpace.updateMany({ data: { status: 'AVAILABLE' } });
  await prisma.\$disconnect();
  console.log('OK');
}
main().catch(e => { console.error(e.message); process.exit(1); });
"

if [ $? -eq 0 ]; then
  echo -e " ${GREEN}✓${RESET}"
  echo ""
  echo -e "  ${GREEN}✓ Demo lista. Todos los espacios disponibles.${RESET}"
  echo -e "  ${GREEN}  Usuarios y vehículos del seed intactos.${RESET}"
else
  echo -e " ${RED}✗ Error — verifica que el servidor de BD esté corriendo.${RESET}"
fi
echo ""
