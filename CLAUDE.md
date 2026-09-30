# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

FarmHub is an offline-first PWA for goat farm management aimed at Kenyan farmers (KES currency, Kenya-specific vaccines like PPR/CCPP, FAMACHA deworming scores, East African breeds). It is plain HTML/CSS/vanilla JS: no framework, no bundler, no package.json, no tests, no linter.

## Running locally

Serve the repo root over HTTP. Opening `index.html` via `file://` breaks the service worker and IndexedDB behavior.

```bash
python -m http.server 8000
```

Then open http://localhost:8000. Any static host works (GitHub Pages, Cloudflare Pages). All paths are relative, so hosting under a subpath works too.

The system `node` may be too old to parse optional chaining (`?.`), which the code uses. Syntax-check with a modern Node, e.g. `~/.nvm/versions/node/v22.22.2/bin/node --check js/db.js`. There is no automated test suite yet. Verify changes in a real browser, e.g. Playwright driving a local server, and cover the offline reload and the DB upgrade from the previous `DB_VERSION`.

Product direction, the competitor comparison and the phased production plan are in `docs/ROADMAP.md`.

## Architecture

**Script loading, not modules.** `index.html` loads `js/*.js` as classic `<script>` tags in dependency order: `db → components → projections → sync → photos → search → pages → app`. Each file defines a global object (`FarmDB`, `Toast`/`Modal`/`Form`/`Components`, `Projections`, `CloudSync`, `PhotoUpload`, `Search`, `Pages`, `App`/`Actions`) and they reference each other through globals. A new file has to be added to that script list in the right order. `App.init()` runs on `DOMContentLoaded`.

**Data layer (`js/db.js`).** IndexedDB database `FarmHubDB`. Every object store and its indexes are declared in the `STORES` map. `onupgradeneeded` creates any store or index that is missing, including on existing stores, so a schema change means editing `STORES` and bumping `DB_VERSION`. Data migrations go in the same handler, gated on `event.oldVersion`. Generic CRUD helpers (`add`, `update`, `get`, `getAll`, `getAllByIndex`) sit underneath per-domain helpers (`Goats`, `Breedings`, `Vaccinations`, `Dewormings`, `Finances`, `Reminders`). Only what is attached to `window.FarmDB` at the bottom of the file is exposed. `seedDefaultData` fills in the reference `vaccineTypes`/`dewormerTypes`. `exportAllData`/`importAllData` iterate over `STORES`, and import **clears** each store before re-adding its records.

**Record IDs are numbers.** Auto-increment keys are numeric, but form values and `data-goat-id` attributes are strings. The CRUD helpers therefore coerce ids with `toKey()`, and `normalizeRefs()` converts the reference fields listed in `REF_FIELDS` (`goatId`, `doeId`, …) to numbers on every add/update. A new reference field must be added to `REF_FIELDS`, or its index lookups will silently return nothing.

**Navigation (`js/app.js`).** A single-page shell with no URL routing. Elements marked `data-page="x"` (sidebar `.menu-item`, `.bottom-nav-item`, `.section-link`) call `App.navigate(x)`. That function sets the title from a `titles` map and dispatches through `pageMap` to a `Pages.*` renderer. A new page therefore needs an entry in both maps and a menu item in `index.html`. Several nav entries (vaccinations, deworming, kidding) currently map to other pages as placeholders.

**Rendering (`js/pages.js`).** Each `Pages.x()` is async: it queries `FarmDB`, builds an HTML string, and assigns it to `#main-content.innerHTML`. Any user-entered or imported value interpolated into that HTML must be wrapped in `escapeHtml()` (defined in `components.js`), because backups and future sync make stored data untrusted. `Form.createFieldHtml` already escapes labels, values and options. Buttons carry `data-action` (and optionally `data-goat-id`). After rendering, pages call `Pages.attachActionHandlers()`, which sends clicks to `Actions.handle(action, { goatId })` in `app.js`. A new action needs an entry in the `Actions.handle` map.

**Forms.** Add/edit flows in `Actions` build modals on the fly with `Form.createFormModal(title, fields, onSubmit)` (`js/components.js`). `fields` is a declarative array that gets rendered to HTML, and submit hands `onSubmit` a plain object from `FormData`. `Toast` and `Modal` are the shared feedback/UI primitives.

**Service worker (`sw.js`).** Cache-first. **Bump `CACHE_NAME` on every release that changes a cached file**, or installed clients keep serving stale code. `STATIC_ASSETS` is maintained by hand and must list every file loaded by `index.html`, using paths relative to the service-worker scope (no leading `/`). The worker intercepts same-origin requests plus Google Fonts and cdnjs (Font Awesome), and caches CORS responses so web fonts work offline.

**Farmer-facing veterinary content.** Seeded vaccine and dewormer notes in `seedDefaultData` and the guides in `Pages.guides()` give dosing and safety advice. Treat changes there as safety-critical. `seedDefaultData` only runs on empty stores, so correcting text in existing installs needs an explicit update, as with `ALBENDAZOLE_NOTE`.

**Partially wired modules.**
- `js/sync.js` (`CloudSync`) targets a planned Cloudflare Workers backend. `API_URL` is still a placeholder, and nothing calls `CloudSync.init()` yet. Its merge strategy is "server wins" by `updatedAt`.
- `js/photos.js` (`PhotoUpload`) resizes images on a canvas and stores them as JPEG data URLs, but no page uses it yet.
- The `sync` and `push` handlers in `sw.js` are stubs.
