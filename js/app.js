/**
 * app.js — Gnoke Reader
 * Bootstrap. Runs after ALL other scripts loaded.
 * Owns: DOMContentLoaded init, page routing, drawer.
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. Init shared modules ── */
  Theme.init();
  UI.init();

  /* ── 2. Init reader core (registry + drop zone + events) ── */
  ReaderCore.init();

  /* ── 3. Initial page ── */
  _loadPage('home-page');


  /* ══════════════════════════════════════════════════════
     PAGE ROUTING
  ══════════════════════════════════════════════════════ */

  function _loadPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(id);
    if (page) page.classList.add('active');
    State.set('activePage', id);
    if (id !== 'reader-page') {
      const ctx = document.getElementById('context-info');
      if (ctx) ctx.textContent = '';
    }
  }

  window.loadPage = _loadPage;


  /* ══════════════════════════════════════════════════════
     MOBILE DRAWER
  ══════════════════════════════════════════════════════ */

  const Drawer = (() => {
    const panel   = () => document.getElementById('drawer');
    const overlay = () => document.getElementById('drawer-overlay');
    const open    = () => { panel()?.classList.add('open');    overlay()?.classList.add('open'); };
    const close   = () => { panel()?.classList.remove('open'); overlay()?.classList.remove('open'); };
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    document.getElementById('hamburger')?.addEventListener('click', open);
    document.getElementById('drawer-close')?.addEventListener('click', close);
    document.getElementById('drawer-overlay')?.addEventListener('click', close);
    return { open, close };
  })();

  window.Drawer = Drawer;


  /* ══════════════════════════════════════════════════════
     ABOUT PAGE — tech table
  ══════════════════════════════════════════════════════ */

  const aboutTbody = document.getElementById('about-tech-table');
  if (aboutTbody) {
    const rows = [
      ['Markdown',        'marked.js v11 + highlight.js v11'],
      ['PDF',             'Mozilla pdf.js v3'],
      ['DOCX',            'mammoth.js v1.6'],
      ['CSV / TSV',       'PapaParse v5'],
      ['JSON',            'Built-in (zero deps)'],
      ['TXT / ME',        'Built-in (zero deps)'],
      ['LOG',             'Built-in — level colour coding'],
      ['INI / CFG / TOML','Built-in — section + key/value colouring'],
      ['.env',            'Built-in — sensitive value masking'],
      ['DIFF / PATCH',    'Built-in — added/removed line colouring'],
      ['SQL',             'Built-in — keyword syntax highlighting'],
      ['Persistence',     'localStorage (theme, font size, recent)'],
      ['Stack',           'HTML · CSS · Vanilla JS'],
      ['Version',         'v1.1'],
    ];
    aboutTbody.innerHTML = rows.map(([k, v]) => `
      <tr><td>${k}</td><td>${v}</td></tr>`).join('');
  }

});
