const fs = require('fs');
const path = require('path');

const PLUGINS_DIR = path.join(__dirname, 'plugins');

if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR, { recursive: true });

/**
 * Carga e inicializa todos los plugins en la carpeta plugins
 * @param {object} context Objeto con referencias al servidor, db, etc., para los plugins
 */
function loadPlugins(context) {
    console.log('🔌 Cargando sistema de plugins...');
    
    const files = fs.readdirSync(PLUGINS_DIR);
    
    files.forEach(file => {
        if (file.endsWith('.js')) {
            try {
                const pluginPath = path.join(PLUGINS_DIR, file);
                const plugin = require(pluginPath);
                
                if (typeof plugin.init === 'function') {
                    plugin.init(context);
                    console.log(`✅ Plugin cargado: ${file}`);
                }
            } catch (e) {
                console.error(`❌ Error cargando plugin ${file}:`, e.message);
            }
        }
    });
}

module.exports = {
    loadPlugins
};
