// whl-linker.js — hover/selection brain: association groups → highlight weights.
const RANK = { hlC: 1, hlR: 2, sel: 3 };
const layerOf = (pd, ...names) => {
  if (!pd) return null;
  for (const n of names) { if (pd[n]) return pd[n]; if (pd.layers && pd.layers[n]) return pd.layers[n]; }
  return null;
};

export function createLinker({ bus, store } = {}) {
  let sel = null, hov = null, raf = 0, offs = [];
  const cache = new Map(); // page → {ref, byId, byWord}

  function idx(page) {
    const pd = (store && store.get) ? store.get(page) : null;
    const assoc = layerOf(pd, 'associations', 'assoc');
    const c = cache.get(page);
    if (c && c.ref === assoc) return c;
    const byId = new Map(), byWord = new Map();
    for (const g of (assoc && assoc.groups) || []) {
      byId.set(g.id, g);
      for (const w of g.w || []) {
        const k = w[0] + ':' + w[1];
        const a = byWord.get(k); a ? a.push(g.id) : byWord.set(k, [g.id]);
      }
    }
    const out = { ref: assoc, byId, byWord };
    cache.set(page, out);
    return out;
  }

  const setMax = (m, k, w) => { const p = m.get(k); if (!p || RANK[w] > RANK[p]) m.set(k, w); };

  function addGroup(maps, page, g, wG, wC) {
    if (!g) return;
    setMax(maps.groups, g.id, wG);
    const regs = new Set();
    for (const w of g.w || []) { setMax(maps.words, page + '/' + w[0] + ':' + w[1], wG); regs.add(w[0]); }
    for (const ref of g.s || []) regs.add(ref.r);
    for (const ref of g.t || []) regs.add(ref.r);
    for (const r of regs) setMax(maps.regions, page + '/' + r, wC);
  }

  // wG: resolved group/word weight; wC: containing-region context weight; wLone: region-only weight.
  function resolve(maps, ev, wG, wC, wLone) {
    if (!ev || ev.page == null) return;
    const ix = idx(ev.page);
    let region = ev.region, word = ev.word;
    if (Array.isArray(word)) { if (region == null) region = word[0]; word = word[1]; } // tolerate [r,i] refs
    let gids = Array.isArray(ev.groups) && ev.groups.length ? ev.groups : (ev.group ? [ev.group] : null);
    if (!gids && word != null && region != null) gids = ix.byWord.get(region + ':' + word) || null;
    if (gids && gids.length) {
      for (const gid of gids) addGroup(maps, ev.page, ix.byId.get(gid) || { id: gid }, wG, wC);
      if (region != null) setMax(maps.regions, ev.page + '/' + region, wC);
    } else if (region != null) {
      // region-only: region + its counterpart region content share the region key across panes
      setMax(maps.regions, ev.page + '/' + region, wLone);
    }
  }

  function emit() {
    const maps = { regions: new Map(), words: new Map(), groups: new Map() };
    if (sel) resolve(maps, sel, 'sel', 'hlC', 'sel');
    if (hov) resolve(maps, hov, 'hlR', 'hlC', 'hlC'); // merged over selection; setMax keeps sel lit
    bus.emit('highlight', maps);
  }
  function schedule() {
    if (raf) return;
    // rAF can be paused (hidden document) or throttled to a crawl (occluded
    // window): race it against a short macrotask so the emit always lands.
    raf = -1;
    const fire = () => { if (raf === -1) { raf = 0; emit(); } };
    if (!(typeof document !== 'undefined' && document.hidden)) requestAnimationFrame(fire);
    setTimeout(fire, 32);
  }

  if (bus && bus.on) {
    offs.push(bus.on('hover', ev => { hov = ev; schedule(); }));
    offs.push(bus.on('hover:clear', () => { if (hov) { hov = null; schedule(); } }));
    offs.push(bus.on('select', ev => { sel = ev; schedule(); }));
    offs.push(bus.on('select:clear', () => { if (sel) { sel = null; schedule(); } }));
    offs.push(bus.on('layer', ev => {
      if (ev && ev.name === 'associations' && ev.status === 'ready') { cache.delete(ev.page); if (sel || hov) schedule(); }
    }));
  }

  return {
    destroy() {
      for (const f of offs) if (typeof f === 'function') f();
      offs = []; sel = hov = null; cache.clear();
      if (raf > 0) cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}
