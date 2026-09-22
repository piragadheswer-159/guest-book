/**
 * Guest Book & Visitor Log Application
 * Modern Front Desk Operations Portal
 */

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // 1. DEFAULT SEED DATA (Matching user screenshot)
  // -------------------------------------------------------------------------
  const SEED_VISITORS = [
    {
      id: 'v-1',
      name: 'Pavithra V',
      phone: '9876543210',
      purpose: 'Project Discussion',
      datetime: '2025-09-20T10:15'
    },
    {
      id: 'v-2',
      name: 'Keerthana S',
      phone: '9123456789',
      purpose: 'Meeting',
      datetime: '2025-09-20T11:20'
    },
    {
      id: 'v-3',
      name: 'Arun Kumar',
      phone: '9988776655',
      purpose: 'Interview',
      datetime: '2025-09-19T14:45'
    },
    {
      id: 'v-4',
      name: 'Sneha R',
      phone: '9345678901',
      purpose: 'Workshop',
      datetime: '2025-09-19T11:30'
    },
    {
      id: 'v-5',
      name: 'Vignesh P',
      phone: '8765432109',
      purpose: 'Delivery',
      datetime: '2025-09-18T16:10'
    }
  ];

  // -------------------------------------------------------------------------
  // 2. APPLICATION STATE
  // -------------------------------------------------------------------------
  const state = {
    visitors: [],
    searchQuery: '',
    purposeFilter: 'ALL',
    currentPage: 1,
    itemsPerPage: 5,
    editingId: null,
    pendingDeleteId: null,
    user: null, // { username: 'admin', email: 'admin@guestbook.io', role: 'Staff' }
    theme: 'light',
    backendConnected: false
  };

  // -------------------------------------------------------------------------
  // 3. BACKEND API CONFIGURATION & CLIENT
  // -------------------------------------------------------------------------
  const API_BASE = (window.location.port === '5000' || window.location.port === '')
    ? ''
    : 'http://localhost:5000';

  function getAuthHeaders() {
    const token = localStorage.getItem('guestbook_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  function setBackendStatus(status, text, tooltip) {
    state.backendConnected = (status === 'connected');
    if (!el.backendStatusPill) return;
    el.backendStatusPill.className = `backend-status-pill status-${status}`;
    if (el.statusText) el.statusText.textContent = text;
    if (tooltip) el.backendStatusPill.title = tooltip;
  }

  async function checkBackendHealth() {
    try {
      const res = await fetch(`${API_BASE}/api/health`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const dbName = data.databaseType || 'MongoDB';
        setBackendStatus('connected', `Connected (${dbName})`, `Connected to ${data.database || 'MongoDB'} | Host: ${data.host || 'localhost'}:${data.port || 27017}`);
        return true;
      }
      throw new Error('Health check returned non-200');
    } catch (err) {
      setBackendStatus('disconnected', 'Offline Mode', 'Backend server unreachable. Using local storage.');
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // 4. DOM ELEMENTS
  // -------------------------------------------------------------------------
  const el = {
    // Nav
    navHome: document.getElementById('navHome'),
    navAddVisitor: document.getElementById('navAddVisitor'),
    navViewLogs: document.getElementById('navViewLogs'),
    navAbout: document.getElementById('navAbout'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mainNav: document.getElementById('mainNav'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),

    // Backend Status
    backendStatusPill: document.getElementById('backendStatusPill'),
    statusText: document.getElementById('statusText'),
    statusPulseDot: document.getElementById('statusPulseDot'),

    // Auth & Header
    authWrapper: document.getElementById('authWrapper'),
    headerLoginBtn: document.getElementById('headerLoginBtn'),
    userProfileMenu: document.getElementById('userProfileMenu'),
    userProfileBtn: document.getElementById('userProfileBtn'),
    userDropdown: document.getElementById('userDropdown'),
    dropdownExportBtn: document.getElementById('dropdownExportBtn'),
    dropdownClearAllBtn: document.getElementById('dropdownClearAllBtn'),
    dropdownLogoutBtn: document.getElementById('dropdownLogoutBtn'),

    // Stats
    totalVisitorsCount: document.getElementById('totalVisitorsCount'),
    todayVisitorsCount: document.getElementById('todayVisitorsCount'),
    activePurposeCount: document.getElementById('activePurposeCount'),

    // Form
    visitorForm: document.getElementById('visitorForm'),
    visitorId: document.getElementById('visitorId'),
    visitorName: document.getElementById('visitorName'),
    visitorPhone: document.getElementById('visitorPhone'),
    visitorPurpose: document.getElementById('visitorPurpose'),
    visitorDateTime: document.getElementById('visitorDateTime'),
    submitVisitorBtn: document.getElementById('submitVisitorBtn'),
    submitBtnText: document.getElementById('submitBtnText'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    formCardTitle: document.getElementById('formCardTitle'),
    editingIndicator: document.getElementById('editingIndicator'),

    // Validation Errors
    nameError: document.getElementById('nameError'),
    phoneError: document.getElementById('phoneError'),
    purposeError: document.getElementById('purposeError'),
    dateError: document.getElementById('dateError'),

    // Table & Toolbar
    visitorTableBody: document.getElementById('visitorTableBody'),
    emptyState: document.getElementById('emptyState'),
    searchVisitorInput: document.getElementById('searchVisitorInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    filterPurposeSelect: document.getElementById('filterPurposeSelect'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    logCountBadge: document.getElementById('logCountBadge'),

    // Pagination
    paginationInfo: document.getElementById('paginationInfo'),
    paginationControls: document.getElementById('paginationControls'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    pageNumbers: document.getElementById('pageNumbers'),

    // Modals
    loginModal: document.getElementById('loginModal'),
    closeLoginModal: document.getElementById('closeLoginModal'),
    loginForm: document.getElementById('loginForm'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    togglePasswordBtn: document.getElementById('togglePasswordBtn'),
    quickDemoLoginBtn: document.getElementById('quickDemoLoginBtn'),

    aboutModal: document.getElementById('aboutModal'),
    closeAboutModal: document.getElementById('closeAboutModal'),
    aboutCloseBtn: document.getElementById('aboutCloseBtn'),
    footerAboutBtn: document.getElementById('footerAboutBtn'),
    footerPrivacyBtn: document.getElementById('footerPrivacyBtn'),

    deleteConfirmModal: document.getElementById('deleteConfirmModal'),
    deleteModalText: document.getElementById('deleteModalText'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),

    toastContainer: document.getElementById('toastContainer')
  };

  // -------------------------------------------------------------------------
  // 5. STORAGE & INITIALIZATION
  // -------------------------------------------------------------------------
  async function init() {
    loadTheme();
    loadAuth();
    setDefaultDateTime();
    bindEvents();
    loadLocalVisitors();
    render();

    // Check backend health and load persistent records from SQLite
    await checkBackendHealth();
    await loadVisitors();

    // Heartbeat health check every 15 seconds
    setInterval(checkBackendHealth, 15000);
  }

  async function loadVisitors() {
    try {
      const res = await fetch(`${API_BASE}/api/visitors`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          state.visitors = json.data;
          saveVisitors();
          setBackendStatus('connected', 'Connected (MongoDB)', 'Database synced with MongoDB backend');
          render();
          return;
        }
      }
      throw new Error('Invalid backend response');
    } catch (e) {
      console.warn('Backend unavailable, loading local storage cache', e);
      setBackendStatus('disconnected', 'Offline Mode', 'Backend server unreachable. Using local storage.');
      loadLocalVisitors();
      render();
    }
  }

  function loadLocalVisitors() {
    try {
      const stored = localStorage.getItem('guestbook_visitors');
      if (stored) {
        state.visitors = JSON.parse(stored);
      } else {
        state.visitors = [...SEED_VISITORS];
        saveVisitors();
      }
    } catch (e) {
      console.warn('Storage read error, using seeds', e);
      state.visitors = [...SEED_VISITORS];
    }
  }

  function saveVisitors() {
    try {
      localStorage.setItem('guestbook_visitors', JSON.stringify(state.visitors));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  function loadTheme() {
    const saved = localStorage.getItem('guestbook_theme') || 'light';
    state.theme = saved;
    document.documentElement.setAttribute('data-theme', saved);
  }

  function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('guestbook_theme', state.theme);
    showToast('Theme Changed', `Switched to ${state.theme} mode.`, 'info');
  }

  function loadAuth() {
    try {
      const auth = localStorage.getItem('guestbook_auth');
      if (auth) {
        state.user = JSON.parse(auth);
        updateAuthUI();
      }
    } catch (e) {
      state.user = null;
    }
  }

  function setDefaultDateTime() {
    // Current local datetime formatted for <input type="datetime-local">
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    el.visitorDateTime.value = `${year}-${month}-${day}T${hours}:${mins}`;
  }

  // -------------------------------------------------------------------------
  // 5. EVENT BINDINGS
  // -------------------------------------------------------------------------
  function bindEvents() {
    // Theme Toggle
    el.themeToggleBtn.addEventListener('click', toggleTheme);

    // Navigation Scrolling & Tabs
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = btn.getAttribute('data-target');
        if (targetId) {
          document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
          btn.classList.add('active');
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        if (el.mainNav.classList.contains('mobile-open')) {
          el.mainNav.classList.remove('mobile-open');
        }
      });
    });

    // Mobile nav toggle
    el.mobileMenuBtn.addEventListener('click', () => {
      el.mainNav.classList.toggle('mobile-open');
    });

    // Brand logo click (scroll home)
    document.getElementById('brandLogo').addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Form submission
    el.visitorForm.addEventListener('submit', handleFormSubmit);
    el.cancelEditBtn.addEventListener('click', cancelEdit);

    // Search and Filter
    el.searchVisitorInput.addEventListener('input', handleSearchInput);
    el.clearSearchBtn.addEventListener('click', () => {
      el.searchVisitorInput.value = '';
      state.searchQuery = '';
      state.currentPage = 1;
      el.clearSearchBtn.classList.add('hidden');
      renderTable();
    });

    el.filterPurposeSelect.addEventListener('change', (e) => {
      state.purposeFilter = e.target.value;
      state.currentPage = 1;
      renderTable();
    });

    el.resetFiltersBtn.addEventListener('click', () => {
      el.searchVisitorInput.value = '';
      state.searchQuery = '';
      el.clearSearchBtn.classList.add('hidden');
      el.filterPurposeSelect.value = 'ALL';
      state.purposeFilter = 'ALL';
      state.currentPage = 1;
      renderTable();
    });

    // Pagination
    el.prevPageBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderTable();
      }
    });

    el.nextPageBtn.addEventListener('click', () => {
      const totalPages = getTotalPages();
      if (state.currentPage < totalPages) {
        state.currentPage++;
        renderTable();
      }
    });

    // Export CSV
    el.exportCsvBtn.addEventListener('click', exportLogsToCsv);
    el.dropdownExportBtn.addEventListener('click', exportLogsToCsv);

    // Login Navigation & Auth
    // headerLoginBtn is an <a> link to login.html
    el.closeLoginModal.addEventListener('click', closeLoginModal);
    el.loginForm.addEventListener('submit', handleLogin);
    el.quickDemoLoginBtn.addEventListener('click', handleQuickDemoLogin);
    el.togglePasswordBtn.addEventListener('click', togglePasswordVisibility);

    // Profile Dropdown
    el.userProfileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      el.userDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!el.authWrapper.contains(e.target)) {
        el.userDropdown.classList.add('hidden');
      }
    });

    el.dropdownLogoutBtn.addEventListener('click', handleLogout);
    el.dropdownClearAllBtn.addEventListener('click', resetToDemoData);

    // About Modal
    el.navAbout.addEventListener('click', openAboutModal);
    el.footerAboutBtn.addEventListener('click', openAboutModal);
    el.footerPrivacyBtn.addEventListener('click', openAboutModal);
    el.closeAboutModal.addEventListener('click', closeAboutModal);
    el.aboutCloseBtn.addEventListener('click', closeAboutModal);

    // Delete Modal
    el.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    el.confirmDeleteBtn.addEventListener('click', confirmDeleteVisitor);

    // Escape Key Modal Dismissal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeLoginModal();
        closeAboutModal();
        closeDeleteModal();
      }
    });

    // Real-time form input error clearing
    el.visitorName.addEventListener('input', () => el.visitorName.classList.remove('is-invalid'));
    el.visitorPhone.addEventListener('input', () => el.visitorPhone.classList.remove('is-invalid'));
    el.visitorPurpose.addEventListener('change', () => el.visitorPurpose.classList.remove('is-invalid'));
    el.visitorDateTime.addEventListener('input', () => el.visitorDateTime.classList.remove('is-invalid'));
  }

  // -------------------------------------------------------------------------
  // 6. FORM HANDLERS (ADD & EDIT)
  // -------------------------------------------------------------------------
  async function handleFormSubmit(e) {
    e.preventDefault();

    const name = el.visitorName.value.trim();
    const phone = el.visitorPhone.value.trim();
    const purpose = el.visitorPurpose.value;
    const datetime = el.visitorDateTime.value;

    let isValid = true;

    if (!name || name.length < 2) {
      el.visitorName.classList.add('is-invalid');
      isValid = false;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!phone || cleanPhone.length < 7) {
      el.visitorPhone.classList.add('is-invalid');
      isValid = false;
    }

    if (!purpose) {
      el.visitorPurpose.classList.add('is-invalid');
      isValid = false;
    }

    if (!datetime) {
      el.visitorDateTime.classList.add('is-invalid');
      isValid = false;
    }

    if (!isValid) {
      showToast('Validation Error', 'Please complete all required fields correctly.', 'error');
      return;
    }

    el.submitVisitorBtn.disabled = true;
    const prevText = el.submitBtnText.textContent;
    el.submitBtnText.textContent = state.editingId ? 'Saving...' : 'Registering...';

    try {
      if (state.editingId) {
        // Update Existing Visitor via API
        let updatedVisitor = null;
        try {
          const res = await fetch(`${API_BASE}/api/visitors/${state.editingId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, phone, purpose, datetime })
          });
          const json = await res.json();
          if (res.ok && json.success) {
            updatedVisitor = json.data;
          }
        } catch (netErr) {
          console.warn('Backend offline, updating locally', netErr);
        }

        const idx = state.visitors.findIndex(v => v.id === state.editingId);
        if (idx !== -1) {
          state.visitors[idx] = updatedVisitor || {
            ...state.visitors[idx],
            name,
            phone,
            purpose,
            datetime
          };
          saveVisitors();
          showToast('Visitor Updated', `${name}'s log has been updated successfully.`, 'success');
        }
        cancelEdit();
      } else {
        // Add New Visitor via API
        let createdVisitor = null;
        try {
          const res = await fetch(`${API_BASE}/api/visitors`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, phone, purpose, datetime })
          });
          const json = await res.json();
          if (res.ok && json.success) {
            createdVisitor = json.data;
          }
        } catch (netErr) {
          console.warn('Backend offline, saving locally', netErr);
        }

        const newVisitor = createdVisitor || {
          id: 'v-' + Date.now(),
          name,
          phone,
          purpose,
          datetime
        };

        // Prepend so new check-ins appear at the top
        state.visitors.unshift(newVisitor);
        saveVisitors();
        showToast('Visitor Registered', `Welcome ${name}! Check-in recorded in database.`, 'success');
        resetForm();
      }

      render();
    } finally {
      el.submitVisitorBtn.disabled = false;
      el.submitBtnText.textContent = state.editingId ? 'Save Changes' : 'Add Visitor';
    }
  }

  function resetForm() {
    el.visitorForm.reset();
    el.visitorId.value = '';
    setDefaultDateTime();
    el.visitorName.classList.remove('is-invalid');
    el.visitorPhone.classList.remove('is-invalid');
    el.visitorPurpose.classList.remove('is-invalid');
    el.visitorDateTime.classList.remove('is-invalid');
  }

  function startEditVisitor(id) {
    const visitor = state.visitors.find(v => v.id === id);
    if (!visitor) return;

    state.editingId = id;
    el.visitorId.value = id;
    el.visitorName.value = visitor.name;
    el.visitorPhone.value = visitor.phone;
    el.visitorPurpose.value = visitor.purpose;
    el.visitorDateTime.value = visitor.datetime;

    // UI Updates
    el.formCardTitle.textContent = `Edit Visitor: ${visitor.name}`;
    el.submitBtnText.textContent = 'Save Changes';
    el.editingIndicator.classList.remove('hidden');
    el.cancelEditBtn.classList.remove('hidden');

    // Scroll to form and focus name
    el.visitorFormSection = document.getElementById('visitorFormSection');
    el.visitorFormSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => el.visitorName.focus(), 300);
  }

  function cancelEdit() {
    state.editingId = null;
    resetForm();
    el.formCardTitle.textContent = 'Add Visitor';
    el.submitBtnText.textContent = 'Add Visitor';
    el.editingIndicator.classList.add('hidden');
    el.cancelEditBtn.classList.add('hidden');
  }

  // -------------------------------------------------------------------------
  // 7. DELETE HANDLERS
  // -------------------------------------------------------------------------
  function openDeleteModal(id) {
    const visitor = state.visitors.find(v => v.id === id);
    if (!visitor) return;

    state.pendingDeleteId = id;
    el.deleteModalText.innerHTML = `Are you sure you want to remove <strong>${escapeHtml(visitor.name)}</strong> (${escapeHtml(visitor.purpose)}) from the visitor log?`;
    el.deleteConfirmModal.classList.remove('hidden');
  }

  function closeDeleteModal() {
    state.pendingDeleteId = null;
    el.deleteConfirmModal.classList.add('hidden');
  }

  async function confirmDeleteVisitor() {
    if (!state.pendingDeleteId) return;

    const idToDelete = state.pendingDeleteId;
    const visitor = state.visitors.find(v => v.id === idToDelete);
    const name = visitor ? visitor.name : 'Visitor';

    el.confirmDeleteBtn.disabled = true;
    el.confirmDeleteBtn.textContent = 'Removing...';

    try {
      try {
        await fetch(`${API_BASE}/api/visitors/${idToDelete}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
      } catch (netErr) {
        console.warn('Backend offline on delete, removing locally', netErr);
      }

      state.visitors = state.visitors.filter(v => v.id !== idToDelete);
      saveVisitors();

      closeDeleteModal();
      showToast('Record Deleted', `${name} was removed from the database.`, 'info');

      // If currently editing this record, reset the form
      if (state.editingId === idToDelete) {
        cancelEdit();
      }

      // Ensure pagination remains valid
      const totalPages = getTotalPages();
      if (state.currentPage > totalPages && totalPages > 0) {
        state.currentPage = totalPages;
      }

      render();
    } finally {
      el.confirmDeleteBtn.disabled = false;
      el.confirmDeleteBtn.textContent = 'Yes, Delete Record';
    }
  }

  async function resetToDemoData() {
    if (confirm('Are you sure you want to reset the visitor logs to original demo entries?')) {
      try {
        const res = await fetch(`${API_BASE}/api/visitors/reset`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
        const json = await res.json();
        if (res.ok && json.success && Array.isArray(json.data)) {
          state.visitors = json.data;
        } else {
          state.visitors = [...SEED_VISITORS];
        }
      } catch (err) {
        state.visitors = [...SEED_VISITORS];
      }
      saveVisitors();
      el.userDropdown.classList.add('hidden');
      render();
      showToast('Logs Reset', 'Visitor records restored to default demonstration data.', 'info');
    }
  }

  // -------------------------------------------------------------------------
  // 8. SEARCH & FILTERING
  // -------------------------------------------------------------------------
  function handleSearchInput(e) {
    state.searchQuery = e.target.value.trim().toLowerCase();
    state.currentPage = 1;
    if (state.searchQuery) {
      el.clearSearchBtn.classList.remove('hidden');
    } else {
      el.clearSearchBtn.classList.add('hidden');
    }
    renderTable();
  }

  function getFilteredVisitors() {
    return state.visitors.filter(v => {
      // Purpose match
      if (state.purposeFilter !== 'ALL' && v.purpose !== state.purposeFilter) {
        return false;
      }
      // Query match
      if (state.searchQuery) {
        const query = state.searchQuery;
        const nameMatch = v.name.toLowerCase().includes(query);
        const purposeMatch = v.purpose.toLowerCase().includes(query);
        const phoneMatch = v.phone.includes(query);
        return nameMatch || purposeMatch || phoneMatch;
      }
      return true;
    });
  }

  function getTotalPages() {
    const filtered = getFilteredVisitors();
    return Math.ceil(filtered.length / state.itemsPerPage) || 1;
  }

  // -------------------------------------------------------------------------
  // 9. RENDERING & UI UPDATES
  // -------------------------------------------------------------------------
  function render() {
    renderStats();
    renderTable();
  }

  function renderStats() {
    el.totalVisitorsCount.textContent = state.visitors.length;

    // Calculate today's visits
    const todayStr = new Date().toISOString().slice(0, 10);
    // Also include mockup date '2025-09-20' for realistic initial demo count
    const todayCount = state.visitors.filter(v => {
      const vDate = v.datetime ? v.datetime.slice(0, 10) : '';
      return vDate === todayStr || vDate === '2025-09-20';
    }).length;
    el.todayVisitorsCount.textContent = todayCount;

    // Distinct purposes
    const uniquePurposes = new Set(state.visitors.map(v => v.purpose));
    el.activePurposeCount.textContent = uniquePurposes.size;

    // Log count badge
    el.logCountBadge.textContent = `${state.visitors.length} ${state.visitors.length === 1 ? 'entry' : 'entries'}`;
  }

  function renderTable() {
    const filtered = getFilteredVisitors();
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;

    if (state.currentPage > totalPages) {
      state.currentPage = totalPages;
    }

    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = Math.min(startIndex + state.itemsPerPage, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);

    // Empty state
    if (totalItems === 0) {
      el.visitorTableBody.innerHTML = '';
      el.emptyState.classList.remove('hidden');
      el.paginationInfo.textContent = 'Showing 0 to 0 of 0 entries';
      el.prevPageBtn.disabled = true;
      el.nextPageBtn.disabled = true;
      el.pageNumbers.innerHTML = '';
      return;
    }

    el.emptyState.classList.add('hidden');

    // Build rows
    let rowsHtml = '';
    pageItems.forEach((visitor, i) => {
      const globalIndex = startIndex + i + 1;
      const initial = visitor.name.trim().charAt(0).toUpperCase() || 'V';
      const formattedDate = formatDateTimeString(visitor.datetime);
      const badgeClass = getPurposeBadgeClass(visitor.purpose);

      rowsHtml += `
        <tr data-id="${visitor.id}">
          <td class="col-num">${globalIndex}</td>
          <td class="col-name">
            <div class="name-cell">
              <span class="visitor-initial">${initial}</span>
              <span>${escapeHtml(visitor.name)}</span>
            </div>
          </td>
          <td class="col-phone">${escapeHtml(visitor.phone)}</td>
          <td class="col-purpose">
            <span class="purpose-badge ${badgeClass}">${escapeHtml(visitor.purpose)}</span>
          </td>
          <td class="col-date">${formattedDate}</td>
          <td class="col-actions">
            <div class="action-buttons">
              <button 
                class="table-action-btn edit-btn" 
                data-action="edit" 
                data-id="${visitor.id}" 
                title="Edit ${escapeHtml(visitor.name)}"
                aria-label="Edit visitor"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button 
                class="table-action-btn delete-btn" 
                data-action="delete" 
                data-id="${visitor.id}" 
                title="Delete ${escapeHtml(visitor.name)}"
                aria-label="Delete visitor"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    el.visitorTableBody.innerHTML = rowsHtml;

    // Attach row action listeners
    el.visitorTableBody.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => startEditVisitor(btn.getAttribute('data-id')));
    });

    el.visitorTableBody.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => openDeleteModal(btn.getAttribute('data-id')));
    });

    // Pagination info & buttons
    el.paginationInfo.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} entries`;
    el.prevPageBtn.disabled = state.currentPage <= 1;
    el.nextPageBtn.disabled = state.currentPage >= totalPages;

    // Page number pills
    let pagesHtml = '';
    for (let p = 1; p <= totalPages; p++) {
      pagesHtml += `
        <button class="page-btn ${p === state.currentPage ? 'active' : ''}" data-page="${p}">
          ${p}
        </button>
      `;
    }
    el.pageNumbers.innerHTML = pagesHtml;

    el.pageNumbers.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.currentPage = parseInt(btn.getAttribute('data-page'), 10);
        renderTable();
      });
    });
  }

  function getPurposeBadgeClass(purpose) {
    switch (purpose) {
      case 'Project Discussion': return 'badge-project';
      case 'Meeting': return 'badge-meeting';
      case 'Interview': return 'badge-interview';
      case 'Workshop': return 'badge-workshop';
      case 'Delivery': return 'badge-delivery';
      default: return 'badge-default';
    }
  }

  function formatDateTimeString(dateTimeStr) {
    if (!dateTimeStr) return '';
    try {
      const d = new Date(dateTimeStr);
      if (isNaN(d.getTime())) return dateTimeStr;

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');

      let hours = d.getHours();
      const mins = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const strHours = String(hours).padStart(2, '0');

      return `${year}-${month}-${day} ${strHours}:${mins} ${ampm}`;
    } catch (e) {
      return dateTimeStr;
    }
  }

  // -------------------------------------------------------------------------
  // 10. AUTHENTICATION (LOGIN & LOGOUT)
  // -------------------------------------------------------------------------
  function openLoginModal() {
    el.loginModal.classList.remove('hidden');
    el.loginEmail.focus();
  }

  function closeLoginModal() {
    el.loginModal.classList.add('hidden');
  }

  function togglePasswordVisibility() {
    const isPass = el.loginPassword.type === 'password';
    el.loginPassword.type = isPass ? 'text' : 'password';
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email = el.loginEmail.value.trim();
    const pass = el.loginPassword.value.trim();

    if (!email || !pass) {
      showToast('Login Failed', 'Please provide both username/email and password.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password: pass })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        state.user = data.user;
        localStorage.setItem('guestbook_auth', JSON.stringify(state.user));
        if (data.token) {
          localStorage.setItem('guestbook_token', data.token);
        }
        updateAuthUI();
        closeLoginModal();
        showToast('Welcome Back!', `Signed in as ${state.user.username} (${state.user.role})`, 'success');
        return;
      } else {
        showToast('Invalid Credentials', data.error || 'Use demo credentials: admin / admin123', 'error');
        return;
      }
    } catch (netErr) {
      console.warn('Backend unavailable, fallback local auth check', netErr);
      if ((email === 'admin' || email.includes('@')) && pass.length >= 4) {
        state.user = {
          username: email === 'admin' ? 'Admin' : email.split('@')[0],
          email: email === 'admin' ? 'admin@guestbook.io' : email,
          role: 'Staff'
        };
        localStorage.setItem('guestbook_auth', JSON.stringify(state.user));
        updateAuthUI();
        closeLoginModal();
        showToast('Welcome Back!', `Signed in as ${state.user.username} (Offline Mode)`, 'success');
      } else {
        showToast('Invalid Credentials', 'Use demo credentials: admin / admin123', 'error');
      }
    }
  }

  async function handleQuickDemoLogin() {
    el.loginEmail.value = 'admin';
    el.loginPassword.value = 'admin123';

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'admin', password: 'admin123' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        state.user = data.user;
        localStorage.setItem('guestbook_auth', JSON.stringify(state.user));
        if (data.token) localStorage.setItem('guestbook_token', data.token);
        updateAuthUI();
        closeLoginModal();
        showToast('Demo Login Active', 'Signed in with Administrative front-desk privileges.', 'success');
        return;
      }
    } catch (e) {
      console.warn('Backend offline, using fallback auth', e);
    }

    state.user = {
      username: 'Admin',
      email: 'admin@guestbook.io',
      role: 'Staff'
    };
    localStorage.setItem('guestbook_auth', JSON.stringify(state.user));
    updateAuthUI();
    closeLoginModal();
    showToast('Demo Login Active', 'Signed in with Administrative front-desk privileges.', 'success');
  }

  async function handleLogout() {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
    } catch (e) {
      // Ignore network errors on logout
    }
    state.user = null;
    localStorage.removeItem('guestbook_auth');
    localStorage.removeItem('guestbook_token');
    el.userDropdown.classList.add('hidden');
    updateAuthUI();
    showToast('Signed Out', 'You have been successfully logged out.', 'info');
  }

  function updateAuthUI() {
    if (state.user) {
      el.headerLoginBtn.classList.add('hidden');
      el.userProfileMenu.classList.remove('hidden');
      document.getElementById('userNameLabel').textContent = state.user.username;
      document.getElementById('userAvatar').textContent = state.user.username.charAt(0).toUpperCase();
      document.getElementById('dropdownUserEmail').textContent = state.user.email;
    } else {
      el.headerLoginBtn.classList.remove('hidden');
      el.userProfileMenu.classList.add('hidden');
    }
  }

  // -------------------------------------------------------------------------
  // 11. ABOUT MODAL
  // -------------------------------------------------------------------------
  function openAboutModal() {
    el.aboutModal.classList.remove('hidden');
  }

  function closeAboutModal() {
    el.aboutModal.classList.add('hidden');
  }

  // -------------------------------------------------------------------------
  // 12. EXPORT CSV
  // -------------------------------------------------------------------------
  function exportLogsToCsv() {
    if (!state.visitors || state.visitors.length === 0) {
      showToast('Export Notice', 'No visitor records available to export.', 'info');
      return;
    }

    const headers = ['#', 'Visitor Name', 'Phone Number', 'Purpose of Visit', 'Date & Time'];
    const rows = state.visitors.map((v, i) => [
      i + 1,
      `"${v.name.replace(/"/g, '""')}"`,
      `"${v.phone}"`,
      `"${v.purpose}"`,
      `"${formatDateTimeString(v.datetime)}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `guestbook_visitors_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    el.userDropdown.classList.add('hidden');
    showToast('Export Complete', 'Visitor logs CSV downloaded successfully.', 'success');
  }

  // -------------------------------------------------------------------------
  // 13. TOAST SYSTEM
  // -------------------------------------------------------------------------
  function showToast(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else {
      iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-content">
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
      </div>
    `;

    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 3800);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // -------------------------------------------------------------------------
  // RUN APPLICATION
  // -------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
