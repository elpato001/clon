const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

// Habilitar modo WAL para mejor rendimiento en escrituras/lecturas concurrentes
db.pragma('journal_mode = WAL');

/**
 * Inicializa el esquema de la base de datos
 */
function initDatabase() {
    // Tabla de Usuarios
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parent_id INTEGER, -- NULL para cuenta principal, ID para perfiles
            username TEXT UNIQUE,
            password TEXT,
            role TEXT DEFAULT 'user',
            name TEXT,
            pin TEXT,
            profile_image TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Intentar añadir la columna parent_id si no existe (migración simple)
    try { db.exec("ALTER TABLE users ADD COLUMN parent_id INTEGER REFERENCES users(id) ON DELETE CASCADE;"); } catch(e){}


    // Tabla de Bibliotecas
    db.exec(`
        CREATE TABLE IF NOT EXISTS libraries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            type TEXT NOT NULL, -- Peliculas, Series, Musica, etc.
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabla de Items Multimedia
    db.exec(`
        CREATE TABLE IF NOT EXISTS media_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            library_id INTEGER,
            parent_id INTEGER, -- Para temporadas o subcarpetas
            name TEXT NOT NULL,
            path TEXT UNIQUE NOT NULL,
            type TEXT NOT NULL, -- folder, video, audio
            poster TEXT,
            backdrop TEXT,
            metadata TEXT, -- JSON con sinopsis, año, etc.
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE
        )
    `);

    // Tabla de Progreso de Reproducción
    db.exec(`
        CREATE TABLE IF NOT EXISTS playback_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            media_item_id INTEGER,
            position REAL DEFAULT 0,
            finished BOOLEAN DEFAULT 0,
            last_watched DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, media_item_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE
        )
    `);

    // Tabla de Logs de Acceso (Seguridad)
    db.exec(`
        CREATE TABLE IF NOT EXISTS access_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip TEXT NOT NULL,
            username TEXT,
            status TEXT NOT NULL, -- success, failure, blocked
            attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Migrar usuarios existentes si el archivo users.json existe
    migrateLegacyUsers();
}

function migrateLegacyUsers() {
    const usersFile = path.join(__dirname, 'users.json');
    if (fs.existsSync(usersFile)) {
        try {
            const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
            const insert = db.prepare('INSERT OR IGNORE INTO users (id, username, password, role, name) VALUES (?, ?, ?, ?, ?)');
            
            const transaction = db.transaction((userList) => {
                for (const user of userList) {
                    insert.run(user.id, user.username, user.password, user.role, user.name);
                }
            });

            transaction(users);
            console.log('✅ Usuarios migrados correctamente a SQLite.');
            
            // Renombrar el archivo para evitar migraciones futuras
            fs.renameSync(usersFile, usersFile + '.bak');
        } catch (err) {
            console.error('❌ Error migrando usuarios:', err.message);
        }
    } else {
        // Crear admin por defecto si no hay nada
        const adminCheck = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
        if (!adminCheck) {
            const hash = bcrypt.hashSync('admin123', 10);
            db.prepare('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)').run('admin', hash, 'admin', 'Administrador');
            console.log('👤 Usuario admin creado por defecto.');
        }
    }
}

initDatabase();

module.exports = db;
