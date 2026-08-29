import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import OpenSeadragon from 'openseadragon'
import {
  COLS,
  createBus,
  createLinker,
  createStore,
  createViewer,
  type Bus,
  type Highlight,
  type PageKey,
  type Region,
  type Store,
  type Viewer,
  type ViewportRect,
} from './vanilla'
import { dataPagesFor, viewerPagesFor, type Book } from './books'

// whl-viewer reads the OpenSeadragon global and never exposes its instance, so
// the app publishes the global and reaches the instance back through
// OpenSeadragon.getViewer() when it needs to drive the viewport (the minimap).
;(window as unknown as { OpenSeadragon: typeof OpenSeadragon }).OpenSeadragon = OpenSeadragon

export interface Reader {
  stageRef: React.RefObject<HTMLDivElement | null>
  bus: Bus
  store: Store | null
  viewer: Viewer | null
  viewerNonce: number
  dataPages: PageKey[]
  hasData(page: PageKey): boolean
  regionsOf(page: PageKey): Region[]
  viewPage: PageKey
  curPage: PageKey
  curRegion: number
  viewport: ViewportRect | null
  layerTick: number
  lastHighlight: Highlight | null
  select(page: PageKey, region: number): void
  step(d: number): void
  goto(page: PageKey): void
  panWorld(x: number, y: number): void
  osd(): OpenSeadragon.Viewer | null
}

export function useReader(book: Book, opening: boolean): Reader {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const bus = useMemo(() => createBus(), [])
  const storeRef = useRef<Store | null>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const highlightRef = useRef<Highlight | null>(null)
  const selActiveRef = useRef(false)

  const [storeNonce, setStoreNonce] = useState(0)
  const [viewerNonce, setViewerNonce] = useState(0)
  const [layerTick, setLayerTick] = useState(0)
  const [viewPage, setViewPage] = useState<PageKey>(book.start)
  const [curPage, setCurPage] = useState<PageKey>(book.start)
  const curPageRef = useRef<PageKey>(book.start)
  const [curRegion, setCurRegion] = useState(1)
  const [viewport, setViewport] = useState<ViewportRect | null>(null)

  const dataPages = useMemo(() => dataPagesFor(book), [book])
  const facing = book.facing?.key ?? null

  /* store + linker: one per book */
  useEffect(() => {
    const store = createStore({
      base: 'lib/data',
      book: book.id,
      bus,
      pages: dataPages,
      layers: book.layers,
      latency: '3g',
    })
    const linker = createLinker({ bus, store })
    storeRef.current = store
    setStoreNonce((n) => n + 1)
    store.load(book.start === 'center' ? 'center' : book.start)
    for (const k of dataPages) if (k !== book.start) store.prefetch(k)
    return () => {
      try {
        linker.destroy()
      } catch {
        /* already gone */
      }
      storeRef.current = null
    }
  }, [book, bus, dataPages])

  /* viewer: rebuilt when the opening toggle changes the world */
  useEffect(() => {
    const el = stageRef.current
    const store = storeRef.current
    if (!el || !store) return
    const pages = viewerPagesFor(book, opening)
    const twoUp = book.kind === 'roll' || (opening && !!book.facing)
    const viewer = createViewer({
      el,
      bus,
      store,
      book: book.id,
      profile: {
        layout: twoUp ? 'scroll-h' : 'single',
        ...(book.kind === 'roll' ? { direction: 'rtl' as const } : {}),
        gap: 0, // recto and verso are joined edge to edge, no gutter
        zoomOnSelect: false,
        viewportEvents: true,
      },
      pages,
      start: book.start,
    })
    viewerRef.current = viewer
    setViewerNonce((n) => n + 1)
    if (highlightRef.current) viewer.applyHighlight(highlightRef.current)
    return () => {
      try {
        viewer.destroy()
      } catch {
        /* already gone */
      }
      viewerRef.current = null
      el.innerHTML = ''
    }
  }, [book, bus, opening, storeNonce])

  /* bus wiring */
  useEffect(() => {
    const offs = [
      bus.on('highlight', (h: Highlight) => {
        highlightRef.current = h
        viewerRef.current?.applyHighlight(h)
      }),
      bus.on('view', (p: { page?: PageKey }) => {
        if (!p?.page || p.page === facing) return
        setViewPage(p.page)
        if (selActiveRef.current || curPageRef.current === p.page) return
        const regs = storeRef.current?.get(p.page)?.source?.regions ?? []
        curPageRef.current = p.page
        setCurPage(p.page)
        setCurRegion(regs.length > 1 ? 1 : 0)
      }),
      bus.on('select', (p: { page?: PageKey; region?: number }) => {
        if (!p?.page || p.region == null || p.page === facing) return
        selActiveRef.current = true
        curPageRef.current = p.page
        setCurPage(p.page)
        setCurRegion(Math.max(0, p.region))
      }),
      bus.on('select:clear', () => {
        selActiveRef.current = false
      }),
      bus.on('layer', (p: { status?: string }) => {
        if (p?.status === 'ready') setLayerTick((t) => t + 1)
      }),
      bus.on('viewport', (v: ViewportRect) => setViewport(v)),
    ]
    return () => offs.forEach((off) => off())
  }, [bus, facing])

  /* seed the viewport rect: viewportEvents does not fire on init or resize */
  useEffect(() => {
    const timers = [80, 400, 1200].map((t) =>
      setTimeout(() => {
        const v = viewerRef.current?.viewportInfo()
        if (v) setViewport(v)
      }, t),
    )
    return () => timers.forEach(clearTimeout)
  }, [viewerNonce])

  const regionsOf = useCallback(
    (page: PageKey) => storeRef.current?.get(page)?.source?.regions ?? [],
    // layerTick keeps callers re-reading as layers land
    [layerTick],
  )
  const hasData = useCallback((page: PageKey) => dataPages.includes(page), [dataPages])

  const select = useCallback((page: PageKey, region: number) => {
    viewerRef.current?.select(page, region)
  }, [])

  const step = useCallback(
    (d: number) => {
      const regs = regionsOf(curPage)
      if (!regs.length) return
      const n = Math.max(0, Math.min(regs.length - 1, curRegion + d))
      if (n !== curRegion) viewerRef.current?.select(curPage, n)
    },
    [curPage, curRegion, regionsOf],
  )

  const goto = useCallback((page: PageKey) => viewerRef.current?.goto(page), [])

  const osd = useCallback(() => {
    try {
      const el = stageRef.current
      return el ? (OpenSeadragon.getViewer(el) ?? null) : null
    } catch {
      return null
    }
  }, [])

  const panWorld = useCallback(
    (x: number, y: number) => {
      const v = osd()
      if (v?.viewport) {
        try {
          v.viewport.panTo(new OpenSeadragon.Point(x, y), true)
          v.viewport.applyConstraints(true)
          const info = viewerRef.current?.viewportInfo()
          if (info) setViewport(info)
          return
        } catch {
          /* fall through to page granularity */
        }
      }
      const viewer = viewerRef.current
      if (!viewer) return
      let best: PageKey | null = null
      let bd = Infinity
      for (const p of viewerPagesFor(book, opening)) {
        const r = viewer.worldRect(p.key)
        if (!r) continue
        const d = x < r.x ? r.x - x : x > r.x + r.w ? x - (r.x + r.w) : 0
        if (d < bd) {
          bd = d
          best = p.key
        }
      }
      if (best) viewer.goto(best)
    },
    [book, opening, osd],
  )

  return {
    stageRef,
    bus,
    store: storeRef.current,
    viewer: viewerRef.current,
    viewerNonce,
    dataPages,
    hasData,
    regionsOf,
    viewPage,
    curPage,
    curRegion,
    viewport,
    layerTick,
    lastHighlight: highlightRef.current,
    select,
    step,
    goto,
    panWorld,
    osd,
  }
}

export { COLS }
