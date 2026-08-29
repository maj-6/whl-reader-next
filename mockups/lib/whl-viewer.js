// whl-viewer.js — OSD facsimile plane: profiles, region/word overlays, hover/select.
// OpenSeadragon 5 optional global; degrades to a static flex strip with the same events.

const CSS = `
.wv-host{position:relative;overflow:hidden;background:var(--bg-sunk);min-height:0}
.wv-plane{pointer-events:none;overflow:visible}
.wv-plane>*{position:absolute}
.wv-region{pointer-events:auto;cursor:pointer;border-radius:2px}
.wv-plane.wv-vis>.wv-region{background:var(--tint-region);box-shadow:inset 0 0 0 1px var(--line-2)}
.wv-region.hlC{background:var(--tint-region);box-shadow:inset 0 0 0 1px var(--line-2)}
.wv-region.hlR{background:var(--tint-select);box-shadow:inset 0 0 0 1px var(--accent)}
.wv-region.sel{background:var(--tint-select);box-shadow:inset 0 0 0 2px var(--accent)}
.wv-word{pointer-events:auto;cursor:pointer;border-radius:2px}
.wv-word.hlC{background:var(--tint-region)}
.wv-word.hlR{background:var(--tint-select);box-shadow:0 0 0 1px var(--accent)}
.wv-word.sel{background:var(--tint-select);box-shadow:0 0 0 2px var(--accent)}
.wv-wvlayer{position:absolute;inset:0;pointer-events:none}
.wv-wordvis{position:absolute;pointer-events:none;border-radius:2px;outline:1px solid color-mix(in srgb,var(--line-2) 55%,transparent)}
.wv-strip{display:flex;gap:10px;height:100%;overflow-x:auto;overflow-y:hidden;padding:10px;align-items:center;scrollbar-width:thin}
.wv-strip.wv-rtl{direction:rtl}
.wv-fpage{position:relative;height:calc(100% - 4px);flex:0 0 auto;box-shadow:var(--shadow);background:var(--bg-raise)}
.wv-fpage img{height:100%;width:auto;display:block;user-select:none;-webkit-user-drag:none}
.wv-fpage>.wv-plane{position:absolute;inset:0}
.wv-ph{display:flex;align-items:center;justify-content:center;text-align:center;background:var(--bg-sunk);border:1px dashed var(--line-2);color:var(--ink-3);font:12px/1.4 var(--font-chrome);border-radius:var(--radius)}
`;
function injectCss() {
  if (document.getElementById('whl-viewer-css')) return;
  const s = document.createElement('style'); s.id = 'whl-viewer-css'; s.textContent = CSS;
  document.head.appendChild(s);
}
const WTS = ['hlC', 'hlR', 'sel'];
const SANE = 60, GAP = 0.02;
const entries = m => !m ? [] : (m instanceof Map ? [...m.entries()] : Object.entries(m));
// pages[].clip → normalized {top,bottom,left,right} fractions of the SOURCE image, or null
function normClip(c) {
  if (!c) return null;
  const f = v => Math.max(0, Math.min(0.45, +v || 0));
  const n = { top: f(c.top), bottom: f(c.bottom), left: f(c.left), right: f(c.right) };
  return (n.top || n.bottom || n.left || n.right) ? n : null;
}
// attach client pointer coords when a real pointer event caused the emit
const pxy = (e, p) => { if (e && typeof e.clientX === 'number') { p.px = e.clientX; p.py = e.clientY; } return p; };

export function createViewer(opts = {}) {
  const { el, bus, profile = {}, pages = [], start, store } = opts;
  const showRegionOverlays = opts.regions !== false;
  injectCss();
  const layout = profile.layout || 'single';
  const rtl = profile.direction === 'rtl';
  const keys = pages.map(p => p.key);
  const byKey = {}; pages.forEach(p => { byKey[p.key] = p; });

  // world rects: the CLIPPED region of each page is normalized to height 1, x-advance =
  // clipped aspect; rtl → page N+1 to the LEFT. imgRects = where the FULL image sits so
  // the clipped window lands exactly on rects (overlay boxes are fractions of the full image).
  const gap = Number.isFinite(profile.gap) ? Math.max(0, profile.gap) : GAP;
  const rects = {}, imgRects = {}, clips = {}; let cx = 0;
  for (const p of pages) {
    const a = (p.w > 0 && p.h > 0) ? p.w / p.h : 0.7;
    const c = clips[p.key] = normClip(p.clip);
    const cw = c ? 1 - c.left - c.right : 1, ch = c ? 1 - c.top - c.bottom : 1;
    const ca = a * cw / ch;
    const x = rtl ? -(cx + ca) : cx;
    rects[p.key] = { x, y: 0, w: ca, h: 1 };
    const W = a / ch, H = 1 / ch;
    imgRects[p.key] = c ? { x: x - c.left * W, y: -c.top * H, w: W, h: H } : rects[p.key];
    cx += ca + gap;
  }

  let cur = (start && keys.includes(start)) ? start : keys[0];
  let curView = null, destroyed = false, inSel = false, lastH = null;
  let osd = null, strip = null, shown = null, ro = null, scrollRaf = 0;
  const planes = {}, regionsBuilt = {}, regionEls = new Map(), wordEls = new Map();
  const wordVis = {}, wordVisOn = {}, trackers = new Set();
  let painted = [];
  const offs = [];
  const emit = (t, p) => { if (bus && bus.emit) bus.emit(t, p); };
  const OSD = typeof window !== 'undefined' ? window.OpenSeadragon : null;

  const pct = (st, box) => {
    st.left = box[0] * 100 + '%'; st.top = box[1] * 100 + '%';
    st.width = Math.max(0, box[2] - box[0]) * 100 + '%'; st.height = Math.max(0, box[3] - box[1]) * 100 + '%';
  };
  const pageData = k => { try { return store && store.get ? store.get(k) : null; } catch { return null; } };
  const regionBox = (k, r) => pageData(k)?.source?.regions?.[r]?.box || null;

  function plane(k) {
    let pl = planes[k];
    if (!pl) {
      pl = document.createElement('div'); pl.className = 'wv-plane'; pl.dataset.page = k;
      planes[k] = pl;
    }
    return pl;
  }

  function regionEvents(d, k, r) {
    d.addEventListener('pointerenter', e => emit('hover', pxy(e, { src: 'viewer', page: k, region: r })));
    d.addEventListener('pointerleave', () => emit('hover:clear'));
    clickable(d, e => select(k, r, e));
  }

  // OSD pointer capture retargets real clicks away from overlay elements, so in OSD mode
  // each clickable overlay gets its own MouseTracker; the plain listener stays for the
  // fallback strip. Exactly one path is armed per element — no double-fire.
  function clickable(d, fn) {
    if (osd && OSD && OSD.MouseTracker) {
      const t = new OSD.MouseTracker({
        element: d,
        clickHandler: ev => { if (ev.quick === false) return; fn(ev.originalEvent || null); }
      });
      trackers.add(t);
      d._wvTracker = t;
    } else {
      d.addEventListener('click', e => { e.stopPropagation(); fn(e); });
    }
  }

  function buildRegions(k) {
    if (!showRegionOverlays || regionsBuilt[k]) return;
    const regs = pageData(k)?.source?.regions;
    if (!Array.isArray(regs)) return;
    regionsBuilt[k] = true;
    const pl = plane(k);
    regs.forEach((rg, r) => {
      if (!rg || !Array.isArray(rg.box)) return;
      const d = document.createElement('div');
      d.className = 'wv-region'; d.dataset.p = k; d.dataset.r = r;
      pct(d.style, rg.box);
      regionEvents(d, k, r);
      pl.appendChild(d);
      regionEls.set(k + '/' + r, d);
    });
  }

  // word boxes: created lazily, only for words a highlight names
  function ensureWord(key) {
    let d = wordEls.get(key);
    if (d) return d;
    const cut = key.indexOf('/');
    if (cut < 0) return null;
    const k = key.slice(0, cut), rest = key.slice(cut + 1), c2 = rest.indexOf(':');
    if (c2 < 0 || !byKey[k]) return null;
    const r = +rest.slice(0, c2), i = +rest.slice(c2 + 1);
    const data = pageData(k), arr = data?.words || data?.glyphs;
    const w = arr?.[i], box = Array.isArray(w) ? w : w?.box;
    if (!Array.isArray(box)) return null;
    d = document.createElement('div');
    d.className = 'wv-word'; d.dataset.p = k; d.dataset.r = r; d.dataset.w = i;
    pct(d.style, box);
    d.addEventListener('pointerenter', e => emit('hover', pxy(e, { src: 'viewer', page: k, region: r, word: [r, i] })));
    d.addEventListener('pointerleave', e => emit('hover', pxy(e, { src: 'viewer', page: k, region: r })));
    clickable(d, e => select(k, r, e));
    plane(k).appendChild(d);
    wordEls.set(key, d);
    return d;
  }

  function paint() {
    for (const d of painted) d.classList.remove(...WTS);
    painted = [];
    if (!lastH) return;
    for (const [key, wt] of entries(lastH.regions)) {
      const d = regionEls.get(key);
      if (d && WTS.includes(wt)) { d.classList.add(wt); painted.push(d); }
    }
    for (const [key, wt] of entries(lastH.words)) {
      const d = ensureWord(key);
      if (d && WTS.includes(wt)) { d.classList.add(wt); painted.push(d); }
    }
    if (wordEls.size > 400) {
      const keep = new Set(painted);
      for (const [key, d] of wordEls) if (!keep.has(d)) {
        if (d._wvTracker) { try { d._wvTracker.destroy(); } catch { } trackers.delete(d._wvTracker); }
        d.remove(); wordEls.delete(key);
      }
    }
  }

  function placeholder(k) {
    const p = byKey[k], ph = document.createElement('div');
    ph.className = 'wv-ph'; ph.textContent = (p && p.key ? p.key : 'page') + ' — image unavailable';
    return ph;
  }

  function trackTo(k) {
    if (!k || k === curView) return;
    curView = k; cur = k;
    emit('view', { page: k });
  }

  // ---------- OSD mode ----------
  function fitPage(k, imm) {
    if (!osd || !rects[k]) return;
    const r = rects[k];
    try { osd.viewport.fitBounds(new OSD.Rect(r.x - 0.01, r.y - 0.01, r.w + 0.02, r.h + 0.02), !!imm); } catch { }
  }
  function zoomRegion(k, r, imm) {
    const box = regionBox(k, r), ir = imgRects[k];   // region boxes are fractions of the FULL image
    if (!osd || !box || !ir) return;
    const w = (box[2] - box[0]) * ir.w, h = (box[3] - box[1]) * ir.h;
    const px = Math.max(w * 0.2, 0.02), py = Math.max(h * 0.35, 0.02);
    try {
      osd.viewport.fitBounds(new OSD.Rect(ir.x + box[0] * ir.w - px, ir.y + box[1] * ir.h - py, w + 2 * px, h + 2 * py), !!imm);
    } catch { }
  }
  function addPageOSD(k) {
    const p = byKey[k], r = rects[k], ir = imgRects[k], c = clips[k];
    osd.addTiledImage({
      tileSource: { type: 'image', url: p.url }, x: ir.x, y: ir.y, width: ir.w,
      success: ev => {
        if (destroyed) return;
        if (c && ev && ev.item) {
          try {   // clip rect in IMAGE coordinates = fractions × pixel dims
            const sz = ev.item.getContentSize();
            ev.item.setClip(new OSD.Rect(c.left * sz.x, c.top * sz.y, (1 - c.left - c.right) * sz.x, (1 - c.top - c.bottom) * sz.y));
          } catch { }
        }
        if (k === cur) fitPage(k, true);
      },
      error: () => {
        if (destroyed) return;
        try { osd.addOverlay({ element: placeholder(k), location: new OSD.Rect(r.x, r.y, r.w, r.h) }); } catch { }
        if (k === cur) fitPage(k, true);
      }
    });
    try { osd.addOverlay({ element: plane(k), location: new OSD.Rect(ir.x, ir.y, ir.w, ir.h) }); } catch { }
    buildRegions(k);
  }
  function showSingle(k) {
    if (shown === k || !osd) return;
    if (shown != null) {
      try { osd.removeOverlay(plane(shown)); } catch { }
      try { const w = osd.world; while (w.getItemCount()) w.removeItem(w.getItemAt(0)); } catch { }
    }
    shown = k;
    addPageOSD(k);
    fitPage(k, shown == null);
  }
  function initOSD() {
    const z = profile.zoom || {};
    osd = OSD({
      element: el, showNavigationControl: false, autoResize: true,
      animationTime: 0.35, springStiffness: 8.5, visibilityRatio: 0.3,
      minZoomImageRatio: z.min || 0.5, maxZoomPixelRatio: z.max || 2.5,
      gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
      crossOriginPolicy: false, tileSources: []
    });
    if (layout === 'scroll-h') { keys.forEach(addPageOSD); fitPage(cur, true); }
    else showSingle(cur);
    osd.addHandler('update-viewport', () => {
      vpEmit();
      // viewport-center → view {page}
      let c; try { c = osd.viewport.getCenter(true); } catch { return; }
      let best = null, bd = Infinity;
      for (const k of keys) {
        const r = rects[k];
        const d = c.x < r.x ? r.x - c.x : (c.x > r.x + r.w ? c.x - (r.x + r.w) : 0);
        if (d < bd) { bd = d; best = k; }
      }
      if (layout === 'single') best = shown;
      trackTo(best);
    });
  }

  // ---------- no-OSD fallback: static strip ----------
  function fpage(k) { return strip ? strip.querySelector(`.wv-fpage[data-page="${k}"]`) : null; }
  function stripTrack() {
    if (!strip) return;
    const cr = strip.getBoundingClientRect(), mid = cr.left + cr.width / 2;
    let best = null, bd = Infinity;
    for (const k of keys) {
      const fp = fpage(k); if (!fp) continue;
      const r = fp.getBoundingClientRect();
      const d = mid < r.left ? r.left - mid : (mid > r.right ? mid - r.right : 0);
      if (d < bd) { bd = d; best = k; }
    }
    trackTo(best);
  }
  function stripGoto(k, o = {}) {
    const fp = fpage(k); if (!fp) return;
    const cr = strip.getBoundingClientRect(), r = fp.getBoundingClientRect();
    strip.scrollTo({
      left: strip.scrollLeft + (r.left - cr.left) - (cr.width - r.width) / 2,
      behavior: o.immediate ? 'auto' : 'smooth'
    });
  }
  function initStrip() {
    strip = document.createElement('div');
    strip.className = 'wv-strip' + (rtl ? ' wv-rtl' : '');
    if (gap === 0) strip.style.gap = '0px';
    for (const p of pages) {
      const c = clips[p.key];
      const cw = c ? 1 - c.left - c.right : 1, ch = c ? 1 - c.top - c.bottom : 1;
      const fp = document.createElement('div');
      fp.className = 'wv-fpage'; fp.dataset.page = p.key;
      if (p.w > 0 && p.h > 0) fp.style.aspectRatio = (p.w * cw) + '/' + (p.h * ch);
      const img = new Image(); img.src = p.url; img.alt = p.key; img.draggable = false;
      img.onerror = () => { const ph = placeholder(p.key); ph.style.height = '100%'; ph.style.aspectRatio = (p.w > 0 ? p.w : 3) + '/' + (p.h > 0 ? p.h : 4); img.replaceWith(ph); };
      const pl = plane(p.key);
      if (c) {   // wrapper crops; img + overlay plane span the FULL image, shifted by the clip offset
        fp.style.overflow = 'hidden';
        const st = { position: 'absolute', left: (-c.left / cw * 100) + '%', top: (-c.top / ch * 100) + '%', height: (100 / ch) + '%' };
        Object.assign(img.style, st, { width: 'auto', maxWidth: 'none' });
        Object.assign(pl.style, st, { width: (100 / cw) + '%' });
      }
      fp.appendChild(img); fp.appendChild(pl);
      strip.appendChild(fp);
      buildRegions(p.key);
    }
    el.appendChild(strip);
    strip.addEventListener('scroll', () => {
      vpEmit();
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; stripTrack(); });
    }, { passive: true });
    requestAnimationFrame(() => { if (destroyed) return; stripGoto(cur, { immediate: true }); stripTrack(); });
  }

  // ---------- viewport reporting (opt-in continuous sync for facing panes) ----------
  function viewportInfo() {
    if (osd) {
      try { const b = osd.viewport.getBounds(true); return { x: b.x, y: b.y, w: b.width, h: b.height }; } catch { return null; }
    }
    if (!strip) return null;
    // approximate world bounds from visible page client-rects
    const cr = strip.getBoundingClientRect();
    const at = clientX => {
      let best = null, bd = Infinity;
      for (const k of keys) {
        const fp = fpage(k); if (!fp) continue;
        const r = fp.getBoundingClientRect(), wr = rects[k];
        if (clientX >= r.left && clientX <= r.right) return wr.x + ((clientX - r.left) / r.width) * wr.w;
        const d = clientX < r.left ? r.left - clientX : clientX - r.right;
        if (d < bd) { bd = d; best = clientX < r.left ? wr.x : wr.x + wr.w; }
      }
      return best;
    };
    const a = at(cr.left), b = at(cr.right);
    if (a == null || b == null) return null;
    const x0 = Math.min(a, b), x1 = Math.max(a, b);
    return { x: x0, y: 0, w: x1 - x0, h: 1 };
  }
  let vpRaf = 0;
  function vpEmit() {
    if (!profile.viewportEvents || vpRaf) return;
    vpRaf = requestAnimationFrame(() => {
      vpRaf = 0;
      const v = viewportInfo();
      if (v) emit('viewport', v);
    });
  }

  // ---------- shared API ----------
  function goto(k, o = {}) {
    if (!keys.includes(k)) return;
    cur = k;
    if (osd) { if (layout === 'single') showSingle(k); else fitPage(k, o.immediate); }
    else if (strip) stripGoto(k, o);
  }
  function next() { const i = keys.indexOf(cur); if (i < keys.length - 1) goto(keys[i + 1]); }
  function prev() { const i = keys.indexOf(cur); if (i > 0) goto(keys[i - 1]); }
  function select(page, region, ev) {
    if (profile.zoomOnSelect !== false) {
      if (layout === 'single' && page !== cur) goto(page);
      if (osd) zoomRegion(page, region);
      else if (strip) {
        const d = regionEls.get(page + '/' + region);
        if (d) d.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        else stripGoto(page, {});
      }
    }
    if (!inSel) { inSel = true; try { emit('select', pxy(ev, { page, region })); } finally { inSel = false; } }
  }
  function applyHighlight(h) { lastH = h || null; paint(); }
  function setRegionsVisible(v) { for (const k in planes) planes[k].classList.toggle('wv-vis', !!v); }
  // passive word/glyph outlines for a whole page — separate plane layer, never touches
  // the applyHighlight-driven wv-word elements.
  function buildWordVis(k) {
    if (!byKey[k] || !wordVisOn[k] || wordVis[k]) return;
    const data = pageData(k), arr = data?.words || data?.glyphs;
    if (!Array.isArray(arr) || !arr.length) return;   // layer not ready yet; retried on 'layer' ready
    const layer = document.createElement('div');
    layer.className = 'wv-wvlayer';
    for (const w of arr) {
      const box = Array.isArray(w) ? w : w?.box;
      if (!Array.isArray(box)) continue;
      const d = document.createElement('div');
      d.className = 'wv-wordvis';
      pct(d.style, box);
      layer.appendChild(d);
    }
    plane(k).appendChild(layer);
    wordVis[k] = layer;
  }
  function setWordBoxes(k, on) {
    if (!byKey[k]) return;
    wordVisOn[k] = !!on;
    if (on) buildWordVis(k);
    else if (wordVis[k]) { wordVis[k].remove(); delete wordVis[k]; }
  }
  function addOverlayEl(page, box, node) {
    if (!byKey[page] || !Array.isArray(box)) return null;
    const wrap = document.createElement('div');
    wrap.style.pointerEvents = 'none';
    pct(wrap.style, box);
    if (node) wrap.appendChild(node);
    plane(page).appendChild(wrap);
    return wrap;
  }
  function destroy() {
    destroyed = true;
    offs.forEach(f => { try { f(); } catch { } });
    if (ro) ro.disconnect();
    if (scrollRaf) cancelAnimationFrame(scrollRaf);
    for (const t of trackers) { try { t.destroy(); } catch { } }
    trackers.clear();
    if (osd) { try { osd.destroy(); } catch { } osd = null; }
    if (el) { el.innerHTML = ''; el.classList.remove('wv-host'); }
    regionEls.clear(); wordEls.clear(); painted = [];
  }

  // ---------- init ----------
  if (!el) return { goto() { }, next() { }, prev() { }, current: () => cur, select() { }, applyHighlight() { }, setRegionsVisible() { }, setWordBoxes() { }, addOverlayEl() { return null; }, viewportInfo: () => null, worldRect: () => null, destroy() { } };
  el.classList.add('wv-host');
  if (OSD && keys.length) initOSD(); else if (keys.length) initStrip();

  // self-heal: hidden/degenerate container at init starves OSD autoResize — re-home on first real size
  let sane = el.clientWidth >= SANE && el.clientHeight >= SANE;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => {
      const ok = el.clientWidth >= SANE && el.clientHeight >= SANE;
      if (ok && !sane) {
        sane = true;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (destroyed) return;
          if (osd) fitPage(cur, true);
          else if (strip) { stripGoto(cur, { immediate: true }); stripTrack(); }
        }));
      } else if (!ok) sane = false;
    });
    ro.observe(el);
  }

  if (bus && bus.on) {
    offs.push(bus.on('layer', p => {
      if (!p || p.status !== 'ready' || !keys.includes(p.page)) return;
      if (p.name === 'source') { buildRegions(p.page); if (lastH) paint(); }
      else if (p.name === 'words' || p.name === 'glyphs') { buildWordVis(p.page); if (lastH) paint(); }
    }));
    offs.push(bus.on('nav', p => {
      if (!p || !keys.includes(p.page)) return;
      if (p.region != null) select(p.page, p.region); else goto(p.page);
    }));
  }

  return { goto, next, prev, current: () => cur, select, applyHighlight, setRegionsVisible, setWordBoxes, addOverlayEl,
    viewportInfo, worldRect: k => rects[k] ? { ...rects[k] } : null, destroy };
}
