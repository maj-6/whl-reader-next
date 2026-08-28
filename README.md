# WHL Reader Next

Redesign prototype for the WHL reader — streaming-first, OpenSeadragon-based. Current phase: **design mockups** (see [DESIGN.md](DESIGN.md)).

- `mockups/` — static HTML mockups, no build step. Serve over HTTP (pages fetch layer data); start at `mockups/index.html`.
- `mockups/lib/` — the reader component library (ES modules + real extracted corpus samples). Contract: `lib/API.md`; playground: `lib/components.html`.
- Deployed via GitHub Pages on push to `main`.

Local preview:

```bash
python -m http.server 5200
```

then http://localhost:5200/mockups/
