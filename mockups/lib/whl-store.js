// whl-store — layer fetching with canonical priority + simulated latency. See API.md.
// Layers per page: source → words|glyphs → associations → entities (+ synthetic 'tiles').
export function createStore({ base = 'lib/data', book, bus, pages = [], layers, latency = 0 } = {}) {
  const cache = new Map(); // pageKey → {status, data, promise}
  const slow = latency === '3g';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const emit = (page, name, status, st) => {
    st[name] = status;
    if (bus) { try { bus.emit('layer', { page, name, status }); } catch (e) { console.error('[whl-store]', e); } }
  };
  const layerNames = p => (layers && layers[p]) ||
    ['source', book === 'EB01' ? 'glyphs' : 'words', 'associations', 'entities'];

  function buildIndex(assoc) {
    const bySource = {}, byTranslation = {}, byWord = {}, byGroup = {};
    for (const g of (assoc && assoc.groups) || []) {
      if (!g || !g.id) continue;
      byGroup[g.id] = g;
      for (const s of g.s || []) (bySource[s.r] || (bySource[s.r] = [])).push(g.id);
      for (const t of g.t || []) (byTranslation[t.r] || (byTranslation[t.r] = [])).push(g.id);
      for (const w of g.w || []) {
        const k = w[0] + ':' + w[1];
        (byWord[k] || (byWord[k] = [])).push(g.id);
      }
    }
    for (const m of [bySource, byTranslation, byWord])
      for (const k in m) m[k] = [...new Set(m[k])];
    return { bySource, byTranslation, byWord, byGroup };
  }

  function load(pageKey) {
    let ent = cache.get(pageKey);
    if (ent) return ent.promise;
    const status = {}, data = { book, page: pageKey, index: buildIndex(null), status: null };
    ent = { status, data, promise: null };
    cache.set(pageKey, ent);
    data.status = status;

    const names = layerNames(pageKey);
    for (const n of ['tiles', ...names]) emit(pageKey, n, 'pending', status);

    // tiles are the viewer's business; synthetic status so dots can show 5 layers
    (async () => {
      emit(pageKey, 'tiles', 'loading', status);
      await sleep(slow ? 900 : 120);
      emit(pageKey, 'tiles', 'ready', status);
    })();

    ent.promise = (async () => {
      for (const name of names) {
        if (slow) await sleep(250 + Math.random() * 300); // stagger so streaming is watchable
        emit(pageKey, name, 'loading', status);
        try {
          const res = await fetch(`${base}/${book}/${pageKey}/${name}.json`);
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const json = await res.json();
          data[name] = json;
          if (name === 'words') data.wordBoxes = Array.isArray(json) ? json : [];
          if (name === 'glyphs') data.wordBoxes = Array.isArray(json) ? json.map(g => g && g.box).filter(Boolean) : [];
          if (name === 'associations') data.index = buildIndex(json);
          emit(pageKey, name, 'ready', status);
        } catch (e) {
          emit(pageKey, name, 'error', status); // non-fatal: page stays usable (e.g. image-only cols)
        }
      }
      return data;
    })();
    return ent.promise;
  }

  const get = pageKey => { const e = cache.get(pageKey); return e && e.data; };
  const statusOf = pageKey => { const e = cache.get(pageKey); return e ? { ...e.status } : {}; };
  const prefetch = pageKey => { load(pageKey); };

  return { load, get, status: statusOf, prefetch, pages };
}
