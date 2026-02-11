;(function () {
  'use strict';

  const TOTAL_PAGES = 384;

  /* ── State ── */
  let currentPage = 1;
  let viewMode = 'image';   // 'image' | 'text'
  let zoomLevel = 100;

  /* ── DOM refs ── */
  const pageCounter    = document.getElementById('page-counter');
  const pageImage      = document.getElementById('page-image');
  const imageView      = document.getElementById('image-view');
  const textView       = document.getElementById('text-view');
  const textContent    = document.getElementById('text-content');
  const pageDisplay    = document.getElementById('page-display');
  const btnPrev        = document.getElementById('btn-prev');
  const btnNext        = document.getElementById('btn-next');
  const pageInput      = document.getElementById('page-input');
  const progressBar    = document.getElementById('progress-bar');
  const zoomPanel      = document.getElementById('zoom-panel');
  const openNewTab     = document.getElementById('open-new-tab');
  const contextFab     = document.getElementById('context-fab');
  const contextMenu    = document.getElementById('context-menu');
  const ctxPrev        = document.getElementById('ctx-prev');
  const ctxNext        = document.getElementById('ctx-next');
  const ctxPageLabel   = document.getElementById('ctx-page-label');
  const ctxToggleView  = document.getElementById('ctx-toggle-view');
  const ctxClose       = document.getElementById('ctx-close');
  const searchInput    = document.getElementById('search-input');
  const searchResults  = document.getElementById('search-results');

  /* ── Helpers ── */
  function pad(n) { return String(n).padStart(4, '0'); }
  function imagePath(n) { return 'pages/page_' + pad(n) + '.jpg'; }
  function textPath(n)  { return 'text/page_'  + pad(n) + '.html'; }

  /* ── Navigation ── */
  function goToPage(n) {
    n = Math.max(1, Math.min(TOTAL_PAGES, parseInt(n, 10) || 1));
    currentPage = n;

    // Update counter & input
    pageCounter.textContent = 'Page ' + n + ' of ' + TOTAL_PAGES;
    pageInput.value = n;
    ctxPageLabel.textContent = 'Page ' + n;

    // Progress
    progressBar.style.width = ((n / TOTAL_PAGES) * 100) + '%';

    // Image view
    pageImage.src = imagePath(n);
    openNewTab.href = imagePath(n);

    // Text view (lazy fetch)
    if (viewMode === 'text') { loadText(n); }

    // Persist
    try { localStorage.setItem('hwgw-page', n); } catch (e) {}
  }

  function loadText(n) {
    textContent.innerHTML = '<p style="color:#9aa0a6;">Loading…</p>';
    fetch(textPath(n))
      .then(function (r) { return r.ok ? r.text() : '<p>No text available for this page.</p>'; })
      .then(function (html) { textContent.innerHTML = html; })
      .catch(function ()    { textContent.innerHTML = '<p>Could not load text.</p>'; });
  }

  /* ── View Toggle ── */
  function setView(mode) {
    viewMode = mode;
    if (mode === 'image') {
      imageView.style.display = '';
      textView.style.display  = 'none';
      ctxToggleView.textContent = 'Switch to Text View';
    } else {
      imageView.style.display = 'none';
      textView.style.display  = '';
      ctxToggleView.textContent = 'Switch to Image View';
      loadText(currentPage);
    }
    try { localStorage.setItem('hwgw-view', mode); } catch (e) {}
  }

  /* ── Zoom ── */
  function setZoom(level) {
    zoomLevel = level;
    pageDisplay.style.transform = level === 100 ? '' : 'scale(' + (level / 100) + ')';
    // Update active button
    zoomPanel.querySelectorAll('.zoom-btn').forEach(function (btn) {
      btn.classList.toggle('active', parseInt(btn.dataset.zoom, 10) === level);
    });
    try { localStorage.setItem('hwgw-zoom', level); } catch (e) {}
  }

  /* ── Context Menu ── */
  function openMenu()  { contextMenu.style.display = ''; searchInput.value = ''; searchResults.innerHTML = ''; }
  function closeMenu()  { contextMenu.style.display = 'none'; }

  /* ── Search ── */
  function handleSearch() {
    var q = searchInput.value.trim().toLowerCase();
    searchResults.innerHTML = '';
    if (!q || q.length < 2 || !window.pagesData) return;
    var hits = window.pagesData.filter(function (p) {
      return p.title.toLowerCase().indexOf(q) !== -1 ||
             (p.searchText && p.searchText.toLowerCase().indexOf(q) !== -1);
    }).slice(0, 15);
    hits.forEach(function (h) {
      var li = document.createElement('li');
      li.innerHTML = '<span class="sr-page">p.' + h.page + '</span> <span class="sr-title">' + h.title + '</span>';
      li.addEventListener('click', function () { goToPage(h.page); closeMenu(); });
      searchResults.appendChild(li);
    });
  }

  /* ── Event Listeners ── */
  btnPrev.addEventListener('click', function () { goToPage(currentPage - 1); });
  btnNext.addEventListener('click', function () { goToPage(currentPage + 1); });
  pageInput.addEventListener('change', function () { goToPage(pageInput.value); });

  ctxPrev.addEventListener('click', function () { goToPage(currentPage - 1); });
  ctxNext.addEventListener('click', function () { goToPage(currentPage + 1); });
  ctxToggleView.addEventListener('click', function () { setView(viewMode === 'image' ? 'text' : 'image'); });
  ctxClose.addEventListener('click', closeMenu);

  contextFab.addEventListener('click', openMenu);
  contextMenu.addEventListener('click', function (e) { if (e.target === contextMenu) closeMenu(); });

  searchInput.addEventListener('input', handleSearch);

  // Zoom buttons
  zoomPanel.querySelectorAll('.zoom-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { setZoom(parseInt(btn.dataset.zoom, 10)); });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', function (e) {
    // Ignore when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case 'ArrowLeft':  goToPage(currentPage - 1); break;
      case 'ArrowRight': goToPage(currentPage + 1); break;
      case 'v': case 'V': setView(viewMode === 'image' ? 'text' : 'image'); break;
      case 'm': case 'M': openMenu(); break;
      case 'Escape': closeMenu(); break;
    }
  });

  /* ── Init ── */
  (function init() {
    // Restore from URL param or localStorage
    var params = new URLSearchParams(window.location.search);
    var startPage = parseInt(params.get('page'), 10);
    if (!startPage) { try { startPage = parseInt(localStorage.getItem('hwgw-page'), 10); } catch (e) {} }

    // Restore view mode
    try {
      var savedView = localStorage.getItem('hwgw-view');
      if (savedView === 'text') setView('text');
    } catch (e) {}

    // Restore zoom
    try {
      var savedZoom = parseInt(localStorage.getItem('hwgw-zoom'), 10);
      if (savedZoom >= 70 && savedZoom <= 140) setZoom(savedZoom);
    } catch (e) {}

    goToPage(startPage || 1);
  })();
})();
