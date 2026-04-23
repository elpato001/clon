const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const EPG_CACHE = path.join(__dirname, 'media', '.epg.json');

/**
 * Descarga y procesa un archivo XMLTV
 * @param {string} url URL del archivo XMLTV
 */
async function refreshEPG(url) {
    if (!url) return;
    console.log(`📺 Actualizando Guía EPG desde: ${url}`);

    try {
        const response = await axios.get(url);
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);

        // Simplificar el formato para el frontend
        const epgData = {
            channels: {},
            programs: []
        };

        if (result.tv.channel) {
            const channels = Array.isArray(result.tv.channel) ? result.tv.channel : [result.tv.channel];
            channels.forEach(ch => {
                epgData.channels[ch.$.id] = ch['display-name'];
            });
        }

        if (result.tv.programme) {
            const programs = Array.isArray(result.tv.programme) ? result.tv.programme : [result.tv.programme];
            epgData.programs = programs.map(p => ({
                channel: p.$.channel,
                start: p.$.start,
                stop: p.$.stop,
                title: p.title?._ || p.title,
                desc: p.desc?._ || p.desc
            }));
        }

        fs.writeFileSync(EPG_CACHE, JSON.stringify(epgData));
        console.log('✅ EPG actualizado correctamente.');
        return epgData;
    } catch (e) {
        console.error('❌ Error actualizando EPG:', e.message);
        return null;
    }
}

/**
 * Obtiene la programación actual para un canal
 */
function getCurrentProgram(channelId) {
    if (!fs.existsSync(EPG_CACHE)) return null;
    const epg = JSON.parse(fs.readFileSync(EPG_CACHE, 'utf8'));
    
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0]; // Formato XMLTV YYYYMMDDHHMMSS
    
    return epg.programs.find(p => p.channel === channelId && now >= p.start && now <= p.stop);
}

module.exports = {
    refreshEPG,
    getCurrentProgram
};
