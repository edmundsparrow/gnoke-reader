/**
 * reader-core.js — Gnoke Reader
 * Plugin registry and file dispatch engine.
 *
 * Every format plugin calls ReaderRegistry.register(plugin) with:
 *   {
 *     extensions : ['md', 'markdown'],   // lowercase, no dot
 *     label      : 'Markdown',
 *     icon       : '📝',
 *     lib        : 'https://cdn.../lib.min.js'  // or null
 *     render     : async (file, container) => void
 *   }
 *
 * ReaderCore.openFile(file) handles everything else.
 * Adding a new format = write one file, register it, add one <script> tag.
 */

/* ── Plugin Registry ── */
const ReaderRegistry = (() => {
  const _plugins = {};   /* ext → plugin */

  function register(plugin) {
    plugin.extensions.forEach(ext => {
      _plugins[ext.toLowerCase()] = plugin;
    });
  }

  function forExt(ext) {
    return _plugins[ext.toLowerCase()] || null;
  }

  function allFormats() {
    const seen = new Set();
    return Object.values(_plugins).filter(p => {
      if (seen.has(p.label)) return false;
      seen.add(p.label); return true;
    });
  }

  return { register, forExt, allFormats };
})();


/* ── Core engine ── */
const ReaderCore = (() => {

  const RECENT_KEY     = 'gnoke_reader_recent';
  const FONT_KEY       = 'gnoke_reader_fontsize';
  const MAX_RECENT     = 8;

  let _currentSearch   = '';
  let _searchHits      = [];
  let _searchIdx       = 0;
  let _fontSize        = 16;

  /* ── DOM shortcuts ── */
  const $  = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  /* ── Library loader (lazy, cached) ── */
  const _libCache = {};
  function _loadLib(url) {
    if (!url) return Promise.resolve();
    if (_libCache[url]) return _libCache[url];
    _libCache[url] = new Promise((res, rej) => {
      const s   = document.createElement('script');
      s.src     = url;
      s.onload  = res;
      s.onerror = () => rej(new Error(`Failed to load lib: ${url}`));
      document.head.appendChild(s);
    });
    return _libCache[url];
  }

  /* ── Recent files (metadata only — no file content stored) ── */
  function _loadRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
  }

  function _saveRecent(entry) {
    let list = _loadRecent().filter(r => r.name !== entry.name);
    list.unshift(entry);
    if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  }

  function _renderRecent() {
    const container = $('recent-list');
    if (!container) return;
    const list = _loadRecent();
    if (!list.length) {
      container.innerHTML = '<p style="color:var(--muted);font-size:.82rem;text-align:center;padding:1rem 0;">No recent files yet.</p>';
      return;
    }
    container.innerHTML = list.map(r => `
      <div class="recent-item" data-name="${_esc(r.name)}">
        <span class="recent-icon">${r.icon || '📄'}</span>
        <div>
          <div class="recent-name">${_esc(r.name)}</div>
          <div class="recent-meta">${r.size} · ${r.opened}</div>
        </div>
        <span class="recent-badge">${_esc(r.label)}</span>
      </div>`).join('');
    /* Recent items are display-only — user must re-open the file
       (browser security prevents re-reading without user gesture) */
    container.querySelectorAll('.recent-item').forEach(el => {
      el.title = 'Open the file again to re-read';
      el.style.cursor = 'default';
    });
  }

  /* ── Format tags on home page ── */
  function _renderFormatTags() {
    const wrap = $('format-tags');
    if (!wrap) return;
    wrap.innerHTML = ReaderRegistry.allFormats()
      .map(p => `<span class="format-tag">${p.icon} ${p.label}</span>`)
      .join('');
  }

  /* ── Font size ── */
  function _applyFontSize(size) {
    _fontSize = Math.max(12, Math.min(24, size));
    const body = $('reader-body');
    if (body) body.style.fontSize = _fontSize + 'px';
    localStorage.setItem(FONT_KEY, _fontSize);
    State.set('readerFontSize', _fontSize);
  }

  /* ── Search ── */
  function _clearSearch() {
    $$('mark.search-hit').forEach(m => {
      const parent = m.parentNode;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
    _searchHits  = [];
    _searchIdx   = 0;
    _updateSearchCount();
  }

  function _updateSearchCount() {
    const el = $('search-count');
    if (!el) return;
    el.textContent = _searchHits.length
      ? `${_searchIdx + 1} / ${_searchHits.length}`
      : _currentSearch ? '0 results' : '';
  }

  function _markText(node, query) {
    if (node.nodeType === 3) {
      const idx = node.textContent.toLowerCase().indexOf(query.toLowerCase());
      if (idx === -1) return;
      const mark  = document.createElement('mark');
      mark.className = 'search-hit';
      mark.textContent = node.textContent.substring(idx, idx + query.length);
      const after = node.splitText(idx);
      after.textContent = after.textContent.substring(query.length);
      node.parentNode.insertBefore(mark, after);
      _searchHits.push(mark);
    } else if (
      node.nodeType === 1 &&
      !['SCRIPT','STYLE','MARK'].includes(node.tagName)
    ) {
      Array.from(node.childNodes).forEach(c => _markText(c, query));
    }
  }

  function runSearch(query) {
    _clearSearch();
    _currentSearch = query.trim();
    if (!_currentSearch) return;
    const body = $('reader-body');
    if (!body) return;
    _markText(body, _currentSearch);
    _searchIdx = 0;
    if (_searchHits.length) {
      _searchHits[0].classList.add('current');
      _searchHits[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    _updateSearchCount();
    State.set('searchHits', _searchHits.length);
  }

  function searchNext() {
    if (!_searchHits.length) return;
    _searchHits[_searchIdx].classList.remove('current');
    _searchIdx = (_searchIdx + 1) % _searchHits.length;
    _searchHits[_searchIdx].classList.add('current');
    _searchHits[_searchIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    _updateSearchCount();
  }

  function searchPrev() {
    if (!_searchHits.length) return;
    _searchHits[_searchIdx].classList.remove('current');
    _searchIdx = (_searchIdx - 1 + _searchHits.length) % _searchHits.length;
    _searchHits[_searchIdx].classList.add('current');
    _searchHits[_searchIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    _updateSearchCount();
  }

  /* ── File open ── */
  async function openFile(file) {
    const ext    = file.name.split('.').pop().toLowerCase();
    const plugin = ReaderRegistry.forExt(ext);

    if (!plugin) {
      UI.toast(`Unsupported format: .${ext}`, 'err');
      return;
    }

    /* Switch to reader page immediately — show loading state */
    _showReaderPage(file, plugin);

    const body = $('reader-body');
    body.innerHTML = '<div class="reader-loading">⏳ Loading…</div>';

    try {
      /* Lazy-load the plugin's library if needed */
      await _loadLib(plugin.lib);

      /* Call the plugin's render function */
      await plugin.render(file, body);

    } catch (err) {
      console.error('[ReaderCore] render error:', err);
      body.innerHTML = `
        <div class="reader-error">
          <span class="err-icon">⚠️</span>
          <strong>Could not read this file.</strong><br>
          ${_esc(err.message)}
        </div>`;
    }

    /* Save to recent */
    _saveRecent({
      name   : file.name,
      label  : plugin.label,
      icon   : plugin.icon,
      size   : _fmtSize(file.size),
      opened : new Date().toLocaleDateString(),
    });

    State.set('openFile', { name: file.name, ext, plugin: plugin.label });
    _clearSearch();
  }

  function _showReaderPage(file, plugin) {
    /* Update toolbar */
    const fnEl = $('reader-filename');
    const bdEl = $('reader-format-badge');
    if (fnEl) fnEl.textContent = file.name;
    if (bdEl) bdEl.textContent = plugin.label;

    /* Update topbar context */
    const ctx = $('context-info');
    if (ctx) ctx.textContent = file.name;

    /* Switch page */
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const rp = $('reader-page');
    if (rp) rp.classList.add('active');
    State.set('activePage', 'reader-page');

    /* Reset search box */
    const si = $('search-input');
    if (si) si.value = '';
    const sc = $('search-count');
    if (sc) sc.textContent = '';

    /* Apply saved font size */
    const body = $('reader-body');
    if (body) body.style.fontSize = _fontSize + 'px';
  }

  function closeReader() {
    State.set('openFile', null);
    State.set('activePage', 'home-page');
    const ctx = $('context-info');
    if (ctx) ctx.textContent = '';
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const hp = $('home-page');
    if (hp) hp.classList.add('active');
    _clearSearch();
    _renderRecent();
  }

  /* ── Helpers ── */
  function _fmtSize(bytes) {
    if (bytes < 1024)        return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function _esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str || '');
    return d.innerHTML;
  }

  /* ── Init ── */
  function init() {
    _fontSize = parseInt(localStorage.getItem(FONT_KEY)) || 16;
    _renderFormatTags();
    _renderRecent();

    /* Font size controls */
    $('btn-font-up')?.addEventListener('click', () => _applyFontSize(_fontSize + 1));
    $('btn-font-down')?.addEventListener('click', () => _applyFontSize(_fontSize - 1));

    /* Search */
    $('search-input')?.addEventListener('input', e => {
      if (!e.target.value.trim()) { _clearSearch(); return; }
      runSearch(e.target.value);
    });
    $('search-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.shiftKey ? searchPrev() : searchNext(); }
      if (e.key === 'Escape') { e.target.value = ''; _clearSearch(); }
    });
    $('btn-search-next')?.addEventListener('click', searchNext);
    $('btn-search-prev')?.addEventListener('click', searchPrev);

    /* Close reader */
    $('btn-reader-close')?.addEventListener('click', closeReader);

    /* Drop zone */
    const dz = $('drop-zone');
    if (dz) {
      dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
      dz.addEventListener('drop', e => {
        e.preventDefault(); dz.classList.remove('drag-over');
        const f = e.dataTransfer.files[0];
        if (f) openFile(f);
      });
    }

    /* File input */
    $('file-input')?.addEventListener('change', e => {
      const f = e.target.files[0];
      if (f) openFile(f);
      e.target.value = '';   /* allow re-selecting same file */
    });

    /* Open button in topbar */
    $('btn-open-file')?.addEventListener('click', () => $('file-input')?.click());
  }

  return { init, openFile, closeReader, runSearch, searchNext, searchPrev };
})();
