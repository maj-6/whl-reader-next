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

export function createViewer(opts = {}) {
  const { el, bus, profile = {}, pages = [], start, store } = opts;
  const showRegionOverlays = opts.regions !== false;
  injectCss();
  const layout = profile.layout || 'single';
  const rtl = profile.direction === 'rtl';
  const keys = pages.map(p => p.key);
  const byKey = {}; pages.forEach(p => { byKey[p.key] = p; });

  // world rects: equal height 1, widths from aspect; rtl → page N+1 to the LEFT
  const rects = {}; let cx = 0;
  for (const p of pages) {
    const a = (p.w > 0 && p.h > 0) ? p.w / p.h : 0.7;
    rects[p.key] = rtl ? { x: -(cx + a), y: 0, w: a, h: 1 } : { x: cx, y: 0, w: a, h: 1 };
    cx += a + GAP;
  }

  let cur = (start && keys.includes(start)) ? start : keys[0];
  let curView = null, destroyed = false, inSel = false, lastH = null;
  let osd = null, strip = null, shown = null, ro = null, scrollRaf = 0;
  const planes = {}, regionsBuilt = {}, regionEls = new Map(), wordEls = new Map();
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
    d.addEventListener('pointerenter', () => emit('hover', { src: 'viewer', page: k, region: r }));
    d.addEventListener('pointerleave', () => emit('hover:clear'));
    d.addEventListener('click', e => { e.stopPropagation(); select(k, r); });
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
    d.addEventListener('pointerenter', () => emit('hover', { src: 'viewer', page: k, region: r, word: [r, i] }));
    d.addEventListener('pointerleave', () => emit('hover', { src: 'viewer', page: k, region: r }));
    d.addEventListener('click', e => { e.stopPropagation(); select(k, r); });
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
      for (const [key, d] of wordEls) if (!keep.has(d)) { d.remove(); wordEls.delete(key); }
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
    const box = regionBox(k, r), pr = rects[k];
    if (!osd || !box || !pr) return;
    const w = (box[2] - box[0]) * pr.w, h = box[3] - box[1];
    const px = Math.max(w * 0.2, 0.02), py = Math.max(h * 0.35, 0.02);
    try {
      osd.viewport.fitBounds(new OSD.Rect(pr.x + box[0] * pr.w - px, box[1] - py, w + 2 * px, h + 2 * py), !!imm);
    } catch { }
  }
  function addPageOSD(k) {
    const p = byKey[k], r = rects[k];
    osd.addTiledImage({
      tileSource: { type: 'image', url: p.url }, x: r.x, y: r.y, width: r.w,
      success: () => { if (!destroyed && k === cur) fitPage(k, true); },
      error: () => {
        if (destroyed) return;
        try { osd.addOverlay({ element: placeholder(k), location: new OSD.Rect(r.x, r.y, r.w, r.h) }); } catch { }
        if (k === cur) fitPage(k, true);
      }
    });
    try { osd.addOverlay({ element: plane(k), location: new OSD.Rect(r.x, r.y, r.w, r.h) }); } catch { }
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
    for (const p of pages) {
      const fp = document.createElement('div');
      fp.className = 'wv-fpage'; fp.dataset.page = p.key;
      if (p.w > 0 && p.h > 0) fp.style.aspectRatio = p.w + '/' + p.h;
      const img = new Image(); img.src = p.url; img.alt = p.key; img.draggable = false;
      img.onerror = () => { const ph = placeholder(p.key); ph.style.height = '100%'; ph.style.aspectRatio = (p.w > 0 ? p.w : 3) + '/' + (p.h > 0 ? p.h : 4); img.replaceWith(ph); };
      fp.appendChild(img); fp.appendChild(plane(p.key));
      strip.appendChild(fp);
      buildRegions(p.key);
    }
    el.appendChild(strip);
    strip.addEventListener('scroll', () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; stripTrack(); });
    }, { passive: true });
    requestAnimationFrame(() => { if (destroyed) return; stripGoto(cur, { immediate: true }); stripTrack(); });
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
  function select(page, region) {
    if (layout === 'single' && page !== cur) goto(page);
    if (osd) zoomRegion(page, region);
    else if (strip) {
      const d = regionEls.get(page + '/' + region);
      if (d) d.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      else stripGoto(page, {});
    }
    if (!inSel) { inSel = true; try { emit('select', { page, region }); } finally { inSel = false; } }
  }
  function applyHighlight(h) { lastH = h || null; paint(); }
  function setRegionsVisible(v) { for (const k in planes) planes[k].classList.toggle('wv-vis', !!v); }
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
    if (osd) { try { osd.destroy(); } catch { } osd = null; }
    if (el) { el.innerHTML = ''; el.classList.remove('wv-host'); }
    regionEls.clear(); wordEls.clear(); painted = [];
  }

  // ---------- init ----------
  if (!el) return { goto() { }, next() { }, prev() { }, current: () => cur, select() { }, applyHighlight() { }, setRegionsVisible() { }, addOverlayEl() { return null; }, destroy() { } };
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
      else if (p.name === 'words' || p.name === 'glyphs') { if (lastH) paint(); }
    }));
    offs.push(bus.on('nav', p => {
      if (!p || !keys.includes(p.page)) return;
      if (p.region != null) select(p.page, p.region); else goto(p.page);
    }));
  }

  return { goto, next, prev, current: () => cur, select, applyHighlight, setRegionsVisible, addOverlayEl, destroy };
}
