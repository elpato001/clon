require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const fileUpload = require('express-fileupload');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-enterprise-secret-key-2024';
const db = require('./db');
const scanner = require('./scanner');
const transcoder = require('./transcoder');
const security = require('./security');
const iptv = require('./iptv');
const pluginLoader = require('./pluginLoader');







// ==============================================
// 🔒 CONFIGURACIÓN DE SEGURIDAD
// ==============================================
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutos
const MAX_LOGIN_ATTEMPTS = 5;
const fileLocks = new Map();


// Rutas absolutas
const MEDIA_FOLDER = path.resolve(__dirname, 'media');
const IPTV_FILE = path.join(__dirname, 'iptv.json');


// Middleware de Autenticación JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

    if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
        req.user = user;
        next();
    });
}

// ==============================================
// 📂 INICIALIZACIÓN
// ==============================================
function initializeApp() {
    if (!fs.existsSync(MEDIA_FOLDER)) {
        fs.mkdirSync(MEDIA_FOLDER, { recursive: true });
    }
    ['Peliculas', 'Series', 'Musica'].forEach(folder => {
        const folderPath = path.join(MEDIA_FOLDER, folder);
        if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);
    });

    // Inicializar bibliotecas en DB y escanear
    scanner.initLibraries();
    const libs = db.prepare('SELECT id FROM libraries').all();
    libs.forEach(lib => scanner.scanLibrary(lib.id));
    
    // Iniciar monitoreo
    scanner.startWatcher();

    // Cargar plugins
    pluginLoader.loadPlugins({ app, db, scanner, transcoder, security, iptv });
}



initializeApp();

// ==============================================
// 🔧 UTILIDADES
// ==============================================
async function withFileLock(filePath, operation) {
    while (fileLocks.get(filePath)) await new Promise(r => setTimeout(r, 50));
    fileLocks.set(filePath, true);
    try { return await operation(); } finally { fileLocks.delete(filePath); }
}

function validatePath(inputPath) {
    try {
        const decodedPath = decodeURIComponent(inputPath);
        const resolvedPath = path.resolve(decodedPath);
        if (!resolvedPath.startsWith(path.resolve(MEDIA_FOLDER))) return null;
        return resolvedPath;
    } catch (e) { return null; }
}


// ==============================================
// MIDDLEWARES
// ==============================================
app.use(cors());
app.use(express.json());
app.use(fileUpload({ 
    limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10GB Max
    useTempFiles: true,
    tempFileDir: '/tmp/'
}));
app.use(express.static('public'));
app.use('/media', authenticateToken, express.static(MEDIA_FOLDER));
app.use('/transcode', authenticateToken, express.static(path.join(__dirname, 'media', '.transcode')));


// ==============================================
// 🔐 RUTAS PÚBLICAS
// ==============================================
app.post('/api/login', security.bruteForceProtection, (req, res) => {
    const { username, password } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
        security.logAccess(ip, username, 'failure');
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    bcrypt.compare(password, user.password, (err, match) => {
        if (match) {
            security.logAccess(ip, username, 'success');
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
            const { password, ...safeUser } = user;
            res.json({ success: true, token, user: safeUser });
        } else {
            security.logAccess(ip, username, 'failure');
            res.status(401).json({ error: 'Credenciales inválidas' });
        }
    });
});



// ==============================================
// 🔐 RUTAS PROTEGIDAS
// ==============================================
app.get('/api/browse', authenticateToken, (req, res) => {
    const rawPath = req.query.path ? decodeURIComponent(req.query.path) : '';
    let items;

    if (rawPath === '' || rawPath === MEDIA_FOLDER) {
        // Mostrar bibliotecas raíz
        items = db.prepare('SELECT id, name, path, "folder" as type FROM libraries').all().map(lib => ({
            name: lib.name,
            type: 'folder',
            path: lib.path,
            poster: null
        }));
    } else {
        // Limpiar la ruta relativa
        const relPath = path.relative(MEDIA_FOLDER, rawPath).replace(/\\/g, '/');
        
        // Buscar items en esta ruta
        items = db.prepare(`
            SELECT m.*, p.position, p.finished
            FROM media_items m
            LEFT JOIN playback_progress p ON m.id = p.media_item_id AND p.user_id = ?
            WHERE m.path LIKE ? AND m.path NOT LIKE ?
        `).all(req.user.id, relPath + '/%', relPath + '/%/%');

        // Formatear para el frontend
        items = items.map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            path: path.join(MEDIA_FOLDER, item.path),
            poster: item.poster || getPoster(path.join(MEDIA_FOLDER, item.path), item.path),
            progress: item.position,
            finished: item.finished
        }));
    }

    res.json(items);
});


function getPoster(folder, rel) {
    const p = ['poster.jpg', 'poster.png', 'folder.jpg', 'cover.jpg'].find(f => fs.existsSync(path.join(folder, f)));
    return p ? `/media/${rel}/${p}` : null;
}
function isVideo(f) { return ['.mp4', '.mkv', '.avi', '.mov', '.webm'].includes(path.extname(f).toLowerCase()); }

app.get('/stream', authenticateToken, (req, res) => {
    const filePath = validatePath(req.query.path);
    if (!filePath) return res.status(403).send('Denegado');
    const range = req.headers.range;
    const size = fs.statSync(filePath).size;
    if (range) {
        const [start, end] = range.replace(/bytes=/, "").split("-").map(Number);
        const realEnd = end || size - 1;
        res.writeHead(206, { 'Content-Range': `bytes ${start}-${realEnd}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': (realEnd - start) + 1, 'Content-Type': 'video/mp4' });
        fs.createReadStream(filePath, { start, end: realEnd }).pipe(res);
    } else {
        res.writeHead(200, { 'Content-Length': size, 'Content-Type': 'video/mp4' });
        fs.createReadStream(filePath).pipe(res);
    }
});

app.post('/api/progress', authenticateToken, (req, res) => {
    const { mediaId, position, finished } = req.body;
    if (!mediaId) return res.status(400).json({ error: 'mediaId es requerido' });

    try {
        db.prepare(`
            INSERT INTO playback_progress (user_id, media_item_id, position, finished, last_watched)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, media_item_id) DO UPDATE SET
                position = excluded.position,
                finished = excluded.finished,
                last_watched = CURRENT_TIMESTAMP
        `).run(req.user.id, mediaId, position || 0, finished ? 1 : 0);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/continue-watching', authenticateToken, (req, res) => {
    try {
        const items = db.prepare(`
            SELECT m.*, p.position, p.last_watched
            FROM playback_progress p
            JOIN media_items m ON p.media_item_id = m.id
            WHERE p.user_id = ? AND p.finished = 0 AND p.position > 0
            ORDER BY p.last_watched DESC
            LIMIT 20
        `).all(req.user.id);

        const results = items.map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            path: path.join(MEDIA_FOLDER, item.path),
            poster: item.poster || getPoster(path.join(MEDIA_FOLDER, item.path), item.path),
            progress: item.position
        }));

        res.json(results);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});



app.get('/api/stream/hls', authenticateToken, (req, res) => {
    const filePath = validatePath(req.query.path);
    if (!filePath) return res.status(403).send('Denegado');

    const sessionId = Buffer.from(filePath).toString('hex').slice(-16);
    const playlistPath = transcoder.startHLSTranscode(filePath, sessionId);

    // Devolver la URL relativa de la playlist
    res.json({ url: `/transcode/${sessionId}/index.m3u8` });
});

// --- PERFILES ---
app.get('/api/profiles', authenticateToken, (req, res) => {
    // Si el usuario ya es un perfil, buscamos los perfiles del padre
    const ownerId = req.user.parent_id || req.user.id;
    const profiles = db.prepare('SELECT id, name, profile_image, pin FROM users WHERE id = ? OR parent_id = ?').all(ownerId, ownerId);
    
    // Ocultar PIN real, solo indicar si tiene
    res.json(profiles.map(p => ({ ...p, hasPin: !!p.pin, pin: undefined })));
});

app.post('/api/profiles', authenticateToken, (req, res) => {
    const { name, pin, profile_image } = req.body;
    const ownerId = req.user.parent_id || req.user.id;
    
    try {
        db.prepare('INSERT INTO users (parent_id, name, pin, profile_image, role) VALUES (?, ?, ?, ?, ?)')
          .run(ownerId, name, pin || null, profile_image || null, 'user');
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/profiles/login', authenticateToken, (req, res) => {
    const { profileId, pin } = req.body;
    const ownerId = req.user.parent_id || req.user.id;

    const profile = db.prepare('SELECT * FROM users WHERE id = ? AND (id = ? OR parent_id = ?)').get(profileId, ownerId, ownerId);
    
    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });

    if (profile.pin && profile.pin !== pin) {
        return res.status(401).json({ error: 'PIN incorrecto' });
    }

    const token = jwt.sign({ 
        id: profile.id, 
        username: profile.username, 
        role: profile.role,
        parent_id: profile.parent_id 
    }, JWT_SECRET, { expiresIn: '24h' });

    const { password: _, pin: __, ...safeUser } = profile;
    res.json({ success: true, token, user: safeUser });
});

app.get('/api/users', authenticateToken, async (req, res) => {

    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const users = db.prepare('SELECT id, username, role, name, created_at FROM users').all();
    res.json(users);
});


app.get('/api/files', authenticateToken, (req, res) => {
    const rawPath = req.query.path ? decodeURIComponent(req.query.path) : MEDIA_FOLDER;
    const dirPath = validatePath(rawPath);
    if (!dirPath) return res.status(403).json({ error: 'Acceso denegado' });

    fs.readdir(dirPath, { withFileTypes: true }, (err, items) => {
        if (err) return res.status(500).json({ error: err.message });
        const result = items.map(item => {
            const fullPath = path.join(dirPath, item.name);
            let size = '--';
            if (!item.isDirectory()) {
                try { size = formatSize(fs.statSync(fullPath).size); } catch(e){}
            }
            return {
                name: item.name,
                type: item.isDirectory() ? 'folder' : 'file',
                path: fullPath,
                size: size
            };
        });
        res.json(result);
    });
});

app.post('/api/upload', authenticateToken, (req, res) => {
    const rawDest = req.body.path ? decodeURIComponent(req.body.path) : MEDIA_FOLDER;
    const dest = validatePath(rawDest);
    
    if (!dest) return res.status(403).json({ error: 'Acceso denegado' });
    if (!req.files || !req.files.file) return res.status(400).json({ error: 'No se subió ningún archivo' });

    let uploadedFiles = req.files.file;
    if (!Array.isArray(uploadedFiles)) uploadedFiles = [uploadedFiles];

    let errors = [];
    let processed = 0;

    uploadedFiles.forEach(file => {
        if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
            errors.push('Nombre inválido: ' + file.name);
            processed++;
            if (processed === uploadedFiles.length) finalize();
            return;
        }

        const uploadPath = path.join(dest, file.name);
        file.mv(uploadPath, (err) => {
            if (err) errors.push(err.message);
            processed++;
            if (processed === uploadedFiles.length) finalize();
        });
    });

    function finalize() {
        if (errors.length > 0) return res.status(500).json({ error: errors.join(', ') });
        res.json({ success: true });
    }
});

app.delete('/api/delete', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const filePath = validatePath(req.body.path);
    if (!filePath) return res.status(403).json({ error: 'Ruta no válida' });

    fs.unlink(filePath, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/iptv/config', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { url, epgUrl } = req.body;
    if (!url) return res.status(400).json({ error: 'URL es requerida' });
    
    try {
        await withFileLock(IPTV_FILE, async () => {
            const config = { url, epgUrl };
            fs.writeFileSync(IPTV_FILE, JSON.stringify(config, null, 2));
            if (epgUrl) iptv.refreshEPG(epgUrl);
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/iptv/epg', authenticateToken, (req, res) => {
    const epgPath = path.join(__dirname, 'media', '.epg.json');
    if (fs.existsSync(epgPath)) {
        res.json(JSON.parse(fs.readFileSync(epgPath, 'utf8')));
    } else {
        res.json({ channels: {}, programs: [] });
    }
});

app.post('/api/iptv/dvr', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { streamUrl, name, durationMins } = req.body;
    
    const fileName = `${name.replace(/\s+/g, '_')}_${Date.now()}.mp4`;
    const outputPath = path.join(MEDIA_FOLDER, 'Peliculas', fileName); // Guardar en Peliculas por defecto

    const args = [
        '-i', streamUrl,
        '-t', (durationMins || 60) * 60,
        '-c', 'copy', // No recodificar para ahorrar CPU
        outputPath
    ];

    const dvrProcess = exec(`${process.env.FFMPEG_PATH || 'ffmpeg'} -i "${streamUrl}" -t ${(durationMins || 60) * 60} -c copy "${outputPath}"`);
    
    res.json({ success: true, message: 'Grabación iniciada', file: fileName });
});


app.get('/api/iptv/channels', authenticateToken, (req, res) => {
    if (!fs.existsSync(IPTV_FILE)) return res.json({ channels: [] });
    try {
        const config = JSON.parse(fs.readFileSync(IPTV_FILE, 'utf8'));
        const listUrl = config.url;
        if (!listUrl) return res.json({ channels: [] });

        if (listUrl.startsWith('http')) {
            const lib = listUrl.startsWith('https') ? require('https') : require('http');
            const request = lib.get(listUrl, (response) => {
                if (response.statusCode !== 200) return res.json({ channels: [] });
                let data = '';
                response.setEncoding('utf8');
                response.on('data', chunk => data += chunk);
                response.on('end', () => res.json({ channels: parseM3U(data) }));
            });
            request.on('error', () => res.json({ channels: [] }));
            request.setTimeout(10000, () => { request.destroy(); res.json({ channels: [] }); });
        } else {
            const localPath = listUrl.replace('file://', '');
            if (fs.existsSync(localPath)) res.json({ channels: parseM3U(fs.readFileSync(localPath, 'utf8')) });
            else res.json({ channels: [] });
        }
    } catch (e) { res.json({ channels: [] }); }
});

function parseM3U(content) {
    const lines = content.split('\n');
    const channels = [];
    let currentChannel = {};

    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('#EXTINF:')) {
            const nameMatch = line.match(/,(.*)$/);
            const logoMatch = line.match(/tvg-logo="([^"]*)"/);
            currentChannel.name = nameMatch ? nameMatch[1].trim() : 'Canal';
            currentChannel.logo = logoMatch ? logoMatch[1] : 'https://via.placeholder.com/40/1a1a2e/ffffff?text=TV';
        } else if (line && !line.startsWith('#')) {
            currentChannel.url = line;
            if (currentChannel.url) channels.push({ ...currentChannel });
            currentChannel = {};
        }
    });
    return channels;
}

app.post('/api/admin/update', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const updateScript = path.join(__dirname, 'update.sh');
    if (!fs.existsSync(updateScript)) return res.status(404).json({ error: 'Script no encontrado' });
    
    exec('bash update.sh', (error, stdout) => {
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true, output: stdout });
    });
});

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

app.post('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { username, password, role, name } = req.body;
    try {
        const hash = bcrypt.hashSync(password, 10);
        db.prepare('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)').run(username, hash, role, name);
        res.json({ success: true });
    } catch (e) {
        if (e.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }
        res.status(400).json({ error: e.message });
    }
});


app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const userId = parseInt(req.params.id);
    try {
        db.prepare('DELETE FROM users WHERE id = ?').run(userId);
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
});


app.post('/api/admin/reboot', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    exec('sudo reboot', (error) => {
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    });
});

app.get('/api/admin/system-info', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    
    try {
        const publicIpRes = await axios.get('https://api.ipify.org?format=json');
        const os = require('os');
        const interfaces = os.networkInterfaces();
        const localIps = [];
        
        for (const iface of Object.values(interfaces)) {
            for (const details of iface) {
                if (details.family === 'IPv4' && !details.internal) {
                    localIps.push(details.address);
                }
            }
        }

        res.json({
            publicIp: publicIpRes.data.ip,
            localIps: localIps,
            platform: os.platform(),
            uptime: os.uptime(),
            port: PORT
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/users/change-password', authenticateToken, async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
    
    try {
        const hash = bcrypt.hashSync(newPassword, 10);
        db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


app.post('/api/admin/poweroff', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    exec('sudo poweroff', (error) => {
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 MyMediaServer v2.0.0 PRO operando en puerto ${PORT}`);
});
