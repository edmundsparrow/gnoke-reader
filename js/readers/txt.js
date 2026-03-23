/**
 * readers/txt.js — Gnoke Reader
 * Plain text plugin. Zero dependencies.
 * Handles: .txt, .me (simple notes/readme variants)
 */

ReaderRegistry.register({
  extensions : ['txt', 'me'],
  label      : 'Plain Text',
  icon       : '📄',
  lib        : null,

  render: async (file, container) => {
    const text = await file.text();
    const div  = document.createElement('div');
    div.className  = 'txt-body';
    div.textContent = text;
    container.innerHTML = '';
    container.appendChild(div);
  },
});
