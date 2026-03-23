/**
 * readers/sql.js — Gnoke Reader
 * SQL file viewer with keyword syntax highlighting. Zero dependencies.
 * Handles: .sql
 *
 * Highlights:
 *   DDL keywords    (CREATE, ALTER, DROP, TABLE, INDEX…)  → accent
 *   DML keywords    (SELECT, INSERT, UPDATE, DELETE…)     → blue
 *   Clauses         (WHERE, FROM, JOIN, ON, GROUP BY…)    → purple-ish
 *   Functions       (COUNT, SUM, AVG, COALESCE…)          → amber
 *   String literals ('…')                                 → green
 *   Numbers                                               → orange
 *   -- and /* comments                                    → muted italic
 *   NULL / TRUE / FALSE                                   → red / green
 */

ReaderRegistry.register({
  extensions : ['sql'],
  label      : 'SQL',
  icon       : '🗄️',
  lib        : null,

  render: async (file, container) => {
    const text = await file.text();

    const pre = document.createElement('pre');
    pre.className = 'txt-body';
    pre.style.cssText = `
      background:#0c0e14; color:#c9d1d9;
      border:1px solid var(--border); border-radius:var(--radius);
      padding:1.2em 1.4em; font-size:.82em; line-height:1.65;
      overflow-x:auto;`;

    pre.innerHTML = _highlightSQL(text);

    /* Statement count */
    const stmts = (text.match(/;/g) || []).length;
    const meta = document.createElement('div');
    meta.style.cssText = 'font-family:var(--font-mono);font-size:.68rem;color:var(--muted);margin-bottom:10px;';
    meta.textContent = `${stmts} statement${stmts !== 1 ? 's' : ''}`;

    container.innerHTML = '';
    container.appendChild(meta);
    container.appendChild(pre);
  },
});

/* ── SQL highlighter ── */
function _highlightSQL(src) {
  /* Tokenise — process character by character to handle strings + comments */
  const tokens = [];
  let i = 0;

  while (i < src.length) {
    /* Single-line comment -- */
    if (src[i] === '-' && src[i+1] === '-') {
      const end = src.indexOf('\n', i);
      const s   = end === -1 ? src.slice(i) : src.slice(i, end);
      tokens.push({ type: 'comment', val: s });
      i += s.length;
      continue;
    }
    /* Block comment /* ... * / */
    if (src[i] === '/' && src[i+1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const s   = end === -1 ? src.slice(i) : src.slice(i, end + 2);
      tokens.push({ type: 'comment', val: s });
      i += s.length;
      continue;
    }
    /* String literal ' ' */
    if (src[i] === "'") {
      let s = "'", j = i + 1;
      while (j < src.length) {
        if (src[j] === "'" && src[j+1] === "'") { s += "''"; j += 2; }
        else if (src[j] === "'") { s += "'"; j++; break; }
        else { s += src[j]; j++; }
      }
      tokens.push({ type: 'string', val: s });
      i = j;
      continue;
    }
    /* Number */
    if (/[0-9]/.test(src[i]) || (src[i] === '-' && /[0-9]/.test(src[i+1] || ''))) {
      let s = src[i++];
      while (i < src.length && /[0-9._]/.test(src[i])) s += src[i++];
      tokens.push({ type: 'number', val: s });
      continue;
    }
    /* Word */
    if (/[A-Za-z_]/.test(src[i])) {
      let s = '';
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) s += src[i++];
      tokens.push({ type: 'word', val: s });
      continue;
    }
    /* Punctuation / whitespace / other */
    tokens.push({ type: 'other', val: src[i++] });
  }

  /* Render tokens */
  return tokens.map(tok => {
    const e = _escS(tok.val);
    switch (tok.type) {
      case 'comment': return `<span style="color:#6e7681;font-style:italic;">${e}</span>`;
      case 'string':  return `<span style="color:#56d364;">${e}</span>`;
      case 'number':  return `<span style="color:#f08d49;">${e}</span>`;
      case 'word':    return _colorWord(tok.val, e);
      default:        return e;
    }
  }).join('');
}

const _DDL       = new Set(['CREATE','ALTER','DROP','TABLE','VIEW','INDEX','TRIGGER','PROCEDURE','FUNCTION','DATABASE','SCHEMA','SEQUENCE','CONSTRAINT','PRIMARY','FOREIGN','UNIQUE','KEY','DEFAULT','NOT','NULL','REFERENCES','CASCADE','RESTRICT','AUTO_INCREMENT','AUTOINCREMENT','SERIAL','IF','EXISTS','LIKE','AS','ON','WITH','TEMP','TEMPORARY','VIRTUAL','REPLACE','TRUNCATE']);
const _DML       = new Set(['SELECT','INSERT','UPDATE','DELETE','MERGE','UPSERT','INTO','VALUES','SET','FROM','RETURNING']);
const _CLAUSES   = new Set(['WHERE','AND','OR','NOT','IN','BETWEEN','IS','LIKE','HAVING','GROUP','BY','ORDER','LIMIT','OFFSET','UNION','ALL','EXCEPT','INTERSECT','JOIN','INNER','LEFT','RIGHT','FULL','OUTER','CROSS','NATURAL','USING','LATERAL','DISTINCT','TOP','FETCH','NEXT','ROWS','ONLY','OVER','PARTITION','WINDOW']);
const _FUNCTIONS = new Set(['COUNT','SUM','AVG','MIN','MAX','COALESCE','NULLIF','ISNULL','IFNULL','NVL','CAST','CONVERT','SUBSTR','SUBSTRING','LENGTH','LEN','UPPER','LOWER','TRIM','LTRIM','RTRIM','REPLACE','CONCAT','ROUND','FLOOR','CEIL','CEILING','ABS','MOD','NOW','CURRENT_DATE','CURRENT_TIME','CURRENT_TIMESTAMP','DATE','YEAR','MONTH','DAY','HOUR','MINUTE','SECOND','EXTRACT','DATEDIFF','DATEADD','STRFTIME','ROW_NUMBER','RANK','DENSE_RANK','NTILE','LAG','LEAD','FIRST_VALUE','LAST_VALUE','JSON_EXTRACT','JSON_OBJECT','GROUP_CONCAT','STRING_AGG']);
const _BOOL_NULL = new Set(['NULL','TRUE','FALSE','UNKNOWN']);
const _TYPES     = new Set(['INT','INTEGER','BIGINT','SMALLINT','TINYINT','FLOAT','DOUBLE','DECIMAL','NUMERIC','REAL','VARCHAR','CHAR','TEXT','BLOB','CLOB','BOOLEAN','BOOL','DATE','TIME','DATETIME','TIMESTAMP','JSON','UUID','BYTEA','BINARY','VARBINARY']);

function _colorWord(word, escaped) {
  const up = word.toUpperCase();
  if (_BOOL_NULL.has(up)) {
    const col = up === 'NULL' ? '#ff7b72' : up === 'TRUE' ? '#56d364' : '#ff7b72';
    return `<span style="color:${col};font-weight:600;">${escaped}</span>`;
  }
  if (_DDL.has(up))       return `<span style="color:#79c0ff;font-weight:600;">${escaped}</span>`;
  if (_DML.has(up))       return `<span style="color:#d2a8ff;font-weight:600;">${escaped}</span>`;
  if (_CLAUSES.has(up))   return `<span style="color:#ffa657;font-weight:600;">${escaped}</span>`;
  if (_FUNCTIONS.has(up)) return `<span style="color:#e3b341;">${escaped}</span>`;
  if (_TYPES.has(up))     return `<span style="color:#f78166;">${escaped}</span>`;
  return escaped;
}

function _escS(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
