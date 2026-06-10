// script.js (versión con modal de admin corregido)
import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { 
    collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-functions.js";
const functions = getFunctions(app);

// --------------------------------------------------------------
// DATOS ESTÁTICOS
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
let currentUserData = null;
let officialResults = {};
let allParticipants = [];
let isAdminAuthenticated = false;
let activeView = 'user'; // 'user' o 'admin'

// --------------------------------------------------------------
// FIRESTORE OPERATIONS
// --------------------------------------------------------------
async function saveUserDataToFirestore(uid, data) {
    const userRef = doc(db, 'participants', uid);
    await setDoc(userRef, data);
}
async function loadUserDataFromFirestore(uid) {
    const userRef = doc(db, 'participants', uid);
    const snap = await getDoc(userRef);
    return snap.exists() ? snap.data() : null;
}
async function loadAllParticipants() {
    const q = query(collection(db, 'participants'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
async function saveOfficialResultsToFirestore(results) {
    const resultsRef = doc(db, 'official', 'results');
    await setDoc(resultsRef, { data: results });
}
async function loadOfficialResultsFromFirestore() {
    const resultsRef = doc(db, 'official', 'results');
    const snap = await getDoc(resultsRef);
    return snap.exists() ? snap.data().data : {};
}
async function deleteUserFromFirestore(uid) {
    await deleteDoc(doc(db, 'participants', uid));
}
async function updateUserLock(uid, locked) {
    await updateDoc(doc(db, 'participants', uid), { locked });
}

// --------------------------------------------------------------
// LÓGICA DE PUNTOS
// --------------------------------------------------------------
function calculateUserScore(predictions) {
    if (!predictions) return 0;
    let score = 0;
    for (const match of ALL_MATCHES) {
        if (predictions[match.id] && officialResults[match.id] && predictions[match.id] === officialResults[match.id]) score++;
    }
    return score;
}

// --------------------------------------------------------------
// RENDER DE PARTIDOS
// --------------------------------------------------------------
function renderMatches(containerId, sourceData, isAdmin = false, disabled = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
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
                <div class="match-teams">${formatMatchTeams(match.local, match.visitor)}</div>
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
            if (disabled) card.querySelectorAll('input').forEach(inp => inp.disabled = true);
            card.querySelectorAll('.result-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    if (disabled) return;
                    const radio = opt.querySelector('input');
                    if (radio) radio.checked = true;
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
        if (selected) preds[match.id] = selected.value;
    }
    return preds;
}
function getOfficialResultsFromDOM() {
    const results = {};
    for (const match of ALL_MATCHES) {
        const selected = document.querySelector(`input[name="official_${match.id}"]:checked`);
        if (selected) results[match.id] = selected.value;
    }
    return results;
}

// --------------------------------------------------------------
// ADMIN: LEADERBOARD Y TOP 3
// --------------------------------------------------------------
function renderLeaderboard() {
    const tbody = document.getElementById('leaderboardBody');
    if (!tbody) return;
    const scores = allParticipants.map(p => ({
        uid: p.id,
        name: p.name,
        dept: p.dept,
        email: p.email,
        points: calculateUserScore(p.predictions || {}),
        locked: p.locked || false
    })).sort((a,b) => b.points - a.points);
    tbody.innerHTML = '';
    if (scores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">Sin participantes registrados</td></tr>';
        return;
    }
    scores.forEach((s, idx) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${idx+1}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.dept)}</td>
            <td>${escapeHtml(s.email)}</td>
            <td class="points">${s.points} / ${ALL_MATCHES.length}</td>
            <td>${s.locked ? 'Bloqueado' : 'Activo'}</td>
            <td>
                <button class="btn-icon view-btn" data-uid="${s.uid}">👁️ Ver</button>
                <button class="btn-icon delete-btn" data-uid="${s.uid}">🗑️ Eliminar</button>
                <button class="btn-icon ${s.locked ? 'unlock-btn' : 'lock-btn'} toggle-lock-btn" data-uid="${s.uid}">${s.locked ? '🔓 Desbloquear' : '🔒 Bloquear'}</button>
            </td>
        `;
    });
    // Eventos dinámicos
   // Dentro del evento del botón eliminar
const deleteUserFn = httpsCallable(functions, 'deleteUser');
try {
    await deleteUserFn({ uid: uid });
    // Actualizar listas locales
    allParticipants = allParticipants.filter(p => p.id !== uid);
    renderLeaderboard();
    renderTopThree();
    if (currentUserData && currentUserData.id === uid) {
        await logout();
    }
    alert('Usuario eliminado completamente (Firestore y Auth).');
} catch (error) {
    console.error('Error al eliminar:', error);
    alert('Error al eliminar: ' + error.message);
}

function renderTopThree() {
    const container = document.getElementById('topThreeContainer');
    if (!container) return;
    const scores = allParticipants.map(p => ({
        name: p.name,
        dept: p.dept,
        points: calculateUserScore(p.predictions || {})
    })).sort((a,b) => b.points - a.points).slice(0,3);
    if (scores.length === 0) {
        container.innerHTML = '<p class="helper-text">Aún no hay participantes.</p>';
        return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    let html = '';
    scores.forEach((s, i) => {
        html += `<div class="top-item"><div class="top-medal">${medals[i]}</div><div class="top-name">${escapeHtml(s.name)}</div><div class="top-dept">${escapeHtml(s.dept)}</div><div class="top-points">${s.points} aciertos</div></div>`;
    });
    container.innerHTML = html;
}

function showUserPredictionsModal(user) {
    const preds = user.predictions || {};
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    let matchesHtml = '<div style="max-height:70vh; overflow:auto; padding:0.5rem;">';
    for (const match of ALL_MATCHES) {
        const pick = preds[match.id];
        let pickText = pick === 'local' ? '🏠 Local' : pick === 'draw' ? '🤝 Empate' : pick === 'visitor' ? '✈️ Visitante' : '❌ Sin pronóstico';
        matchesHtml += `<div class="match-card" style="margin-bottom:0.5rem;"><div class="match-teams">${formatMatchTeams(match.local, match.visitor)}</div><div>${pickText}</div></div>`;
    }
    matchesHtml += '</div>';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header"><h3>Pronósticos de ${escapeHtml(user.name)}</h3><button class="close-modal">&times;</button></div>
            <p style="padding:0 1rem;">Email: ${escapeHtml(user.email)}</p>
            ${matchesHtml}
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

// --------------------------------------------------------------
// VISTA USUARIO
// --------------------------------------------------------------
function showPredictionsForUser(userData) {
    const isLocked = userData.locked === true;
    renderMatches('groupsMatchesContainer', userData.predictions || {}, false, isLocked);
    const saveBtn = document.getElementById('savePredictionsBtn');
    const lockedMsg = document.getElementById('lockedMessage');
    if (isLocked) {
        saveBtn.style.display = 'none';
        lockedMsg.classList.remove('hidden');
        lockedMsg.innerHTML = '🔒 Tus pronósticos han sido bloqueados por el administrador. No puedes modificarlos.';
    } else {
        saveBtn.style.display = 'inline-block';
        lockedMsg.classList.add('hidden');
        lockedMsg.innerHTML = '';
    }
}

async function saveUserPredictions() {
    if (!currentUserData) return;
    if (currentUserData.locked) {
        alert('Tus pronósticos están bloqueados. No puedes modificarlos.');
        return;
    }
    const predictions = getUserPredictionsFromDOM();
    currentUserData.predictions = predictions;
    await saveUserDataToFirestore(currentUserData.id, currentUserData);
    alert('Pronósticos guardados en la nube');
}

// --------------------------------------------------------------
// ADMIN: RESULTADOS OFICIALES
// --------------------------------------------------------------
async function saveOfficialResults() {
    officialResults = getOfficialResultsFromDOM();
    await saveOfficialResultsToFirestore(officialResults);
    alert('Resultados oficiales guardados');
    renderLeaderboard();
    renderTopThree();
}

// --------------------------------------------------------------
// AUTENTICACIÓN
// --------------------------------------------------------------
async function registerWithEmail(email, password, name, dept) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        const userData = { name, dept, email, predictions: {}, locked: false, createdAt: new Date().toISOString() };
        await saveUserDataToFirestore(uid, userData);
        return userCredential.user;
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') alert('❌ Este correo ya está registrado. Inicia sesión.');
        else alert('Error en el registro: ' + error.message);
        throw error;
    }
}

async function loginWithEmail(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') alert('❌ Correo o contraseña incorrectos.');
        else alert('Error al iniciar sesión: ' + error.message);
        throw error;
    }
}

async function logout() {
    await signOut(auth);
    currentUserData = null;
    showAuthScreen();
}

// --------------------------------------------------------------
// MODAL ADMIN CORREGIDO (sin duplicados y centrado)
// --------------------------------------------------------------
let adminModal = null; // referencia al modal actual

function showAdminLoginModal() {
    // Si ya hay un modal abierto, lo cerramos primero
    if (adminModal) {
        adminModal.remove();
        adminModal = null;
    }
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal-backdrop';
    modalDiv.innerHTML = `
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
    document.body.appendChild(modalDiv);
    adminModal = modalDiv;

    const closeModal = () => {
        if (adminModal) {
            adminModal.remove();
            adminModal = null;
        }
    };
    modalDiv.querySelector('.close-modal').addEventListener('click', closeModal);
    modalDiv.addEventListener('click', (e) => { if (e.target === modalDiv) closeModal(); });
    document.getElementById('cancelLogin').addEventListener('click', closeModal);

    const login = () => {
        const user = document.getElementById('adminUser').value.trim();
        const pass = document.getElementById('adminPass').value.trim();
        if (user === 'admin' && pass === 'mundial2026') {
            isAdminAuthenticated = true;
            closeModal();
            showAdminScreen();
        } else alert('Credenciales incorrectas');
    };
    document.getElementById('submitLogin').addEventListener('click', login);
    modalDiv.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('keypress', (e) => { if (e.key === 'Enter') login(); });
    });
}

// --------------------------------------------------------------
// CONTROL DE VISTAS
// --------------------------------------------------------------
function showAuthScreen() {
    document.getElementById('authScreen').classList.add('active');
    document.getElementById('userView').classList.remove('active');
    document.getElementById('adminView').classList.remove('active');
    document.getElementById('btnUserView').classList.remove('active');
    document.getElementById('btnAdminView').classList.remove('active');
    activeView = 'user'; // al salir, volvemos a vista usuario
    isAdminAuthenticated = false;
}

function showUserScreen() {
    document.getElementById('authScreen').classList.remove('active');
    document.getElementById('userView').classList.add('active');
    document.getElementById('adminView').classList.remove('active');
    document.getElementById('btnUserView').classList.add('active');
    document.getElementById('btnAdminView').classList.remove('active');
    activeView = 'user';
    if (currentUserData) showPredictionsForUser(currentUserData);
}

function showAdminScreen() {
    if (!isAdminAuthenticated) {
        showAdminLoginModal();
        return;
    }
    document.getElementById('authScreen').classList.remove('active');
    document.getElementById('userView').classList.remove('active');
    document.getElementById('adminView').classList.add('active');
    document.getElementById('btnUserView').classList.remove('active');
    document.getElementById('btnAdminView').classList.add('active');
    activeView = 'admin';
    renderMatches('adminMatchesContainer', officialResults, true, false);
    renderLeaderboard();
    renderTopThree();
}

// --------------------------------------------------------------
// INICIALIZACIÓN
// --------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    // Tema oscuro
    const storedTheme = localStorage.getItem('theme');
    const isDark = storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.body.classList.add('dark');
    const toggleBtn = document.getElementById('themeToggle');
    toggleBtn.textContent = isDark ? '🌙' : '🌞';
    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const nowDark = document.body.classList.contains('dark');
        localStorage.setItem('theme', nowDark ? 'dark' : 'light');
        toggleBtn.textContent = nowDark ? '🌙' : '🌞';
    });

    // Botón volver arriba
    const scrollBtn = document.getElementById('scrollTopBtn');
    if (scrollBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) scrollBtn.classList.add('show');
            else scrollBtn.classList.remove('show');
        });
        scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    // Tabs de autenticación
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    showLoginBtn.addEventListener('click', () => {
        showLoginBtn.classList.add('active');
        showRegisterBtn.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    });
    showRegisterBtn.addEventListener('click', () => {
        showRegisterBtn.classList.add('active');
        showLoginBtn.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    });

    // Eventos de botones
    document.getElementById('doLoginBtn').addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        if (!email || !password) { alert('Completa todos los campos'); return; }
        try {
            const user = await loginWithEmail(email, password);
            const userData = await loadUserDataFromFirestore(user.uid);
            if (!userData) { alert('Error: datos de usuario no encontrados'); return; }
            currentUserData = { id: user.uid, ...userData };
            showUserScreen();
        } catch (e) {}
    });
    document.getElementById('doRegisterBtn').addEventListener('click', async () => {
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const name = document.getElementById('regName').value.trim();
        const dept = document.getElementById('regDept').value.trim();
        if (!email || !password || !name || !dept) { alert('Completa todos los campos'); return; }
        try {
            const user = await registerWithEmail(email, password, name, dept);
            const userData = await loadUserDataFromFirestore(user.uid);
            currentUserData = { id: user.uid, ...userData };
            showUserScreen();
        } catch (e) {}
    });
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('savePredictionsBtn').addEventListener('click', saveUserPredictions);
    document.getElementById('saveOfficialResultsBtn').addEventListener('click', saveOfficialResults);
    document.getElementById('refreshScoresBtn').addEventListener('click', () => { renderLeaderboard(); renderTopThree(); alert('Puntajes actualizados'); });
    document.getElementById('btnUserView').addEventListener('click', () => {
        if (!currentUserData) showAuthScreen();
        else showUserScreen();
    });
    document.getElementById('btnAdminView').addEventListener('click', () => {
        if (!isAdminAuthenticated) showAdminLoginModal();
        else showAdminScreen();
    });

    // Cargar datos globales
    officialResults = await loadOfficialResultsFromFirestore();
    allParticipants = await loadAllParticipants();

    // Estado de autenticación
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userData = await loadUserDataFromFirestore(user.uid);
            if (userData) {
                currentUserData = { id: user.uid, ...userData };
                officialResults = await loadOfficialResultsFromFirestore();
                allParticipants = await loadAllParticipants();
                showUserScreen();
            } else {
                await signOut(auth);
                showAuthScreen();
            }
        } else {
            currentUserData = null;
            showAuthScreen();
        }
    });
});

import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-functions.js";