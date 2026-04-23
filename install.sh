#!/bin/bash
set -e

# Colores CasaOS-Style
CYAN='\033[0;36m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

echo -e "\n${CYAN}${BOLD}"
echo "   ██████╗ ██╗   ██╗██████╗  █████╗ ████████╗ ██████╗ ██████╗ "
echo "  ██╔════╝ ██║   ██║██╔══██╗██╔══██╗╚══██╔══╝██╔═══██╗██╔══██╗"
echo "  ██║      ██║   ██║██████╔╝███████║   ██║   ██║   ██║██████╔╝"
echo "  ██║      ██║   ██║██╔══██╗██╔══██║   ██║   ██║   ██║██╔══██╗"
echo "  ╚██████╗ ╚██████╔╝██║  ██║██║  ██║   ██║   ╚██████╔╝██║  ██║"
echo "   ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "${BLUE}▶ Bienvenido al Instalador Universal Estilo CasaOS${NC}\n"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Por favor, ejecuta este instalador como root (sudo).${NC}"
  exit 1
fi

INSTALL_DIR="/opt/mymediaserver"

echo -e "${CYAN}➜ [1/5] Preparando el sistema operativo...${NC}"
apt-get update >/dev/null 2>&1
apt-get install -y curl git ufw >/dev/null 2>&1

echo -e "${CYAN}➜ [2/5] Instalando las turbinas (Node.js 20.x)...${NC}"
if ! command -v node >/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
    apt-get install -y nodejs >/dev/null 2>&1
fi

echo -e "${CYAN}➜ [3/5] Descargando y posicionando Curator...${NC}"
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}  Actualizando directorio existente...${NC}"
    cd $INSTALL_DIR
    git config --global --add safe.directory $INSTALL_DIR
    git fetch --all >/dev/null 2>&1
    git reset --hard origin/main >/dev/null 2>&1
else
    git clone https://github.com/pepitozoe79-lgtm/gnu-free-player $INSTALL_DIR >/dev/null 2>&1
    cd $INSTALL_DIR
fi

echo -e "${CYAN}➜ [4/5] Ensamblando dependencias internas...${NC}"
npm install --production >/dev/null 2>&1

echo -e "${CYAN}➜ [5/5] Inyectando el demonio en la matriz (Systemd)...${NC}"
cat > /etc/systemd/system/mymediaserver.service <<EOF
[Unit]
Description=Curator Media Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node $INSTALL_DIR/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable mymediaserver.service >/dev/null 2>&1
systemctl restart mymediaserver.service

if command -v ufw > /dev/null; then
    ufw allow 3000/tcp >/dev/null 2>&1
fi

IP=$(hostname -I | awk '{print $1}')

echo -e "\n${GREEN}${BOLD}✨ ¡INSTALACIÓN COMPLETADA CON ÉXITO! ✨${NC}\n"
echo -e "${YELLOW}🌐 Accede a tu interfaz en :${NC} http://$IP:3000"
echo -e "${YELLOW}👤 Usuario por defecto  :${NC} admin"
echo -e "${YELLOW}🔑 Contraseña            :${NC} admin123\n"
echo -e "🚀 Tu servidor ya se está ejecutando en segundo plano de por vida."
echo -e "Para desinstalar en el futuro: ${CYAN}curl -fsSL https://raw.githubusercontent.com/pepitozoe79-lgtm/gnu-free-player/main/uninstall.sh | sudo bash${NC}\n"
