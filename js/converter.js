/**
 * converter.js — Gnoke Reader
 * Converts the currently open file to PDF using pdfmake.
 * Replaces A+/A− font controls. Drop-in: one <script> tag, one button.
 *
 * Supported paths:
 *   md / docx / txt / me  → HTML → pdfmake content (rich)
 *   csv / tsv             → table
 *   log / sql / ini / cfg
 *   conf / toml / env /
 *   diff / patch / json   → monospace plain text
 *   pdf                   → toast (already a PDF)
 *
 * Lazy-loads pdfmake + vfs_fonts from CDN on first use.
 */

const Converter = (() => {

  const PDFMAKE_JS  = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.9/pdfmake.min.js';
  const PDFMAKE_VFS = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.9/vfs_fonts.min.js';

  const RICH_FORMATS  = new Set(['md','markdown','docx','txt','me']);
  const TABLE_FORMATS = new Set(['csv','tsv']);
  const MONO_FORMATS  = new Set(['log','sql','ini','cfg','conf','toml','env','diff','patch','json','geojson','jsonl']);

  let _libReady = false;

  /* ── Load pdfmake lazily ── */
  function _loadLibs() {
    if (_libReady) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s1 = document.createElement('script');
      s1.src = PDFMAKE_JS;
      s1.onload = () => {
        const s2 = document.createElement('script');
        s2.src = PDFMAKE_VFS;
        s2.onload = () => { _libReady = true; resolve(); };
        s2.onerror = reject;
        document.head.appendChild(s2);
      };
      s1.onerror = reject;
      document.head.appendChild(s1);
    });
  }

  /* ── Helpers ── */
  function _text(str) {
    const d = document.createElement('div');
    d.innerHTML = str;
    return (d.textContent || '').trim();
  }

  function _filename() {
    return document.getElementById('reader-filename')?.textContent?.trim() || 'document';
  }

  function _ext() {
    return State.get('openFile')?.ext?.toLowerCase() || '';
  }

  function _pdfName() {
    const base = _filename().replace(/\.[^.]+$/, '') || 'document';
    return base + '.pdf';
  }

  /* ── RICH: walk rendered HTML → pdfmake content array ── */
  function _richContent(container) {
    const content = [];

    function walk(node) {
      if (node.nodeType === 3) {
        const t = node.textContent;
        if (t.trim()) content.push({ text: t, fontSize: 10, color: '#1a1033' });
        return;
      }
      if (node.nodeType !== 1) return;
      const tag = node.tagName;

      if (/^H[1-6]$/.test(tag)) {
        const lvl   = parseInt(tag[1]);
        const sizes = [22, 17, 14, 12, 11, 10];
        content.push({
          text      : node.textContent.trim(),
          fontSize  : sizes[lvl - 1],
          bold      : true,
          color     : '#1a1033',
          margin    : lvl === 1 ? [0, 14, 0, 8] : [0, 10, 0, 5],
          ...(lvl <= 2 ? { decoration: 'underline', decorationColor: '#ddd6fe' } : {}),
        });
        return;
      }

      if (tag === 'P') {
        const inline = _inlineNodes(node);
        if (inline.length) content.push({ text: inline, margin: [0, 0, 0, 6] });
        return;
      }

      if (tag === 'BLOCKQUOTE') {
        content.push({
          text        : node.textContent.trim(),
          italics     : true,
          fontSize    : 10,
          color       : '#7c6aaa',
          margin      : [12, 4, 0, 8],
          background  : '#f5f3fe',
        });
        return;
      }

      if (tag === 'PRE' || tag === 'CODE') {
        content.push({
          text      : node.textContent,
          font      : 'Courier',
          fontSize  : 8.5,
          color     : '#3d2b7a',
          background: '#f5f3fe',
          margin    : [0, 4, 0, 8],
          preserveLeadingSpaces: true,
        });
        return;
      }

      if (tag === 'UL' || tag === 'OL') {
        const items = [];
        node.querySelectorAll(':scope > li').forEach(li => {
          items.push({ text: li.textContent.trim(), fontSize: 10, color: '#1a1033' });
        });
        if (items.length) {
          content.push({
            [tag === 'UL' ? 'ul' : 'ol']: items,
            margin: [0, 2, 0, 8],
          });
        }
        return;
      }

      if (tag === 'TABLE') {
        const tbl = _tableFromEl(node);
        if (tbl) content.push(tbl);
        return;
      }

      if (tag === 'HR') {
        content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#ddd6fe' }], margin: [0, 8, 0, 8] });
        return;
      }

      /* Recurse into divs, sections etc. */
      node.childNodes.forEach(walk);
    }

    container.childNodes.forEach(walk);
    return content;
  }

  /* Inline nodes within a paragraph (bold, italic, links, code) */
  function _inlineNodes(el) {
    const parts = [];
    el.childNodes.forEach(n => {
      if (n.nodeType === 3) {
        if (n.textContent) parts.push({ text: n.textContent, fontSize: 10, color: '#1a1033' });
      } else if (n.nodeType === 1) {
        const t   = n.tagName;
        const txt = n.textContent;
        if (!txt) return;
        if (t === 'STRONG' || t === 'B') parts.push({ text: txt, bold: true, fontSize: 10, color: '#1a1033' });
        else if (t === 'EM' || t === 'I') parts.push({ text: txt, italics: true, fontSize: 10, color: '#1a1033' });
        else if (t === 'CODE') parts.push({ text: txt, font: 'Courier', fontSize: 8.5, color: '#7c3aed', background: '#f5f3fe' });
        else if (t === 'A') parts.push({ text: txt, color: '#7c3aed', decoration: 'underline', fontSize: 10 });
        else if (t === 'DEL' || t === 'S') parts.push({ text: txt, decoration: 'lineThrough', fontSize: 10, color: '#7c6aaa' });
        else parts.push({ text: txt, fontSize: 10, color: '#1a1033' });
      }
    });
    return parts.length ? parts : [{ text: el.textContent, fontSize: 10, color: '#1a1033' }];
  }

  /* Extract a <table> element → pdfmake table object */
  function _tableFromEl(tableEl) {
    const rows = [];
    tableEl.querySelectorAll('tr').forEach(tr => {
      const cells = [];
      tr.querySelectorAll('th, td').forEach(cell => {
        const isTh = cell.tagName === 'TH';
        cells.push({
          text      : cell.textContent.trim(),
          fontSize  : 8.5,
          bold      : isTh,
          color     : isTh ? '#7c3aed' : '#1a1033',
          fillColor : isTh ? '#f5f3fe' : undefined,
          margin    : [4, 3, 4, 3],
        });
      });
      if (cells.length) rows.push(cells);
    });

    if (!rows.length) return null;
    const colCount = rows[0].length || 1;

    return {
      table: {
        headerRows : 1,
        widths     : Array(colCount).fill('*'),
        body       : rows,
      },
      layout: {
        hLineWidth   : (i) => 0.5,
        vLineWidth   : (i) => 0.5,
        hLineColor   : () => '#ddd6fe',
        vLineColor   : () => '#ddd6fe',
      },
      margin: [0, 4, 0, 10],
    };
  }

  /* ── CSV: extract table directly from DOM ── */
  function _csvContent(container) {
    const tbl = container.querySelector('table');
    if (!tbl) return [{ text: 'No table found.', fontSize: 10 }];
    const result = _tableFromEl(tbl);
    return result ? [result] : [{ text: 'Empty table.', fontSize: 10 }];
  }

  /* ── MONO: extract text, preserve whitespace ── */
  function _monoContent(container) {
    const raw = container.innerText || container.textContent || '';
    /* Split into lines, cap at 2000 to avoid huge PDFs */
    const lines = raw.split('\n').slice(0, 2000);
    return [{
      text      : lines.join('\n'),
      font      : 'Courier',
      fontSize  : 7.5,
      color     : '#1a1033',
      lineHeight: 1.45,
      preserveLeadingSpaces: true,
    }];
  }

  /* ── Build pdfmake doc definition ── */
  function _buildDocDef(content, filename) {
    return {
      info: { title: filename },
      pageSize  : 'A4',
      pageMargins: [40, 52, 40, 52],
      header    : (pg, pages) => ({
        columns: [
          { text: filename, fontSize: 7.5, color: '#7c6aaa', margin: [40, 18, 0, 0] },
          { text: `${pg} / ${pages}`, fontSize: 7.5, color: '#7c6aaa', alignment: 'right', margin: [0, 18, 40, 0] },
        ],
      }),
      content,
      defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.5 },
    };
  }

  /* ── Main export entry point ── */
  async function exportPDF() {
    const ext = _ext();

    if (ext === 'pdf') {
      UI.toast('Already a PDF — open it directly', 'info');
      return;
    }

    const container = document.getElementById('reader-body');
    if (!container || !container.children.length) {
      UI.toast('Nothing to convert', 'err');
      return;
    }

    UI.toast('Preparing PDF…');

    try {
      await _loadLibs();
    } catch (e) {
      UI.toast('Could not load PDF library', 'err');
      return;
    }

    let content;

    if (RICH_FORMATS.has(ext)) {
      content = _richContent(container);
    } else if (TABLE_FORMATS.has(ext)) {
      content = _csvContent(container);
    } else {
      content = _monoContent(container);
    }

    if (!content.length) content = [{ text: 'No content.', fontSize: 10 }];

    const docDef  = _buildDocDef(content, _filename());
    const pdfName = _pdfName();

    try {
      pdfMake.createPdf(docDef).download(pdfName);
      UI.toast(`Saved ${pdfName}`, 'ok');
    } catch (e) {
      console.error('[Converter] pdfmake error:', e);
      UI.toast('PDF generation failed', 'err');
    }
  }

  return { exportPDF };
})();

