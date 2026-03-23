# 📖 Gnoke Reader

A universal offline document viewer. Open any supported file and read it beautifully — no upload, no account, no server.

> **Portable. Private. Offline-first.**

---

## Live Demo

**[edmundsparrow.github.io/gnoke-reader](https://edmundsparrow.github.io/gnoke-reader)**

---

## Supported Formats — v1.1

| Format | Extensions | Library |
|---|---|---|
| Markdown | `.md` `.markdown` | marked.js + highlight.js |
| Plain Text | `.txt` `.me` | none (zero deps) |
| Log File | `.log` | none — level colour coding |
| JSON | `.json` `.geojson` `.jsonl` | none — collapsible tree |
| CSV / TSV | `.csv` `.tsv` | PapaParse |
| PDF | `.pdf` | Mozilla pdf.js |
| Word Document | `.docx` | mammoth.js |
| Config File | `.ini` `.cfg` `.conf` `.toml` | none — section/key/value colouring |
| Env File | `.env` | none — sensitive value masking |
| Diff / Patch | `.diff` `.patch` | none — added/removed line colouring |
| SQL | `.sql` | none — keyword syntax highlighting |

---

## Run Locally

```bash
git clone https://github.com/edmundsparrow/gnoke-reader.git
cd gnoke-reader
python -m http.server 8080
```

Open: **http://localhost:8080**

> ⚠️ Always run through a local server — the File API and Service Worker require a secure context (HTTPS or localhost).

---

## Project Structure

```
gnoke-reader/
├── index.html              ← Splash screen
├── main/
│   └── index.html          ← App shell
├── js/
│   ├── state.js            ← App state (single source of truth)
│   ├── theme.js            ← Dark / light toggle
│   ├── ui.js               ← Toast, status chip
│   ├── reader-core.js      ← Plugin registry, file dispatch, search, font size
│   ├── readers/
│   │   ├── txt.js          ← Plain text plugin
│   │   ├── log.js          ← Log viewer plugin (level colouring)
│   │   ├── md.js           ← Markdown plugin
│   │   ├── json.js         ← JSON collapsible tree plugin
│   │   ├── csv.js          ← CSV / TSV table plugin
│   │   ├── pdf.js          ← PDF paged canvas plugin
│   │   └── docx.js         ← DOCX plugin
│   └── app.js              ← Bootstrap + event wiring
├── style.css               ← Gnoke design system
├── reader.css              ← Document rendering typography
├── sw.js                   ← Service worker (offline / PWA)
├── manifest.json           ← PWA manifest (includes share_target)
├── global.png              ← App icon
└── LICENSE
```

---

## Adding a New Format

This is the core design goal — adding a new format touches **one file** and **one script tag**. Nothing else changes.

1. Create `js/readers/yourformat.js`
2. Implement and register the plugin:

```js
ReaderRegistry.register({
  extensions : ['xyz'],          // lowercase, no dot
  label      : 'My Format',
  icon       : '📄',
  lib        : 'https://cdn.../lib.min.js',  // or null if zero-dep
  render     : async (file, container) => {
    const text = await file.text();          // or file.arrayBuffer()
    container.innerHTML = `<div class="reader-body">${text}</div>`;
  },
});
```

3. Add `<script src="../js/readers/yourformat.js"></script>` in `main/index.html`
4. Add the extension to the `accept` attribute on `#file-input`

That's it. `reader-core.js`, `app.js`, and every other file stay untouched.

---

## Planned — v2

| Format | Library |
|---|---|
| `.xlsx` | SheetJS |
| `.pptx` | SheetJS / custom slide renderer |

---

## Features

- **Search inside file** — highlight all matches, navigate with Enter / Shift+Enter
- **Font size control** — A+ / A− in toolbar, persisted in localStorage
- **Dark / light mode** — persisted in localStorage
- **Recent files** — last 8 filenames shown on home page (metadata only — no content stored)
- **Sortable CSV tables** — click any column header to sort
- **JSON collapsible tree** — click any object/array node to expand or collapse
- **Log level colouring** — ERROR red, WARN amber, INFO blue, SUCCESS green, DEBUG grey
- **PDF keyboard navigation** — arrow keys to turn pages
- **Offline** — full PWA, works after first load

---

## Privacy & Tech

- **Stack:** Vanilla JS, zero framework dependencies. Format libraries loaded lazily on demand.
- **Privacy:** No tracking, no telemetry, no ads. Files never leave the device.
- **Persistence:** Only file metadata (name, date) stored in localStorage. File content is never persisted.
- **Share target:** On Android, long-press any supported file → Share → Gnoke Reader.
- **License:** GNU GPL v3.0

---

## Support

If this app saves you time, consider buying me a coffee:
**[selar.com/showlove/edmundsparrow](https://selar.com/showlove/edmundsparrow)**

---

© 2026 Edmund Sparrow — Gnoke Suite · v1.0
