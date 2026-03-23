/**
 * readers/md.js — Gnoke Reader
 * Markdown plugin.
 * Libraries: marked.js (parsing), highlight.js (code syntax)
 * Handles: .md, .markdown
 */

ReaderRegistry.register({
  extensions : ['md', 'markdown'],
  label      : 'Markdown',
  icon       : '📝',
  /* Load marked first; highlight.js is loaded lazily after */
  lib        : 'https://cdnjs.cloudflare.com/ajax/libs/marked/11.2.0/marked.min.js',

  render: async (file, container) => {
    const text = await file.text();

    /* Lazy-load highlight.js CSS + JS (only once) */
    await _loadHljs();

    /* Configure marked */
    marked.setOptions({
      breaks    : true,
      gfm       : true,
      highlight : (code, lang) => {
        if (window.hljs) {
          try {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
          } catch { return code; }
        }
        return code;
      },
    });

    const html = marked.parse(text);
    container.innerHTML = `<div class="reader-body">${html}</div>`;

    /* Run hljs on any code blocks that weren't auto-highlighted */
    if (window.hljs) {
      container.querySelectorAll('pre code').forEach(el => {
        if (!el.classList.contains('hljs')) hljs.highlightElement(el);
      });
    }

    /* Make all links open in new tab safely */
    container.querySelectorAll('a[href]').forEach(a => {
      if (a.href.startsWith('http')) {
        a.target = '_blank';
        a.rel    = 'noopener noreferrer';
      }
    });
  },
});

let _hljsLoaded = false;
async function _loadHljs() {
  if (_hljsLoaded || window.hljs) { _hljsLoaded = true; return; }

  /* CSS */
  if (!document.getElementById('hljs-css')) {
    const link   = document.createElement('link');
    link.id      = 'hljs-css';
    link.rel     = 'stylesheet';
    link.href    = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
    document.head.appendChild(link);
  }

  /* JS */
  await new Promise((res, rej) => {
    const s   = document.createElement('script');
    s.src     = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
    s.onload  = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });

  _hljsLoaded = true;
}
