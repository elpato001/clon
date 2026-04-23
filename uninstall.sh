#!/bin/bash

# Curator Media Server - Desinstalador Universal
echo "🗑️ Desinstalando Curator Media Server..."

# 1. Detener y eliminar servicio
if [ -f "/etc/systemd/system/curator.service" ]; then
    echo "⏹️ Deteniendo servicio..."
    sudo systemctl stop curator
    sudo systemctl disable curator
    sudo rm /etc/systemd/system/curator.service
    sudo systemctl daemon-reload
fi

echo "✅ Servicio eliminado."
echo "Nota: La carpeta del proyecto y tus archivos en 'media/' NO han sido borrados por seguridad."
echo "Si deseas borrarlos manualmente, usa: rm -rf $(pwd)"
