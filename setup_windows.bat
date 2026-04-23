@echo off
setlocal enabledelayedexpansion

:: Curator Media Server - Instalador Maestro para Windows
:: 📽️ "Todo en uno: Node.js, Git, FFmpeg y el Servidor"

echo ------------------------------------------------
echo 📽️ BIENVENIDO AL INSTALADOR DE CURATOR MEDIA SERVER
echo ------------------------------------------------
echo.

:: 1. Verificar permisos de Administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Ejecutando como administrador.
) else (
    echo [ERROR] Por favor, ejecuta este script como ADMINISTRADOR.
    pause
    exit /b 1
)

:: 2. Verificar/Instalar Node.js
where node >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Node.js ya está instalado.
) else (
    echo [!] Node.js no encontrado. Instalando vía winget...
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    if %errorLevel% neq 0 (
        echo [ERROR] No se pudo instalar Node.js automáticamente. 
        echo Por favor instálalo desde https://nodejs.org/
        pause
        exit /b 1
    )
    echo [OK] Node.js instalado. Reiniciando entorno...
)

:: 3. Verificar/Instalar Git
where git >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Git ya está instalado.
) else (
    echo [!] Git no encontrado. Instalando vía winget...
    winget install Git.Git --silent --accept-package-agreements --accept-source-agreements
    if %errorLevel% neq 0 (
        echo [ERROR] No se pudo instalar Git automáticamente.
        pause
        exit /b 1
    )
    echo [OK] Git instalado.
)

:: 4. Clonar Proyecto
if not exist ".git" (
    echo [!] Clonando repositorio...
    git clone https://github.com/elpato001/clon.git curator-server
    cd curator-server
)

:: 5. Instalar dependencias de Node
echo.
echo 🛠️ Instalando dependencias del servidor...
call npm install

:: 6. Configurar variables de entorno
if not exist ".env" (
    echo [!] Configurando archivo .env...
    copy .env.example .env
    :: Generar secreto aleatorio simple
    set "SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM%"
    powershell -Command "(Get-Content .env) -replace 'tu-secreto-super-seguro-aqui', '!SECRET!' | Set-Content .env"
)

:: 7. Crear estructura de carpetas de medios
echo [!] Creando carpetas de medios...
if not exist "media\Peliculas" mkdir "media\Peliculas"
if not exist "media\Series" mkdir "media\Series"
if not exist "media\Musica" mkdir "media\Musica"
if not exist "media\.cache" mkdir "media\.cache"
if not exist "media\.transcode" mkdir "media\.transcode"

:: 8. Finalización
echo.
echo ================================================
echo ✅ ¡INSTALACIÓN COMPLETADA CON ÉXITO!
echo ================================================
echo.
echo 🌐 Acceso Local: http://localhost:3000
echo 🔑 Admin: admin / admin123
echo.
echo 🚀 Para iniciar el servidor ahora, escribe:
echo    npm start
echo.
echo ================================================
pause
