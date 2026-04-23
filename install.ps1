# Curator Media Server - Instalador para Windows (PowerShell)
# 📽️ "Un solo comando para Windows"

Write-Host "📽️ Iniciando instalación de Curator Media Server en Windows..." -ForegroundColor Cyan

# 1. Comprobar Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Node.js no encontrado. Por favor, instálalo desde https://nodejs.org/" -ForegroundColor Yellow
    return
}

# 2. Clonar el repositorio
if (!(Test-Path .git)) {
    Write-Host "📂 Clonando repositorio..." -ForegroundColor Gray
    git clone https://github.com/elpato001/clon.git curator-server
    Set-Location curator-server
}

# 3. Instalar dependencias
Write-Host "🛠️ Instalando dependencias de NPM..." -ForegroundColor Gray
npm install

# 4. Configurar .env
if (!(Test-Path .env)) {
    Write-Host "⚙️ Configurando archivo .env..." -ForegroundColor Gray
    Copy-Item .env.example .env
    $secret = [Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 255) }))
    (Get-Content .env) -replace 'tu-secreto-super-seguro-aqui', $secret | Set-Content .env
}

# 5. Crear carpetas
$folders = @("media/Peliculas", "media/Series", "media/Musica", "media/.cache", "media/.transcode")
foreach ($f in $folders) {
    if (!(Test-Path $f)) { New-Item -ItemType Directory -Path $f -Force }
}

Write-Host ""
Write-Host "✅ ¡Instalación Completada!" -ForegroundColor Green
Write-Host "------------------------------------------------"
Write-Host "🚀 Para iniciar el servidor, escribe: npm start"
Write-Host "🌐 Accede en: http://localhost:3000"
Write-Host "🔑 Usuario por defecto: admin / admin123"
Write-Host "------------------------------------------------"
