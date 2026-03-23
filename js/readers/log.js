/**
 * readers/log.js — Gnoke Reader
 * Log viewer plugin. Zero dependencies.
 * Handles: .log
 *
 * Colours log lines by level keyword:
 *   ERROR / FATAL / CRITICAL → red
 *   WARN  / WARNING          → amber
 *   INFO                     → blue
 *   SUCCESS / OK / DONE      → green
 *   DEBUG / TRACE / VERBOSE  → grey (dimmed)
 *   Timestamps               → muted
 */

ReaderRegistry.register({
  extensions : ['log'],
  label      : 'Log File',
  icon       : '🖥️',
  lib        : null,

  render: async (file, container) => {
    const text  = await file.text();
    const lines = text.split('\n');

    const pre   = document.createElement('pre');
    pre.className = 'log-body';

    pre.innerHTML = lines.map(line => {
      const esc  = _escLog(line);
      const cls  = _classifyLine(line);
      /* Highlight timestamps separately within non-classified lines */
      const out  = cls
        ? `<span class="log-line ${cls}">${esc}</span>`
        : `<span class="log-line">${_highlightTimestamp(esc)}</span>`;
      return out;
    }).join('\n');

    container.innerHTML = '';
    container.appendChild(pre);
  },
});

/* ── Classify by level keyword ── */
function _classifyLine(line) {
  const u = line.toUpperCase();
  if (/\b(ERROR|FATAL|CRITICAL|EXCEPTION|FAIL(ED)?)\b/.test(u)) return 'log-error';
  if (/\b(WARN(ING)?)\b/.test(u))                                 return 'log-warn';
  if (/\b(INFO|NOTICE)\b/.test(u))                                return 'log-info';
  if (/\b(SUCCESS|SUCCEEDED|OK|DONE|PASS(ED)?)\b/.test(u))        return 'log-success';
  if (/\b(DEBUG|TRACE|VERBOSE|SILLY)\b/.test(u))                  return 'log-debug';
  return null;
}

/* ── Highlight ISO / common timestamp patterns ── */
function _highlightTimestamp(escaped) {
  /* Matches: 2024-01-15T14:32:00  or  14:32:00.123  or  [2024-01-15] */
  return escaped.replace(
    /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?|\d{2}:\d{2}:\d{2}(?:\.\d+)?|\[\d{4}-\d{2}-\d{2}\])/g,
    '<span class="log-timestamp">$1</span>'
  );
}

function _escLog(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
