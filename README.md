# FarmHub

Offline-first goat farm management for Kenyan smallholders. FarmHub is a Progressive Web App (PWA): it installs from the browser onto any Android phone, works without a connection, and keeps all records on the device.

**Status:** early pilot. Everything runs locally in the browser, with no accounts or cloud sync yet. See [docs/ROADMAP.md](docs/ROADMAP.md) for the path to a production service.

## Features

| Area | What works today |
|---|---|
| Herd | Goat profiles (tag, breed, sex, dam/sire, source, purchase price), weights, search |
| Health | Vaccination and deworming records with FAMACHA scores; seeded Kenyan vaccine list (PPR, CCPP, enterotoxaemia, goat pox, …) and dewormers |
| Breeding | Service records with a 150-day gestation estimate, active pregnancies, kidding records |
| Money | Income/expense ledger in KES with a monthly summary |
| Planning | 5-year herd and cash-flow projection |
| Reminders | Due vaccinations and upcoming kiddings |
| Data | JSON export/import for backup and moving to a new phone |
| Offline | Full app shell, fonts and icons cached by the service worker |

## Running locally

No build step or dependencies are needed. Serve the folder over HTTP. `file://` won't work, because service workers and IndexedDB need a real origin.

```bash
python -m http.server 8000
```

Open http://localhost:8000. To test the installed/offline experience, use Chrome DevTools → Application → Service Workers and tick **Offline**.

## Deploying

Upload the repository root to any static host (GitHub Pages, Cloudflare Pages, Netlify). All paths are relative, so hosting under a subpath such as `https://user.github.io/farmhub-web/` works.

**For every release that changes a cached file, bump `CACHE_NAME` in [sw.js](sw.js).** Otherwise installed phones keep serving the old version.

## Installing on a phone

1. Open the app URL in Chrome on Android.
2. Tap ⋮ → **Add to Home screen** (or **Install app**).
3. Open it from the home screen. It works offline from then on.

## Your data

Records live in the phone browser's IndexedDB. Clearing browser data, uninstalling Chrome or losing the phone deletes them. Until cloud sync ships, use **Export/Import** regularly and keep the JSON file somewhere safe (e.g. email it to yourself or save it to Google Drive).

## Project layout

```
index.html        App shell; loads js/*.js in dependency order
manifest.json     PWA install metadata
sw.js             Service worker: precache + offline
css/style.css     All styles
js/db.js          IndexedDB schema, migrations, data access (FarmDB)
js/components.js  Toast, Modal, Form builder, list items, escapeHtml
js/pages.js       Page renderers
js/app.js         Boot, navigation, add/edit actions
js/projections.js 5-year projection model
js/search.js      Global search
js/sync.js        Cloud sync client (not yet enabled)
js/photos.js      Photo capture/resize (not yet wired into pages)
docs/ROADMAP.md   Competitive analysis, production plan, funding
```

Developer notes (architecture, conventions, gotchas) are in [CLAUDE.md](CLAUDE.md).

## Built for Kenya 🇰🇪

Kenya-specific vaccines (PPR, CCPP), FAMACHA scoring for barber's pole worm, KES currency, and common Kenyan breeds (East African, Galla, Boer, Toggenburg, Alpine and crosses).

**Kazi iendelee! 🐐**
