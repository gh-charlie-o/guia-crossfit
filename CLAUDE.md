# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Movement Finder": a static, installable (PWA) search page for CrossFit movements. The user types a
name, abbreviation or alias (snatch, T2B, HSPU) and gets a card that opens the official demo video.
Vanilla HTML/CSS/JS with no dependencies, no build step, no package manager, no tests or linter.
Google Fonts is the only external resource.

## Running locally

Serve the repo root over HTTP — opening `index.html` via `file://` breaks the `fetch()` of the
data file and the service worker registration:

```sh
python3 -m http.server 8000   # then http://localhost:8000/
```

The service worker caches the app shell cache-first, so after editing HTML/CSS/JS a normal reload
can show stale files. Use DevTools → Application → "Update on reload" / unregister, or a hard reload.

## Architecture

- `index.html` — all static markup (header, search box, empty state, footer, modal). Filter pills
  and result cards are injected by JS into `#filters` and `#results`.
- `js/app.js` — single script, no modules. A global `state` (`movements`, `query`, `category`)
  plus an `els` map of DOM refs; every change to query or category re-renders the whole list via
  `renderResults()`. Search is a substring match of the accent/case-normalized query (`normalize()`)
  against `name`, `abbreviation`, `id`, `aliases` and `keywords`. The query is mirrored to
  `?search=` with `history.replaceState` and read back on load, so search URLs are shareable.
  The modal builds the YouTube iframe (`youtube-nocookie.com`) lazily on open and empties it on
  close to stop playback; it uses `inert` on siblings plus a manual Tab focus trap as fallback.
- `data/movements.json` — the whole catalogue, an array of objects:
  `id` (kebab-case, unique), `name`, optional `abbreviation`, `aliases[]`, `categories[]`,
  `equipment[]`, `keywords[]` (extra search terms, incl. Spanish ones like "sentadilla"),
  `youtubeId`, `sourceUrl` (crossfit.com essentials page). Empty `youtubeId` → the card links to
  `sourceUrl` instead; both empty → "Demostración no disponible". Order in the file doesn't matter
  (results are sorted by name at render time).
- `sw.js` — precaches `APP_SHELL` plus `movements.json` on install (with `cache: "reload"`, because
  the host sends a one-week `max-age` and the HTTP cache would otherwise feed stale files into a new
  cache version). Cache-first for the shell, with `ignoreSearch` on navigations so `?search=` URLs
  open offline; network-first with cache fallback for `movements.json` (works offline in the gym but
  picks up data changes when online).
- `css/style.css` — dark "tactical HUD" theme driven by custom properties in `:root`.

### Cross-file couplings to keep in sync

- **Categories** are a fixed set: `Weightlifting`, `Gymnastics`, `Monostructural`. Adding one means
  touching `CATEGORY_STYLE` and the lists in `buildFilterPills()` in `app.js`, plus the color tokens
  (`--<color>`, `-soft`, `-border`) and a `.chip-dot.cat-<name>` rule in `style.css`. Cards and the
  modal are colored by the movement's *first* category through the `--cat-color/--cat-border/--cat-soft`
  variables set inline by JS.
- **Service worker cache**: when shell files change in a way that must reach installed clients, or a
  file is added/renamed/removed, update `APP_SHELL` and bump `CACHE_NAME` (`movement-finder-vN`) in
  `sw.js`; the `activate` handler deletes old caches.
- **Deployment**: Hostinger's Git integration deploys `main` to the site root on every push
  (`https://blanchedalmond-caribou-619522.hostingersite.com/`); there is no GitHub Action. The whole
  repo is published, so anything tracked is publicly reachable. Keep asset and fetch paths relative
  (no leading `/`) so the site still works if it moves to a subpath. Absolute URLs for
  canonical/Open Graph/Twitter meta live in `index.html` and must change with the domain;
  `manifest.json` uses `start_url`/`scope` of `.`.

## Conventions

- UI text and code comments are in Spanish, rioplatense register (voseo: "escribí", "revisá");
  movement names, categories and equipment stay in English as CrossFit uses them.
- DOM is built with `createElement` + `textContent`; `innerHTML` is only used with the hardcoded
  SVG strings from `ICONS`. Icons are inline SVGs, no icon library.
- Show/hide with the `hidden` attribute.
