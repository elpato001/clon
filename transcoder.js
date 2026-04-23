const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';
const TRANSCODE_CACHE = path.join(__dirname, 'media', '.transcode');

if (!fs.existsSync(TRANSCODE_CACHE)) fs.mkdirSync(TRANSCODE_CACHE, { recursive: true });

/**
 * Inicia la transcodificación HLS para un archivo
 * @param {string} inputPath Ruta al video original
 * @param {string} sessionId ID de sesión único
 * @returns {string} Ruta al archivo .m3u8 generado
 */
function startHLSTranscode(inputPath, sessionId) {
    const sessionDir = path.join(TRANSCODE_CACHE, sessionId);
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    const outputPlaylist = path.join(sessionDir, 'index.m3u8');

    // Si ya existe y se está generando, o ya terminó, devolvemos la ruta
    if (fs.existsSync(outputPlaylist)) {
        return outputPlaylist;
    }

    console.log(`🎬 Iniciando transcodificación HLS: ${inputPath}`);

    const args = [
        '-i', inputPath,
        '-codec:v', 'libx264', // Forzar H.264 para compatibilidad
        '-preset', 'veryfast',
        '-codec:a', 'aac',
        '-b:a', '128k',
        '-f', 'hls',
        '-hls_time', '10', // Segmentos de 10 segundos
        '-hls_list_size', '0', // Guardar todos los segmentos
        '-hls_segment_filename', path.join(sessionDir, 'seg%d.ts'),
        outputPlaylist
    ];

    const ffmpeg = spawn(FFMPEG_PATH, args);

    ffmpeg.stderr.on('data', (data) => {
        // FFmpeg escribe el progreso en stderr
        // console.log(`[FFmpeg]: ${data}`);
    });

    ffmpeg.on('close', (code) => {
        console.log(`✅ Transcodificación finalizada para ${sessionId} (Code: ${code})`);
    });

    return outputPlaylist;
}

/**
 * Limpia archivos temporales de transcodificación
 */
function cleanupTranscodeCache() {
    // Implementar lógica para borrar carpetas de sesiones inactivas
}

module.exports = {
    startHLSTranscode,
    cleanupTranscodeCache
};
