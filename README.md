<div align="center">
  <img src="https://images.unsplash.com/photo-1574267432553-4b4628081c31?q=80&w=2662&auto=format&fit=crop" alt="Curator Banner" width="100%" style="border-radius:24px; margin-bottom: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
  
  # 📽️ Curator Media Server v2.0
  ### *The Ultimate Emby-Clone for Personal Cloud Streaming*

  [![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
  [![Node.js](https://img.shields.io/badge/Node.js-v20_LTS-339933.svg?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
  [![SQLite](https://img.shields.io/badge/Database-SQLite3-003B57.svg?style=for-the-badge&logo=sqlite)](https://www.sqlite.org/)
  [![PWA](https://img.shields.io/badge/PWA-Ready-5B8CFF.svg?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)

  **Curator** es un servidor multimedia moderno, premium y ultra-eficiente diseñado para ser el centro de entretenimiento definitivo en tu hogar.
</div>

---

## ✨ Características Principales

### 🧠 Inteligencia y Metadatos
- **Identificación Automática (TMDB):** Escaneo inteligente de películas y series con descarga automática de posters, fanart y sinopsis.
- **Caché Inteligente:** Almacenamiento local de metadatos e imágenes para una carga instantánea y privacidad total.
- **Identificación Manual:** Posibilidad de corregir o editar metadatos directamente desde la interfaz.

### 🎬 Streaming de Próxima Generación
- **Transcodificación HLS Dinámica:** Utiliza FFmpeg para convertir cualquier video (MKV, AVI, etc.) a un flujo adaptable compatible con cualquier navegador.
- **FFmpeg Portable Integrado:** El servidor configura su propio motor de video sin dependencias externas complicadas.
- **Continuar Viendo:** Sincronización exacta del progreso de reproducción entre todos tus dispositivos.

### 👥 Perfiles y Seguridad "Pro"
- **Multi-perfiles:** Crea perfiles individuales para cada miembro de la familia al estilo Netflix.
- **Seguridad por PIN:** Protege perfiles específicos con códigos de 4 dígitos.
- **Hardening de Seguridad:** Protección activa contra ataques de fuerza bruta (bloqueo automático de IPs) y cifrado JWT.

### 📺 TV en Vivo, DVR y Plugins
- **IPTV con Guía EPG:** Soporte para listas M3U y guías XMLTV para ver la programación en tiempo real.
- **Grabador DVR:** Graba tus programas favoritos de la televisión en vivo directamente a tu biblioteca.
- **Ecosistema de Plugins:** Amplía las funciones del servidor soltando scripts en la carpeta `/plugins`.

### 📱 Experiencia Multi-plataforma
- **PWA (Progressive Web App):** Instala Curator en tu Android, iOS o Windows como una aplicación nativa.
- **Diseño Glassmorphism:** Interfaz ultra-moderna con efectos de desenfoque y fondos reactivos.

---

## 🚀 Instalación Automática (One-Liner)

  Instala, configura y levanta el servidor completo con un solo comando en tu terminal de Linux:

  ```bash
  curl -fsSL https://raw.githubusercontent.com/elpato001/clon/main/install.sh | sudo bash
  ```

  Una vez que termine, el servidor estará corriendo como un servicio de fondo. ¡Así de fácil!

### Configuración Inicial
1. Crea un archivo `.env` basado en `.env.example`.
2. Añade tu `TMDB_API_KEY` para activar la identificación automática.
3. Inicia el servidor: `npm start`.

---

## 💻 Comandos de Administración

| Acción | Comando |
| :--- | :--- |
| **Iniciar Servidor** | `npm start` |
| **Modo Desarrollo** | `npm run dev` |
| **Limpiar Caché Transcode** | `rm -rf media/.transcode/*` |
| **Reiniciar DB** | `rm database.db` (Cuidado: borra usuarios y progreso) |

---

  ## 🗑️ Desinstalación Rápida

  Si alguna vez decides remover el servicio (sin borrar tus videos), basta con correr:

  ```bash
  curl -fsSL https://raw.githubusercontent.com/elpato001/clon/main/uninstall.sh | sudo bash
  ```

---

## 📂 Estructura del Proyecto

```text
/
├── bin/              📦 (Binarios de FFmpeg)
├── media/            🎬 (Tus películas, series y música)
│   ├── .cache/       🖼️ (Posters y backdrops cacheados)
│   └── .transcode/   🎞️ (Segmentos temporales de streaming)
├── plugins/          🔌 (Extensiones del sistema)
├── public/           🎨 (Frontend PWA y assets)
├── server.js         🧠 (Núcleo de la API y Seguridad)
└── database.db       🗄️ (Base de datos SQLite)
```

---

## 🦆 Agradecimientos

Este proyecto es la culminación de un proceso de aprendizaje intenso y apasionado. Un agradecimiento especial al maestro **[@elpato001](https://github.com/elpato001)** por su guía y enseñanzas que permitieron elevar este código a un nivel premium.

---

**Hecho con ❤️ para la comunidad de Home Servers.**
