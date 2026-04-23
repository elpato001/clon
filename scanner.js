const fs = require('fs');
const path = require('path');
const db = require('./db');
const chokidar = require('chokidar');
const metadataService = require('./metadata');


const MEDIA_FOLDER = path.resolve(__dirname, 'media');

/**
 * Inicializa las bibliotecas base en la base de datos
 */
function initLibraries() {
    const defaultLibraries = [
        { name: 'Películas', path: 'Peliculas', type: 'movie' },
        { name: 'Series', path: 'Series', type: 'series' },
        { name: 'Música', path: 'Música', type: 'music' }
    ];

    const insert = db.prepare('INSERT OR IGNORE INTO libraries (name, path, type) VALUES (?, ?, ?)');
    
    defaultLibraries.forEach(lib => {
        const fullPath = path.join(MEDIA_FOLDER, lib.path);
        if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
        insert.run(lib.name, lib.path, lib.type);
    });
}

/**
 * Escanea una biblioteca completa
 */
function scanLibrary(libraryId) {
    const library = db.prepare('SELECT * FROM libraries WHERE id = ?').get(libraryId);
    if (!library) return;

    const fullPath = path.join(MEDIA_FOLDER, library.path);
    console.log(`🔍 Escaneando biblioteca: ${library.name} (${fullPath})`);

    recursiveScan(fullPath, library.id);
}

function recursiveScan(dirPath, libraryId, parentId = null) {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    items.forEach(item => {
        const fullPath = path.join(dirPath, item.name);
        const relPath = path.relative(MEDIA_FOLDER, fullPath).replace(/\\/g, '/');
        
        if (item.isDirectory()) {
            // Registrar carpeta y seguir escaneando
            const id = registerMediaItem({
                library_id: libraryId,
                parent_id: parentId,
                name: item.name,
                path: relPath,
                type: 'folder'
            });
            recursiveScan(fullPath, libraryId, id);
        } else if (isVideo(item.name)) {
            registerMediaItem({
                library_id: libraryId,
                parent_id: parentId,
                name: path.parse(item.name).name,
                path: relPath,
                type: 'video'
            });
        }
    });
}

function registerMediaItem(item) {
    const existing = db.prepare('SELECT id FROM media_items WHERE path = ?').get(item.path);
    if (existing) return existing.id;

    const info = db.prepare(`
        INSERT INTO media_items (library_id, parent_id, name, path, type)
        VALUES (?, ?, ?, ?, ?)
    `).run(item.library_id, item.parent_id, item.name, item.path, item.type);
    
    const newId = info.lastInsertRowid;

    // Disparar identificación de metadatos en segundo plano
    if (item.type === 'video' || (item.type === 'folder' && item.parent_id === null)) {
        metadataService.updateMetadata(newId).catch(err => console.error('Metadata error:', err));
    }

    return newId;
}


function isVideo(f) {
    return ['.mp4', '.mkv', '.avi', '.mov', '.webm'].includes(path.extname(f).toLowerCase());
}

/**
 * Inicia el monitoreo en tiempo real
 */
function startWatcher() {
    console.log('👀 Iniciando monitoreo de medios en tiempo real...');
    const watcher = chokidar.watch(MEDIA_FOLDER, {
        ignored: /(^|[\/\\])\../, // ignorar archivos ocultos
        persistent: true,
        ignoreInitial: true
    });

    watcher
        .on('add', filePath => handleFileEvent('add', filePath))
        .on('unlink', filePath => handleFileEvent('remove', filePath))
        .on('addDir', dirPath => handleFileEvent('addDir', dirPath))
        .on('unlinkDir', dirPath => handleFileEvent('removeDir', dirPath));
}

function handleFileEvent(event, filePath) {
    const relPath = path.relative(MEDIA_FOLDER, filePath).replace(/\\/g, '/');
    console.log(`📢 Evento [${event}]: ${relPath}`);
    
    if (event === 'add' || event === 'addDir') {
        // Encontrar a qué biblioteca pertenece
        const libPath = relPath.split('/')[0];
        const library = db.prepare('SELECT id FROM libraries WHERE path = ?').get(libPath);
        if (library) {
            // Aquí podríamos disparar el registro individual o re-escanear
            // Por simplicidad en esta fase, solo registramos si es video o carpeta
            if (event === 'addDir' || isVideo(filePath)) {
                // Necesitamos encontrar el parent_id... 
                // Por ahora, un re-escaneo parcial o simplemente registrarlo
                // En una versión pro, buscaríamos el ID de la carpeta contenedora.
            }
        }
    } else if (event === 'remove' || event === 'removeDir') {
        db.prepare('DELETE FROM media_items WHERE path = ? OR path LIKE ?').run(relPath, relPath + '/%');
    }
}

module.exports = {
    initLibraries,
    scanLibrary,
    startWatcher
};
