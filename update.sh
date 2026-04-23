#!/bin/bash

# Colores para la salida
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔄 Iniciando actualización de MyMediaServer...${NC}"

# 1. Descargar cambios de GitHub
echo -e "${GREEN}📡 Descargando últimas mejoras desde GitHub...${NC}"
git pull origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Código actualizado correctamente.${NC}"
else
    echo -e "${RED}❌ Error al descargar de GitHub. Verifica tu conexión.${NC}"
    exit 1
fi

# 2. Instalar nuevas dependencias si las hay
echo -e "${GREEN}📦 Verificando dependencias (npm install)...${NC}"
npm install --production

# 3. Reiniciar el servicio para aplicar cambios
echo -e "${GREEN}⚙️  Reiniciando el servicio para aplicar cambios...${NC}"
if [ -f "/etc/systemd/system/mymediaserver.service" ]; then
    sudo systemctl restart mymediaserver
    echo -e "${YELLOW}🚀 Servidor reiniciado y funcionando.${NC}"
else
    echo -e "${YELLOW}⚠️  No se encontró servicio systemd. Reinicia el servidor manualmente con 'npm start'.${NC}"
fi

echo -e "${GREEN}✨ ¡Actualización completada con éxito!${NC}"
