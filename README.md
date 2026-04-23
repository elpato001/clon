<div align="center">
  <img src="https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2659&auto=format&fit=crop" alt="Curator Banner" width="100%" style="border-radius:15px; margin-bottom: 20px;">
  
  # 📽️ Curator Media Server

  Un media server moderno, responsivo y ultra veloz inspirado en las grandes plataformas de streaming. Anteriormente conocido como "GNU Free Player", ahora renace en NodeJS con una estética premium.

  ## 🚀 Instalación Automática (Estilo CasaOS)

  Instala, configura y levanta el servidor completo con un solo comando en tu terminal de Ubuntu/Debian:

  ```bash
  curl -fsSL https://raw.githubusercontent.com/pepitozoe79-lgtm/MyMediaServer/main/install.sh | sudo bash
  ```

  Una vez que termine, te dirá tu IP, puerto y clave maestra en pantalla. ¡Así de fácil!

  ## 🗑️ Desinstalación Rápida

  Si alguna vez decides remover todo el ecosistema (sin borrar tus videos almacenados), basta con correr:

  ```bash
  curl -fsSL https://raw.githubusercontent.com/pepitozoe79-lgtm/MyMediaServer/main/uninstall.sh | sudo bash
  ```

  ---

  ## 📂 Arquitectura del Proyecto-v2.0.0

  [![Security](https://img.shields.io/badge/Security-JWT_|_Path_Traversal_Protected-green.svg?style=for-the-badge)]()
  [![Docker Ready](https://img.shields.io/badge/Docker-Ready-2496ED.svg?style=for-the-badge&logo=docker)]()
  [![Node.js](https://img.shields.io/badge/Node.js-v20_LTS-339933.svg?style=for-the-badge&logo=nodedotjs)]()
</div>

<br>

Bienvenido a **Curator Media Server** (la reencarnación NodeJS de *GNU Free Player*), la evolución premium de tu cine en casa personal. Construido sobre Node.js, este proyecto no es solo un servidor de archivos; es una plataforma de streaming VOD (Video On Demand) completa con una de las interfaces más hermosas, seguras y robustas de la comunidad Open Source.

---

## ✨ Novedades Recientes (Lo nuevo en esta versión)

Hemos migrado del antiguo núcleo C# a una arquitectura **Node.js ultra-rápida y ligera**, resolviendo múltiples errores reportados por la comunidad:
1. **🛠️ Instalador Automático Estilo CasaOS:** Ya no necesitas instalar .NET ni lidiar con dependencias complejas. Un solo comando lo instala todo.
2. **🔑 Cambio de Contraseñas Activo:** A petición popular, hemos añadido el botón de *Cambiar Contraseña* directamente en el panel de usuario. Tu cuenta `admin` puede modificar su clave con 2 clics para mantener la seguridad.
3. **📁 Subida de Archivos Masivos Optimizada:** Se corrigieron los errores de subida (Upload). El backend ahora admite *streaming de subidas de hasta 10GB* utilizando el protocolo `multipart/form-data` e integrando Headers `Authorization: Bearer` con JWT sin cortes.
4. **🔌 Desinstalador Universal:** Si te equivocaste de servidor o quieres limpiar todo, añadimos un script de `uninstall.sh` súper seguro que limpia el daemon sin borrar tus películas.

---

## 🌟 ¿Qué lo hace tan especial?

### 🛡️ Seguridad de Grado Empresarial (Enterprise Security)
* **Autenticación JWT:** Olvídate del viejo sistema de Cookies poco seguras. Todas las rutas usan JSON Web Tokens.
* **Tolerancia a Path Traversal:** Protege completamente tu servidor impidiendo que usuarios escapen de la carpeta `/media`.
* **File Locking:** Previene la corrupción de tu lista de `users.json` al tratar de cambiar contraseñas simultáneamente.

### 🎨 Experiencia "Curator" Premium (Glassmorphism)
Interfaz rediseñada desde cero inspirada en las principales plataformas de VOD.
* Estética oscura "Glassmorphism" con fondos reactivos que toman el color de tus pósters.
* Reproductor de video que guarda automáticamente progreso en **Continue Watching**.

### 🛰️ Live IPTV Integrado
Soporte absoluto para listas M3U / M3U8. Pega tu link de IPTV y el sistema extraerá automáticamente el logo del canal y su título para mostrarlo gráficamente.

---

## 💻 Entorno de Desarrollo Manual

Si eres desarrollador o quieres correrlo en Windows/MacOS en lugar de un servidor Ubuntu:

1. Clona el proyecto
```powershell
git clone https://github.com/pepitozoe79-lgtm/MyMediaServer.git
cd MyMediaServer
```
2. Instala dependencias y corre el servidor local:
```powershell
npm install
npm start
```

---

## 📂 Arquitectura Interna y Organización
El servidor generará automáticamente su estructura local de carpetas en cuanto inicie:

```text
/opt/mymediaserver/
├── media/           🎬 (Tus películas y subcarpetas van aquí)
├── public/          🎨 (Frontend Vanilla JS/CSS interactivo)
├── server.js        🧠 (Core protegido por JWT)
├── users.json       🔐 (Base de datos Autogenerada de cuentas)
└── iptv.json        📺 (Configuración de IPTV guardada)
```

💡 **Tip de Portadas:** ¿Quieres darle elegancia a tu biblioteca? Coloca cualquier imagen JPG con el nombre `poster.jpg` dentro de la subcarpeta local de una película y el servidor la usará inteligentemente en lugar del póster genérico.

---

## 🦆 Agradecimientos y Mención Honorífica

Quiero hacer una mención honorífica y un agradecimiento muy especial a mi maestro, **[@elpato001](https://github.com/elpato001)**. Gracias a sus conocimientos transmitidos, su dedicación y sus enseñanzas a lo largo de este camino, la evolución de este proyecto y mis habilidades como desarrollador han llegado a un nuevo y extraordinario nivel. ¡Gracias eternas, maestro!


**Hecho con ❤️ para la comunidad Open Source y Home Servers.**
