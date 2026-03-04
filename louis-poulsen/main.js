/**
 * Louis Poulsen 燈具選型 — Main Application
 * Pure vanilla JS, no frameworks, no persistent storage
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════
  let allLamps = [];
  let filteredLamps = [];

  // DOM refs
  const filterType = document.getElementById('filterType');
  const filterDesigner = document.getElementById('filterDesigner');
  const filterSearch = document.getElementById('filterSearch');
  const btnReset = document.getElementById('btnReset');
  const btnResetEmpty = document.getElementById('btnResetEmpty');
  const resultCount = document.getElementById('resultCount');
  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const emptyState = document.getElementById('emptyState');
  const productGrid = document.getElementById('productGrid');
  const detailModal = document.getElementById('detailModal');
  const modalClose = document.getElementById('modalClose');
  const modalImageWrap = document.getElementById('modalImageWrap');
  const modalDetails = document.getElementById('modalDetails');
  const filterBar = document.getElementById('filterBar');

  // ═══════════════════════════════════════
  // LAMP PLACEHOLDER SVG
  // ═══════════════════════════════════════
  const placeholderSVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1">
    <path d="M12 28 C12 20, 21 13, 32 13 C43 13, 52 20, 52 28" stroke-linecap="round" opacity="0.35"/>
    <path d="M17 32 C17 26, 23 20, 32 20 C41 20, 47 26, 47 32" stroke-linecap="round" opacity="0.25"/>
    <path d="M22 35 C22 31, 26 27, 32 27 C38 27, 42 31, 42 35" stroke-linecap="round" opacity="0.18"/>
    <line x1="32" y1="6" x2="32" y2="13" opacity="0.3"/>
    <circle cx="32" cy="32" r="2" fill="currentColor" opacity="0.1" stroke="none"/>
  </svg>`;

  const largePlaceholderSVG = `<svg width="96" height="96" viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="1.2">
    <path d="M16 42 C16 30, 30 19, 48 19 C66 19, 80 30, 80 42" stroke-linecap="round" opacity="0.35"/>
    <path d="M23 48 C23 38, 33 29, 48 29 C63 29, 73 38, 73 48" stroke-linecap="round" opacity="0.25"/>
    <path d="M31 52 C31 46, 38 40, 48 40 C58 40, 65 46, 65 52" stroke-linecap="round" opacity="0.18"/>
    <line x1="48" y1="8" x2="48" y2="19" opacity="0.3"/>
    <circle cx="48" cy="46" r="3" fill="currentColor" opacity="0.1" stroke="none"/>
  </svg>`;

  // ═══════════════════════════════════════
  // DARK/LIGHT MODE TOGGLE
  // ═══════════════════════════════════════
  (function initTheme() {
    const toggle = document.querySelector('[data-theme-toggle]');
    const root = document.documentElement;
    let theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.setAttribute('data-theme', theme);
    updateToggleIcon(toggle, theme);

    if (toggle) {
      toggle.addEventListener('click', () => {
        theme = theme === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', theme);
        toggle.setAttribute('aria-label', theme === 'dark' ? '切換淺色模式' : '切換深色模式');
        updateToggleIcon(toggle, theme);
      });
    }
  })();

  function updateToggleIcon(toggle, theme) {
    if (!toggle) return;
    toggle.innerHTML = theme === 'dark'
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  // ═══════════════════════════════════════
  // STICKY FILTER BAR SHADOW
  // ═══════════════════════════════════════
  (function initScrollDetect() {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          filterBar.classList.toggle('scrolled', window.scrollY > 100);
          ticking = false;
        });
        ticking = true;
      }
    });
  })();

  // ═══════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════

  /**
   * Load lamp data from local JSON file.
   * Fallback: CSV via Papa Parse (commented out).
   */
  async function loadLampData() {
    showLoading();
    try {
      const response = await fetch('./data/louis_poulsen_lamps.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      allLamps = await response.json();
      onDataLoaded();
    } catch (err) {
      console.error('Failed to load lamp data:', err);
      showError();
    }
  }

  /*
  // CSV fallback using Papa Parse CDN
  // <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>
  async function loadLampDataCSV() {
    showLoading();
    try {
      const response = await fetch('./data/louis_poulsen_lamps.csv');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const csvText = await response.text();
      const result = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      allLamps = result.data;
      onDataLoaded();
    } catch (err) {
      console.error('Failed to load CSV data:', err);
      showError();
    }
  }
  */

  function onDataLoaded() {
    hideLoading();
    populateFilters();
    applyFilters();
  }

  // ═══════════════════════════════════════
  // SKELETON LOADING
  // ═══════════════════════════════════════
  function showLoading() {
    errorState.style.display = 'none';
    emptyState.style.display = 'none';
    productGrid.style.display = 'none';
    loadingState.style.display = '';
    loadingState.innerHTML = '';

    for (let i = 0; i < 8; i++) {
      const card = document.createElement('div');
      card.className = 'skeleton-card';
      card.innerHTML = `
        <div class="skeleton-card-image skeleton"></div>
        <div class="skeleton-card-body">
          <div class="skeleton-line w60 skeleton"></div>
          <div class="skeleton-line w40 skeleton"></div>
          <div class="skeleton-line w30 skeleton"></div>
        </div>`;
      loadingState.appendChild(card);
    }

    resultCount.textContent = '資料載入中...';
  }

  function hideLoading() {
    loadingState.style.display = 'none';
  }

  function showError() {
    loadingState.style.display = 'none';
    productGrid.style.display = 'none';
    emptyState.style.display = 'none';
    errorState.style.display = '';
    resultCount.textContent = '';
  }

  // ═══════════════════════════════════════
  // FILTERS
  // ═══════════════════════════════════════
  function populateFilters() {
    // Types
    const types = [...new Set(allLamps.map(l => l['Type']))].sort();
    types.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      filterType.appendChild(opt);
    });

    // Designers
    const designers = [...new Set(allLamps.map(l => l['Designer']))].sort();
    designers.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      filterDesigner.appendChild(opt);
    });
  }

  function applyFilters() {
    const typeVal = filterType.value;
    const designerVal = filterDesigner.value;
    const searchVal = filterSearch.value.trim().toLowerCase();

    filteredLamps = allLamps.filter(lamp => {
      if (typeVal && lamp['Type'] !== typeVal) return false;
      if (designerVal && lamp['Designer'] !== designerVal) return false;
      if (searchVal) {
        const name = lamp['Product Name'].toLowerCase();
        // Fuzzy: all search characters appear in order
        if (!fuzzyMatch(name, searchVal)) return false;
      }
      return true;
    });

    renderGrid();
    updateResultCount();
  }

  function fuzzyMatch(str, query) {
    // Simple fuzzy: check if all query words are found in the string
    const words = query.split(/\s+/);
    return words.every(word => str.includes(word));
  }

  function resetFilters() {
    filterType.value = '';
    filterDesigner.value = '';
    filterSearch.value = '';
    applyFilters();
  }

  function updateResultCount() {
    const total = allLamps.length;
    const shown = filteredLamps.length;
    resultCount.textContent = `顯示 ${shown} / ${total} 款燈具`;
  }

  // Event listeners
  filterType.addEventListener('change', applyFilters);
  filterDesigner.addEventListener('change', applyFilters);
  filterSearch.addEventListener('input', debounce(applyFilters, 200));
  btnReset.addEventListener('click', resetFilters);
  btnResetEmpty.addEventListener('click', resetFilters);

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ═══════════════════════════════════════
  // GRID RENDERING
  // ═══════════════════════════════════════
  function renderGrid() {
    productGrid.innerHTML = '';

    if (filteredLamps.length === 0) {
      productGrid.style.display = 'none';
      emptyState.style.display = '';
      return;
    }

    emptyState.style.display = 'none';
    productGrid.style.display = '';

    filteredLamps.forEach((lamp, index) => {
      const card = document.createElement('article');
      card.className = 'product-card card-enter';
      card.style.animationDelay = `${Math.min(index * 30, 400)}ms`;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `${lamp['Product Name']} by ${lamp['Designer']}`);

      const imgUrl = lamp['Official Image URL'];
      const hasImage = imgUrl && imgUrl.startsWith('http');

      card.innerHTML = `
        <div class="card-image-wrap">
          ${hasImage ? `<img class="card-image" src="${escapeAttr(imgUrl)}" alt="${escapeAttr(lamp['Product Name'])}" loading="lazy" width="400" height="400"
            onerror="this.style.display='none';this.nextElementSibling.style.display='';">` : ''}
          <div class="card-placeholder" ${hasImage ? 'style="display:none;"' : ''}>
            ${placeholderSVG}
            <span>圖片暫無法載入</span>
          </div>
        </div>
        <div class="card-body">
          <div class="card-name">${escapeHTML(lamp['Product Name'])}</div>
          <div class="card-designer">${escapeHTML(lamp['Designer'])}</div>
          <span class="card-badge${lamp['Limited Edition'] === 'Yes' ? ' badge-limited' : ''}">${escapeHTML(lamp['Type'])}</span>
        </div>`;

      card.addEventListener('click', () => openModal(lamp));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(lamp);
        }
      });

      productGrid.appendChild(card);
    });
  }

  // ═══════════════════════════════════════
  // BUY LINK FILTERING
  // ═══════════════════════════════════════
  const buyChannels = [
    { key: 'Louis Poulsen Official', label: 'Louis Poulsen' },
    { key: 'LampTwist', label: 'LampTwist' },
    { key: 'MOHD', label: 'MOHD' },
    { key: 'Finnish Design Shop', label: 'Finnish Design Shop' },
    { key: 'Diffusione Luce', label: 'Diffusione Luce' }
  ];

  function isGenericBrandPage(url) {
    if (!url || typeof url !== 'string') return true;
    const u = url.toLowerCase();
    if (u.includes('/manufacturer/')) return true;
    if (u.includes('/brands/')) return true;
    // Finnish Design Shop manufacturer page
    if (u.match(/\/manufacturer\/[^/]+\/?$/)) return true;
    // Generic diffusione shop brand page
    if (u.match(/diffusioneshop\.com\/it\/manufacturer\//)) return true;
    return false;
  }

  function getValidBuyLinks(lamp) {
    const links = [];
    buyChannels.forEach(ch => {
      const url = lamp[ch.key];
      if (url && url.startsWith('http') && !isGenericBrandPage(url)) {
        links.push({ label: ch.label, url });
      }
    });
    return links;
  }

  // ═══════════════════════════════════════
  // DETAIL MODAL
  // ═══════════════════════════════════════
  function openModal(lamp) {
    // Image
    const imgUrl = lamp['Official Image URL'];
    const hasImage = imgUrl && imgUrl.startsWith('http');

    modalImageWrap.innerHTML = `
      ${hasImage ? `<img class="modal-image" src="${escapeAttr(imgUrl)}" alt="${escapeAttr(lamp['Product Name'])}"
        onerror="this.style.display='none';this.nextElementSibling.style.display='';">` : ''}
      <div class="modal-image-placeholder" ${hasImage ? 'style="display:none;"' : ''}>
        ${largePlaceholderSVG}
        <span>圖片暫無法載入</span>
      </div>`;

    // Details
    const buyLinks = getValidBuyLinks(lamp);
    const buyLinksHTML = buyLinks.length > 0
      ? buyLinks.map((link, i) =>
          `<a class="btn-buy${i > 0 ? ' btn-buy-secondary' : ''}" href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer">
            ${escapeHTML(link.label)}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
          </a>`
        ).join('')
      : '<span class="no-buy-links">暫無可用的購買連結</span>';

    modalDetails.innerHTML = `
      <h2 class="modal-product-name">${escapeHTML(lamp['Product Name'])}</h2>
      <p class="modal-designer">${escapeHTML(lamp['Designer'])}</p>
      <dl class="modal-meta">
        <dt>類型</dt>
        <dd>${escapeHTML(lamp['Type'])}</dd>
        <dt>設計年份</dt>
        <dd>${escapeHTML(lamp['Year Designed'])}</dd>
        <dt>限量版</dt>
        <dd>${lamp['Limited Edition'] === 'Yes' ? '是' : '否'}</dd>
        <dt>可選顏色</dt>
        <dd>${escapeHTML(lamp['Available Colors'])}</dd>
        <dt>尺寸</dt>
        <dd>${escapeHTML(lamp['Dimensions (Diameter x Height)'])}</dd>
      </dl>
      <h3 class="modal-section-title">購買連結 / Buy Links</h3>
      <div class="buy-links">${buyLinksHTML}</div>`;

    // Show modal
    detailModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    modalClose.focus();
  }

  function closeModal() {
    detailModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Close handlers
  modalClose.addEventListener('click', closeModal);
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && detailModal.classList.contains('active')) {
      closeModal();
    }
  });

  // ═══════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════
  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ═══════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════
  loadLampData();

})();
