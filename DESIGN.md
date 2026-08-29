# WHL Reader Next — Design Brief (mockup phase)

Redesign of the WHL reader (`reader-app/whl_reader.py`, single-file Flask, monolithic per-book payload, plain `<img>` facsimile). This phase produces static HTML mockups for iteration; backend follows after review.

## Goals

1. **Remote streaming** — all data from object storage (S3/Supabase PoC); no monolithic payload. Per-page layer bundles fetched on viewport approach, priority-ordered: image tiles → source text → parallel → associations → entities (canonical 5-layer roster). Content-hashed immutable paths (corpus already pins SHA-256 everywhere) → aggressive HTTP caching.
2. **OpenSeadragon viewer** with per-book profiles: `paged` (codex), `continuous-v`, `scroll-h` (EB01, RTL edge-to-edge roll), deep-zoom for plates/fine detail. DZI pyramids built offline.
3. **Responsiveness at scale** — EB02 is 236 pages; the current eager hydration (~20MB) is the named blocker. Everything per-page, on-demand, cancelable.

## Information architecture

```
Library → Work → Version (witness / edition / translation) → Reader
```

- **Work** is the unit of presentation (e.g. *Ebers Papyrus*, *De materia medica*). A work groups versions: EB01 (papyrus witness) + EB02 (Joachim 1890 German trans.); E46/E47 (Amatus commentary — related work); E45/E51 (two copies of Grant Herbier); E23/E52/E53 (one Yale MS).
- **Tiers**: `landmark | notable | standard | minimal` — drives overview richness, thumbnail count, "read more" depth, suggested-reading, knowledge articles. Landmark: Ebers, Ben Cao Gang Mu, Dioscorides.
- Multiple translations = sibling versions with a switcher in the reader.

## Reader modes (per-book default, user-switchable within allowed set)

| Mode | Facsimile | Text | For |
|---|---|---|---|
| **Study** | hidden or thumbnail rail | primary, full width | dictionaries, reference (E10, E17) |
| **Facsimile** | OSD pane left (split, draggable) | reading pane right | default two-pane, like current |
| **Explore** | full-bleed OSD | window + sidebars, unobtrusive | manuscripts, scrolls, woodblocks (EB01, E54, E28) |

**Basic/advanced toggle**: basic hides layer checkboxes, confidence, engine chrome, region outlines; advanced exposes regions/lines/words layers, atomic-mapping highlight, diagnostics. Persisted.

## Sidebar (single, tabbed)

1. **Contents** — nav tree (`whl.toc.v1`: importance primary/secondary/detail drives collapse; out-of-window targets dimmed). Format-flexible: chapters (codex), columns (scroll), entries (dictionary).
2. **On this page** — dynamic, follows viewport. Relevance-ranked (new per-page `relevance` attribute on entity mentions): entity cards w/ thumbnails (plant/author/substance), commentary excerpts from multiple authors, resolved citations → collapsible translation excerpt + actions: *add to reading list* / *open in new tab*.
3. **Article** — knowledge articles bound to page/chapter.
4. **Appearance** — scheme (archive/herbarium/oxford) × light/dark, reading typography, layout, per-book defaults vs user overrides.

## Interaction invariants carried over

- Bidirectional lexical hover (text ↔ facsimile ↔ translation) via associations v2 atomic groups; three weights (context/resolved/selected); zero cross-page leakage.
- Region/line/word overlays keep normalized coords + `data-p/data-r/data-l/data-w` contract, ported to OSD overlay plane.
- Diplomatic text exactness, visible uncertainty, rubrics red.

## Streaming UX

Skeletons per arriving layer; page usable at each stage (image alone → +text → +hover → +entities). Prefetch by viewport distance; visible but quiet status (tiny layer dots, advanced mode only). Errors degrade to fewer layers, never block reading.

## Embedding

`?embed=` variants: `full` (chrome-less reader, not demoed in mockups), `excerpt` (single passage card w/ hover, "open in reader" link), `card` (cover + title + Read CTA), `explore` (visual-first). Parent site composes these.

## Design language (iteration 3 — binding)

- **Restrained, institutional.** No marketing idioms: no hero taglines, no "Try:", no feature-selling copy, no playful microcopy. The existing Archive tokens are the palette; **design effort goes to layout and interaction, not colors or fonts.**
- **Concise, declarative prose.** Assume the reader knows what they are looking at. Labels name things ("Column 45 · Eb 188–190"), they do not explain them. Show, don't tell; explanatory text is a last resort and one sentence when unavoidable.
- **Intuitive navigation without oversimplifying.** Controls where a scholar expects them; no onboarding chrome, no tooltips that restate labels.
- **The reader is the product.** It ships embedded or semi-embedded in a parent site; overview/library pages are secondary chrome around it.
- Mock-notes (mockup-only chrome) shrink to one terse line stating what is interactive.

## Explorer implementation (iteration 6 — current)

The explorer is now a **React + Tailwind + shadcn/ui** app under `app/`, built by Vite
into `mockups/explorer.html`; the other pages remain vanilla. The reader machinery is
unchanged — `whl-viewer`, `whl-text`, `whl-store`, `whl-linker` are imported as source
through one typed façade (`app/src/whl/vanilla.ts`) and driven from a `useReader` hook,
so the component library stays the single implementation of the reading substrate.

Theming is generated rather than hand-authored: twelve schemes come from a few oklch
parameters, and one token map feeds both the shadcn names (`--background`, `--card`,
`--popover`, `--border`, `--ring`) and the legacy names the vanilla modules read
(`--ink`, `--line`, `--tint-*`, `--rubric`), so both systems follow one theme.
`assets/tokens.css` is untouched and no longer loaded by the explorer.

Chrome: a masthead carrying the book's **bibliographic record** (transcribed from the
corpus `reader/<LABEL>.bib.json` sidecars, never invented) with the full record in a
popover; a **solid** left sidebar showing where the leaf on view sits in the whole book;
**floating** right panels; a minimap floating over the facsimile rather than in the
sidebar; and a movable settings panel covering scheme, element style, corner radius,
stage colour, panel opacity and blur, typefaces, reading size and leading.

## The two viewers (iteration 4)

Review settled the explorer on the **window + dual-sidebar** mechanism (all other explore concepts and the styles/split variants were rejected and deleted).

- **`explorer.html?book=EB01|E54|E28`** — visual-first. Left nav sidebar (columns/cases for the roll, entries for codex pages; collapsible sections, rail collapses to a strip). Right info sidebar, drag-resizable, collapsible sections Text / Commentary / Entities / Ask; text layout flips stacked↔side-by-side with width. **Coupling:** right sidebar collapsed → floating reading window (drag/resize/translucency); expanded → window is sucked back and selection highlights/scrolls in the sidebar.
- **`reader.html?book=E17|E18|E25`** — study/facsimile. Two-pane with draggable divider, Study mode collapses the viewer to a rail, layer-status dots (advanced), knowledge sidebar (contents/this page/article/appearance).

Shared rules: red ink (rubrics) preserved wherever transcription, translation, or hieroglyphs render; hieroglyphic display is a data-gated toggle, off by default; layer capability is driven by what each book's data actually has (glyph-level E54/EB01, word-level E17, span-level E18, region-level E28/E25).

Seamlessness: scanner borders are clipped per column (top ≈7.5%, bottom ≈8.5%; sides are continuous), clipped regions normalized to equal world height, zero world gap.

## Component library (iteration 2)

The reader machinery is packaged as vanilla ES modules in `mockups/lib/` with a written contract ([lib/API.md](mockups/lib/API.md)) so mockups compose instead of reimplementing: `whl-bus` (events), `whl-chrome` (topbar + persistence), `whl-store` (layer fetching, priority order, simulated latency), `whl-viewer` (OSD plane: single & scroll-h RTL profiles, overlays, fallbacks), `whl-text` (reading pane: atomic spans, entities), `whl-linker` (hover/select → weighted highlights), `whl-sidebar` (contents / this page / article / appearance). Contract + data schemas: `mockups/lib/API.md`. The viewers run on **real extracted corpus data** (`lib/data/`): EB01 cols 0044–0048, E54/E28/E18/E25 center pages, E17 page-0382. These modules are mockup-grade seeds of the production reader, not throwaway.

## Current file set

| File | Role |
|---|---|
| `index.html` | entry: choice between the two viewers, three books each |
| `explorer.html` | visual-first viewer (EB01, E54, E28) |
| `reader.html` | study/facsimile viewer (E17, E18, E25) |
| `streaming.html` | delivery architecture + progressive-loading simulation (backend phase) |

Everything else from earlier iterations (library/overview/work-hub pages, superseded explore concepts, art directions, the components playground) is deleted — see AGENTS.md; do not resurrect from git history. Pages are static, GitHub-Pages-hosted; imagery = corpus thumbs + downscaled samples in `mockups/assets/`; layer data extracted per book in `mockups/lib/data/`.
