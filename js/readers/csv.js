/**
 * readers/csv.js — Gnoke Reader
 * CSV / TSV table viewer with sortable columns.
 * Library: PapaParse
 * Handles: .csv, .tsv
 */

ReaderRegistry.register({
  extensions : ['csv', 'tsv'],
  label      : 'Spreadsheet',
  icon       : '📊',
  lib        : 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js',

  render: async (file, container) => {
    const text      = await file.text();
    const delimiter = file.name.endsWith('.tsv') ? '\t' : undefined; /* auto-detect for csv */

    const result = Papa.parse(text, {
      delimiter     : delimiter || '',
      header        : false,
      skipEmptyLines: true,
      dynamicTyping : false,
    });

    const rows = result.data;
    if (!rows.length) {
      container.innerHTML = '<div class="reader-error"><span class="err-icon">📭</span>File is empty.</div>';
      return;
    }

    const headers  = rows[0];
    const dataRows = rows.slice(1);
    let   sortCol  = -1;
    let   sortAsc  = true;

    function buildTable(data) {
      const wrap = document.createElement('div');
      wrap.style.overflowX = 'auto';

      const meta = document.createElement('div');
      meta.className = 'csv-meta';
      meta.innerHTML = `
        <span>📋 <strong>${dataRows.length}</strong> rows</span>
        <span>📏 <strong>${headers.length}</strong> columns</span>
        ${result.errors.length ? `<span style="color:var(--red)">⚠ ${result.errors.length} parse warning(s)</span>` : ''}`;

      const table = document.createElement('table');
      table.className = 'csv-table csv-sortable';

      /* Header row */
      const thead = document.createElement('thead');
      const hrow  = document.createElement('tr');

      /* Row number column */
      const thN = document.createElement('th');
      thN.textContent = '#';
      thN.style.width = '36px';
      hrow.appendChild(thN);

      headers.forEach((h, i) => {
        const th    = document.createElement('th');
        th.textContent = h || `Col ${i + 1}`;
        if (i === sortCol) th.classList.add(sortAsc ? 'csv-sort-asc' : 'csv-sort-desc');
        th.addEventListener('click', () => {
          if (sortCol === i) sortAsc = !sortAsc;
          else { sortCol = i; sortAsc = true; }
          const sorted = [...data].sort((a, b) => {
            const av = a[i] ?? '', bv = b[i] ?? '';
            const n  = parseFloat(av) - parseFloat(bv);
            const cmp = isNaN(n) ? av.toString().localeCompare(bv.toString()) : n;
            return sortAsc ? cmp : -cmp;
          });
          container.innerHTML = '';
          container.appendChild(buildTable(sorted));
        });
        hrow.appendChild(th);
      });
      thead.appendChild(hrow);
      table.appendChild(thead);

      /* Body rows */
      const tbody = document.createElement('tbody');
      data.forEach((row, ri) => {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.className   = 'row-num';
        td.textContent = ri + 1;
        tr.appendChild(td);
        headers.forEach((_, ci) => {
          const cell         = document.createElement('td');
          cell.textContent   = row[ci] ?? '';
          cell.title         = row[ci] ?? '';
          tr.appendChild(cell);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrap.appendChild(meta);
      wrap.appendChild(table);
      return wrap;
    }

    container.innerHTML = '';
    container.appendChild(buildTable(dataRows));
  },
});
