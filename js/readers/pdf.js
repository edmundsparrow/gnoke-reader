/**
 * readers/pdf.js — Gnoke Reader
 * PDF paged canvas renderer using Mozilla pdf.js.
 * Handles: .pdf
 */

ReaderRegistry.register({
  extensions : ['pdf'],
  label      : 'PDF',
  icon       : '📕',
  lib        : 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',

  render: async (file, container) => {
    /* pdf.js needs its worker configured */
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc      = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages  = pdfDoc.numPages;

    /* Build controls bar */
    const ctrl = document.createElement('div');
    ctrl.className = 'pdf-controls';
    ctrl.innerHTML = `
      <button class="btn btn-sm btn-ghost" id="pdf-prev">← Prev</button>
      <span class="pdf-page-info" id="pdf-page-info">1 / ${totalPages}</span>
      <button class="btn btn-sm btn-ghost" id="pdf-next">Next →</button>
      <span style="flex:1"></span>
      <button class="btn btn-sm btn-ghost" id="pdf-zoom-out">−</button>
      <span id="pdf-zoom-label" style="font-family:var(--font-mono);font-size:.68rem;min-width:42px;text-align:center;">100%</span>
      <button class="btn btn-sm btn-ghost" id="pdf-zoom-in">+</button>`;

    /* Build canvas area */
    const pages = document.createElement('div');
    pages.className = 'pdf-page-wrap';

    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'pdf-canvas-wrap';
    const canvas  = document.createElement('canvas');
    const ctx     = canvas.getContext('2d');
    canvasWrap.appendChild(canvas);
    pages.appendChild(canvasWrap);

    container.innerHTML = '';
    /* Controls sit outside the scrollable reader-body — insert in toolbar area */
    const toolbar = document.querySelector('.reader-toolbar');
    const existingCtrl = document.getElementById('pdf-ctrl-bar');
    if (existingCtrl) existingCtrl.remove();
    ctrl.id = 'pdf-ctrl-bar';
    if (toolbar) toolbar.insertAdjacentElement('afterend', ctrl);

    container.appendChild(pages);

    let currentPage = 1;
    let scale       = _deviceScale();

    async function renderPage(num) {
      const page     = await pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale });
      canvas.width   = viewport.width;
      canvas.height  = viewport.height;
      canvas.style.width  = '100%';
      canvas.style.height = 'auto';
      await page.render({ canvasContext: ctx, viewport }).promise;
      document.getElementById('pdf-page-info').textContent = `${num} / ${totalPages}`;
    }

    await renderPage(1);

    ctrl.querySelector('#pdf-prev').addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; renderPage(currentPage); }
    });
    ctrl.querySelector('#pdf-next').addEventListener('click', () => {
      if (currentPage < totalPages) { currentPage++; renderPage(currentPage); }
    });
    ctrl.querySelector('#pdf-zoom-in').addEventListener('click', () => {
      scale = Math.min(scale + 0.25, 4);
      ctrl.querySelector('#pdf-zoom-label').textContent = Math.round(scale * 100) + '%';
      renderPage(currentPage);
    });
    ctrl.querySelector('#pdf-zoom-out').addEventListener('click', () => {
      scale = Math.max(scale - 0.25, 0.5);
      ctrl.querySelector('#pdf-zoom-label').textContent = Math.round(scale * 100) + '%';
      renderPage(currentPage);
    });

    /* Keyboard navigation */
    const _keyHandler = e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (currentPage < totalPages) { currentPage++; renderPage(currentPage); }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (currentPage > 1) { currentPage--; renderPage(currentPage); }
      }
    };
    document.addEventListener('keydown', _keyHandler);
    /* Clean up key handler when reader closes */
    canvas._cleanup = () => {
      document.removeEventListener('keydown', _keyHandler);
      ctrl.remove();
    };
    const closeBtn = document.getElementById('btn-reader-close');
    if (closeBtn) {
      const _orig = closeBtn.onclick;
      closeBtn.addEventListener('click', () => canvas._cleanup && canvas._cleanup(), { once: true });
    }
  },
});

function _deviceScale() {
  const vw = window.innerWidth;
  /* Fit A4 width comfortably on different screens */
  if (vw < 500) return 0.8;
  if (vw < 800) return 1.0;
  return 1.4;
}
