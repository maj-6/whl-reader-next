// whl-chrome — topbar, scheme/mode/adv persistence, mock-note. See API.md.
const LS = { scheme: 'whlnext-scheme', mode: 'whlnext-mode', adv: 'whlnext-adv' };
const root = document.documentElement;

const CSS = `
.topbar .tb-back { white-space: nowrap; }
.tb-title { font: 600 10.5px var(--font-chrome); letter-spacing: .1em; text-transform: uppercase;
  color: var(--ink-3); white-space: nowrap; }
.tb-sep { width: 1px; height: 20px; background: var(--line); flex: none; }
.bookpick { display: flex; align-items: center; gap: 9px; padding: 4px 10px 4px 5px; border: 1px solid transparent;
  border-radius: var(--radius); background: none; cursor: pointer; color: var(--ink); font-family: var(--font-chrome); text-align: left; }
.bookpick:hover { border-color: var(--line-2); background: var(--bg); }
.bookpick img { width: 24px; height: 33px; object-fit: cover; border-radius: 2px; border: 1px solid var(--line-2); }
.bookpick .bp-t { display: flex; flex-direction: column; line-height: 1.25; }
.bookpick .bp-t b { font-size: 13.5px; font-weight: 600; }
.bookpick .bp-t small { font-size: 10.5px; color: var(--ink-3); }
.bookpick .caret { color: var(--ink-3); font-size: 9px; margin-left: 2px; }
.seg { display: inline-flex; border: 1px solid var(--line-2); border-radius: var(--radius); overflow: hidden; background: var(--bg-raise); }
.seg button { border: 0; border-right: 1px solid var(--line); background: none; padding: 5px 13px;
  font: 12.5px var(--font-chrome); color: var(--ink-2); cursor: pointer; }
.seg button:last-child { border-right: 0; }
.seg button.active { background: var(--tint-select); color: var(--ink); font-weight: 600; }
.seg button:disabled { opacity: .4; cursor: not-allowed; }
.advtog { display: flex; align-items: center; gap: 7px; font: 11px var(--font-chrome); color: var(--ink-3);
  cursor: pointer; user-select: none; }
.advtog .lb.on { color: var(--ink); font-weight: 600; }
.sw { width: 34px; height: 19px; border-radius: 99px; background: var(--bg-sunk); border: 1px solid var(--line-2);
  position: relative; cursor: pointer; padding: 0; flex: none; }
.sw::after { content: ''; position: absolute; left: 2px; top: 2px; width: 13px; height: 13px; border-radius: 50%;
  background: var(--ink-3); transition: left .16s, background .16s; }
html[data-adv="1"] .sw { background: var(--tint-select); border-color: var(--accent); }
html[data-adv="1"] .sw::after { left: 17px; background: var(--accent); }
html:not([data-adv="1"]) .adv-only { display: none !important; }
`;

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function mountChrome(opts = {}) {
  const { title = '', back = 'index.html', book, modes, note, bus,
    modesDisabled = [], mockSwitch = 'full' } = opts;
  const showAdv = opts.adv !== false;

  // persisted state → <html> immediately
  let scheme, colorMode, adv;
  try {
    scheme = localStorage.getItem(LS.scheme) || 'archive';
    colorMode = localStorage.getItem(LS.mode) || 'light';
    adv = localStorage.getItem(LS.adv) === '1';
  } catch { scheme = 'archive'; colorMode = 'light'; adv = false; }
  root.dataset.scheme = scheme;
  root.dataset.mode = colorMode;
  root.dataset.adv = adv ? '1' : '0';

  if (!document.getElementById('whl-chrome-css')) {
    const st = document.createElement('style');
    st.id = 'whl-chrome-css'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  // mini emitter for 'mode' / 'adv'
  const subs = new Map();
  const on = (ev, fn) => { (subs.get(ev) || subs.set(ev, new Set()).get(ev)).add(fn); return () => subs.get(ev).delete(fn); };
  const fire = (ev, p) => {
    for (const fn of subs.get(ev) || []) { try { fn(p); } catch (e) { console.error('[whl-chrome]', e); } }
    if (bus && bus.emit) { try { bus.emit(ev, p); } catch (e) { console.error('[whl-chrome]', e); } }
  };

  let rMode = opts.mode || (modes && modes[0]) || null;

  const el = document.createElement('div');
  el.className = 'topbar';
  el.innerHTML = `
  ${back === false ? '' : `<a class="tb-back" href="${esc(back)}">&larr; ${back === 'index.html' ? 'Mockups' : 'Back'}</a>
  <span class="tb-sep"></span>`}
  <span class="tb-title">${esc(title)}</span>
  ${book ? `<button type="button" class="bookpick" title="Book picker — non-functional in this mockup">
    ${book.thumb ? `<img src="${esc(book.thumb)}" alt="">` : ''}
    <span class="bp-t"><b>${esc(book.title)}</b>${book.label ? `<small>${esc(book.label)}</small>` : ''}</span>
    <span class="caret">&#9662;</span></button>` : ''}
  ${modes && modes.length ? `<div class="seg whl-modeseg">${modes.map(m =>
    `<button type="button" data-m="${esc(m)}"${m === rMode ? ' class="active"' : ''}${modesDisabled.includes(m) ? ' disabled' : ''}>${esc(m[0].toUpperCase() + m.slice(1))}</button>`).join('')}</div>` : ''}
  ${showAdv ? `<div class="advtog" title="Basic hides layer chrome; Advanced exposes layers, streaming status, confidence">
    <span class="lb lb-basic">Basic</span>
    <button type="button" class="sw" role="switch" aria-checked="false" aria-label="Advanced mode"></button>
    <span class="lb lb-adv">Advanced</span></div>` : ''}
  ${mockSwitch === 'none' ? '' : `<div class="mock-switch">
    ${mockSwitch === 'mode-only' ? '' : `<select class="btn whl-scheme" aria-label="Colour scheme">
      <option value="archive">Archive</option>
      <option value="herbarium">Herbarium</option>
      <option value="oxford">Oxford</option>
    </select>`}
    <button type="button" class="btn whl-colormode"></button>
  </div>`}`;
  document.body.prepend(el);

  const $ = s => el.querySelector(s);
  const schemeSel = $('.whl-scheme'), cmBtn = $('.whl-colormode');

  function syncAppearance() {
    if (schemeSel) schemeSel.value = scheme;
    if (cmBtn) cmBtn.textContent = colorMode === 'dark' ? '☀ Light' : '☾ Dark';
  }
  function setScheme(v) {
    if (!v || v === scheme) return;
    scheme = v; root.dataset.scheme = v;
    try { localStorage.setItem(LS.scheme, v); } catch {}
    syncAppearance();
  }
  function setColorMode(v) {
    if (v !== 'dark' && v !== 'light') return;
    if (v === colorMode) { syncAppearance(); return; }
    colorMode = v; root.dataset.mode = v;
    try { localStorage.setItem(LS.mode, v); } catch {}
    syncAppearance();
  }
  function setAdv(onFlag) {
    onFlag = !!onFlag;
    root.dataset.adv = onFlag ? '1' : '0';
    try { localStorage.setItem(LS.adv, onFlag ? '1' : '0'); } catch {}
    const tog = $('.advtog');
    if (tog) {
      tog.querySelector('.lb-basic').classList.toggle('on', !onFlag);
      tog.querySelector('.lb-adv').classList.toggle('on', onFlag);
      tog.querySelector('.sw').setAttribute('aria-checked', onFlag ? 'true' : 'false');
    }
    if (onFlag !== adv) { adv = onFlag; fire('adv', { on: adv }); }
  }
  function setMode(m) {
    if (!modes || !modes.includes(m)) return;
    el.querySelectorAll('.whl-modeseg button').forEach(b => b.classList.toggle('active', b.dataset.m === m));
    if (m !== rMode) { rMode = m; fire('mode', { mode: m }); }
  }

  if (schemeSel) schemeSel.addEventListener('change', () => setScheme(schemeSel.value));
  if (cmBtn) cmBtn.addEventListener('click', () => setColorMode(colorMode === 'dark' ? 'light' : 'dark'));
  const tog = $('.advtog'); // single handler on container → no label/switch double-fire
  if (tog) tog.addEventListener('click', () => setAdv(root.dataset.adv !== '1'));
  const seg = $('.whl-modeseg');
  if (seg) seg.addEventListener('click', e => {
    const b = e.target.closest('button[data-m]');
    if (b && !b.disabled) setMode(b.dataset.m);
  });
  // sidebar appearance panel delegates persistence via document event
  document.addEventListener('whl-appearance', e => {
    const d = (e && e.detail) || {};
    if (d.scheme) setScheme(d.scheme);
    if (d.mode) setColorMode(d.mode);
  });

  // initial paint of adv labels / switch (no event fired: state unchanged)
  const startAdv = adv; adv = !startAdv; setAdv(startAdv);
  syncAppearance();

  if (note) {
    const n = document.createElement('div');
    n.className = 'mock-note';
    n.innerHTML = `<button type="button" class="mn-x" aria-label="Dismiss">&times;</button>${note}`;
    n.querySelector('.mn-x').addEventListener('click', () => n.remove());
    document.body.appendChild(n);
  }

  const set = (k, v) => {
    if (k === 'mode') setMode(v);
    else if (k === 'adv') setAdv(v);
    else if (k === 'scheme') setScheme(v);
    else if (k === 'colormode') setColorMode(v);
  };
  return { el, on, set };
}
