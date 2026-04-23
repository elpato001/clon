const axios = require('axios');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const CACHE_DIR = path.join(__dirname, 'media', '.cache');

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

/**
 * Busca metadatos para una película o serie
 * @param {string} name Nombre del archivo/carpeta
 * @param {string} type 'movie' o 'series'
 */
async function identifyMedia(name, type) {
    if (!TMDB_API_KEY) {
        console.warn('⚠️ TMDB_API_KEY no configurada. Saltando identificación.');
        return null;
    }

    const cleanName = cleanFileName(name);
    const endpoint = type === 'series' ? 'search/tv' : 'search/movie';
    
    try {
        const response = await axios.get(`https://api.themoviedb.org/3/${endpoint}`, {
            params: {
                api_key: TMDB_API_KEY,
                query: cleanName,
                language: 'es-ES'
            }
        });

        const result = response.data.results[0];
        if (!result) return null;

        // Descargar imágenes localmente
        const posterLocal = await downloadImage(result.poster_path, `poster_${result.id}.jpg`);
        const backdropLocal = await downloadImage(result.backdrop_path, `backdrop_${result.id}.jpg`);

        return {
            tmdb_id: result.id,
            name: result.title || result.name,
            overview: result.overview,
            release_date: result.release_date || result.first_air_date,
            rating: result.vote_average,
            poster: posterLocal,
            backdrop: backdropLocal,
            genres: result.genre_ids
        };
    } catch (error) {
        console.error(`❌ Error identificando ${name}:`, error.message);
        return null;
    }
}

/**
 * Limpia el nombre del archivo para mejorar la búsqueda (quita años, calidades, etc.)
 */
function cleanFileName(name) {
    return name
        .replace(/\d{4}.*$/, '') // Quitar año y todo lo que sigue
        .replace(/\b(1080p|720p|4k|bluray|x264|h264|dual|latino)\b/gi, '')
        .replace(/[\._]/g, ' ')
        .trim();
}

/**
 * Descarga una imagen de TMDB y la guarda en el cache local
 */
async function downloadImage(tmdbPath, fileName) {
    if (!tmdbPath) return null;
    
    const localPath = path.join(CACHE_DIR, fileName);
    if (fs.existsSync(localPath)) return `/media/.cache/${fileName}`;

    try {
        const url = `https://image.tmdb.org/t/p/w500${tmdbPath}`;
        const response = await axios({
            url,
            responseType: 'stream'
        });

        return new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(localPath);
            response.data.pipe(writer);
            writer.on('finish', () => resolve(`/media/.cache/${fileName}`));
            writer.on('error', reject);
        });

    } catch (e) {
        return null;
    }
}

/**
 * Actualiza los metadatos de un item en la DB
 */
async function updateMetadata(itemId) {
    const item = db.prepare('SELECT * FROM media_items WHERE id = ?').get(itemId);
    if (!item) return;

    // Determinar tipo de búsqueda (basado en la biblioteca)
    const lib = db.prepare('SELECT type FROM libraries WHERE id = ?').get(item.library_id);
    const type = lib.type === 'Series' ? 'series' : 'movie';

    const metadata = await identifyMedia(item.name, type);
    if (metadata) {
        db.prepare(`
            UPDATE media_items 
            SET name = ?, poster = ?, backdrop = ?, metadata = ?
            WHERE id = ?
        `).run(
            metadata.name,
            metadata.poster,
            metadata.backdrop,
            JSON.stringify(metadata),
            itemId
        );
        console.log(`✅ Identificado: ${metadata.name}`);
    }
}

module.exports = {
    identifyMedia,
    updateMetadata
};
