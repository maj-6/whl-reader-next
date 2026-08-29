# WHL Reader Next

Design prototype for the WHL reader — two viewers (explorer, study/facsimile), six books, component library, streaming-first. Brief: [DESIGN.md](DESIGN.md). Agent context rules: [AGENTS.md](AGENTS.md).

- `mockups/` — the prototype. Serve over HTTP; start at `mockups/index.html`.
- `mockups/lib/` — component library (contract `lib/API.md`).
- Deployed via GitHub Pages on push to `main`.

Local preview:

```bash
python -m http.server 5200 --directory .
```

## Parallel work (forks)

Design refinement runs on fork branches with local worktrees; `main` is integration.

| Branch | Worktree | Scope |
|---|---|---|
| `fork/explorer` | `../reader-next-forks/explorer` | explorer.html + its lib seams |
| `fork/reader` | `../reader-next-forks/reader` | reader.html + its lib seams |
| `fork/platform` | `../reader-next-forks/platform` | lib modules, streaming/backend, data extraction |

One session per branch. Shared files (`lib/`, `explore-common.js`, `DESIGN.md`) belong to `fork/platform`; viewer branches treat them read-only and report seams instead of editing. Merge to `main` when a slice is coherent; rebase forks onto `main` after merges.
