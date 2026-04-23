#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

echo -e "\n${RED}${BOLD}🗑️  Desinstalador de Curator Media Server${NC}\n"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Por favor, ejecuta este instalador como root (sudo).${NC}"
  exit 1
fi

echo -e "${CYAN}➜ Deteniendo y removiendo el servicio de segundo plano...${NC}"
systemctl stop mymediaserver.service 2>/dev/null || true
systemctl disable mymediaserver.service 2>/dev/null || true
rm -f /etc/systemd/system/mymediaserver.service
systemctl daemon-reload

echo -e "${CYAN}➜ Borrando el núcleo del sistema...${NC}"
INSTALL_DIR="/opt/mymediaserver"
if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
fi

echo -e "\n${GREEN}${BOLD}✅ ¡Desinstalación completada con éxito!${NC}"
echo -e "Tu servidor Ubuntu está limpio."
