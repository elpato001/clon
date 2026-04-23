#!/bin/bash

# Curator Media Server - Instalador Universal v2.0
# "Un solo comando para gobernarlos a todos"

echo "📽️ Iniciando instalación de Curator Media Server..."

# 1. Comprobar dependencias básicas
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js (v20)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

if ! command -v git &> /dev/null; then
    echo "📦 Instalando Git..."
    sudo apt-get install -y git
fi

# 2. Clonar el repositorio si no estamos dentro
if [ ! -d ".git" ]; then
    echo "📂 Clonando repositorio..."
    git clone https://github.com/elpato001/clon.git curator-server
    cd curator-server
fi

# 3. Instalar dependencias de NPM
echo "npm 🛠️ Instalando dependencias del proyecto..."
npm install

# 4. Configurar entorno (.env)
if [ ! -f ".env" ]; then
    echo "⚙️ Configurando archivo .env..."
    cp .env.example .env
    # Generar un JWT_SECRET aleatorio
    SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    sed -i "s/tu-secreto-super-seguro-aqui/$SECRET/" .env
fi

# 5. Crear estructura de carpetas
mkdir -p media/Peliculas media/Series media/Musica media/.cache media/.transcode

# 6. Configurar servicio Systemd (Opcional pero recomendado para Linux)
if [ -d "/etc/systemd/system" ]; then
    echo "🔄 Configurando servicio Systemd..."
    CURR_DIR=$(pwd)
    cat <<EOF | sudo tee /etc/systemd/system/curator.service
[Unit]
Description=Curator Media Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$CURR_DIR
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    sudo systemctl enable curator
    sudo systemctl start curator
fi

echo ""
echo "✅ ¡Instalación Completada con Éxito!"
echo "------------------------------------------------"
echo "🌐 Accede en: http://$(hostname -I | awk '{print $1}'):3000"
echo "🔑 Usuario por defecto: admin / admin123"
echo "⚠️ Recuerda editar el archivo .env con tu TMDB_API_KEY para los metadatos."
echo "------------------------------------------------"
