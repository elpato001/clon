const db = require('./db');

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MINS = 15;

/**
 * Middleware para proteger contra ataques de fuerza bruta
 */
function bruteForceProtection(req, res, next) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Verificar si la IP está bloqueada
    const lastFailures = db.prepare(`
        SELECT COUNT(*) as count 
        FROM access_logs 
        WHERE ip = ? 
        AND status = 'failure' 
        AND attempted_at > datetime('now', '-${BLOCK_DURATION_MINS} minutes')
    `).get(ip);

    if (lastFailures.count >= MAX_ATTEMPTS) {
        logAccess(ip, null, 'blocked');
        return res.status(429).json({ 
            error: `Demasiados intentos fallidos. Tu IP ha sido bloqueada por ${BLOCK_DURATION_MINS} minutos.` 
        });
    }

    next();
}

/**
 * Registra un intento de acceso
 */
function logAccess(ip, username, status) {
    try {
        db.prepare('INSERT INTO access_logs (ip, username, status) VALUES (?, ?, ?)')
          .run(ip, username, status);
    } catch (e) {
        console.error('Error logging access:', e.message);
    }
}

module.exports = {
    bruteForceProtection,
    logAccess
};
