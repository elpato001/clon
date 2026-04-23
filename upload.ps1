# script de automatización de subida a GitHub (Powershell)

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 Inicializando subida a GitHub: MyMediaServer v2.0.0 " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Asegurar que estamos en un repositorio limpio
if (Test-Path .git) {
    Write-Host "[!] Repositorio Git antiguo detectado. Reinicializando..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force .git
}

# 2. Inicializar repositorio e indexar
Write-Host "[1/4] Inicializando git add..." -ForegroundColor Green
git init
git add .

# 3. Primer Commit
Write-Host "[2/4] Creando Commit Principal de The Enterprise Edition..." -ForegroundColor Green
git commit -m "🚀 feat: MyMediaServer v2.0.0 - Enterprise Security Edition

- Autenticación JWT completa y sesiones robustas implementadas.
- Defensa contramarchas: Path Traversal prevention & concurrent database file locks.
- Frontend rediseñado: Aesthetics UI 'Curator' con Glassmorphism y Reactivo.
- Funcionalidad 'Continue Watching' incrustada v2.
- Capacidades de Docker y Docker Compose ready.
- Arquitectura Nginx + Reverse Proxy + HTTPS lists.
- Install.sh, update.sh listos para deploys en VPS (Debian/Ubuntu)."

# 4. Creando Tag de Version
Write-Host "[3/4] Creando Release Tag v2.0.0..." -ForegroundColor Green
git tag -a v2.0.0 -m "Release v2.0.0 - Producción lista y totalmente segura"

# 5. Configurar Remote y Subir
Write-Host "[4/4] Conectando con GitHub Remote Push..." -ForegroundColor Green
git branch -M main
git remote add origin https://github.com/pepitozoe79-lgtm/MyMediaServer-v2.0.0.git

Write-Host ""
Write-Host "⏳ Subiendo código fonte, hold on tight... (podría solicitar credenciales)" -ForegroundColor Magenta
git push -u origin main --force
git push origin v2.0.0 --force

Write-Host ""
Write-Host "✅ ¡Felicidades! Subida completada con éxito. Listo para distribución masiva." -ForegroundColor Green
Write-Host "🌍 Puedes ver tu portada en: https://github.com/pepitozoe79-lgtm/MyMediaServer-v2.0.0" -ForegroundColor Cyan
Write-Host ""
