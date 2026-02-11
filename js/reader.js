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
  const themeToggle    = document.getElementById('theme-toggle');

  // Full-page search overlay
  const searchOverlay      = document.getElementById('search-overlay');
  const searchOverlayInput = document.getElementById('search-overlay-input');
  const searchOverlayResults = document.getElementById('search-overlay-results');

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

  /* ── Sepia Theme ── */
  function setTheme(sepia) {
    document.body.classList.toggle('sepia', sepia);
    themeToggle.classList.toggle('active', sepia);
    themeToggle.setAttribute('aria-checked', sepia);
    try { localStorage.setItem('hwgw-theme', sepia ? 'sepia' : 'default'); } catch (e) {}
  }

  themeToggle.addEventListener('click', function () {
    setTheme(!document.body.classList.contains('sepia'));
  });

  /* ── Context Menu ── */
  function openMenu()  { contextMenu.style.display = ''; searchInput.value = ''; searchResults.innerHTML = ''; }
  function closeMenu()  { contextMenu.style.display = 'none'; }

  /* ── Commentary Index ── */
  var commentaryIndex = {};  // { pageNum: "plain text of commentary" }
  var commentaryIndexReady = false;
  var commentaryIndexLoading = false;

  function buildCommentaryIndex() {
    if (commentaryIndexReady || commentaryIndexLoading) return;
    commentaryIndexLoading = true;

    var pages = window.pagesData || [];
    var batch = [];
    pages.forEach(function (p) {
      batch.push(
        fetch(textPath(p.page))
          .then(function (r) { return r.ok ? r.text() : null; })
          .then(function (html) {
            if (!html) return;
            var tmp = document.createElement('div');
            tmp.innerHTML = html;
            var commentaryEl = tmp.querySelector('.commentary');
            if (commentaryEl) {
              commentaryIndex[p.page] = commentaryEl.textContent.replace(/\s+/g, ' ').trim();
            }
          })
          .catch(function () {})
      );
    });

    Promise.all(batch).then(function () {
      commentaryIndexReady = true;
      commentaryIndexLoading = false;
      // Re-run active search
      if (searchOverlay.style.display !== 'none' && searchOverlayInput.value.trim().length >= 2) {
        runSearch(searchOverlayInput, searchOverlayResults);
      }
      if (searchInput.value.trim().length >= 2) {
        runSearch(searchInput, searchResults);
      }
    });
  }

  /* ── Search (shared logic) ── */
  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getSnippet(text, query) {
    var lower = text.toLowerCase();
    var idx = lower.indexOf(query);
    if (idx === -1) return '';
    var start = Math.max(0, idx - 30);
    var end = Math.min(text.length, idx + query.length + 50);
    var snippet = (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
    var escaped = escapeHtml(snippet);
    var re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return escaped.replace(re, '<mark>$1</mark>');
  }

  function collectResults(q) {
    var seen = {};
    var results = [];

    window.pagesData.forEach(function (p) {
      var titleMatch = p.title.toLowerCase().indexOf(q) !== -1;
      var searchTextMatch = p.searchText && p.searchText.toLowerCase().indexOf(q) !== -1;
      if (titleMatch || searchTextMatch) {
        seen[p.page] = true;
        results.push({
          page: p.page,
          title: p.title,
          type: 'page',
          snippet: searchTextMatch ? getSnippet(p.searchText, q) : ''
        });
      }
    });

    Object.keys(commentaryIndex).forEach(function (pageNum) {
      var text = commentaryIndex[pageNum];
      if (text.toLowerCase().indexOf(q) !== -1) {
        var pg = parseInt(pageNum, 10);
        if (!seen[pg]) {
          var pageData = window.pagesData.find(function (p) { return p.page === pg; });
          results.push({
            page: pg,
            title: pageData ? pageData.title : 'Page ' + pg,
            type: 'commentary',
            snippet: getSnippet(text, q)
          });
        } else {
          var existing = results.find(function (r) { return r.page === pg; });
          if (existing && !existing.snippet) {
            existing.snippet = getSnippet(text, q);
            existing.type = 'both';
          }
        }
      }
    });

    results.sort(function (a, b) { return a.page - b.page; });
    return results;
  }

  function renderResults(results, container, onSelect, limit) {
    container.innerHTML = '';
    var items = results.slice(0, limit || 20);

    items.forEach(function (h, i) {
      var li = document.createElement('li');
      if (i === 0) li.classList.add('active');
      var badge = h.type === 'commentary' ? '<span class="sr-badge">commentary</span>' : '';
      var snippetHtml = h.snippet ? '<span class="sr-snippet">' + h.snippet + '</span>' : '';
      li.innerHTML = '<span class="sr-page">p.' + h.page + '</span> <span class="sr-title">' + escapeHtml(h.title) + '</span>' + badge + snippetHtml;
      li.addEventListener('click', function () { onSelect(h); });
      container.appendChild(li);
    });

    if (!commentaryIndexReady) {
      var hint = document.createElement('li');
      hint.className = 'search-loading';
      hint.textContent = 'Loading commentary index...';
      container.appendChild(hint);
    }
  }

  function runSearch(inputEl, containerEl) {
    var q = inputEl.value.trim().toLowerCase();
    containerEl.innerHTML = '';
    if (!q || q.length < 2 || !window.pagesData) return;

    if (!commentaryIndexReady && !commentaryIndexLoading) {
      buildCommentaryIndex();
    }

    var results = collectResults(q);
    var isOverlay = containerEl === searchOverlayResults;
    var limit = isOverlay ? 30 : 15;

    renderResults(results, containerEl, function (h) {
      goToPage(h.page);
      if (h.type === 'commentary') setView('text');
      if (isOverlay) closeSearchOverlay();
      else closeMenu();
    }, limit);
  }

  // Context-menu search (wired to existing input)
  searchInput.addEventListener('input', function () {
    runSearch(searchInput, searchResults);
  });

  /* ── Full-page Search Overlay ── */
  var overlayActiveIndex = 0;

  function openSearchOverlay() {
    searchOverlay.style.display = '';
    searchOverlayInput.value = '';
    searchOverlayResults.innerHTML = '';
    overlayActiveIndex = 0;
    // Focus after animation frame so it's visible
    requestAnimationFrame(function () { searchOverlayInput.focus(); });
    // Start building index eagerly
    if (!commentaryIndexReady && !commentaryIndexLoading) buildCommentaryIndex();
  }

  function closeSearchOverlay() {
    searchOverlay.style.display = 'none';
    searchOverlayInput.blur();
  }

  function setActiveResult(idx) {
    var items = searchOverlayResults.querySelectorAll('li:not(.search-loading)');
    if (!items.length) return;
    idx = Math.max(0, Math.min(items.length - 1, idx));
    items.forEach(function (li, i) { li.classList.toggle('active', i === idx); });
    overlayActiveIndex = idx;
    // Scroll into view
    items[idx].scrollIntoView({ block: 'nearest' });
  }

  searchOverlayInput.addEventListener('input', function () {
    overlayActiveIndex = 0;
    runSearch(searchOverlayInput, searchOverlayResults);
  });

  searchOverlayInput.addEventListener('keydown', function (e) {
    var items = searchOverlayResults.querySelectorAll('li:not(.search-loading)');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveResult(overlayActiveIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveResult(overlayActiveIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items.length) items[overlayActiveIndex].click();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeSearchOverlay();
    }
  });

  // Close on backdrop click
  searchOverlay.addEventListener('click', function (e) {
    if (e.target === searchOverlay) closeSearchOverlay();
  });

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

  // Zoom buttons
  zoomPanel.querySelectorAll('.zoom-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { setZoom(parseInt(btn.dataset.zoom, 10)); });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', function (e) {
    // Ctrl/Cmd+K opens search from anywhere
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (searchOverlay.style.display === 'none') openSearchOverlay();
      else closeSearchOverlay();
      return;
    }

    // Ignore when typing in inputs (except overlay-specific keys handled above)
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case '/':
        e.preventDefault();
        openSearchOverlay();
        break;
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

    // Restore theme
    try {
      var savedTheme = localStorage.getItem('hwgw-theme');
      if (savedTheme === 'sepia') setTheme(true);
    } catch (e) {}

    goToPage(startPage || 1);
  })();
})();
