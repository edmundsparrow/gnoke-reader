/**
 * readers/ini.js — Gnoke Reader
 * Config file viewer. Zero dependencies.
 * Handles: .ini, .cfg, .conf, .toml
 *
 * Renders:
 *   [section] headers     — accent colour, bold
 *   key = value pairs     — key muted, value prominent
 *   # and ; comments      — dimmed italic
 *   TOML tables [[table]] — double-bracket styling
 *   TOML types            — strings, numbers, booleans coloured
 */

ReaderRegistry.register({
  extensions : ['ini', 'cfg', 'conf', 'toml'],
  label      : 'Config',
  icon       : '⚙️',
  lib        : null,

  render: async (file, container) => {
    const text  = await file.text();
    const lines = text.split('\n');
    const isToml = file.name.endsWith('.toml');

    const pre = document.createElement('pre');
    pre.className   = 'txt-body';
    pre.style.cssText = 'background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:1.2em 1.4em;';

    pre.innerHTML = lines.map(raw => {
      const line = raw;
      const trimmed = line.trim();

      /* Empty line */
      if (!trimmed) return '<span style="display:block">\n</span>';

      /* Comment */
      if (trimmed.startsWith('#') || trimmed.startsWith(';')) {
        return `<span style="display:block;color:var(--muted);font-style:italic;">${_esc(line)}</span>`;
      }

      /* TOML double-bracket table [[name]] */
      if (/^\[\[.+\]\]$/.test(trimmed)) {
        return `<span style="display:block;color:var(--accent);font-weight:700;margin-top:.8em;">${_esc(line)}</span>`;
      }

      /* Section header [name] */
      if (/^\[.+\]$/.test(trimmed)) {
        return `<span style="display:block;color:var(--accent);font-weight:700;margin-top:.8em;">${_esc(line)}</span>`;
      }

      /* Key = value  or  key: value */
      const kvMatch = line.match(/^(\s*)([^=:\s][^=:]*?)\s*([=:])\s*(.*)$/);
      if (kvMatch) {
        const [, indent, key, sep, val] = kvMatch;
        const valHtml = _colorValue(val, isToml);
        return `<span style="display:block;">${_esc(indent)}<span style="color:var(--text2);font-weight:600;">${_esc(key)}</span><span style="color:var(--muted);">${_esc(sep)}</span> ${valHtml}</span>`;
      }

      return `<span style="display:block;">${_esc(line)}</span>`;
    }).join('');

    container.innerHTML = '';
    container.appendChild(pre);
  },
});

function _colorValue(val, isToml) {
  const t = val.trim();
  /* Quoted string */
  if (/^["'].*["']$/.test(t)) {
    return `<span style="color:var(--green);">${_esc(val)}</span>`;
  }
  /* Boolean */
  if (/^(true|false|yes|no|on|off)$/i.test(t)) {
    const col = /^(true|yes|on)$/i.test(t) ? 'var(--green)' : 'var(--red)';
    return `<span style="color:${col};font-weight:600;">${_esc(val)}</span>`;
  }
  /* Number */
  if (/^-?\d+(\.\d+)?$/.test(t)) {
    return `<span style="color:#f08d49;">${_esc(val)}</span>`;
  }
  /* Inline comment after value (# ...) */
  const commentIdx = val.indexOf(' #');
  if (commentIdx > -1) {
    const v = val.substring(0, commentIdx);
    const c = val.substring(commentIdx);
    return `<span style="color:var(--text);">${_esc(v)}</span><span style="color:var(--muted);font-style:italic;">${_esc(c)}</span>`;
  }
  return `<span style="color:var(--text);">${_esc(val)}</span>`;
}

function _esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
