// Shared substrate for the explore concepts: the seamless EB01 roll.
// Concepts differ only in how information surfaces; wiring stays identical.
import { createStore } from './lib/whl-store.js';
import { createViewer } from './lib/whl-viewer.js';
import { createLinker } from './lib/whl-linker.js';

export const COLS = [
  { key: 'col-0044', url: 'assets/pages/EB01-col-0044.jpg', w: 834,  h: 1600, clip: { top: .0756, bottom: .0844 } },
  { key: 'col-0045', url: 'assets/pages/EB01-col-0045.jpg', w: 916,  h: 1600, clip: { top: .0762, bottom: .0844 } },
  { key: 'col-0046', url: 'assets/pages/EB01-col-0046.jpg', w: 880,  h: 1600, clip: { top: .0737, bottom: .0881 } },
  { key: 'col-0047', url: 'assets/pages/EB01-col-0047.jpg', w: 996,  h: 1600, clip: { top: .0762, bottom: .0844 } },
  { key: 'col-0048', url: 'assets/pages/EB01-col-0048.jpg', w: 967,  h: 1600, clip: { top: .07,   bottom: .0844 } },
];
export const DATA_COLS = ['col-0044', 'col-0045', 'col-0046', 'col-0048']; // col-0047: image only

export function createRoll({ el, bus, start = 'col-0045', latency = '3g', viewerOpts = {} }) {
  const store = createStore({ base: 'lib/data', book: 'EB01', bus, pages: DATA_COLS, latency });
  const { profile: profileOver, ...viewerRest } = viewerOpts;
  const viewer = createViewer({
    el, bus, store, book: 'EB01',
    pages: COLS, start,
    ...viewerRest,
    profile: { layout: 'scroll-h', direction: 'rtl', gap: 0, ...(profileOver || {}) },
  });
  createLinker({ bus, store });
  store.load(start);
  for (const k of DATA_COLS) if (k !== start) store.prefetch(k);
  return { viewer, store };
}

// r.hl = [{ref, t, rub:[[s,e],…]}] — hieroglyph lines per TLA sentence, UTF-16 offsets, red-ink spans.
// signs without Unicode codepoints arrive as literal [SIGN:XXX] tokens; show a quiet placeholder
const escH = s => String(s).replace(/\[SIGN:[^\]]+\]/g, '▯').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
export function hieroHTML(r) {
  if (!r || !Array.isArray(r.hl)) return '';
  return r.hl.map(l => {
    const spans = (l.rub || []).slice().sort((a, b) => a[0] - b[0]);
    let out = '', pos = 0;
    for (const [s, e] of spans) {
      if (s > pos) out += escH(l.t.slice(pos, s));
      out += `<span class="rub">${escH(l.t.slice(s, e))}</span>`;
      pos = e;
    }
    out += escH(l.t.slice(pos));
    return `<div class="hl-line"><span class="hl-ref">${escH(l.ref)}</span><span class="hl-t">${out}</span></div>`;
  }).join('');
}

export function romanCol(key) {
  const n = +key.slice(4);
  const R = [[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let s = '', v = n;
  for (const [d, r] of R) while (v >= d) { s += r; v -= d; }
  return s;
}
