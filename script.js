// --------------------------------------------------------------
// MUNDIAL 2026 - 48 EQUIPOS, 12 GRUPOS, 72 PARTIDOS
// --------------------------------------------------------------

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const TEAMS_BY_GROUP = {
    A: ['México', 'Sudáfrica', 'Corea del Sur', 'República Checa'],
    B: ['Canadá', 'Bosnia y Herzegovina', 'Catar', 'Suiza'],
    C: ['Brasil', 'Marruecos', 'Haití', 'Escocia'],
    D: ['Estados Unidos', 'Paraguay', 'Australia', 'Turquía'],
    E: ['Alemania', 'Curazao', 'Costa de Marfil', 'Ecuador'],
    F: ['Países Bajos', 'Japón', 'Suecia', 'Túnez'],
    G: ['Bélgica', 'Egipto', 'Irán', 'Nueva Zelanda'],
    H: ['España', 'Cabo Verde', 'Arabia Saudita', 'Uruguay'],
    I: ['Francia', 'Senegal', 'Irak', 'Noruega'],
    J: ['Argentina', 'Argelia', 'Austria', 'Jordania'],
    K: ['Portugal', 'RD Congo', 'Uzbekistán', 'Colombia'],
    L: ['Inglaterra', 'Croacia', 'Ghana', 'Panamá']
};

const countryToCode = {
    'México': 'mx', 'Sudáfrica': 'za', 'Corea del Sur': 'kr', 'República Checa': 'cz',
    'Canadá': 'ca', 'Bosnia y Herzegovina': 'ba', 'Catar': 'qa', 'Suiza': 'ch',
    'Brasil': 'br', 'Marruecos': 'ma', 'Haití': 'ht', 'Escocia': 'gb-sct',
    'Estados Unidos': 'us', 'Paraguay': 'py', 'Australia': 'au', 'Turquía': 'tr',
    'Alemania': 'de', 'Curazao': 'cw', 'Costa de Marfil': 'ci', 'Ecuador': 'ec',
    'Países Bajos': 'nl', 'Japón': 'jp', 'Suecia': 'se', 'Túnez': 'tn',
    'Bélgica': 'be', 'Egipto': 'eg', 'Irán': 'ir', 'Nueva Zelanda': 'nz',
    'España': 'es', 'Cabo Verde': 'cv', 'Arabia Saudita': 'sa', 'Uruguay': 'uy',
    'Francia': 'fr', 'Senegal': 'sn', 'Irak': 'iq', 'Noruega': 'no',
    'Argentina': 'ar', 'Argelia': 'dz', 'Austria': 'at', 'Jordania': 'jo',
    'Portugal': 'pt', 'RD Congo': 'cd', 'Uzbekistán': 'uz', 'Colombia': 'co',
    'Inglaterra': 'gb-eng', 'Croacia': 'hr', 'Ghana': 'gh', 'Panamá': 'pa'
};

function formatMatchTeams(local, visitor) {
    const localCode = countryToCode[local] || 'unknown';
    const visitorCode = countryToCode[visitor] || 'unknown';
    const localFlag = `<span class="fi fi-${localCode} fis" style="font-size:1.1rem; margin-right:0.2rem;"></span>`;
    const visitorFlag = `<span class="fi fi-${visitorCode} fis" style="font-size:1.1rem; margin-left:0.2rem;"></span>`;
    return `${localFlag} ${local} <span style="margin:0 0.5rem; font-weight:600;">vs</span> ${visitor} ${visitorFlag}`;
}

function generateMatches() {
    const matches = [];
    for (const group of GROUPS) {
        const teams = TEAMS_BY_GROUP[group];
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                matches.push({
                    id: `${group}_${teams[i]}_vs_${teams[j]}`,
                    group: group,
                    local: teams[i],
                    visitor: teams[j]
                });
            }
        }
    }
    return matches;
}

const ALL_MATCHES = generateMatches();

// --------------------------------------------------------------
// ESTADO GLOBAL
// --------------------------------------------------------------
let participants = [];      // cada uno: { id, name, dept, email, predictions, locked }
let officialResults = {};
let currentUserId = null;

function loadFromStorage() {
    const storedParts = localStorage.getItem('quiniela_participants_v4');
    if(storedParts) participants = JSON.parse(storedParts);
    const storedResults = localStorage.getItem('quiniela_officialResults_v4');
    if(storedResults) officialResults = JSON.parse(storedResults);
    const storedUser = localStorage.getItem('quiniela_currentUserId_v4');
    if(storedUser) currentUserId = parseInt(storedUser);
}

function persistParticipants() { localStorage.setItem('quiniela_participants_v4', JSON.stringify(participants)); }
function persistOfficialResults() { localStorage.setItem('quiniela_officialResults_v4', JSON.stringify(officialResults)); }
function persistCurrentUser() {
    if(currentUserId) localStorage.setItem('quiniela_currentUserId_v4', currentUserId);
    else localStorage.removeItem('quiniela_currentUserId_v4');
}

// Cálculo de puntajes
function calculateUserScore(predictions) {
    if(!predictions) return 0;
    let score = 0;
    for (const match of ALL_MATCHES) {
        if(predictions[match.id] && officialResults[match.id] && predictions[match.id] === officialResults[match.id]) score++;
    }
    return score;
}

function computeAllScores() {
    return participants.map(p => ({
        id: p.id,
        name: p.name,
        dept: p.dept,
        email: p.email || '—',
        points: calculateUserScore(p.predictions || {}),
        locked: p.locked || false
    })).sort((a,b) => b.points - a.points);
}

// Render Top 3 en Admin
function renderTopThree() {
    const container = document.getElementById('topThreeContainer');
    if(!container) return;
    const scores = computeAllScores();
    const top3 = scores.slice(0,3);
    if(top3.length === 0) {
        container.innerHTML = '<p class="helper-text">Aún no hay participantes.</p>';
        return;
    }
    let html = '';
    const medals = ['🥇', '🥈', '🥉'];
    top3.forEach((item, idx) => {
        html += `
            <div class="top-item">
                <div class="top-medal">${medals[idx]}</div>
                <div class="top-name">${escapeHtml(item.name)}</div>
                <div class="top-dept">${escapeHtml(item.dept)}</div>
                <div class="top-points">${item.points} aciertos</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Render leaderboard con botones de bloqueo
function renderLeaderboard() {
    const tbody = document.getElementById('leaderboardBody');
    if(!tbody) return;
    const scores = computeAllScores();
    tbody.innerHTML = '';
    if(scores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="helper-text" style="text-align:center">Sin participantes registrados</td></tr>';
        return;
    }
    scores.forEach((s, idx) => {
        const row = tbody.insertRow();
        const lockStatus = s.locked ? 'Bloqueado' : 'Activo';
        const lockBtnText = s.locked ? '🔓 Desbloquear' : '🔒 Bloquear';
        const lockBtnClass = s.locked ? 'unlock-btn' : 'lock-btn';
        row.innerHTML = `
            <td>${idx+1}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.dept)}</td>
            <td>${escapeHtml(s.email)}</td>
            <td class="points">${s.points} / ${ALL_MATCHES.length}</td>
            <td>${lockStatus}</td>
            <td>
                <button class="btn-icon view-btn" data-id="${s.id}">👁️ Ver</button>
                <button class="btn-icon delete-btn" data-id="${s.id}">🗑️ Eliminar</button>
                <button class="btn-icon ${lockBtnClass} toggle-lock-btn" data-id="${s.id}">${lockBtnText}</button>
            </td>
        `;
    });
    // Eventos de botones
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'));
            const user = participants.find(p => p.id === id);
            if(user) showUserPredictionsModal(user);
        });
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'));
            if(confirm('¿Eliminar este usuario permanentemente?')) {
                participants = participants.filter(p => p.id !== id);
                persistParticipants();
                if(currentUserId === id) {
                    currentUserId = null;
                    persistCurrentUser();
                    showRegistrationOnly();
                }
                renderLeaderboard();
                renderTopThree();
                if(activeView === 'user') refreshUserView();
            }
        });
    });
    document.querySelectorAll('.toggle-lock-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'));
            const user = participants.find(p => p.id === id);
            if(user) {
                user.locked = !user.locked;
                persistParticipants();
                renderLeaderboard();
                renderTopThree();
                if(activeView === 'user' && currentUserId === id) refreshUserView();
                alert(`Usuario ${user.name} ahora está ${user.locked ? 'BLOQUEADO' : 'DESBLOQUEADO'}.`);
            }
        });
    });
}

// Modal con pronósticos
function showUserPredictionsModal(user) {
    const preds = user.predictions || {};
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    let matchesHtml = '<div style="max-height:70vh; overflow-y:auto; padding:0.5rem;">';
    for (const match of ALL_MATCHES) {
        const pick = preds[match.id];
        let pickText = pick === 'local' ? '🏠 Local' : pick === 'draw' ? '🤝 Empate' : pick === 'visitor' ? '✈️ Visitante' : '❌ Sin pronóstico';
        matchesHtml += `
            <div class="match-card" style="margin-bottom:0.5rem;">
                <div class="match-teams">${formatMatchTeams(match.local, match.visitor)}</div>
                <div>${pickText}</div>
            </div>
        `;
    }
    matchesHtml += '</div>';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Pronósticos de ${escapeHtml(user.name)}</h3>
                <button class="close-modal">&times;</button>
            </div>
            <p style="padding:0 1rem;">Email: ${escapeHtml(user.email || 'No registrado')}</p>
            ${matchesHtml}
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if(e.target === modal) modal.remove(); });
}

function escapeHtml(str) {
    if(!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
}

// --------------------------------------------------------------
// RENDERIZADO DE PARTIDOS (usuario y admin)
// --------------------------------------------------------------
function renderMatches(containerId, sourceData, isAdmin = false, disabled = false) {
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = '';
    for (const group of GROUPS) {
        const groupMatches = ALL_MATCHES.filter(m => m.group === group);
        const groupDiv = document.createElement('div');
        groupDiv.className = 'group-block';
        groupDiv.innerHTML = `<div class="group-title">Grupo ${group}</div>`;
        const matchesDiv = document.createElement('div');
        matchesDiv.className = 'matches-group';
        for (const match of groupMatches) {
            const current = sourceData[match.id] || '';
            const card = document.createElement('div');
            card.className = 'match-card';
            card.innerHTML = `
                <div class="match-teams">
                    ${formatMatchTeams(match.local, match.visitor)}
                </div>
                <div class="result-options">
                    <label class="result-option ${current === 'local' ? 'selected' : ''}">
                        <input type="radio" name="${isAdmin ? 'official' : 'match'}_${match.id}" value="local" ${current === 'local' ? 'checked' : ''} class="hidden" ${disabled ? 'disabled' : ''}> 🏠 Local
                    </label>
                    <label class="result-option ${current === 'draw' ? 'selected' : ''}">
                        <input type="radio" name="${isAdmin ? 'official' : 'match'}_${match.id}" value="draw" ${current === 'draw' ? 'checked' : ''} class="hidden" ${disabled ? 'disabled' : ''}> 🤝 Empate
                    </label>
                    <label class="result-option ${current === 'visitor' ? 'selected' : ''}">
                        <input type="radio" name="${isAdmin ? 'official' : 'match'}_${match.id}" value="visitor" ${current === 'visitor' ? 'checked' : ''} class="hidden" ${disabled ? 'disabled' : ''}> ✈️ Visitante
                    </label>
                </div>
            `;
            if(disabled) {
                card.querySelectorAll('input').forEach(inp => inp.disabled = true);
            }
            card.querySelectorAll('.result-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    if(disabled) return;
                    const radio = opt.querySelector('input');
                    if(radio) radio.checked = true;
                    card.querySelectorAll('.result-option').forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                });
            });
            matchesDiv.appendChild(card);
        }
        groupDiv.appendChild(matchesDiv);
        container.appendChild(groupDiv);
    }
}

function getUserPredictionsFromDOM() {
    const preds = {};
    for (const match of ALL_MATCHES) {
        const selected = document.querySelector(`input[name="match_${match.id}"]:checked`);
        if(selected) preds[match.id] = selected.value;
    }
    return preds;
}

function getOfficialResultsFromDOM() {
    const results = {};
    for (const match of ALL_MATCHES) {
        const selected = document.querySelector(`input[name="official_${match.id}"]:checked`);
        if(selected) results[match.id] = selected.value;
    }
    return results;
}

function saveUserPredictions() {
    if(!currentUserId) { alert('Primero regístrate.'); return; }
    const user = participants.find(p => p.id === currentUserId);
    if(user && user.locked) {
        alert('Tus pronósticos están bloqueados por el administrador. No puedes modificarlos.');
        return;
    }
    const preds = getUserPredictionsFromDOM();
    if(user) {
        user.predictions = preds;
        persistParticipants();
        alert('Pronósticos guardados correctamente');
    }
}

function saveOfficialResults() {
    officialResults = getOfficialResultsFromDOM();
    persistOfficialResults();
    alert('Resultados oficiales guardados');
    renderLeaderboard();
    renderTopThree();
}

// --------------------------------------------------------------
// FLUJO DE USUARIO
// --------------------------------------------------------------
function showRegistrationOnly() {
    document.getElementById('predictionsSection').classList.add('hidden-section');
    document.getElementById('changeUserLink').classList.add('hidden');
    document.getElementById('currentUserInfo').innerHTML = '';
}

function showPredictionsForUser(user) {
    document.getElementById('predictionsSection').classList.remove('hidden-section');
    document.getElementById('changeUserLink').classList.remove('hidden');
    document.getElementById('currentUserInfo').innerHTML = `✅ Sesión iniciada como: <strong>${escapeHtml(user.name)}</strong> · ${escapeHtml(user.dept)}${user.email ? ` · ${escapeHtml(user.email)}` : ''}`;
    const isLocked = user.locked === true;
    renderMatches('groupsMatchesContainer', user.predictions || {}, false, isLocked);
    const saveBtn = document.getElementById('savePredictionsBtn');
    const lockedMsgDiv = document.getElementById('lockedMessage');
    if(isLocked) {
        saveBtn.style.display = 'none';
        lockedMsgDiv.classList.remove('hidden');
        lockedMsgDiv.innerHTML = '🔒 Tus pronósticos han sido bloqueados por el administrador. No puedes modificarlos.';
    } else {
        saveBtn.style.display = 'inline-block';
        lockedMsgDiv.classList.add('hidden');
        lockedMsgDiv.innerHTML = '';
    }
}

function refreshUserView() {
    if(currentUserId) {
        const user = participants.find(p => p.id === currentUserId);
        if(user) showPredictionsForUser(user);
        else showRegistrationOnly();
    } else {
        showRegistrationOnly();
    }
}

function registerUser() {
    const name = document.getElementById('userNameInput').value.trim();
    const dept = document.getElementById('userDeptInput').value.trim();
    const email = document.getElementById('userEmailInput').value.trim();
    if(!name) { alert('Ingresa tu nombre'); return; }
    let existing = participants.find(p => p.name.toLowerCase() === name.toLowerCase() && p.dept === dept);
    if(existing) {
        currentUserId = existing.id;
        persistCurrentUser();
        showPredictionsForUser(existing);
    } else {
        const newId = Date.now();
        const newUser = { id: newId, name, dept, email: email || '', predictions: {}, locked: false };
        participants.push(newUser);
        persistParticipants();
        currentUserId = newId;
        persistCurrentUser();
        showPredictionsForUser(newUser);
        alert(`¡Registrado exitosamente, ${name}! Ahora puedes hacer tus pronósticos.`);
    }
}

function changeUser() {
    currentUserId = null;
    persistCurrentUser();
    showRegistrationOnly();
    document.getElementById('userNameInput').focus();
}

// --------------------------------------------------------------
// ADMIN AUTH y VISTAS (Enter en login)
// --------------------------------------------------------------
let isAdminAuthenticated = false;
let activeView = 'user';

function showAdminLoginModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>🔐 Acceso Administrador</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div style="padding:1rem;">
                <input type="text" id="adminUser" placeholder="Usuario" class="form-input" style="width:100%; margin-bottom:0.5rem;">
                <input type="password" id="adminPass" placeholder="Contraseña" class="form-input" style="width:100%; margin-bottom:1rem;">
                <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
                    <button id="cancelLogin" class="btn">Cancelar</button>
                    <button id="submitLogin" class="btn btn-primary">Ingresar</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('.close-modal').addEventListener('click', close);
    document.getElementById('cancelLogin').addEventListener('click', close);
    
    const login = () => {
        const user = document.getElementById('adminUser').value.trim();
        const pass = document.getElementById('adminPass').value.trim();
        if(user === 'admin' && pass === 'mundial2026') {
            isAdminAuthenticated = true;
            close();
            setView('admin');
        } else alert('Credenciales incorrectas');
    };
    document.getElementById('submitLogin').addEventListener('click', login);
    // Enter en cualquier input del modal
    const inputs = modal.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') login();
        });
    });
}

function setView(view) {
    if(view === 'admin' && !isAdminAuthenticated) { showAdminLoginModal(); return; }
    activeView = view;
    const userViewDiv = document.getElementById('userView');
    const adminViewDiv = document.getElementById('adminView');
    if(view === 'user') {
        userViewDiv.classList.add('active');
        adminViewDiv.classList.remove('active');
        refreshUserView();
    } else {
        userViewDiv.classList.remove('active');
        adminViewDiv.classList.add('active');
        renderMatches('adminMatchesContainer', officialResults, true, false);
        renderLeaderboard();
        renderTopThree();
    }
}

// --------------------------------------------------------------
// TEMA OSCURO/CLARO
// --------------------------------------------------------------
function initTheme() {
    const stored = localStorage.getItem('theme');
    const isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if(isDark) document.body.classList.add('dark');
    const toggleBtn = document.getElementById('themeToggle');
    toggleBtn.textContent = isDark ? '🌙' : '🌞';
    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const nowDark = document.body.classList.contains('dark');
        localStorage.setItem('theme', nowDark ? 'dark' : 'light');
        toggleBtn.textContent = nowDark ? '🌙' : '🌞';
    });
}

// --------------------------------------------------------------
// INICIALIZACIÓN
// --------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    initTheme();
    setView('user');
    document.getElementById('btnUserView').addEventListener('click', () => setView('user'));
    document.getElementById('btnAdminView').addEventListener('click', () => setView('admin'));
    document.getElementById('registerUserBtn').addEventListener('click', registerUser);
    document.getElementById('changeUserBtn').addEventListener('click', changeUser);
    document.getElementById('savePredictionsBtn').addEventListener('click', saveUserPredictions);
    document.getElementById('saveOfficialResultsBtn').addEventListener('click', saveOfficialResults);
    document.getElementById('refreshScoresBtn').addEventListener('click', () => { 
        renderLeaderboard(); 
        renderTopThree();
        alert('Puntajes actualizados'); 
    });
});

// Botón flotante volver arriba
// Botón volver arriba - versión robusta
document.addEventListener('DOMContentLoaded', () => {
    const scrollBtn = document.getElementById('scrollTopBtn');
    if (!scrollBtn) return;

    const checkScroll = () => {
        if (window.scrollY > 500) {
            scrollBtn.classList.add('show');
        } else {
            scrollBtn.classList.remove('show');
        }
    };

    // Forzar una comprobación inicial después de un breve retraso (por si el DOM tarda)
    setTimeout(checkScroll, 100);
    
    // Escuchar el evento scroll
    window.addEventListener('scroll', checkScroll);
    
    // Al hacer clic, subir suavemente
    scrollBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

window.scrollTo(0, 500);
setTimeout(() => console.log(window.scrollY, document.getElementById('scrollTopBtn').classList), 200);

