/* ===== PWA SERVICE WORKER ===== */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => {
            console.log('✅ Service Worker registrado');
        }).catch(err => {
            console.log('❌ Error al registrar SW:', err);
        });
    });
}

// Curator Premium v2.0 - JWT Edition (Core Logic Completamente Restaurado)
let currentUser = null;
let authToken = localStorage.getItem('token');
let currentPath = null;
let allMediaItems = [];
let currentVideoId = null;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const appContainer = document.getElementById('appContainer');
const mainScroll = document.getElementById('mainScroll');
const heroSection = document.getElementById('heroSection');
const mediaHomeSection = document.querySelector('.content-wrapper');

// Views
const mediaGrid = document.getElementById('mediaGrid');
const continueGrid = document.getElementById('continueGrid');
const continueWatchingSection = document.getElementById('continueWatchingSection');
const fileManager = document.getElementById('fileManager');
const iptvSection = document.getElementById('iptvSection');
const adminPanel = document.getElementById('adminPanel');
const modal = document.getElementById('playerModal');
const videoPlayer = document.getElementById('videoPlayer');

// Placeholders
const PLACEHOLDER = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2659&auto=format&fit=crop';
const FOLDER_ICON = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'300\' viewBox=\'0 0 200 300\'%3E%3Crect width=\'200\' height=\'300\' fill=\'%23121212\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%235b8cff\' font-size=\'40\'%3E📁%3C/text%3E%3C/svg%3E';

// API Wrapper con JWT
async function apiFetch(url, options = {}) {
    options.headers = options.headers || {};
    if (authToken) options.headers['Authorization'] = `Bearer ${authToken}`;
    
    const res = await fetch(url, options);
    if ((res.status === 401 || res.status === 403) && url !== '/api/login') {
        logout();
        throw new Error('Sesión expirada');
    }
    return res.json();
}

// --- AUTH ---
async function doLogin() {
    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;
    const errorDiv = document.getElementById('loginError');

    if (!username || !password) return errorDiv.innerText = "Completa todos los campos.";

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        
        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('token', authToken);
            
            loginScreen.classList.add('hidden');
            loadProfilesGrid();
        } else {
            errorDiv.innerText = data.error;
        }
    } catch (e) {
        errorDiv.innerText = "Error de conexión con el servidor.";
    }
}


function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    location.reload();
}

// Inicializar si ya hay token
if (authToken && localStorage.getItem('user')) {
    currentUser = JSON.parse(localStorage.getItem('user'));
    appContainer.classList.remove('hidden');
    loginScreen.classList.add('hidden');
    updateUserUI();
    showHome();
} else if (authToken) {
    // Si hay token de cuenta pero no de perfil
    loginScreen.classList.add('hidden');
    loadProfilesGrid();
}

function updateUserUI() {
    document.getElementById('currentUserText').innerText = currentUser.name;
    document.getElementById('userAvatar').innerText = currentUser.name.charAt(0).toUpperCase();
    if (currentUser.role === 'admin') document.getElementById('adminDropdownOptions').classList.remove('hidden');
    else document.getElementById('adminDropdownOptions').classList.add('hidden');
}


// --- PROFILES LOGIC ---
async function loadProfilesGrid() {
    const screen = document.getElementById('profileScreen');
    const grid = document.getElementById('profileGrid');
    screen.classList.remove('hidden');
    
    // Limpiar grid excepto el botón de añadir
    const addBtn = grid.querySelector('.add-profile');
    grid.innerHTML = '';
    
    try {
        const profiles = await apiFetch('/api/profiles');
        profiles.forEach(p => {
            const item = document.createElement('div');
            item.className = 'profile-item';
            item.innerHTML = `
                <div class="profile-avatar">${p.name.charAt(0).toUpperCase()}</div>
                <div class="profile-name">${p.name} ${p.hasPin ? '<i class="fas fa-lock" style="font-size:0.8rem; margin-left:5px; opacity:0.5"></i>' : ''}</div>
            `;
            item.onclick = () => selectProfile(p.id, p.hasPin);
            grid.appendChild(item);
        });
        grid.appendChild(addBtn);
    } catch (e) { console.error(e); }
}

function selectProfile(profileId, hasPin) {
    if (hasPin) {
        const modal = document.getElementById('pinModal');
        const input = document.getElementById('pinInput');
        const btn = document.getElementById('pinSubmitBtn');
        
        modal.classList.remove('hidden');
        input.value = '';
        input.focus();
        
        btn.onclick = async () => {
            const res = await apiFetch('/api/profiles/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileId, pin: input.value })
            });
            if (res.success) {
                finalizeProfileLogin(res);
                modal.classList.add('hidden');
            } else {
                alert("PIN incorrecto");
                input.value = '';
            }
        };
    } else {
        doProfileLogin(profileId);
    }
}

async function doProfileLogin(profileId) {
    const res = await apiFetch('/api/profiles/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId })
    });
    if (res.success) finalizeProfileLogin(res);
}

function finalizeProfileLogin(data) {
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(currentUser));
    
    document.getElementById('profileScreen').classList.add('hidden');
    appContainer.classList.remove('hidden');
    updateUserUI();
    showHome();
}

function showAddProfile() {
    const name = prompt("Nombre del nuevo perfil:");
    if (!name) return;
    const pin = prompt("PIN opcional (4 dígitos) o deja en blanco:");
    
    apiFetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pin })
    }).then(res => {
        if (res.success) loadProfilesGrid();
        else alert("Error: " + res.error);
    });
}

// --- NAVIGATION ---

function hideAll() {
    heroSection.classList.add('hidden');
    continueWatchingSection.classList.add('hidden');
    mediaGrid.parentElement.classList.add('hidden');
    fileManager.classList.add('hidden');
    iptvSection.classList.add('hidden');
    adminPanel.classList.add('hidden');
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.getElementById('breadcrumbs').innerHTML = '';
}

function showHome() {
    hideAll();
    heroSection.classList.remove('hidden');
    continueWatchingSection.classList.remove('hidden');
    mediaGrid.parentElement.classList.remove('hidden');
    document.getElementById('navHome').classList.add('active');
    document.getElementById('libraryTitle').innerText = "Recientemente Añadidos";
    currentPath = null;
    loadLibrary();
    loadContinueWatching();
}

function loadCategory(folder) {
    hideAll();
    mediaGrid.parentElement.classList.remove('hidden');
    document.getElementById(`nav${folder}`).classList.add('active');
    document.getElementById('libraryTitle').innerText = folder;
    loadLibrary(`media/${folder}`);
}

function toggleView() {
    hideAll();
    fileManager.classList.remove('hidden');
    document.getElementById('navFiles').classList.add('active');
    loadFilesList();
}

function showIPTV() {
    hideAll();
    iptvSection.classList.remove('hidden');
    document.getElementById('navIPTV').classList.add('active');
    loadIPTVChannels();
}

function showAdmin() {
    hideAll();
    adminPanel.classList.remove('hidden');
    document.getElementById('navAdmin').classList.add('active');
    if (currentUser.role === 'admin') loadUsersList();
}

// --- LIBRERÍA ---
async function loadLibrary(path = null) {
    currentPath = path;
    let url = '/api/browse';
    if (path) url += `?path=${encodeURIComponent(path)}`;
    
    try {
        const items = await apiFetch(url);
        allMediaItems = items;
        
        if (!path) updateHero(items[0]);
        else if (path.includes('/')) updateBreadcrumbs(path);

        renderMediaGrid(items);
    } catch (e) { console.error("Error cargando librería", e); }
}

function renderMediaGrid(items) {
    mediaGrid.innerHTML = '';
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'media-card';
        const title = formatTitle(item.name);
        const poster = item.poster || (item.type === 'folder' ? FOLDER_ICON : PLACEHOLDER);

        // Agregamos el Token JWT a la imagen para que el src salte el Auth
        const imgSrc = poster.startsWith('/media') ? `${poster}?token=${authToken}` : poster;

        card.innerHTML = `
            <div class="card-img-container">
                <img src="${imgSrc}" onerror="this.src='${PLACEHOLDER}'">
                ${item.progress ? `<div class="progress-bar-mini" style="width: ${(item.progress/3600)*100}%"></div>` : ''}
            </div>
            <div class="card-info">
                <div class="card-title">${title}</div>
                <div class="card-meta">${item.type === 'folder' ? 'Colección' : (item.metadata ? JSON.parse(item.metadata).release_date?.split('-')[0] : 'Video')}</div>
            </div>
        `;

        card.onclick = () => {
            if (item.type === 'folder') loadLibrary(item.path);
            else playMedia(item.path, title, item.hasSubtitles, imgSrc, item.id, item.progress);
        };
        mediaGrid.appendChild(card);
    });
}


function updateHero(item) {
    if (!item) return;
    const heroTitle = document.getElementById('heroTitle');
    const heroBg = document.getElementById('heroBg');
    const heroTag = document.getElementById('heroTag');
    const heroDesc = document.getElementById('heroDesc');
    
    const meta = item.metadata ? JSON.parse(item.metadata) : null;
    const niceTitle = meta ? meta.name : formatTitle(item.name);

    heroTitle.innerText = niceTitle;
    heroTag.innerText = item.type === 'folder' ? 'Colección' : (meta ? 'Película' : 'Recomendado');
    heroDesc.innerText = meta ? meta.overview : 'Explora tu biblioteca personal de medios.';

    const image = meta ? meta.backdrop : item.poster;
    if (image) {
        const bgSrc = image.startsWith('/media') ? `${image}?token=${authToken}` : image;
        heroBg.style.backgroundImage = `url('${bgSrc}')`;
    }
    
    document.getElementById('heroPlayBtn').onclick = () => {
        if (item.type === 'video') {
            const posterSrc = item.poster ? (item.poster.startsWith('/media') ? `${item.poster}?token=${authToken}` : item.poster) : "";
            playMedia(item.path, niceTitle, item.hasSubtitles, posterSrc, item.id, item.progress);
        }
        else loadLibrary(item.path);
    };
}


// --- CONTINUE WATCHING ---
async function loadContinueWatching() {
    continueGrid.innerHTML = '';
    try {
        const items = await apiFetch('/api/continue-watching');
        if (!items || items.length === 0) {
            continueWatchingSection.style.display = 'none';
            return;
        }

        continueWatchingSection.style.display = 'block';
        items.forEach(item => {
            const title = formatTitle(item.name);
            const card = document.createElement('div');
            card.className = 'media-card';
            
            // Calculamos un porcentaje aproximado si no tenemos la duración total aquí
            // En una versión más pro, guardaríamos total_duration en la DB.
            // Por ahora solo mostramos el ítem.
            
            const poster = item.poster || PLACEHOLDER;
            const imgSrc = poster.startsWith('/media') ? `${poster}?token=${authToken}` : poster;

            card.innerHTML = `
                <div class="card-img-container">
                    <img src="${imgSrc}" onerror="this.src='${PLACEHOLDER}'">
                </div>
                <div class="card-info">
                    <div class="card-title">${title}</div>
                    <div class="card-meta">Continuar viendo</div>
                </div>
            `;
            card.onclick = () => playMedia(item.path, title, false, item.poster, item.id, item.progress);
            continueGrid.appendChild(card);
        });
    } catch (e) {
        console.error("Error cargando continuar viendo", e);
    }
}


// --- PLAYER ---
async function playMedia(path, title, hasSubs, poster, mediaId = null, startTime = 0) {
    currentVideoId = mediaId;
    document.getElementById('currentVideoTitle').innerText = title;
    videoPlayer.dataset.poster = poster || '';
    modal.style.display = 'flex';

    // Intentar obtener stream HLS
    try {
        const hlsRes = await apiFetch(`/api/stream/hls?path=${encodeURIComponent(path)}`);
        const hlsUrl = `${hlsRes.url}?token=${authToken}`;

        if (Hls.isSupported()) {
            if (window.hls) window.hls.destroy();
            const hls = new Hls();
            window.hls = hls;
            hls.loadSource(hlsUrl);
            hls.attachMedia(videoPlayer);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                if (startTime > 0) videoPlayer.currentTime = startTime;
                videoPlayer.play();
            });
        } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            // Soporte nativo (Safari)
            videoPlayer.src = hlsUrl;
            videoPlayer.addEventListener('loadedmetadata', () => {
                if (startTime > 0) videoPlayer.currentTime = startTime;
                videoPlayer.play();
            });
        } else {
            // Fallback a Direct Play si HLS falla
            document.getElementById('videoSource').src = `/stream?path=${encodeURIComponent(path)}&token=${authToken}`;
            videoPlayer.load();
            if (startTime > 0) videoPlayer.currentTime = startTime;
            videoPlayer.play();
        }
    } catch (e) {
        console.error("Error iniciando HLS, usando Direct Play", e);
        document.getElementById('videoSource').src = `/stream?path=${encodeURIComponent(path)}&token=${authToken}`;
        videoPlayer.load();
        if (startTime > 0) videoPlayer.currentTime = startTime;
        videoPlayer.play();
    }
    
    document.getElementById('subtitleTrack').src = hasSubs ? `/subs?path=${encodeURIComponent(path)}&token=${authToken}` : '';

    // Guardar progreso periódicamente (cada 10 segundos)
    if (window.progressInterval) clearInterval(window.progressInterval);
    window.progressInterval = setInterval(() => {
        saveProgressToServer();
    }, 10000);
}


async function saveProgressToServer() {
    if (!currentVideoId || !videoPlayer.duration) return;
    
    const pct = (videoPlayer.currentTime / videoPlayer.duration) * 100;
    const isFinished = pct > 95;

    try {
        await fetch('/api/progress', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                mediaId: currentVideoId,
                position: videoPlayer.currentTime,
                finished: isFinished
            })
        });
    } catch (e) {
        console.error("Error guardando progreso", e);
    }
}


function closePlayer() {
    if (window.progressInterval) clearInterval(window.progressInterval);
    saveProgressToServer();
    modal.style.display = 'none';
    videoPlayer.pause();
    setTimeout(loadContinueWatching, 500); // Dar tiempo a que guarde en el server
}


// --- UTILS ---
function formatTitle(name) {
    if (!name) return "";
    let clean = name.replace(/\.[^/.]+$/, "").replace(/[\._]/g, ' ');
    return clean.replace(/\b\w/g, l => l.toUpperCase());
}

function updateBreadcrumbs(fullPath) {
    const container = document.getElementById('breadcrumbs');
    container.innerHTML = '<span style="cursor:pointer" onclick="showHome()">Inicio</span>';
    const parts = fullPath.split(/[\\/]/).filter(p => p !== 'media');
    let currentAcc = 'media';
    parts.forEach(p => {
        currentAcc += '/' + p;
        const s = document.createElement('span');
        s.innerHTML = ` <i class="fas fa-chevron-right" style="font-size:0.7rem"></i> ${formatTitle(p)}`;
        s.style.cursor = 'pointer';
        const capturePath = currentAcc;
        s.onclick = () => loadLibrary(capturePath);
        container.appendChild(s);
    });
}

function searchMedia() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allMediaItems.filter(i => i.name.toLowerCase().includes(term));
    renderMediaGrid(filtered);
}

// Event Listeners
window.onclick = (e) => { if (e.target == modal) closePlayer(); };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePlayer(); });

// --- GESTOR DE ARCHIVOS ---
async function loadFilesList(dirPath = null) {
    currentPath = dirPath;
    let url = '/api/files';
    if (dirPath) url += `?path=${encodeURIComponent(dirPath)}`;
    const items = await apiFetch(url);
    
    const tbody = document.getElementById('fileListBody');
    tbody.innerHTML = '';
    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        tr.innerHTML = `
            <td style="padding: 1rem; cursor: ${item.type === 'folder' ? 'pointer': 'default'}" onclick="if('${item.type}'==='folder') loadFilesList('${item.path.replace(/\\/g, '/')}')">
                ${item.type === 'folder' ? '📁' : '📄'} ${item.name}
            </td>
            <td style="padding: 1rem;">${item.size}</td>
            <td style="padding: 1rem;">
                ${item.type === 'file' ? `
                    <button class="btn-action red" onclick="deleteFile('${item.path}')"><i class="fas fa-trash"></i> Eliminar</button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function uploadFile() {
    const input = document.getElementById('fileInput');
    if (input.files.length === 0) return alert('Selecciona archivos');
    const formData = new FormData();
    for (let f of input.files) formData.append('file', f);
    if (currentPath) formData.append('path', currentPath);

    document.getElementById('uploadProgressContainer').classList.remove('hidden');
    const bar = document.getElementById('uploadProgressBar');
    
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            bar.style.width = pct + '%';
            document.getElementById('uploadPercentageText').innerText = pct + '%';
        }
    };
    xhr.onload = () => {
        if(xhr.status === 200) {
            document.getElementById('uploadStatusText').innerText = '¡Completado!';
            setTimeout(() => { 
                document.getElementById('uploadProgressContainer').classList.add('hidden');
                loadFilesList(currentPath);
            }, 2000);
        }
    };
    xhr.open('POST', '/api/upload', true);
    if(authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.send(formData);
}

async function deleteFile(path) {
    if(!confirm('¿Seguro que deseas eliminar este archivo?')) return;
    await fetch('/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ path })
    });
    loadFilesList(currentPath);
}

// --- ADMIN / USUARIOS ---
async function changePassword() {
    const newPwd = prompt("Introduce tu nueva contraseña (mínimo 4 caracteres):");
    if (!newPwd) return;
    
    try {
        const res = await apiFetch('/api/users/change-password', {
            method: 'POST',
            body: JSON.stringify({ newPassword: newPwd }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.error) return alert("Error: " + res.error);
        
        alert("Contraseña actualizada correctamente. Por favor, inicia sesión nuevamente.");
        logout();
    } catch (e) {
        alert("Error de conexión al cambiar la contraseña.");
    }
}

async function loadUsersList() {
    const users = await apiFetch('/api/users');
    const list = document.getElementById('usersList');
    list.innerHTML = '';
    users.forEach(u => {
        const li = document.createElement('li');
        li.style.padding = '1rem';
        li.style.background = 'rgba(255,255,255,0.05)';
        li.style.borderRadius = '12px';
        li.style.marginBottom = '0.5rem';
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        
        li.innerHTML = `<span>${u.name} (@${u.username}) - ${u.role.toUpperCase()}</span>`;
        if (u.username !== 'admin') {
            const btn = document.createElement('button');
            btn.className = 'btn-action red';
            btn.innerHTML = '<i class="fas fa-trash"></i> Eliminar';
            btn.onclick = () => deleteUser(u.id);
            li.appendChild(btn);
        }
        list.appendChild(li);
    });
}

async function createUser() {
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value;
    const name = document.getElementById('newName').value;
    
    if (!username || !password || !name) return alert('Completa todos los campos');
    
    try {
        const res = await apiFetch('/api/users', {
            method: 'POST',
            body: JSON.stringify({ username, password, role, name }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.error) return alert('Error del servidor: ' + res.error);
        
        alert('Usuario creado exitosamente');
        document.getElementById('newUsername').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('newName').value = '';
        loadUsersList();
    } catch (e) {
        alert('Error de conexión');
    }
}

async function deleteUser(id) {
    if(!confirm('¿Seguro que deseas eliminar a este usuario?')) return;
    try {
        const res = await apiFetch('/api/users/' + id, { method: 'DELETE' });
        if (res.error) return alert(res.error);
        loadUsersList();
    } catch (e) {
        alert('Error al eliminar');
    }
}

// --- IPTV ---
async function loadIPTVChannels() {
    const data = await apiFetch('/api/iptv/channels');
    const container = document.getElementById('iptvGrid');
    container.innerHTML = '';
    
    if (data.channels && data.channels.length > 0) {
        data.channels.forEach(ch => {
            const card = document.createElement('div');
            card.className = 'media-card';
            card.innerHTML = `
                <div class="card-img-container" style="background: var(--glass); display: flex; align-items: center; justify-content: center; padding: 20px;">
                    <img src="${ch.logo}" style="object-fit: contain; max-height: 100px;" onerror="this.src='https://via.placeholder.com/150/1a1a2e/ffffff?text=TV'">
                </div>
                <div class="card-info">
                    <div class="card-title">${ch.name}</div>
                    <div class="card-meta">Live TV</div>
                </div>
            `;
            // IPTV suele ser m3u8 y no usar tokens directamente al remoto
            card.onclick = () => playMedia(ch.url, ch.name, false, ch.logo);
            container.appendChild(card);
        });
    } else {
        container.innerHTML = '<p>No hay canales configurados. Guarda tu archivo M3U arriba.</p>';
    }
}

async function configIPTV() {
    const url = document.getElementById('iptvUrl').value;
    const epgUrl = document.getElementById('iptvEpgUrl').value;
    if (!url) return alert('Pega una URL válida');
    try {
        const res = await fetch('/api/iptv/config', {
            method: 'POST',
            body: JSON.stringify({ url, epgUrl }),
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (data.error) return alert('Error del servidor: ' + data.error);
        
        loadIPTVChannels();
        alert('Configuración guardada con éxito, canales listos!');
    } catch (e) {
        alert('Error crítico de guardado');
    }
}

async function uploadGlobalFile() {
    const input = document.getElementById('globalFileInput');
    if (input.files.length === 0) return;
    
    const formData = new FormData();
    for (let f of input.files) formData.append('file', f);
    if (currentPath) formData.append('path', currentPath);

    document.getElementById('toastUpload').classList.remove('hidden');
    const bar = document.getElementById('toastUploadBar');
    const pctText = document.getElementById('toastUploadPct');
    const statusText = document.getElementById('toastUploadText');
    statusText.innerText = 'Subiendo...';
    
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            bar.style.width = pct + '%';
            pctText.innerText = pct + '%';
        }
    };
    xhr.onload = () => {
        if(xhr.status === 200) {
            statusText.innerText = '¡Completado!';
            setTimeout(() => { 
                document.getElementById('toastUpload').classList.add('hidden');
                bar.style.width = '0%';
                if (!document.getElementById('mediaGrid').parentElement.classList.contains('hidden')) {
                    loadLibrary(currentPath);
                } else if (!document.getElementById('fileManager').classList.contains('hidden')) {
                    loadFilesList(currentPath);
                }
            }, 2000);
        } else {
            statusText.innerText = 'Error al subir';
            setTimeout(() => document.getElementById('toastUpload').classList.add('hidden'), 3000);
        }
        input.value = '';
    };
    xhr.open('POST', '/api/upload', true);
    if(authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.send(formData);
}

async function rebootServerMenu() {
    if(!confirm('¿Seguro que deseas reiniciar el sistema operativo del Servidor? Tomará unos instantes.')) return;
    try {
        apiFetch('/api/admin/reboot', { method: 'POST' });
        alert('Reiniciando servidor... La página perderá conexión en breve.');
    } catch(e) {}
}

async function poweroffServerMenu() {
    if(!confirm('¡PELIGRO EXTREMO! ¿Seguro que deseas APAGAR físicamente la computadora/servidor? Perderás el acceso y tendrás que encenderla manualmente.')) return;
    try {
        apiFetch('/api/admin/poweroff', { method: 'POST' });
        alert('Apagando sistema de inmediato...');
    } catch(e) {}
}

let lastScrollTop = 0;
document.getElementById('mainScroll').addEventListener('scroll', () => {
    let st = document.getElementById('mainScroll').scrollTop;
    if (st > lastScrollTop && st > 80) {
        document.querySelector('.topbar').style.transform = 'translateY(-150%)';
        document.getElementById('userDropdown').classList.add('hidden');
    } else {
        document.querySelector('.topbar').style.transform = 'translateY(0)';
    }
    lastScrollTop = st;
});

