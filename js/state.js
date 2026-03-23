/**
 * state.js — Gnoke Reader
 * Single source of truth for all runtime state.
 */

const State = (() => {

  const DEFAULTS = {
    activePage    : 'home-page',
    openFile      : null,   /* { name, ext, size, plugin } */
    readerFontSize: 16,
    searchQuery   : '',
    searchHits    : 0,
    searchCurrent : 0,
  };

  let _state = { ...DEFAULTS };
  const _listeners = {};

  function get(key)        { return _state[key]; }
  function set(key, value) { _state[key] = value; (_listeners[key] || []).forEach(fn => fn(value)); }
  function on(key, cb)     { if (!_listeners[key]) _listeners[key] = []; _listeners[key].push(cb); }
  function reset()         { _state = { ...DEFAULTS }; }

  return { get, set, on, reset, DEFAULTS };
})();
