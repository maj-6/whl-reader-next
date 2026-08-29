# WHL reader component library (mockup-grade)

Vanilla ES modules, no build step. Pages compose them; nothing here touches page-specific markup. All colors via `tokens.css` vars. OpenSeadragon is an optional global (`window.OpenSeadragon`); every consumer must work (degraded) without it. Served over HTTP (fetch()-based) — not file://.

```
lib/
  whl-bus.js      event hub
  whl-chrome.js   topbar + persistence (scheme/mode/adv) + mock-note
  whl-store.js    layer fetching w/ priority + simulated latency
  whl-viewer.js   OSD facsimile plane: profiles, overlays, hover/select
  whl-text.js     reading pane: regions, atomic spans, entities
  whl-linker.js   hover/selection brain: association groups → highlight weights
  whl-sidebar.js  tabbed sidebar: contents / this page / article / appearance
  data/<BOOK>/<page-key>/{source,entities,associations,words|glyphs}.json
```

## Identity conventions

- pageKey: `page-0382` / `col-0045`. Region id: page-local index `int`. Qualified region: `{page, region}`.
- Word ref: `[region, wordIndex]` into `words.json` (E17) or `glyphs.json` (EB01).
- Group id: from associations layer (`E17-p0382-g0001`).
- Highlight weights: `'hlC'` (context) < `'hlR'` (resolved) < `'sel'` (selected). CSS classes of same name.

## Data files (already extracted, real corpus)

- `source.json` `{book, page_key, px:[w,h], language, regions:[{type, box:[x0,y0,x1,y1] normalized, text, translation, lines?, case_label?}]}`
- `entities.json` `[{id, type: author|plant|citation|substance, label, mentions:[{region, quote, in?}], summary, canonical}]`
- `associations.json` `{page_key, groups:[{id, s:[{r, u:[s,e]}], t:[{r, u:[s,e]}], w:[[region,idx]]}]}` — `u` = UTF-16 offsets into region text (s) / translation (t); `w` = image word refs.
- `words.json` `[[x0,y0,x1,y1], …]` region-independent page word boxes (index = word ref target). `glyphs.json` `[{box, text}]` same role for EB01.

## whl-bus.js

```js
createBus() → { on(type, fn)→off, off(type, fn), emit(type, payload) }
```
Event names used across modules: `hover` `{src:'viewer'|'text', page, region, word?, group?, px?, py?}` | `hover:clear` | `select` `{page, region, group?, px?, py?}` | `select:clear` | `highlight` `{regions:Map<'page/idx',weight>, words:Map<'page/r:i',weight>, groups:Map<id,weight>}` | `view` `{page}` (viewer's current page/col changed) | `layer` `{page, name, status:'pending'|'loading'|'ready'|'error'}` | `mode` `{mode}` | `adv` `{on}` | `nav` `{page, region?}` (sidebar → viewer/text).

## whl-chrome.js

```js
mountChrome({ title, back='index.html'|false, book?:{label,title,thumb},
  modes?:['study','facsimile','explore'], modesDisabled?:[…], mode?, adv?:true,
  note?:string(trusted HTML), bus?, mockSwitch?:'full'|'mode-only'|'none' }) → { el, on(ev,fn), set(k,v) }
```
Renders `.topbar` (back link, book chip, mode segmented control, Basic/Advanced switch, `.mock-switch`) and the dismissible `.mock-note`. Mount target: the topbar is **prepended to `document.body`** (and the mock-note appended to it); there is no target option — pages that need the indicator or other topbar extras insert into the returned `chrome.el`. Owns localStorage: `whlnext-scheme`, `whlnext-mode`, `whlnext-adv` ('1'/'0'); sets `data-scheme/mode/adv` on `<html>`. Events: `'mode'`, `'adv'` — pass `bus` and chrome also emits them on the page bus (no manual bridging). Single-fire toggle (no label double-fire).

Adv visibility is `<html>`-scoped: chrome injects `html:not([data-adv="1"]) .adv-only { display:none }` — pages migrating from the older reference mockups should drop their `body[data-adv]`-scoped `.adv-only` rules.

Appearance persistence delegation: chrome listens for `CustomEvent('whl-appearance', { detail: { scheme?, mode? } })` on `document` (whl-sidebar's appearance panel dispatches it). `scheme` ∈ archive|herbarium|oxford, `mode` ∈ light|dark.

Not in the contract: the reader's page indicator ("p. N" + loaded dots) is page-rendered — build it from store `layer` events and insert it into `chrome.el`.

## whl-store.js

```js
createStore({ base:'lib/data', book, bus, pages:[pageKey…], layers?:{pageKey:[names]}, latency?:0|'3g' })
  → { load(pageKey)→Promise<pagedata>, get(pageKey), status(pageKey), prefetch(pageKey) }
```
Fetches layer files in canonical priority order `source → words|glyphs → associations → entities`, emitting `layer` events per arrival (image tiles are the viewer's business; store still emits a synthetic `tiles` status so dots can show 5 layers). Words vs glyphs is **not derivable from the contract**: store hardcodes `glyphs` for book `'EB01'` and `words` otherwise; `layers:{pageKey:[names]}` is the escape hatch for future books. `latency:'3g'` inserts staged delays so streaming is visible. Timing note: `load()` resolves when the text layers settle, but the synthetic `tiles` ready may land slightly later — `status(pageKey)` can briefly report `tiles:'loading'` after `load()` resolves (harmless for dot UIs). Missing file → status `'error'`, page still usable (col-0047 has images only — must degrade to image-only gracefully). Post-processes: builds per-region span indexes from associations (`bySource[region]`, `byTranslation[region]`, `byWord['r:i']` → group ids).

## whl-viewer.js

```js
createViewer({ el, bus, store, book,
  profile:{ layout:'single'|'scroll-h', direction?:'rtl', zoom?:{max?,min?},
            gap?:0.02, zoomOnSelect?:true },
  pages:[{ key, url, w, h, clip?:{top?,bottom?,left?,right?} }], regions?:true, start?:pageKey }) →
  { goto(pageKey, opts?), next(), prev(), current(), select(page, region),
    applyHighlight(h), setRegionsVisible(bool), setWordBoxes(pageKey, bool),
    addOverlayEl(page, box, el), destroy() }
```
- `scroll-h` lays pages edge-to-edge in one OSD world honoring `direction:'rtl'` (col N+1 left of N; `next()` pans toward reading direction). `single` = one image.
- `pages[].clip`: fractions of the source image to crop per side (scanner borders). The clipped window — not the full image — is normalized to world height 1 with x-advance = clipped aspect; region/word overlay boxes stay fractions of the full image and are compensated for the clip offset automatically. OSD mode uses `tiledImage.setClip`; the no-OSD strip crops via an overflow-hidden wrapper (same visual result).
- `profile.gap`: world gap between pages in `scroll-h` (default 0.02); `gap:0` butts pages exactly edge-to-edge (strip fallback maps 0 → 0px, otherwise keeps its default spacing).
- `profile.zoomOnSelect:false`: `select()` highlights + emits without moving the viewport.
- `hover`/`select` bus events carry `px`/`py` (pointer client coords) when a real pointer caused them; absent for programmatic calls.
- `setWordBoxes(pageKey, on)`: paints/removes ALL word/glyph boxes of a page as passive outlines (`.wv-wordvis`, pointer-events none) — independent of the `applyHighlight` path, which keeps painting over them.
- Region overlays from `store.get(page)`'s `source.regions[].box` (pass `store`; without it the viewer is image-only), word boxes on demand from `words/glyphs`; overlay DOM carries `data-p`/`data-r` (and `data-w`); pointer hit-testing emits `hover`/`select` on the bus (clicks via one `OpenSeadragon.MouseTracker` per overlay in OSD mode, a plain listener in the fallback strip — never both).
- Emits `view {page}` as viewport center crosses page bounds. With `profile.viewportEvents:true` also emits rAF-throttled `viewport {x,y,w,h}` (world bounds) on every pan/zoom/scroll — for facing panes that track the roll continuously. `viewportInfo()` returns the same on demand; `worldRect(pageKey)` returns a page's world rect (clipped geometry, `{x,y,w,h}`, height 1).
- `addOverlayEl` wrappers are positioned by OSD in CSS px: the wrapper's px size tracks zoom, so children sized in % scale with the page while children sized in fixed px keep constant screen scale (position world-anchored either way). Wrappers ship `pointer-events:none`; interactive content sets `pointer-events:auto` on its own node and, in OSD mode, needs an `OpenSeadragon.MouseTracker` for real clicks.
- `hover`/`select` may carry `groups` (array of association group ids) alongside the singular `group`; the linker resolves either.
- MUST include: visibility/rAF guard (hidden pane → stale container; re-home on first real resize), `window.OpenSeadragon` absence fallback (static strip w/ positioned overlays, same events), image load error placeholder.

## whl-text.js

```js
createTextPane({ el, bus, store, book, page, layout?:'pair'|'stacked'|'strip', stripShow?:'both' }) →
  { applyHighlight(h), scrollTo(region, opts?), setLayout(l), setRegion(i), destroy() }
```
Renders `source.regions` as `.rg-el[data-r]` sections: transcription `.tx` + translation `.xl` (tinted). When associations ready, wraps group spans in `<span data-g>` (UTF-16 offsets; code-point safe); when entities ready, wraps mention quotes in `.ent.<type>` anchors (first match per region per quote). Rubric/`case_label` chrome where present. Hover/click on spans → bus `hover`/`select` with group (+ `px`/`py` from real pointers). `'strip'` = single-region running line (scroll reader / explore lens), showing translation when present else transcription; `stripShow:'both'` stacks the transcription line over the translation line when both exist.
- `setRegion(i)` sets the displayed region directly with no bus side-effects (strip re-renders; pair/stacked scroll to it).
- Region-level hover parity: in pair/stacked, hovering a region block that has NO `[data-g]` spans (association-less witnesses like E28) emits `hover {src:'text', page, region}` and `hover:clear` on leave; regions WITH spans keep span-driven hover only (no duplicate region-level emits).

## whl-linker.js

```js
createLinker({ bus, store }) → { destroy() }
```
The brain. On `hover`: resolve group(s) via store indexes → build highlight maps: hovered span's own region = `hlC`, group counterpart spans/words/regions = `hlR`; on `select`: same at `sel`, persists until `select:clear`/next select. Emits one debounced (rAF) `highlight` event; viewer/text/sidebar apply. Never crosses pages (group refs are page-local by construction).

## whl-sidebar.js

```js
createSidebar({ el, bus, tabs:{ contents?, thispage?, article?, appearance? } }) →
  { open(tab), setThisPage(items), setContents(tree), el }
```
- contents: tree `[{id, title, sub?, target:{page, region?}, importance?, children?}]` → collapsible; click emits `nav`.
- thispage: cards `[{kind:'entity'|'citation'|'note', entity?, relevance?, body?, actions?}]` sorted by relevance, entity-typed accents, collapsible citation excerpt, "Add to reading list" / "Open in tab" stub actions.
- appearance: scheme/mode/text-size controls (delegates persistence to chrome via document events).
- Listens to `view` to retitle "This page"; listens to `highlight` to softly mark cards whose entity is active.

## Composition sketch (what pages do)

```js
import {createBus} from './lib/whl-bus.js'; …
const bus = createBus();
const chrome = mountChrome({title:'中药大辞典 · vol 2', modes:['study','facsimile'], …});
const store = createStore({book:'E17', bus, pages:['page-0382'], latency:'3g'});
const viewer = createViewer({el: $('#osd'), bus, store, book:'E17', profile:{layout:'single'},
  pages:[{key:'page-0382', url:'assets/pages/E17-page.jpg', w:1100, h:1600}]});
const text  = createTextPane({el: $('#read'), bus, store, book:'E17', page:'page-0382'});
const side  = createSidebar({el: $('#side'), bus, tabs:{…}});
createLinker({bus, store});
bus.on('highlight', h => { viewer.applyHighlight(h); text.applyHighlight(h); });
store.load('page-0382');
```

Module budget: keep each ≤ ~400 lines; no cross-module imports except whl-bus types implied by events. Report API friction instead of hacking around it.

## Notes & known seams (v1 — candidates for the production port)

Behavior notes:
- `mountChrome` `note` is injected as **trusted HTML** (the one unescaped string input); `title`/`back`/`book` are escaped. `back:false` hides the back link; `modesDisabled` renders a mode present-but-disabled; `mockSwitch:'mode-only'|'none'` trims the scheme switcher (art-direction pages).
- Reading size: `whl-text` sizes `.tx/.xl` with `var(--read-size, 16.5px)`; the sidebar appearance slider sets `--read-size` on `<html>` (persist key `whlnext-readsize`).
- Only ~500 of E17 p.0382's 1,400 association groups carry `w` word refs — a translation hover without facsimile word boxes is data coverage, not a linker bug.
- `whl-linker` races rAF against a 32ms macrotask so highlights land even in occluded/hidden windows.

Known seams (deliberately deferred; pages currently work around them):
1. `whl-store` reports a missing layer file as `'error'`; a distinct `'absent'` status would let advanced UIs say "no layer for this witness" without implying breakage. (Pages currently style error dots per context.)
2. `whl-viewer` re-home fires on the first sane container size, which can land mid-CSS-transition (study→facsimile); a settle-debounce would remove reader-codex's delayed `goto` workaround.
3. `whl-sidebar`: no sanctioned custom-content slot in contents/thispage (column map is prepended into internal DOM); citation cards lack a distinct resolved-quotation field (excerpt currently shows the entity summary).
4. Navigation scrolling uses `scrollIntoView({behavior:'smooth'})`, which crawls in throttled panes; pages ship verify-and-jump fallbacks.

Resolved in v1.1: overlay clicks from real pointers in OSD mode (MouseTracker per overlay), `pages[].clip`, `profile.gap`, `profile.zoomOnSelect:false`, `px`/`py` on pointer-caused hover/select, `setWordBoxes()`, strip `setRegion()` + `stripShow:'both'`, region-level hover parity for association-less witnesses.
