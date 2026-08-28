// whl-text.js — reading pane: regions, atomic association spans, entities.
const CSS = `
.whl-text{font-family:var(--font-read);color:var(--ink);min-height:0}
.whl-text .rg-el{position:relative;padding:10px 14px;border-bottom:1px solid var(--line)}
.whl-text[data-layout="pair"] .rg-el{display:grid;grid-template-columns:1fr 1fr;gap:var(--gap);align-items:start}
.whl-text[data-layout="pair"] .rg-el>.rg-case{grid-column:1/-1;justify-self:start}
.whl-text .tx,.whl-text .xl{white-space:pre-wrap;line-height:1.66;font-size:var(--read-size,16.5px)}
.whl-text .xl{background:var(--tint-translation);border-radius:var(--radius);padding:6px 9px;color:var(--ink-2)}
.whl-text[data-layout="stacked"] .xl{margin-top:6px}
.whl-text .rg-case{font-family:var(--font-chrome);margin-bottom:6px}
.whl-text .rg-title .tx{font-family:var(--font-display);font-weight:600;font-size:18.5px}
.whl-text .rg-footer .tx{color:var(--ink-3);font-size:13px}
.whl-text [data-g]{cursor:pointer;border-radius:2px}
.whl-text [data-g].hlC{background:var(--tint-region)}
.whl-text [data-g].hlR{background:var(--tint-select)}
.whl-text [data-g].sel{background:var(--tint-select);box-shadow:0 0 0 1px var(--accent)}
.whl-text .rg-el.hlC{background:var(--tint-region)}
.whl-text .rg-el.hlR{background:var(--tint-region)}
.whl-text .rg-el.sel{background:var(--tint-region);box-shadow:inset 2px 0 0 var(--accent)}
.whl-text[data-layout="strip"] .strip-line{white-space:nowrap;overflow-x:auto;padding:8px 12px;border-bottom:0}
.whl-text[data-layout="strip"] .strip-body{white-space:nowrap}
.whl-text .whl-skel{height:110px;margin:12px}
`;
function injectCSS() {
  if (document.getElementById('whl-text-css')) return;
  const s = document.createElement('style'); s.id = 'whl-text-css'; s.textContent = CSS;
  document.head.appendChild(s);
}
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = s => String(s).replace(/[&<>"]/g, c => ESC[c]);
const layerOf = (pd, ...names) => {
  if (!pd) return null;
  for (const n of names) { if (pd[n]) return pd[n]; if (pd.layers && pd.layers[n]) return pd.layers[n]; }
  return null;
};
const entries = m => !m ? [] : (m instanceof Map ? [...m] : Object.entries(m));

// marks: [{s,e,g?}|{s,e,ent:{id,cls}}|{s,e,rub:true}] — UTF-16 code-unit offsets;
// data offsets are surrogate-safe, slice() is UTF-16 native.
function decorate(text, marks) {
  if (text == null) return '';
  if (!marks || !marks.length) return esc(text);
  const L = text.length, cuts = new Set([0, L]), ok = [];
  for (const m of marks) {
    const s = Math.max(0, Math.min(L, m.s | 0)), e = Math.max(0, Math.min(L, m.e | 0));
    if (e > s) { cuts.add(s); cuts.add(e); ok.push({ ...m, s, e }); }
  }
  const pts = [...cuts].sort((a, b) => a - b);
  let out = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    let gids = [], ent = null, rub = false;
    for (const m of ok) if (m.s <= a && m.e >= b) {   // marks fully cover or miss a segment
      if (m.g) gids.push(m.g);
      if (m.ent && !ent) ent = m.ent;
      if (m.rub) rub = true;
    }
    let t = esc(text.slice(a, b));
    if (rub) t = `<span class="rub">${t}</span>`;
    if (ent) t = `<a class="ent ${ent.cls}" data-ent="${esc(ent.id)}">${t}</a>`;
    if (gids.length) t = `<span data-g="${gids.join(' ')}">${t}</span>`;
    out += t;
  }
  return out;
}

export function createTextPane({ el, bus, store, book, page, layout = 'pair' } = {}) {
  injectCSS();
  el.classList.add('whl-text');
  el.dataset.layout = layout;
  let cur = 0, painted = [], gEls = new Map(), rEls = new Map(), offs = [], lastHover = null, lastHl = null;

  const pd = () => (store && store.get) ? store.get(page) : null;
  const push = (map, r, m) => { const a = map.get(r); a ? a.push(m) : map.set(r, [m]); };

  function buildMarks(pdata) {
    const S = new Map(), T = new Map();
    const assoc = layerOf(pdata, 'associations', 'assoc');
    for (const g of (assoc && assoc.groups) || []) {
      for (const ref of g.s || []) if (ref && ref.u) push(S, ref.r, { s: ref.u[0], e: ref.u[1], g: g.id });
      for (const ref of g.t || []) if (ref && ref.u) push(T, ref.r, { s: ref.u[0], e: ref.u[1], g: g.id });
    }
    const src = layerOf(pdata, 'source');
    const regions = (src && src.regions) || [];
    regions.forEach((r, i) => {   // optional rubric spans on transcription
      for (const u of r.rub || r.rubrics || []) if (u && u.length === 2) push(S, i, { s: u[0], e: u[1], rub: true });
    });
    const ents = layerOf(pdata, 'entities');
    if (Array.isArray(ents)) {
      const seen = new Set();
      for (const en of ents) {
        const cls = en.type === 'citation' ? 'cite' : (en.type || '');
        for (const m of en.mentions || []) {
          const key = m.region + '|' + (m.in || '') + '|' + m.quote;
          if (seen.has(key)) continue; seen.add(key);
          const r = regions[m.region]; if (!r || !m.quote) continue;
          const hay = m.in === 'translation' ? r.translation : r.text;
          if (!hay) continue;
          const i = hay.indexOf(m.quote); if (i < 0) continue;
          push(m.in === 'translation' ? T : S, m.region, { s: i, e: i + m.quote.length, ent: { id: en.id, cls } });
        }
      }
    }
    return { S, T };
  }

  function regionHTML(r, i, mS, mT) {
    const chip = r.case_label ? `<span class="chip rg-case">${esc(r.case_label)}</span>` : '';
    const lines = Array.isArray(r.lines) && r.lines.length
      ? ` title="ll. ${esc(r.lines[0])}–${esc(r.lines[r.lines.length - 1])}"` : '';
    const tx = `<div class="tx"${lines}>${decorate(r.text, mS)}</div>`;
    const xl = r.translation != null ? `<div class="xl">${decorate(r.translation, mT)}</div>` : '';
    return `<section class="rg-el rg-${esc(r.type || 'text')}" data-r="${i}">${chip}${tx}${xl}</section>`;
  }

  function render() {
    const pdata = pd(), src = layerOf(pdata, 'source');
    if (!src || !Array.isArray(src.regions)) { el.innerHTML = '<div class="skel whl-skel"></div>'; gEls = new Map(); rEls = new Map(); painted = []; return; }
    const { S, T } = buildMarks(pdata);
    if (el.dataset.layout === 'strip') {
      const i = Math.max(0, Math.min(cur, src.regions.length - 1));
      const r = src.regions[i] || {};
      const body = r.translation != null ? decorate(r.translation, T.get(i)) : decorate(r.text, S.get(i));
      el.innerHTML = `<div class="rg-el strip-line" data-r="${i}">` +
        (r.case_label ? `<span class="chip rg-case">${esc(r.case_label)}</span> ` : '') +
        `<span class="strip-body">${body}</span></div>`;
    } else {
      el.innerHTML = src.regions.map((r, i) => regionHTML(r, i, S.get(i), T.get(i))).join('');
    }
    index();
    repaint(lastHl);
  }

  function index() {
    gEls = new Map(); rEls = new Map(); painted = [];
    el.querySelectorAll('.rg-el').forEach(n => rEls.set(+n.dataset.r, n));
    el.querySelectorAll('[data-g]').forEach(n => {
      for (const g of n.dataset.g.split(' ')) { const a = gEls.get(g); a ? a.push(n) : gEls.set(g, [n]); }
    });
  }

  function repaint(h) {
    for (const n of painted) n.classList.remove('hlC', 'hlR', 'sel');
    painted = [];
    if (!h) return;
    const paint = (n, w) => { if (n && w) { n.classList.add(w); painted.push(n); } };
    for (const [g, w] of entries(h.groups)) for (const n of gEls.get(g) || []) paint(n, w);
    for (const [k, w] of entries(h.regions)) {
      const cut = k.lastIndexOf('/');
      if (k.slice(0, cut) === page) paint(rEls.get(+k.slice(cut + 1)), w);
    }
  }

  function applyHighlight(h) { lastHl = h; repaint(h); }

  function scrollTo(region, opts = {}) {
    const n = rEls.get(+region);
    if (n) n.scrollIntoView({ behavior: opts.instant ? 'auto' : 'smooth', block: opts.block || 'center' });
  }

  function setLayout(l) { el.dataset.layout = l; render(); }

  const gidsOf = n => n.dataset.g.split(' ');
  function onOver(e) {
    const g = e.target.closest('[data-g]');
    if (g === lastHover) return;
    lastHover = g;
    if (!g || !el.contains(g)) { bus.emit('hover:clear', {}); return; }
    const rg = g.closest('.rg-el');
    bus.emit('hover', { src: 'text', page, region: rg ? +rg.dataset.r : null, group: gidsOf(g)[0], groups: gidsOf(g) });
  }
  function onLeave() { lastHover = null; bus.emit('hover:clear', {}); }
  function onClick(e) {
    const rg = e.target.closest('.rg-el');
    if (!rg || !el.contains(rg)) return;
    const g = e.target.closest('[data-g]');
    const p = { page, region: +rg.dataset.r };
    if (g) { p.group = gidsOf(g)[0]; p.groups = gidsOf(g); }
    bus.emit('select', p);
  }
  el.addEventListener('mouseover', onOver);
  el.addEventListener('mouseleave', onLeave);
  el.addEventListener('click', onClick);

  if (bus && bus.on) {
    offs.push(bus.on('layer', ev => {
      if (ev && ev.page === page && ev.status === 'ready' &&
        ['source', 'associations', 'entities'].includes(ev.name)) render();
    }));
    offs.push(bus.on('nav', ev => {
      if (!ev || ev.page !== page || ev.region == null) return;
      cur = +ev.region;
      el.dataset.layout === 'strip' ? render() : scrollTo(ev.region);
    }));
    offs.push(bus.on('select', ev => {
      if (ev && ev.page === page && ev.region != null && el.dataset.layout === 'strip' && +ev.region !== cur) {
        cur = +ev.region; render();
      }
    }));
  }

  render();

  return {
    applyHighlight, scrollTo, setLayout,
    destroy() {
      for (const f of offs) if (typeof f === 'function') f();
      el.removeEventListener('mouseover', onOver);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('click', onClick);
      el.innerHTML = ''; el.classList.remove('whl-text');
      offs = []; painted = []; gEls = new Map(); rEls = new Map();
    }
  };
}
