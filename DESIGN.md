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
| **Explore** | full-bleed OSD | floating lens/strip, unobtrusive | manuscripts, plates, scrolls (E52, EB01, E25 plates) |

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

## Component library (iteration 2)

The reader machinery is packaged as vanilla ES modules in `mockups/lib/` with a written contract ([lib/API.md](mockups/lib/API.md)) so mockups compose instead of reimplementing: `whl-bus` (events), `whl-chrome` (topbar + persistence), `whl-store` (layer fetching, priority order, simulated latency), `whl-viewer` (OSD plane: single & scroll-h RTL profiles, overlays, fallbacks), `whl-text` (reading pane: atomic spans, entities), `whl-linker` (hover/select → weighted highlights), `whl-sidebar` (contents / this page / article / appearance). Live playground + API cheat-sheets: `mockups/lib/components.html`. The readers run on **real extracted corpus data** (`lib/data/`): E17 page-0382, EB01 cols 0044–0048, E52 page-0014. These modules are mockup-grade seeds of the production reader, not throwaway.

## Mockup set (this phase)

| File | Shows |
|---|---|
| `index.html` | hub: all mockups + open design questions |
| `library.html` | library home: landmark features, work clusters, tier badges |
| `overview-landmark.html` | Ebers work page: hero, catalog, summary, read-more, witnesses, suggested reading |
| `overview-standard.html` | standard + minimal tier overviews |
| `work-dioscorides.html` | work hub: witness compare, translation switcher |
| `reader-codex.html` | Facsimile+Study modes, real OSD, sidebar, basic/advanced |
| `reader-scroll.html` | EB01 horizontal RTL roll in OSD, column nav, hiero layers |
| `reader-explore.html` | visual-first explore mode + embed variants |
| `streaming.html` | architecture + progressive-loading simulation |

Mockups are static, self-contained, GitHub-Pages-hosted; imagery = real corpus thumbs + downscaled sample pages in `mockups/assets/`.
