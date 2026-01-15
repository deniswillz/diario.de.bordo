/* =============================================
   DIÁRIO DE BORDO - AGROSYSTEM
   Application Logic
   ============================================= */

// =============================================
// DATA MANAGEMENT
// =============================================

const STORAGE_KEYS = {
    notas: 'diario_notas',
    ordens: 'diario_ordens',
    comentarios: 'diario_comentarios'
};

// Generate UUID
function generateId() {
    return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
        Math.floor(Math.random() * 16).toString(16)
    );
}

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// Format date to PT-BR
function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

// Get data from global state (Cache)
function getData(key) {
    // key ex: 'diario_notas' -> 'notas'
    try {
        const prop = key.replace('diario_', '');
        return state.data[prop] || [];
    } catch {
        return [];
    }
}

// Deprecated: Save data to localStorage (Removed in favor of direct DB persistence)
function saveData(key, data) {
    // No-op: Data is saved directly to DB now
    // Keep localstorage as backup if desired, but for now we rely on DB
    // localStorage.setItem(key, JSON.stringify(data));

    // Update local state immediately for optimistic UI
    const prop = key.replace('diario_', '');
    state.data[prop] = data;
}

// =============================================
// STATE MANAGEMENT
// =============================================

const state = {
    currentSection: 'dashboard',
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedDate: getTodayDate(),
    editingItem: null,
    deleteCallback: null,
    // Database Cache
    data: {
        notas: [],
        ordens: [],
        comentarios: []
    }
};

// Async Data Refresh
async function refreshData(payload) {
    if (payload) console.log('🔄 Data change detected:', payload.eventType);

    try {
        const [notas, ordens, comentarios] = await Promise.all([
            window.fetchNotas(),
            window.fetchOrdens(),
            window.fetchComentarios()
        ]);

        state.data.notas = notas || [];
        state.data.ordens = ordens || [];
        state.data.comentarios = comentarios || [];

        // Refresh UI
        state.data.notas = notas || [];
        state.data.ordens = ordens || [];
        state.data.comentarios = comentarios || [];

        // Sync to LocalStorage (for Backup compatibility)
        localStorage.setItem(STORAGE_KEYS.notas, JSON.stringify(state.data.notas));
        localStorage.setItem(STORAGE_KEYS.ordens, JSON.stringify(state.data.ordens));
        localStorage.setItem(STORAGE_KEYS.comentarios, JSON.stringify(state.data.comentarios));

        // Update UI based on current section
        if (state.currentSection === 'dashboard') updateDashboard();
        else if (state.currentSection === 'notas') renderNotasList();
        else if (state.currentSection === 'ordens') renderOrdensList();
        else if (state.currentSection === 'comentarios') renderComentariosList();

        renderCalendar();
        renderAlerts();

    } catch (e) {
        console.error('Error refreshing data:', e);
    }
}

// =============================================
// DOM ELEMENTS
// =============================================

const elements = {
    // Header
    menuToggle: document.getElementById('menuToggle'),
    alertBadge: document.getElementById('alertBadge'),
    badgeCount: document.getElementById('badgeCount'),
    currentDate: document.getElementById('currentDate'),

    // Sidebar
    sidebar: document.getElementById('sidebar'),
    navItems: document.querySelectorAll('.nav-item'),

    // Main
    mainContent: document.getElementById('mainContent'),
    sections: document.querySelectorAll('.section'),

    // Dashboard
    alertPanel: document.getElementById('alertPanel'),
    alertList: document.getElementById('alertList'),
    totalNotas: document.getElementById('totalNotas'),
    notasPendentes: document.getElementById('notasPendentes'),
    totalOrdens: document.getElementById('totalOrdens'),
    ordensPendentes: document.getElementById('ordensPendentes'),
    totalComentarios: document.getElementById('totalComentarios'),
    comentariosHoje: document.getElementById('comentariosHoje'),
    totalAlertas: document.getElementById('totalAlertas'),

    // Calendar
    calendarTitle: document.getElementById('calendarTitle'),
    calendarDays: document.getElementById('calendarDays'),
    prevMonth: document.getElementById('prevMonth'),
    nextMonth: document.getElementById('nextMonth'),

    // Notas Form
    notaForm: document.getElementById('notaForm'),
    notaFormTitle: document.getElementById('notaFormTitle'),
    notaId: document.getElementById('notaId'),
    notaData: document.getElementById('notaData'),
    notaNumero: document.getElementById('notaNumero'),
    notaFornecedor: document.getElementById('notaFornecedor'),
    notaStatus: document.getElementById('notaStatus'),
    notaTipo: document.getElementById('notaTipo'),
    notaObs: document.getElementById('notaObs'),
    notaCancelar: document.getElementById('notaCancelar'),
    notasList: document.getElementById('notasList'),
    notaSearch: document.getElementById('notaSearch'),
    notaFilterStatus: document.getElementById('notaFilterStatus'),

    // Ordens Form
    ordemForm: document.getElementById('ordemForm'),
    ordemFormTitle: document.getElementById('ordemFormTitle'),
    ordemId: document.getElementById('ordemId'),
    ordemData: document.getElementById('ordemData'),
    ordemNumero: document.getElementById('ordemNumero'),
    ordemDocumento: document.getElementById('ordemDocumento'),
    ordemStatus: document.getElementById('ordemStatus'),
    ordemObs: document.getElementById('ordemObs'),
    ordemCancelar: document.getElementById('ordemCancelar'),
    ordensList: document.getElementById('ordensList'),
    ordemSearch: document.getElementById('ordemSearch'),
    ordemFilterStatus: document.getElementById('ordemFilterStatus'),

    // Comentarios Form
    comentarioForm: document.getElementById('comentarioForm'),
    comentarioFormTitle: document.getElementById('comentarioFormTitle'),
    comentarioId: document.getElementById('comentarioId'),
    comentarioData: document.getElementById('comentarioData'),
    comentarioTexto: document.getElementById('comentarioTexto'),
    comentarioCancelar: document.getElementById('comentarioCancelar'),
    comentariosList: document.getElementById('comentariosList'),
    comentarioSearch: document.getElementById('comentarioSearch'),

    // Toast & Modal
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    deleteModal: document.getElementById('deleteModal'),
    cancelDelete: document.getElementById('cancelDelete'),
    confirmDelete: document.getElementById('confirmDelete'),

    // Day Popup Modal
    dayPopupModal: document.getElementById('dayPopupModal'),
    dayPopupTitle: document.getElementById('dayPopupTitle'),
    closeDayPopup: document.getElementById('closeDayPopup'),
    popupNotasCount: document.getElementById('popupNotasCount'),
    popupOrdensCount: document.getElementById('popupOrdensCount'),
    popupComentariosCount: document.getElementById('popupComentariosCount'),
    popupTabs: document.querySelectorAll('.popup-tab'),
    popupNotasContent: document.getElementById('popupNotasContent'),
    popupOrdensContent: document.getElementById('popupOrdensContent'),
    popupComentariosContent: document.getElementById('popupComentariosContent'),
    quickObsInput: document.getElementById('quickObsInput'),
    addQuickObs: document.getElementById('addQuickObs')
};

// =============================================
// NAVIGATION
// =============================================

function navigateTo(sectionId) {
    state.currentSection = sectionId;

    // Update nav items
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionId);
    });

    // Update sections
    elements.sections.forEach(section => {
        section.classList.toggle('active', section.id === sectionId);
    });

    // Close sidebar on mobile
    elements.sidebar.classList.remove('open');

    // Refresh data
    if (sectionId === 'dashboard') {
        updateDashboard();
    } else if (sectionId === 'notas') {
        renderNotasList();
    } else if (sectionId === 'ordens') {
        renderOrdensList();
    } else if (sectionId === 'comentarios') {
        renderComentariosList();
    }
}

// =============================================
// TOAST NOTIFICATIONS
// =============================================

function showToast(message, type = 'success') {
    elements.toastMessage.textContent = message;
    elements.toast.className = `toast ${type} show`;

    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

// =============================================
// DELETE MODAL
// =============================================

function showDeleteModal(callback) {
    state.deleteCallback = callback;
    elements.deleteModal.classList.add('show');
}

function hideDeleteModal() {
    elements.deleteModal.classList.remove('show');
    state.deleteCallback = null;
}

// =============================================
// CALENDAR
// =============================================

const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function renderCalendar() {
    const year = state.currentYear;
    const month = state.currentMonth;

    // Update title
    elements.calendarTitle.textContent = `${monthNames[month]} ${year}`;

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Get data for coloring
    const notas = getData(STORAGE_KEYS.notas);
    const ordens = getData(STORAGE_KEYS.ordens);
    const comentarios = getData(STORAGE_KEYS.comentarios);

    // Build calendar HTML
    let html = '';

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Days of month
    const today = getTodayDate();

    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Check status for this date
        const notasOnDate = notas.filter(n => n.data === dateStr);
        const ordensOnDate = ordens.filter(o => o.data === dateStr);
        const comentariosOnDate = comentarios.filter(c => c.data === dateStr);

        // Lógica de Cores (User Request)
        // Vermelho: > 3 dias atraso
        // Laranja: >= 2 dias atraso
        // Azul: No dia (Hoje)
        // Verde: Classificada ou Concluída

        const pendingNotas = notasOnDate.filter(n => ['Pendente', 'Em Conferência', 'Pré Nota'].includes(n.status));
        const pendingOrdens = ordensOnDate.filter(o => o.status === 'Em Separação');
        const hasPending = pendingNotas.length > 0 || pendingOrdens.length > 0;

        let statusClass = '';

        if (hasPending) {
            const dateObj = new Date(dateStr + 'T00:00:00');
            const todayObj = new Date();
            todayObj.setHours(0, 0, 0, 0);

            // Diff em dias
            const diffTime = todayObj.getTime() - dateObj.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 3) {
                statusClass = 'status-critical';
            } else if (diffDays >= 2) {
                statusClass = 'status-warning';
            } else if (diffDays === 0) {
                statusClass = 'status-today';
            } else if (diffDays === 1) {
                statusClass = 'status-warning'; // Ontem também alerta
            }
        } else {
            const hasComplete = (notasOnDate.some(n => n.status === 'Classificada') ||
                ordensOnDate.some(o => o.status === 'Concluída'));
            if (hasComplete) statusClass = 'status-complete';
        }

        const hasComment = comentariosOnDate.length > 0;

        let classes = `calendar-day ${statusClass}`;
        if (dateStr === today) classes += ' today';
        if (dateStr === state.selectedDate) classes += ' selected';
        if (hasComment && !statusClass) classes += ' has-comment'; // Mantém roxo se só tiver comentário

        // Build counters HTML
        let countersHtml = '';
        if (notasOnDate.length > 0 || ordensOnDate.length > 0 || comentariosOnDate.length > 0) {
            countersHtml = '<div class="day-counters">';
            if (notasOnDate.length > 0) {
                countersHtml += `<span class="counter nota">N(${notasOnDate.length})</span>`;
            }
            if (ordensOnDate.length > 0) {
                countersHtml += `<span class="counter ordem">O(${ordensOnDate.length})</span>`;
            }
            if (comentariosOnDate.length > 0) {
                countersHtml += `<span class="counter comentario">C(${comentariosOnDate.length})</span>`;
            }
            countersHtml += '</div>';
        }

        html += `<div class="${classes}" data-date="${dateStr}"><span class="day-number">${day}</span>${countersHtml}</div>`;
    }

    elements.calendarDays.innerHTML = html;

    // Add click handlers
    document.querySelectorAll('.calendar-day:not(.empty)').forEach(day => {
        day.addEventListener('click', () => {
            showDayPopup(day.dataset.date);
        });
    });
}

function prevMonth() {
    state.currentMonth--;
    if (state.currentMonth < 0) {
        state.currentMonth = 11;
        state.currentYear--;
    }
    renderCalendar();
}

function nextMonth() {
    state.currentMonth++;
    if (state.currentMonth > 11) {
        state.currentMonth = 0;
        state.currentYear++;
    }
    renderCalendar();
}

// =============================================
// DAY POPUP
// =============================================

function showDayPopup(dateStr) {
    state.selectedDate = dateStr;

    // Get data for this date
    const notas = getData(STORAGE_KEYS.notas).filter(n => n.data === dateStr);
    const ordens = getData(STORAGE_KEYS.ordens).filter(o => o.data === dateStr);
    const comentarios = getData(STORAGE_KEYS.comentarios).filter(c => c.data === dateStr);

    // Update title
    const date = new Date(dateStr + 'T00:00:00');
    const formattedDate = date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    elements.dayPopupTitle.textContent = `📅 ${formattedDate}`;

    // Update counts
    elements.popupNotasCount.textContent = notas.length;
    elements.popupOrdensCount.textContent = ordens.length;
    elements.popupComentariosCount.textContent = comentarios.length;

    // Render content
    renderPopupNotas(notas);
    renderPopupOrdens(ordens);
    renderPopupComentarios(comentarios);

    // Reset tabs
    elements.popupTabs.forEach(tab => tab.classList.remove('active'));
    document.querySelector('.popup-tab[data-tab="notas"]').classList.add('active');
    document.querySelectorAll('.popup-tab-content').forEach(content => content.classList.remove('active'));
    elements.popupNotasContent.classList.add('active');

    // Clear quick obs input
    elements.quickObsInput.value = '';

    // Show modal
    elements.dayPopupModal.classList.add('show');
}

function closeDayPopup() {
    elements.dayPopupModal.classList.remove('show');
}

// Helper to get status color class based on time
function getStatusColorClass(dateStr, status) {
    if (['Classificada', 'Concluída'].includes(status)) {
        return 'status-complete';
    }

    if (['Pendente', 'Em Conferência', 'Pré Nota', 'Em Separação'].includes(status)) {
        const dateObj = new Date(dateStr + 'T00:00:00');
        const todayObj = new Date();
        todayObj.setHours(0, 0, 0, 0);
        const diffTime = todayObj.getTime() - dateObj.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 3) return 'status-critical'; // Red
        if (diffDays >= 2) return 'status-warning'; // Orange
        if (diffDays === 1) return 'status-warning';
        return 'status-today'; // Blue (Today)
    }

    return ''; // Default
}

function renderPopupNotas(notas) {
    if (notas.length === 0) {
        elements.popupNotasContent.innerHTML = `
            <div class="popup-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <p>Nenhuma nota fiscal nesta data</p>
            </div>
        `;
        return;
    }

    elements.popupNotasContent.innerHTML = notas.map(nota => {
        // Use custom color logic instead of generic class
        const statusClass = `status-badge ${getStatusColorClass(nota.data, nota.status)}`;

        return `
            <div class="popup-item">
                <div class="popup-item-info">
                    <div class="popup-item-title">Nota ${nota.numero}</div>
                    <div class="popup-item-meta">${nota.fornecedor || 'Sem fornecedor'} ${nota.tipo ? '• ' + nota.tipo : ''}</div>
                    ${nota.observacao ? `<div class="popup-item-meta" style="margin-top: 4px; font-style: italic;">"${nota.observacao}"</div>` : ''}
                </div>
                <div class="popup-item-status">
                    <span class="${statusClass}">${nota.status}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderPopupOrdens(ordens) {
    if (ordens.length === 0) {
        elements.popupOrdensContent.innerHTML = `
            <div class="popup-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <p>Nenhuma ordem de produção nesta data</p>
            </div>
        `;
        return;
    }

    elements.popupOrdensContent.innerHTML = ordens.map(ordem => {
        const statusClass = `status-badge ${getStatusColorClass(ordem.data, ordem.status)}`;

        return `
            <div class="popup-item">
                <div class="popup-item-info">
                    <div class="popup-item-title">Ordem ${ordem.numero}</div>
                    <div class="popup-item-meta">${ordem.documento ? 'Doc: ' + ordem.documento : 'Sem documento'}</div>
                    ${ordem.observacao ? `<div class="popup-item-meta" style="margin-top: 4px; font-style: italic;">"${ordem.observacao}"</div>` : ''}
                </div>
                <div class="popup-item-status">
                    <span class="${statusClass}">${ordem.status}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderPopupComentarios(comentarios) {
    if (comentarios.length === 0) {
        elements.popupComentariosContent.innerHTML = `
            <div class="popup-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>Nenhum comentário nesta data</p>
            </div>
        `;
        return;
    }

    elements.popupComentariosContent.innerHTML = comentarios.map(comentario => `
        <div class="popup-item">
            <div class="popup-item-info">
                <div class="popup-item-title">💬 Comentário</div>
                <div class="popup-item-meta">${comentario.texto}</div>
            </div>
        </div>
    `).join('');
}

async function addQuickObservation() {
    const texto = elements.quickObsInput.value.trim();
    if (!texto) {
        showToast('Digite uma observação!', 'error');
        return;
    }

    const comentario = {
        data: state.selectedDate,
        texto: texto
        // id: generated by DB
    };

    try {
        await window.saveComentario(comentario);
        await refreshData();

        // Refresh UI
        showDayPopup(state.selectedDate);
        renderCalendar();
        updateDashboard();

        elements.quickObsInput.value = '';
        showToast('Observação adicionada!');
    } catch (e) {
        console.error(e);
        showToast('Erro ao adicionar observação', 'error');
    }
}

// =============================================
// ALERTS SYSTEM
// =============================================

function calculateDaysPending(dateStr) {
    const itemDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today - itemDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function getAlerts() {
    const alerts = [];
    const notas = getData(STORAGE_KEYS.notas);
    const ordens = getData(STORAGE_KEYS.ordens);

    // Check pending notas
    notas.forEach(nota => {
        if (['Pendente', 'Em Conferência', 'Pré Nota'].includes(nota.status)) {
            const days = calculateDaysPending(nota.data);
            if (days >= 3) {
                alerts.push({
                    type: 'nota',
                    id: nota.id,
                    title: `Nota ${nota.numero}`,
                    meta: nota.fornecedor || 'Sem fornecedor',
                    days: days,
                    status: nota.status
                });
            }
        }
    });

    // Check pending ordens
    ordens.forEach(ordem => {
        if (ordem.status === 'Em Separação') {
            const days = calculateDaysPending(ordem.data);
            if (days >= 3) {
                alerts.push({
                    type: 'ordem',
                    id: ordem.id,
                    title: `Ordem ${ordem.numero}`,
                    meta: ordem.documento || 'Sem documento',
                    days: days,
                    status: ordem.status
                });
            }
        }
    });

    // Sort by days (most urgent first)
    return alerts.sort((a, b) => b.days - a.days);
}

function renderAlerts() {
    const alerts = getAlerts();

    // Update badge
    if (alerts.length > 0) {
        elements.badgeCount.textContent = alerts.length;
        elements.badgeCount.classList.remove('hidden');
        elements.alertPanel.classList.remove('hidden');
    } else {
        elements.badgeCount.classList.add('hidden');
        elements.alertPanel.classList.add('hidden');
    }

    // Update total alerts stat
    elements.totalAlertas.textContent = alerts.length;

    // Render alert list
    if (alerts.length === 0) {
        elements.alertList.innerHTML = '<p class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg><p>Nenhum alerta pendente!</p>';
    } else {
        elements.alertList.innerHTML = alerts.map(alert => `
            <div class="alert-item">
                <div class="alert-item-info">
                    <span class="alert-item-title">${alert.title}</span>
                    <span class="alert-item-meta">${alert.meta} • ${alert.status}</span>
                </div>
                <span class="alert-item-days ${alert.days >= 5 ? 'critical' : 'warning'}">
                    ${alert.days} dias
                </span>
            </div>
        `).join('');
    }
}

// =============================================
// DASHBOARD
// =============================================

function updateDashboard() {
    const notas = getData(STORAGE_KEYS.notas);
    const ordens = getData(STORAGE_KEYS.ordens);
    const comentarios = getData(STORAGE_KEYS.comentarios);
    const today = getTodayDate();

    // Update stats
    elements.totalNotas.textContent = notas.length;
    const notasPendentes = notas.filter(n => ['Pendente', 'Em Conferência', 'Pré Nota'].includes(n.status)).length;
    elements.notasPendentes.textContent = `${notasPendentes} pendentes`;

    elements.totalOrdens.textContent = ordens.length;
    const ordensSeparacao = ordens.filter(o => o.status === 'Em Separação').length;
    elements.ordensPendentes.textContent = `${ordensSeparacao} em separação`;

    elements.totalComentarios.textContent = comentarios.length;
    const comentariosHoje = comentarios.filter(c => c.data === today).length;
    elements.comentariosHoje.textContent = `${comentariosHoje} hoje`;

    // Render alerts and calendar
    renderAlerts();
    renderCalendar();
}

// =============================================
// NOTAS FISCAIS CRUD
// =============================================

function resetNotaForm() {
    elements.notaForm.reset();
    elements.notaId.value = '';
    elements.notaData.value = getTodayDate();
    elements.notaFormTitle.textContent = 'Nova Nota Fiscal';
    state.editingItem = null;
}

function editNota(id) {
    const notas = getData(STORAGE_KEYS.notas);
    const nota = notas.find(n => n.id === id);

    if (nota) {
        state.editingItem = nota;
        elements.notaId.value = nota.id;
        elements.notaData.value = nota.data;
        elements.notaNumero.value = nota.numero;
        elements.notaFornecedor.value = nota.fornecedor || '';
        elements.notaStatus.value = nota.status;
        elements.notaTipo.value = nota.tipo || '';
        elements.notaObs.value = nota.observacao || '';
        elements.notaFormTitle.textContent = 'Editar Nota Fiscal';

        // Scroll to form
        elements.notaForm.scrollIntoView({ behavior: 'smooth' });
    }
}

function deleteNota(id) {
    showDeleteModal(async () => {
        try {
            await window.deleteNota(id);
            // Optimistic update
            state.data.notas = state.data.notas.filter(n => n.id !== id);

            renderNotasList();
            showToast('Nota excluída com sucesso!');
            hideDeleteModal();
            renderAlerts(); // Atualiza alertas globalmente

            // Full sync in background
            refreshData();
        } catch (e) {
            console.error(e);
            showToast('Erro ao excluir nota.', 'error');
            hideDeleteModal();
        }
    });
}

async function handleSaveNota(e) {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }

    const nota = {
        id: elements.notaId.value || undefined, // undefined deixa Supabase gerar UUID se create
        data: elements.notaData.value,
        numero: elements.notaNumero.value.trim(),
        fornecedor: elements.notaFornecedor.value.trim(),
        status: elements.notaStatus.value,
        tipo: elements.notaTipo.value,
        observacao: elements.notaObs.value.trim(),
        // criadoEm: handled by DB
    };

    if (!nota.numero) {
        showToast('Número da nota é obrigatório', 'error');
        return;
    }

    try {
        const saved = await window.saveNota(nota);

        // Optimistic refresh (or full fetch)
        await refreshData();

        resetNotaForm();
        renderNotasList();
        showToast(elements.notaId.value ? 'Nota atualizada!' : 'Nota salva!');
    } catch (e) {
        console.error(e);
        showToast('Erro ao salvar nota.', 'error');
    }
}

function renderNotasList() {
    const notas = getData(STORAGE_KEYS.notas);
    const searchTerm = elements.notaSearch.value.toLowerCase();
    const statusFilter = elements.notaFilterStatus.value;

    // Filter
    let filtered = notas.filter(nota => {
        const matchSearch = nota.numero.toLowerCase().includes(searchTerm) ||
            (nota.fornecedor || '').toLowerCase().includes(searchTerm);
        const matchStatus = !statusFilter || nota.status === statusFilter;
        return matchSearch && matchStatus;
    });

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.data) - new Date(a.data));

    if (filtered.length === 0) {
        elements.notasList.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <p>Nenhuma nota encontrada</p>
            </div>
        `;
        return;
    }

    elements.notasList.innerHTML = filtered.map(nota => {
        const statusClass = nota.status.toLowerCase().replace(/\s+/g, '-').replace('é', 'e');
        return `
        <div class="list-item">
            <div class="list-item-info">
                <span class="list-item-title">Nota ${nota.numero}</span>
                <div class="list-item-meta">
                    <span>${formatDate(nota.data)}</span>
                    <span>•</span>
                    <span>${nota.fornecedor || 'Sem fornecedor'}</span>
                    ${nota.tipo ? `<span>• ${nota.tipo}</span>` : ''}
                </div>
            </div>
            <div class="list-item-actions">
                <span class="status-badge ${statusClass}">${nota.status}</span>
                <button class="btn-icon" onclick="editNota('${nota.id}')" title="Editar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="btn-icon delete" onclick="deleteNota('${nota.id}')" title="Excluir">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `}).join('');
}

// =============================================
// ORDENS DE PRODUÇÃO CRUD
// =============================================

function resetOrdemForm() {
    elements.ordemForm.reset();
    elements.ordemId.value = '';
    elements.ordemData.value = getTodayDate();
    elements.ordemFormTitle.textContent = 'Nova Ordem de Produção';
    state.editingItem = null;
}

function editOrdem(id) {
    const ordens = getData(STORAGE_KEYS.ordens);
    const ordem = ordens.find(o => o.id === id);

    if (ordem) {
        state.editingItem = ordem;
        elements.ordemId.value = ordem.id;
        elements.ordemData.value = ordem.data;
        elements.ordemNumero.value = ordem.numero;
        elements.ordemDocumento.value = ordem.documento || '';
        elements.ordemStatus.value = ordem.status;
        elements.ordemObs.value = ordem.observacao || '';
        elements.ordemFormTitle.textContent = 'Editar Ordem de Produção';

        elements.ordemForm.scrollIntoView({ behavior: 'smooth' });
    }
}

function deleteOrdem(id) {
    showDeleteModal(async () => {
        try {
            await window.deleteOrdem(id);
            state.data.ordens = state.data.ordens.filter(o => o.id !== id);

            renderOrdensList();
            showToast('Ordem excluída com sucesso!');
            hideDeleteModal();
            renderAlerts();
            refreshData();
        } catch (e) {
            console.error(e);
            showToast('Erro ao excluir ordem.', 'error');
            hideDeleteModal();
        }
    });
}

async function handleSaveOrdem(e) {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }

    const ordem = {
        id: elements.ordemId.value || undefined,
        data: elements.ordemData.value,
        numero: elements.ordemNumero.value.trim(),
        documento: elements.ordemDocumento.value.trim(),
        status: elements.ordemStatus.value,
        observacao: elements.ordemObs.value.trim(),
    };

    if (!ordem.numero) {
        showToast('Número da ordem é obrigatório', 'error');
        return;
    }

    try {
        await window.saveOrdem(ordem);
        await refreshData();

        resetOrdemForm();
        renderOrdensList();
        showToast(elements.ordemId.value ? 'Ordem atualizada!' : 'Ordem salva!');
    } catch (e) {
        console.error(e);
        showToast('Erro ao salvar ordem.', 'error');
    }
}

function renderOrdensList() {
    const ordens = getData(STORAGE_KEYS.ordens);
    const searchTerm = elements.ordemSearch.value.toLowerCase();
    const statusFilter = elements.ordemFilterStatus.value;

    // Filter
    let filtered = ordens.filter(ordem => {
        const matchSearch = ordem.numero.toLowerCase().includes(searchTerm) ||
            (ordem.documento || '').toLowerCase().includes(searchTerm);
        const matchStatus = !statusFilter || ordem.status === statusFilter;
        return matchSearch && matchStatus;
    });

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.data) - new Date(a.data));

    if (filtered.length === 0) {
        elements.ordensList.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <p>Nenhuma ordem encontrada</p>
            </div>
        `;
        return;
    }

    elements.ordensList.innerHTML = filtered.map(ordem => {
        const statusClass = ordem.status.toLowerCase().replace(/\s+/g, '-').replace('ã', 'a');
        return `
        <div class="list-item">
            <div class="list-item-info">
                <span class="list-item-title">Ordem ${ordem.numero}</span>
                <div class="list-item-meta">
                    <span>${formatDate(ordem.data)}</span>
                    ${ordem.documento ? `<span>• Doc: ${ordem.documento}</span>` : ''}
                </div>
            </div>
            <div class="list-item-actions">
                <span class="status-badge ${statusClass}">${ordem.status}</span>
                <button class="btn-icon" onclick="editOrdem('${ordem.id}')" title="Editar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="btn-icon delete" onclick="deleteOrdem('${ordem.id}')" title="Excluir">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `}).join('');
}

// =============================================
// COMENTÁRIOS CRUD
// =============================================

function resetComentarioForm() {
    elements.comentarioForm.reset();
    elements.comentarioId.value = '';
    elements.comentarioData.value = getTodayDate();
    elements.comentarioFormTitle.textContent = 'Novo Comentário';
    state.editingItem = null;
}

function editComentario(id) {
    const comentarios = getData(STORAGE_KEYS.comentarios);
    const comentario = comentarios.find(c => c.id === id);

    if (comentario) {
        state.editingItem = comentario;
        elements.comentarioId.value = comentario.id;
        elements.comentarioData.value = comentario.data;
        elements.comentarioTexto.value = comentario.texto;
        elements.comentarioFormTitle.textContent = 'Editar Comentário';

        elements.comentarioForm.scrollIntoView({ behavior: 'smooth' });
    }
}

function deleteComentario(id) {
    showDeleteModal(async () => {
        try {
            await window.deleteComentario(id);
            state.data.comentarios = state.data.comentarios.filter(c => c.id !== id);

            renderComentariosList();
            showToast('Comentário excluído com sucesso!');
            hideDeleteModal();
            refreshData();
        } catch (e) {
            console.error(e);
            showToast('Erro ao excluir comentário.', 'error');
            hideDeleteModal();
        }
    });
}

async function handleSaveComentario(e) {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }

    const comentario = {
        id: elements.comentarioId.value || undefined,
        data: elements.comentarioData.value,
        texto: elements.comentarioTexto.value.trim(),
        // criadoEm handled by DB
    };

    try {
        await window.saveComentario(comentario);
        await refreshData();

        resetComentarioForm();
        renderComentariosList();
        showToast(elements.comentarioId.value ? 'Comentário atualizado!' : 'Comentário salvo!');
    } catch (e) {
        console.error(e);
        showToast('Erro ao salvar comentário.', 'error');
    }
}

function renderComentariosList() {
    const comentarios = getData(STORAGE_KEYS.comentarios);
    const searchTerm = elements.comentarioSearch.value.toLowerCase();

    // Filter
    let filtered = comentarios.filter(comentario => {
        return comentario.texto.toLowerCase().includes(searchTerm);
    });

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.data) - new Date(a.data));

    if (filtered.length === 0) {
        elements.comentariosList.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>Nenhum comentário encontrado</p>
            </div>
        `;
        return;
    }

    elements.comentariosList.innerHTML = filtered.map(comentario => `
        <div class="list-item">
            <div class="list-item-info">
                <span class="list-item-title">${formatDate(comentario.data)}</span>
                <div class="list-item-meta">
                    <span>${comentario.texto.substring(0, 100)}${comentario.texto.length > 100 ? '...' : ''}</span>
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn-icon" onclick="editComentario('${comentario.id}')" title="Editar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="btn-icon delete" onclick="deleteComentario('${comentario.id}')" title="Excluir">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

// =============================================
// EVENT LISTENERS
// =============================================

function initEventListeners() {
    // Menu toggle
    elements.menuToggle.addEventListener('click', () => {
        elements.sidebar.classList.toggle('open');
    });

    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            navigateTo(item.dataset.section);
        });
    });

    // Calendar navigation
    elements.prevMonth.addEventListener('click', prevMonth);
    elements.nextMonth.addEventListener('click', nextMonth);

    // Notas form
    elements.notaForm.addEventListener('submit', handleSaveNota);
    elements.notaCancelar.addEventListener('click', resetNotaForm);
    elements.notaSearch.addEventListener('input', renderNotasList);
    elements.notaFilterStatus.addEventListener('change', renderNotasList);

    // Ordens form
    elements.ordemForm.addEventListener('submit', handleSaveOrdem);
    elements.ordemCancelar.addEventListener('click', resetOrdemForm);
    elements.ordemSearch.addEventListener('input', renderOrdensList);
    elements.ordemFilterStatus.addEventListener('change', renderOrdensList);

    // Comentarios form
    elements.comentarioForm.addEventListener('submit', handleSaveComentario);
    elements.comentarioCancelar.addEventListener('click', resetComentarioForm);
    elements.comentarioSearch.addEventListener('input', renderComentariosList);

    // Delete modal
    elements.cancelDelete.addEventListener('click', hideDeleteModal);
    elements.confirmDelete.addEventListener('click', () => {
        if (state.deleteCallback) {
            state.deleteCallback();
        }
    });

    // Close modal on outside click
    elements.deleteModal.addEventListener('click', (e) => {
        if (e.target === elements.deleteModal) {
            hideDeleteModal();
        }
    });

    // Day popup modal
    elements.closeDayPopup.addEventListener('click', closeDayPopup);
    elements.addQuickObs.addEventListener('click', addQuickObservation);
    elements.quickObsInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addQuickObservation();
        }
    });

    // Popup tabs
    elements.popupTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab
            elements.popupTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update active content
            document.querySelectorAll('.popup-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`popup${tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)}Content`).classList.add('active');
        });
    });

    // Close popup on outside click
    elements.dayPopupModal.addEventListener('click', (e) => {
        if (e.target === elements.dayPopupModal) {
            closeDayPopup();
        }
    });

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!elements.sidebar.contains(e.target) && !elements.menuToggle.contains(e.target)) {
                elements.sidebar.classList.remove('open');
            }
        }
    });
}

// =============================================
// INITIALIZATION
// =============================================

async function init() {
    // Set current date in header
    const today = new Date();
    elements.currentDate.textContent = today.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    // Set default dates in forms
    elements.notaData.value = getTodayDate();
    elements.ordemData.value = getTodayDate();
    elements.comentarioData.value = getTodayDate();

    // Initialize event listeners
    initEventListeners();

    // Load data from Supabase
    try {
        console.log('Loading data...');
        await refreshData();

        // Subscribe to changes
        if (window.subscribeToChanges) {
            window.subscribeToChanges(refreshData);
        }
    } catch (e) {
        console.error('Initial load failed:', e);
    }

    // Load dashboard
    navigateTo('dashboard');

    console.log('Diário de Bordo inicializado!');
}

// Start app
document.addEventListener('DOMContentLoaded', init);
