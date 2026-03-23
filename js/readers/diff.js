/**
 * readers/diff.js — Gnoke Reader
 * Unified diff / patch viewer. Zero dependencies.
 * Handles: .diff, .patch
 *
 * Colours:
 *   +++ / --- file headers  → bold white
 *   @@ hunk headers         → blue
 *   + added lines           → green
 *   - removed lines         → red
 *   context lines           → default
 *   diff --git headers      → accent bold
 *   index / similarity      → muted
 */

ReaderRegistry.register({
  extensions : ['diff', 'patch'],
  label      : 'Diff / Patch',
  icon       : '📋',
  lib        : null,

  render: async (file, container) => {
    const text  = await file.text();
    const lines = text.split('\n');

    /* Stats */
    let added = 0, removed = 0, files = 0;

    const pre = document.createElement('pre');
    pre.className = 'log-body';   /* reuse the dark terminal style */
    pre.style.fontSize = '.8em';

    pre.innerHTML = lines.map(line => {
      const e = _escD(line);

      /* diff --git a/file b/file */
      if (line.startsWith('diff --git') || line.startsWith('diff -')) {
        files++;
        return `<span class="log-line" style="color:#e8f3f9;font-weight:700;margin-top:.6em;display:block;">${e}</span>`;
      }
      /* index / similarity / rename / mode */
      if (/^(index |similarity |rename |old mode|new mode|deleted file|new file)/.test(line)) {
        return `<span class="log-line log-debug">${e}</span>`;
      }
      /* +++ new file */
      if (line.startsWith('+++')) {
        return `<span class="log-line" style="color:#56d364;font-weight:700;display:block;">${e}</span>`;
      }
      /* --- old file */
      if (line.startsWith('---')) {
        return `<span class="log-line" style="color:#ff7b72;font-weight:700;display:block;">${e}</span>`;
      }
      /* @@ hunk header */
      if (line.startsWith('@@')) {
        return `<span class="log-line log-info">${e}</span>`;
      }
      /* Added line */
      if (line.startsWith('+')) {
        added++;
        return `<span class="log-line log-success">${e}</span>`;
      }
      /* Removed line */
      if (line.startsWith('-')) {
        removed++;
        return `<span class="log-line log-error">${e}</span>`;
      }
      /* Binary / misc */
      if (line.startsWith('Binary')) {
        return `<span class="log-line log-warn">${e}</span>`;
      }
      /* Context */
      return `<span class="log-line">${e}</span>`;
    }).join('\n');

    /* Stats bar */
    const stats = document.createElement('div');
    stats.style.cssText = 'display:flex;gap:16px;margin-bottom:10px;font-family:var(--font-mono);font-size:.72rem;flex-wrap:wrap;';
    stats.innerHTML = `
      <span style="color:var(--muted);">📁 <strong style="color:var(--text);">${files}</strong> file${files !== 1 ? 's' : ''} changed</span>
      <span style="color:var(--green);">+${added} addition${added !== 1 ? 's' : ''}</span>
      <span style="color:var(--red);">−${removed} deletion${removed !== 1 ? 's' : ''}</span>`;

    container.innerHTML = '';
    container.appendChild(stats);
    container.appendChild(pre);
  },
});

function _escD(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
