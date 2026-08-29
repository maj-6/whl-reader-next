# Agent context guidelines

Rules for any session or subagent working in this repo. The goal is a small, current context: read what is listed, nothing else.

## What this repo is

Design prototype for the WHL reader (historical herbal / materia-medica library). Two viewers, six books, one component library. No backend yet; layer data is pre-extracted static JSON served over HTTP.

```
mockups/
  index.html        entry: choice of viewer
  explorer.html     visual-first viewer (?book=EB01|E54|E28) — window + dual sidebars + coupling
  reader.html       study/facsimile viewer (?book=E17|E18|E25)
  streaming.html    delivery-architecture reference (backend phase)
  explore-common.js shared roll/page substrate + hieroglyph renderer
  lib/              component library (ES modules) — contract in lib/API.md
  lib/data/         extracted corpus layers per book/page — DO NOT read into context
  assets/           images — DO NOT read into context
DESIGN.md           binding design brief + design language
AGENTS.md           this file
```

## Read this, and only this

1. `DESIGN.md` — the brief and the binding design language.
2. `lib/API.md` — the component contract, including data-file schemas. **The schemas make reading `lib/data/` unnecessary.**
3. The one page you are changing, plus `explore-common.js` if it imports it.
4. A lib module only if your task changes it.

## Do not ingest

- `lib/data/**` — hundreds of KB of layer JSON. Schemas are in API.md; if you must check a value, use a targeted `python -c` / `jq` query, never a full read.
- `assets/**`, `.git`, git history.
- The corpus at `C:\Users\amill\whl-review\` — the extraction source. Read-only, and only when re-extracting; never edit it from here.
- Superseded pages: none exist — deleted deliberately. Do not resurrect them from git history.

## Verification

- Serve over HTTP: `python -m http.server 5200 --directory <repo>` (pages fetch layer JSON; file:// fails).
- A hidden/occluded browser pane freezes rAF, CSS transitions, and OSD animation, producing FALSE failures (stale computed styles, unfired `view` events, mid-flight transitions). Front the tab and reload before believing any failure.
- Expected noise: OpenSeadragon `willReadFrequently` console warnings; 404s only for layers a book genuinely lacks.
- Esc clears selection; ArrowLeft/Right pan; red ink (`.rub`) must stay red in transcription, translation, and hieroglyphs wherever they render.

## Working in parallel

Forks are git branches with local worktrees (see README). One session per branch; never edit another branch's worktree. `main` is integration — merge, don't cherry-edit. Within a branch, one writer per file at a time.

## Design language (digest — full text in DESIGN.md)

Institutional restraint. Declarative labels, no explanatory or selling copy, no onboarding chrome. Layout and interaction are the design surface; tokens.css colors and fonts are fixed. Mock-notes: one terse line.
