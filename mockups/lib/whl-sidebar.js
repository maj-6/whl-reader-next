// whl-sidebar.js — tabbed sidebar: contents / this page / article / appearance
const LS = { scheme: 'whlnext-scheme', mode: 'whlnext-mode', size: 'whlnext-readsize' };
const ENT_VAR = { author: '--ent-author', plant: '--ent-plant', citation: '--ent-cite', substance: '--ent-substance' };
const TAB_ORDER = ['contents', 'thispage', 'article', 'appearance'];
const TAB_LABEL = { contents: 'Contents', thispage: 'This page', article: 'Article', appearance: 'Appearance' };

const CSS = `
.whl-side .side-panel{display:none}
.whl-side .side-panel.active{display:block}
.whl-side .toc-node{margin:1px 0}
.whl-side .toc-node>summary{list-style:none;display:flex;align-items:baseline;gap:6px;padding:4px 2px;cursor:pointer;border-radius:var(--radius)}
.whl-side .toc-node>summary::-webkit-details-marker{display:none}
.whl-side .toc-c{color:var(--ink-3);font-size:9px;transition:transform .15s;flex:none;transform:translateY(-1px)}
.whl-side .toc-node[open]>summary .toc-c{transform:rotate(90deg) translateX(-1px)}
.whl-side .toc-t{color:var(--ink);font-weight:600;font-size:12.5px}
.whl-side .toc-t:hover{color:var(--accent)}
.whl-side .toc-sub{color:var(--ink-3);font-size:11px}
.whl-side .toc-kids{margin-left:10px;border-left:1px solid var(--line);padding-left:9px}
.whl-side .toc-leaf{display:block;width:100%;text-align:left;border:0;background:none;padding:3px 2px;cursor:pointer;font:12.5px var(--font-chrome);color:var(--ink-2);border-radius:var(--radius)}
.whl-side .toc-leaf:hover{color:var(--accent);background:var(--tint-region)}
html:not([data-adv="1"]) .whl-side .imp-detail{display:none}
html:not([data-adv="1"]) .whl-side .rel-chip{display:none}
.whl-side .tp-card{padding:10px 12px;margin-bottom:10px;border-left:3px solid var(--line-2);transition:box-shadow .25s,border-color .25s}
.whl-side .tp-card.ring{box-shadow:0 0 0 3px var(--tint-select);border-color:var(--accent)}
.whl-side .tp-label{font:600 13px var(--font-chrome);color:var(--ink);cursor:pointer;line-height:1.35}
.whl-side .tp-label:hover{color:var(--accent)}
.whl-side .tp-chips{display:flex;gap:5px;margin:5px 0 0;flex-wrap:wrap}
.whl-side .tp-body{margin-top:6px;color:var(--ink-2);font-size:12px;line-height:1.5}
.whl-side .cite-x{margin-top:6px}
.whl-side .cite-x>summary{list-style:none;cursor:pointer;color:var(--accent);font-size:11.5px;font-weight:600}
.whl-side .cite-x>summary::-webkit-details-marker{display:none}
.whl-side .cite-x>summary::before{content:'▸ '}
.whl-side .cite-x[open]>summary::before{content:'▾ '}
.whl-side .cite-x .tp-body{border-left:2px solid var(--line);padding-left:8px}
.whl-side .tp-actions{display:flex;gap:6px;margin-top:9px}
.whl-side .tp-actions .btn{font-size:11px;padding:4px 8px}
.whl-side .ap-row{margin-bottom:14px}
.whl-side .ap-row>label{display:block;font:600 11px var(--font-chrome);letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin-bottom:5px}
.whl-side .ap-row select{width:100%;padding:5px 8px;font:12.5px var(--font-chrome);color:var(--ink);background:var(--bg-raise);border:1px solid var(--line-2);border-radius:var(--radius)}
.whl-side .seg{display:flex;border:1px solid var(--line-2);border-radius:var(--radius);overflow:hidden}
.whl-side .seg button{flex:1;border:0;background:none;padding:6px;cursor:pointer;font:12px var(--font-chrome);color:var(--ink-2)}
.whl-side .seg button.active{background:var(--tint-select);color:var(--ink)}
.whl-side .ap-row input[type=range]{width:100%;accent-color:var(--accent)}
.whl-side .ap-val{font-size:11px;color:var(--ink-3);margin-left:6px;text-transform:none;letter-spacing:0}
.whl-side .side-empty{color:var(--ink-3);font-size:12px;font-style:italic}`;

// appearance changes are announced to chrome (which owns persistence + <html> datasets);
// the direct dataset/localStorage writes above/below remain as a chromeless fallback.
const announce = detail => { try { document.dispatchEvent(new CustomEvent('whl-appearance', { detail })); } catch {} };
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const div = (cls, txt) => { const d = document.createElement('div'); if (cls) d.className = cls; if (txt != null) d.textContent = txt; return d; };
const mapHas = (m, k) => !!m && (typeof m.has === 'function' ? m.has(k) : Object.prototype.hasOwnProperty.call(m, k));

export function createSidebar({ el, bus, tabs = {} } = {}) {
  if (!document.getElementById('whl-sidebar-css')) {
    const s = document.createElement('style'); s.id = 'whl-sidebar-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }
  el.classList.add('sidebar', 'whl-side');
  el.textContent = '';
  const names = TAB_ORDER.filter(n => tabs[n]);
  const cfg = n => (tabs[n] && typeof tabs[n] === 'object') ? tabs[n] : {};
  const strip = div('sidebar-tabs'), body = div('sidebar-body');
  const btns = {}, panels = {};
  let curPage = null, cards = [], tpTitle = null;

  for (const n of names) {
    const b = document.createElement('button');
    b.textContent = cfg(n).label || TAB_LABEL[n];
    b.onclick = () => open(n);
    strip.appendChild(b); btns[n] = b;
    panels[n] = div('side-panel'); body.appendChild(panels[n]);
  }
  el.append(strip, body);

  function open(name) {
    if (!panels[name]) return;
    for (const n of names) {
      btns[n].classList.toggle('active', n === name);
      panels[n].classList.toggle('active', n === name);
    }
  }

  const emitNav = t => { if (t && t.page != null && bus) bus.emit('nav', { page: t.page, region: t.region }); };
  const pageOf = ent => {
    const seg = String(ent?.id || '').split('/');
    return seg.length >= 2 && /^(page|col)-/.test(seg[1]) ? seg[1] : curPage;
  };

  // ---- contents ----
  function tocNode(n) {
    const imp = n.importance || 'secondary';
    const impCls = imp === 'detail' ? ' imp-detail' : '';
    if (Array.isArray(n.children) && n.children.length) {
      const d = document.createElement('details');
      d.className = 'toc-node' + impCls;
      if (imp === 'primary') d.open = true;
      const s = document.createElement('summary');
      const c = div('toc-c', '▶'); c.setAttribute('aria-hidden', 'true');
      const t = div('toc-t', n.title || n.id || '');
      t.onclick = e => { e.preventDefault(); e.stopPropagation(); emitNav(n.target); };
      s.append(c, t);
      if (n.sub) s.appendChild(div('toc-sub', n.sub));
      const kids = div('toc-kids');
      n.children.forEach(k => kids.appendChild(tocNode(k)));
      d.append(s, kids);
      return d;
    }
    const b = document.createElement('button');
    b.className = 'toc-leaf' + impCls;
    b.textContent = n.title || n.id || '';
    if (n.sub) { const sp = div('toc-sub', ' ' + n.sub); sp.style.display = 'inline'; b.appendChild(sp); }
    b.onclick = () => emitNav(n.target);
    return b;
  }
  function setContents(tree) {
    const p = panels.contents; if (!p) return;
    p.textContent = '';
    const sec = div('side-sec');
    const h = document.createElement('h4'); h.textContent = cfg('contents').title || 'Contents';
    sec.appendChild(h);
    if (Array.isArray(tree) && tree.length) tree.forEach(n => sec.appendChild(tocNode(n)));
    else sec.appendChild(div('side-empty', 'No contents yet.'));
    p.appendChild(sec);
  }

  // ---- this page ----
  function stub(label) {
    const b = document.createElement('button');
    b.className = 'btn ghost'; b.textContent = label; b.title = 'Mockup stub';
    b.onclick = () => { const t = b.textContent; b.textContent = '✓ ' + t; b.disabled = true;
      setTimeout(() => { b.textContent = t; b.disabled = false; }, 900); };
    return b;
  }
  function cardEl(it) {
    const en = it.entity || {};
    const type = en.type || (it.kind === 'citation' ? 'citation' : null);
    const c = div('card tp-card' + (it.kind ? ' k-' + it.kind : ''));
    if (type && ENT_VAR[type]) c.style.borderLeftColor = `var(${ENT_VAR[type]})`;
    c._entId = en.id || null;
    c._mKeys = new Set((en.mentions || []).map(m => `${pageOf(en)}/${m.region}`));
    const label = div('tp-label', en.label || it.title || en.id || it.kind || 'Note');
    if (en.mentions && en.mentions.length)
      label.onclick = () => emitNav({ page: pageOf(en), region: en.mentions[0].region });
    c.appendChild(label);
    const chips = div('tp-chips');
    if (type) { const ch = document.createElement('span'); ch.className = 'chip'; ch.textContent = type; chips.appendChild(ch); }
    if (it.relevance != null) {
      const r = document.createElement('span'); r.className = 'chip rel-chip';
      r.textContent = Number(it.relevance).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
      r.title = 'relevance'; chips.appendChild(r);
    }
    if (chips.childNodes.length) c.appendChild(chips);
    const bodyTxt = it.body || en.summary || '';
    if (it.kind === 'citation') {
      if (bodyTxt) {
        const d = document.createElement('details'); d.className = 'cite-x';
        const s = document.createElement('summary'); s.textContent = 'Excerpt';
        d.append(s, div('tp-body', bodyTxt));
        c.appendChild(d);
      }
      const acts = div('tp-actions');
      (Array.isArray(it.actions) && it.actions.length ? it.actions : ['Add to reading list', 'Open in tab'])
        .forEach(a => acts.appendChild(stub(typeof a === 'string' ? a : a?.label || 'Action')));
      c.appendChild(acts);
    } else {
      if (bodyTxt) c.appendChild(div('tp-body', bodyTxt));
      if (Array.isArray(it.actions) && it.actions.length) {
        const acts = div('tp-actions');
        it.actions.forEach(a => acts.appendChild(stub(typeof a === 'string' ? a : a?.label || 'Action')));
        c.appendChild(acts);
      }
    }
    return c;
  }
  function tpHeading() { return (cfg('thispage').title || 'This page') + (curPage ? ' · ' + curPage : ''); }
  function setThisPage(items) {
    const p = panels.thispage; if (!p) return;
    p.textContent = ''; cards = [];
    const sec = div('side-sec');
    tpTitle = document.createElement('h4'); tpTitle.textContent = tpHeading();
    sec.appendChild(tpTitle);
    const sorted = (Array.isArray(items) ? items.slice() : [])
      .sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
    if (sorted.length) sorted.forEach(it => { const c = cardEl(it); cards.push(c); sec.appendChild(c); });
    else sec.appendChild(div('side-empty', 'Nothing indexed for this page yet.'));
    p.appendChild(sec);
  }

  // ---- article ----
  function setArticle() {
    const p = panels.article; if (!p) return;
    p.textContent = '';
    const sec = div('side-sec');
    const h = document.createElement('h4'); h.textContent = cfg('article').title || 'Article';
    sec.appendChild(h);
    const a = cfg('article');
    if (a.el instanceof Element) sec.appendChild(a.el);
    else if (typeof a.html === 'string') { const w = div('reading'); w.innerHTML = a.html; sec.appendChild(w); }
    else if (typeof a.body === 'string') { const w = div('reading tp-body'); w.textContent = a.body; sec.appendChild(w); }
    else sec.appendChild(div('side-empty', 'No article for this view.'));
    p.appendChild(sec);
  }

  // ---- appearance ----
  function setAppearance() {
    const p = panels.appearance; if (!p) return;
    const root = document.documentElement;
    p.textContent = '';
    const sec = div('side-sec');
    const h = document.createElement('h4'); h.textContent = cfg('appearance').title || 'Appearance';
    sec.appendChild(h);

    const rowScheme = div('ap-row');
    const lab1 = document.createElement('label'); lab1.textContent = 'Scheme';
    const sel = document.createElement('select');
    for (const s of ['archive', 'herbarium', 'oxford']) {
      const o = document.createElement('option'); o.value = s; o.textContent = s[0].toUpperCase() + s.slice(1);
      sel.appendChild(o);
    }
    sel.value = lsGet(LS.scheme) || root.dataset.scheme || 'archive';
    root.dataset.scheme = sel.value;
    sel.onchange = () => { root.dataset.scheme = sel.value; lsSet(LS.scheme, sel.value); announce({ scheme: sel.value }); };
    rowScheme.append(lab1, sel);

    const rowMode = div('ap-row');
    const lab2 = document.createElement('label'); lab2.textContent = 'Mode';
    const seg = div('seg'); const mbtns = {};
    let mode = lsGet(LS.mode) || root.dataset.mode || 'light';
    const setMode = (m, announceIt) => { mode = m; root.dataset.mode = m; lsSet(LS.mode, m);
      for (const k in mbtns) mbtns[k].classList.toggle('active', k === m);
      if (announceIt) announce({ mode: m }); };
    for (const m of ['light', 'dark']) {
      const b = document.createElement('button');
      b.textContent = m[0].toUpperCase() + m.slice(1);
      b.onclick = () => setMode(m, true);
      seg.appendChild(b); mbtns[m] = b;
    }
    setMode(mode);
    rowMode.append(lab2, seg);

    const rowSize = div('ap-row');
    const lab3 = document.createElement('label'); lab3.textContent = 'Text size';
    const val = document.createElement('span'); val.className = 'ap-val';
    lab3.appendChild(val);
    const rng = document.createElement('input');
    rng.type = 'range'; rng.min = '13'; rng.max = '22'; rng.step = '0.5';
    const stored = parseFloat(lsGet(LS.size));
    rng.value = Number.isFinite(stored) ? stored : 16.5;
    const applySize = (persist) => {
      root.style.setProperty('--read-size', rng.value + 'px');
      val.textContent = rng.value + 'px';
      if (persist) lsSet(LS.size, rng.value);
    };
    applySize(false);
    rng.oninput = () => applySize(true);
    rowSize.append(lab3, rng);

    sec.append(rowScheme, rowMode, rowSize);
    p.appendChild(sec);
  }

  // ---- bus wiring ----
  if (bus) {
    bus.on('view', v => {
      if (!v || v.page == null) return;
      curPage = v.page;
      if (tpTitle) tpTitle.textContent = tpHeading();
    });
    bus.on('highlight', h => {
      const groups = h?.groups, regions = h?.regions;
      for (const c of cards) {
        let on = !!(c._entId && mapHas(groups, c._entId));
        if (!on && regions && c._mKeys) for (const k of c._mKeys) if (mapHas(regions, k)) { on = true; break; }
        c.classList.toggle('ring', on);
      }
    });
  }

  setContents(cfg('contents').tree);
  setThisPage(cfg('thispage').items);
  setArticle();
  setAppearance();
  if (names.length) open(names[0]);

  return { open, setThisPage, setContents, el };
}
