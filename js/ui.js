/**
 * ui.js — Gnoke Reader
 * Pure UI utilities. No business logic.
 */

const UI = (() => {

  let _toastTimer = null;

  function toast(msg, type = 'info') {
    const el = document.getElementById('toast');
    if (!el) return;
    clearTimeout(_toastTimer);
    el.textContent = msg;
    el.className   = `show${type === 'err' ? ' err' : type === 'ok' ? ' ok' : ''}`;
    _toastTimer    = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function status(msg) {
    const el = document.getElementById('status-chip');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2200);
  }

  function init() {
    /* Modal overlay click-to-close */
    document.querySelectorAll('.modal-overlay').forEach(ov => {
      ov.addEventListener('click', e => {
        if (e.target === ov) ov.classList.remove('show');
      });
    });
  }

  return { toast, status, init };
})();
