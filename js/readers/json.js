/**
 * readers/json.js — Gnoke Reader
 * JSON collapsible tree viewer. Zero dependencies.
 * Handles: .json, .geojson, .jsonl (first 500 lines for .jsonl)
 */

ReaderRegistry.register({
  extensions : ['json', 'geojson', 'jsonl'],
  label      : 'JSON',
  icon       : '{ }',
  lib        : null,

  render: async (file, container) => {
    let text = await file.text();

    /* .jsonl — render first 500 lines as a JSON array */
    if (file.name.endsWith('.jsonl')) {
      const lines = text.split('\n').filter(l => l.trim()).slice(0, 500);
      text = '[' + lines.join(',') + ']';
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      container.innerHTML = `
        <div class="reader-error">
          <span class="err-icon">⚠️</span>
          <strong>Invalid JSON</strong><br>${_escJ(e.message)}
        </div>`;
      return;
    }

    const wrap  = document.createElement('div');
    wrap.className = 'reader-body json-body';

    const ul    = document.createElement('ul');
    ul.className = 'json-tree';
    _buildTree(data, ul);
    wrap.appendChild(ul);

    container.innerHTML = '';
    container.appendChild(wrap);

    /* Wire collapse/expand toggles */
    wrap.addEventListener('click', e => {
      const tog = e.target.closest('.json-toggle');
      if (tog) tog.classList.toggle('collapsed');
    });
  },
});

/* ── Tree builder ── */
function _buildTree(value, parent, key) {
  const li  = document.createElement('li');

  const keySpan = key !== undefined
    ? `<span class="json-key">${_escJ(JSON.stringify(key))}</span>: `
    : '';

  if (value === null) {
    li.innerHTML = `${keySpan}<span class="json-null">null</span>`;

  } else if (typeof value === 'boolean') {
    li.innerHTML = `${keySpan}<span class="${value ? 'json-bool-true' : 'json-bool-false'}">${value}</span>`;

  } else if (typeof value === 'number') {
    li.innerHTML = `${keySpan}<span class="json-num">${value}</span>`;

  } else if (typeof value === 'string') {
    li.innerHTML = `${keySpan}<span class="json-str">${_escJ(JSON.stringify(value))}</span>`;

  } else if (Array.isArray(value)) {
    const count = value.length;
    const tog   = document.createElement('span');
    tog.className = 'json-toggle';
    tog.innerHTML = `${keySpan}[<span class="json-count">${count} item${count !== 1 ? 's' : ''}</span>]`;
    li.appendChild(tog);

    const ul = document.createElement('ul');
    value.forEach((v, i) => _buildTree(v, ul, i));
    li.appendChild(ul);

  } else if (typeof value === 'object') {
    const keys  = Object.keys(value);
    const count = keys.length;
    const tog   = document.createElement('span');
    tog.className = 'json-toggle';
    tog.innerHTML = `${keySpan}{<span class="json-count">${count} key${count !== 1 ? 's' : ''}</span>}`;
    li.appendChild(tog);

    const ul = document.createElement('ul');
    keys.forEach(k => _buildTree(value[k], ul, k));
    li.appendChild(ul);
  }

  parent.appendChild(li);
}

function _escJ(str) {
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}
