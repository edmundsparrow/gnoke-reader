/**
 * readers/env.js — Gnoke Reader
 * Environment file viewer. Zero dependencies.
 * Handles: .env, .env.local, .env.production, .env.development, .env.example
 *
 * Features:
 *   - KEY=VALUE colouring
 *   - Sensitive keys (PASSWORD, SECRET, TOKEN, KEY, API, AUTH, PRIVATE)
 *     have their values masked by default with a tap-to-reveal toggle
 *   - Comments dimmed
 *   - Empty / export lines handled
 */

ReaderRegistry.register({
  extensions : ['env'],
  label      : '.env',
  icon       : '🔐',
  lib        : null,

  render: async (file, container) => {
    const text  = await file.text();
    const lines = text.split('\n');

    /* Count sensitive values for the notice banner */
    let sensitiveCount = 0;

    const wrap = document.createElement('div');

    /* Build line HTML */
    const pre = document.createElement('pre');
    pre.className = 'txt-body';
    pre.style.cssText = 'background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:1.2em 1.4em;';

    const lineHtmls = lines.map((raw, idx) => {
      const trimmed = raw.trim();

      if (!trimmed) return `<span style="display:block;">\n</span>`;

      /* Comment */
      if (trimmed.startsWith('#')) {
        return `<span style="display:block;color:var(--muted);font-style:italic;">${_escE(raw)}</span>`;
      }

      /* export KEY=VALUE */
      const exportMatch = trimmed.match(/^export\s+(.+)$/);
      const line = exportMatch ? exportMatch[1] : raw;

      /* KEY=VALUE */
      const kvMatch = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (kvMatch) {
        const [, key, val] = kvMatch;
        const isSensitive  = /PASSWORD|SECRET|TOKEN|API[_\s]?KEY|AUTH|PRIVATE|CREDENTIAL|PWD|PASS\b/i.test(key);

        if (isSensitive && val.trim()) {
          sensitiveCount++;
          const maskedId = `env-val-${idx}`;
          return `<span style="display:block;">` +
            (exportMatch ? `<span style="color:var(--muted);">export </span>` : '') +
            `<span style="color:var(--accent);font-weight:600;">${_escE(key)}</span>` +
            `<span style="color:var(--muted);">=</span>` +
            `<span id="${maskedId}" data-real="${_escAttr(val)}" data-masked="1" ` +
                  `style="color:var(--muted);cursor:pointer;user-select:none;" ` +
                  `title="Tap to reveal" onclick="toggleEnvVal('${maskedId}')">` +
              `${'•'.repeat(Math.min(val.length, 16))} 👁</span>` +
            `</span>`;
        }

        return `<span style="display:block;">` +
          (exportMatch ? `<span style="color:var(--muted);">export </span>` : '') +
          `<span style="color:var(--accent);font-weight:600;">${_escE(key)}</span>` +
          `<span style="color:var(--muted);">=</span>` +
          `<span style="color:var(--green);">${_escE(val)}</span>` +
          `</span>`;
      }

      return `<span style="display:block;">${_escE(raw)}</span>`;
    });

    pre.innerHTML = lineHtmls.join('');

    /* Notice banner if sensitive values exist */
    if (sensitiveCount > 0) {
      const notice = document.createElement('div');
      notice.style.cssText = 'margin-bottom:12px;padding:10px 14px;background:var(--accent-lt);border:1.5px solid var(--border2);border-radius:var(--radius);font-size:.78rem;color:var(--text2);display:flex;align-items:center;gap:8px;';
      notice.innerHTML = `<span>🔐</span><span><strong>${sensitiveCount} sensitive value${sensitiveCount > 1 ? 's' : ''} masked.</strong> Tap the value to reveal.</span>`;
      wrap.appendChild(notice);
    }

    wrap.appendChild(pre);
    container.innerHTML = '';
    container.appendChild(wrap);

    /* Expose toggle globally (scoped to this render) */
    window.toggleEnvVal = id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.dataset.masked === '1') {
        el.textContent = el.dataset.real;
        el.style.color = 'var(--green)';
        el.dataset.masked = '0';
        el.title = 'Tap to mask';
      } else {
        const real = el.textContent;
        el.innerHTML = '${'•'.repeat(Math.min(real.length, 16))} 👁';
        el.style.color = 'var(--muted)';
        el.dataset.masked = '1';
        el.title = 'Tap to reveal';
      }
    };
  },
});

function _escE(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function _escAttr(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}
