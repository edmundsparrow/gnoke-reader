/**
 * readers/docx.js — Gnoke Reader
 * DOCX → clean HTML renderer using mammoth.js.
 * Handles: .docx
 */

ReaderRegistry.register({
  extensions : ['docx'],
  label      : 'Word Document',
  icon       : '📘',
  lib        : 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',

  render: async (file, container) => {
    const arrayBuffer = await file.arrayBuffer();

    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "b => strong",
          "i => em",
          "u => u",
          "table => table",
        ],
      }
    );

    const wrap = document.createElement('div');
    wrap.className = 'reader-body';
    wrap.innerHTML = result.value;

    /* Open all links safely */
    wrap.querySelectorAll('a[href]').forEach(a => {
      a.target = '_blank';
      a.rel    = 'noopener noreferrer';
    });

    /* Show mammoth conversion warnings if any */
    if (result.messages && result.messages.length) {
      const warn = document.createElement('div');
      warn.style.cssText = 'margin-top:1.5rem;padding:.8rem 1rem;background:var(--surface2);border:1px solid var(--border);border-radius:8px;font-size:.78rem;color:var(--muted);';
      warn.innerHTML = `<strong style="color:var(--text)">⚠ Conversion notes:</strong><ul style="margin:.4rem 0 0 1.2rem">${
        result.messages.map(m => `<li>${_escD(m.message)}</li>`).join('')
      }</ul>`;
      wrap.appendChild(warn);
    }

    container.innerHTML = '';
    container.appendChild(wrap);
  },
});

function _escD(str) {
  const d = document.createElement('div');
  d.textContent = String(str || '');
  return d.innerHTML;
}
