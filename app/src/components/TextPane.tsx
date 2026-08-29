import { useCallback, useEffect, useRef } from 'react'
import { createTextPane, hieroHTML, type Bus, type Region, type Store, type TextLayout, type TextPane as Pane } from '@/whl/vanilla'

interface Props {
  domId: 'whlTextMain' | 'whlTextWin'
  bus: Bus
  store: Store | null
  book: string
  page: string
  layout: TextLayout
  region?: number
  stripShow?: 'both'
  hiero: boolean
  regions: Region[]
  /** any change that can alter wrapped height: width, size, leading, layer arrival */
  measureKey: string
  pairAuto?: boolean
  pairFrac?: number
  onPairFrac?: (f: number) => void
}

interface Row { txH: number; xlH: number; txW: number; xlW: number }

const median = (a: number[]) => a.slice().sort((x, y) => x - y)[a.length >> 1]
const clamp = (lo: number, hi: number, v: number) => Math.max(lo, Math.min(hi, v))

export function TextPane(props: Props) {
  const { domId, bus, store, book, page, layout, region, stripShow, hiero, regions, measureKey } = props
  const { pairAuto, pairFrac, onPairFrac } = props
  const hostRef = useRef<HTMLDivElement | null>(null)
  const paneRef = useRef<Pane | null>(null)

  /* the pane itself */
  useEffect(() => {
    const el = hostRef.current
    if (!el || !store) return
    el.innerHTML = ''
    const pane = createTextPane({ el, bus, store, book, page, layout, ...(stripShow ? { stripShow } : {}) })
    paneRef.current = pane
    return () => {
      try {
        pane.destroy()
      } catch {
        /* already gone */
      }
      paneRef.current = null
      el.innerHTML = ''
    }
  }, [bus, store, book, page, layout, stripShow])

  useEffect(() => {
    if (region != null) paneRef.current?.setRegion(region)
  }, [region])

  /* hieroglyph lines: injected per region, wiped by every whl-text re-render */
  const injectHiero = useCallback(() => {
    const el = hostRef.current
    if (!el) return
    el.querySelectorAll('.hl-block').forEach((n) => n.remove())
    if (!hiero) return
    el.querySelectorAll<HTMLElement>('.rg-el').forEach((rg) => {
      const html = hieroHTML(regions[Number(rg.dataset.r)])
      if (!html) return
      const anchor =
        rg.querySelector('.strip-tx2') ?? rg.querySelector('.tx') ?? rg.querySelector('.strip-body')
      if (!anchor) return
      const d = document.createElement('div')
      d.className = 'hl-block'
      d.innerHTML = html
      anchor.after(d)
    })
  }, [hiero, regions])

  /* tx / xl auto-balance --------------------------------------------------
     The division point equalises the two columns' vertical extents on average
     across the page, not per region: one probe seeds a wrapped-text area
     estimate (height x width is near invariant), then bisection on the measured
     MEDIAN signed height difference converges in a handful of passes. */
  const applyPair = useCallback((f: number) => {
    const el = hostRef.current
    if (!el) return
    el.style.setProperty('--pair-tx', f.toFixed(3) + 'fr')
    el.style.setProperty('--pair-xl', (1 - f).toFixed(3) + 'fr')
  }, [])

  const measure = useCallback((): Row[] => {
    const el = hostRef.current
    if (!el) return []
    const rows: Row[] = []
    el.querySelectorAll<HTMLElement>('.rg-el').forEach((rg) => {
      const tx = rg.querySelector<HTMLElement>('.tx')
      const xl = rg.querySelector<HTMLElement>('.xl')
      if (!tx || !xl) return
      const hl = rg.querySelector<HTMLElement>('.hl-block')
      const txH = tx.offsetHeight + (hl ? hl.offsetHeight + 8 : 0)
      const xlH = xl.offsetHeight - 12 // .xl carries 6px block padding
      const txW = tx.offsetWidth
      const xlW = xl.offsetWidth - 18 // and 9px inline padding
      if (txH > 0 && xlH > 0 && txW > 0 && xlW > 0) rows.push({ txH, xlH, txW, xlW })
    })
    return rows
  }, [])

  const probe = useCallback(
    (f: number) => {
      const el = hostRef.current
      if (!el) return null
      applyPair(f)
      void el.offsetHeight
      const rows = measure()
      if (!rows.length) return null
      return {
        d: median(rows.map((r) => r.txH - r.xlH)),
        a: median(
          rows.map((r) => {
            const atx = r.txH * r.txW
            const axl = r.xlH * r.xlW
            return atx + axl > 0 ? atx / (atx + axl) : 0.5
          }),
        ),
      }
    },
    [applyPair, measure],
  )

  const balance = useCallback(() => {
    const el = hostRef.current
    if (!el || layout !== 'pair') return
    if (!pairAuto) {
      applyPair(pairFrac ?? 0.5)
      return
    }
    const seed = probe(clamp(0.22, 0.78, pairFrac ?? 0.5))
    if (!seed) return
    let lo = 0.22
    let hi = 0.78
    let f = clamp(lo, hi, seed.a)
    let best = { f, d: Infinity }
    for (let n = 0; n < 7; n++) {
      const p = probe(f)
      if (!p) break
      if (Math.abs(p.d) < Math.abs(best.d)) best = { f, d: p.d }
      if (p.d === 0 || hi - lo < 0.006) break
      if (p.d > 0) lo = f
      else hi = f
      f = (lo + hi) / 2
    }
    const out = Math.round(best.f * 1000) / 1000
    applyPair(out)
    if (onPairFrac && Math.abs(out - (pairFrac ?? 0.5)) > 0.002) onPairFrac(out)
  }, [applyPair, layout, onPairFrac, pairAuto, pairFrac, probe])

  /* whl-text re-renders on every layer event, so re-run after a macrotask.
     The work is reached through a ref: balance() writes the chosen fraction back
     up as state, and depending on its identity here would re-enter itself. */
  const workRef = useRef({ injectHiero, balance })
  workRef.current = { injectHiero, balance }
  useEffect(() => {
    const t = setTimeout(() => {
      workRef.current.injectHiero()
      workRef.current.balance()
    }, 40)
    return () => clearTimeout(t)
  }, [measureKey])

  return <div id={domId} ref={hostRef} className="min-h-0" />
}
