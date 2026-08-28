// whl-bus — event hub (see API.md for event names/payloads)
export function createBus() {
  const map = new Map();
  const on = (type, fn) => {
    let s = map.get(type);
    if (!s) map.set(type, s = new Set());
    s.add(fn);
    return () => off(type, fn);
  };
  const off = (type, fn) => { const s = map.get(type); if (s) s.delete(fn); };
  const emit = (type, payload) => {
    const s = map.get(type);
    if (!s || !s.size) return;
    for (const fn of [...s]) {
      try { fn(payload); }
      catch (e) { console.error('[whl-bus] handler for "' + type + '" threw', e); }
    }
  };
  return { on, off, emit };
}
