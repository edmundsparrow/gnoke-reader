/**
 * theme.js — Gnoke Reader
 * Dark / light theme toggle with localStorage persistence.
 */

const Theme = (() => {

  const KEY = 'gnoke_reader_theme';

  function current() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function _apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
    _syncBtn(theme);
  }

  function _syncBtn(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function init() {
    const saved = localStorage.getItem(KEY);
    if (saved) _apply(saved);
    else _syncBtn(current());
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', () => _apply(current() === 'dark' ? 'light' : 'dark'));
  }

  return { init, current };
})();
