# CHANGELOG

## [2.0.0] - 2026-04-19
### Added
- Nueva interfaz visual "Curator" con Glassmorphism.
- Autenticación JWT para todas las rutas API.
- Middleware de Rate Limiting para prevenir ataques de fuerza bruta en login.
- Soporte para Docker y Docker Compose con Nginx reverse proxy.
- Soporte para HTTPS nativo vía Nginx.
- Validaciones estrictas de rutas para prevenir Path Traversal.

### Changed
- Refactorización total de `server.js` para usar mejores prácticas de seguridad.
- Optimización de la lógica de escaneo de biblioteca.

### Fixed
- Corregido error en `fs.stat` cuando el archivo era borrado durante el escaneo.
- Corregida vulnerabilidad crítica de acceso a directorios raíz.
