import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Box } from '@mantine/core'
import type { Reader } from '@/whl/useReader'
import { viewerPagesFor, type Book } from '@/whl/books'
import type { ViewerPage } from '@/whl/vanilla'

const H = 76 // drawn world height in px; width follows the world's aspect

type Cell = ViewerPage & {
  left: number
  width: number
  imgLeft: number
  imgTop: number
  imgW: number
  imgH: number
}

/** Floats over the facsimile rather than sitting in the sidebar. The world is
 *  drawn at a fixed height, so a long roll simply runs wider than the strip and
 *  scrolls horizontally, keeping the viewport rectangle in sight. */
export function Minimap({ book, reader, opening }: { book: Book; reader: Reader; opening: boolean }) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const worldRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<number | null>(null)
  const [geom, setGeom] = useState<{ minX: number; k: number; w: number; cells: Cell[] } | null>(null)

  const pages = useMemo(() => viewerPagesFor(book, opening), [book, opening])

  const build = useCallback(() => {
    const viewer = reader.viewer
    if (!viewer) return
    const rects = pages.map((p) => viewer.worldRect(p.key))
    if (!rects.length || rects.some((r) => !r)) return
    const minX = Math.min(...rects.map((r) => r!.x))
    const maxX = Math.max(...rects.map((r) => r!.x + r!.w))
    const world = maxX - minX || 1
    const k = H
    const cells: Cell[] = pages.map((p, i) => {
      const r = rects[i]!
      const c = p.clip ?? {}
      const cl = c.left ?? 0
      const ct = c.top ?? 0
      const cb = c.bottom ?? 0
      const ch = 1 - ct - cb
      const a = p.w > 0 && p.h > 0 ? p.w / p.h : 0.7
      const iw = a / ch
      const ih = 1 / ch
      return {
        ...p,
        left: (r.x - minX) * k,
        width: r.w * k,
        imgLeft: -cl * iw * k,
        imgTop: -ct * ih * k,
        imgW: iw * k,
        imgH: ih * k,
      }
    })
    setGeom({ minX, k, w: world * k, cells })
  }, [pages, reader.viewer])

  useLayoutEffect(() => {
    build()
  }, [build, reader.viewerNonce])

  /* keep the viewport rectangle in view as the roll is panned */
  const vp = reader.viewport
  useEffect(() => {
    const sc = scrollRef.current
    if (!sc || !geom || !vp) return
    const left = (vp.x - geom.minX) * geom.k
    const right = left + vp.w * geom.k
    const pad = 24
    if (left < sc.scrollLeft + pad) sc.scrollTo({ left: Math.max(0, left - pad), behavior: 'smooth' })
    else if (right > sc.scrollLeft + sc.clientWidth - pad)
      sc.scrollTo({ left: right - sc.clientWidth + pad, behavior: 'smooth' })
  }, [geom, vp])

  const panFrom = useCallback(
    (clientX: number, clientY: number) => {
      const el = worldRef.current
      if (!el || !geom) return
      const r = el.getBoundingClientRect()
      reader.panWorld(geom.minX + (clientX - r.left) / geom.k, (clientY - r.top) / geom.k)
    },
    [geom, reader],
  )

  if (!geom) return null
  const box = vp
    ? {
        left: (vp.x - geom.minX) * geom.k,
        top: vp.y * geom.k,
        width: Math.max(3, vp.w * geom.k),
        height: Math.max(3, vp.h * geom.k),
      }
    : null

  return (
    <Box
      className="panel panel-floating"
      pos="absolute"
      bottom={12}
      left="50%"
      style={{
        transform: 'translateX(-50%)',
        zIndex: 30,
        overflow: 'hidden',
        pointerEvents: 'auto',
        maxWidth: 'min(46rem, calc(100% - 2rem))',
        boxShadow: 'var(--mantine-shadow-lg)',
      }}
    >
      <Box ref={scrollRef} style={{ overflowX: 'auto', overflowY: 'hidden', overscrollBehaviorX: 'contain', maxWidth: 'min(46rem, 100%)' }}>
        <Box
          ref={worldRef}
          pos="relative"
          w={geom.w}
          h={H}
          style={{ cursor: 'crosshair', touchAction: 'none' }}
          onPointerDown={(e) => {
            if (e.button !== 0) return
            dragRef.current = e.pointerId
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
            panFrom(e.clientX, e.clientY)
            e.preventDefault()
          }}
          onPointerMove={(e) => {
            if (dragRef.current === e.pointerId) panFrom(e.clientX, e.clientY)
          }}
          onPointerUp={() => {
            dragRef.current = null
          }}
          onPointerCancel={() => {
            dragRef.current = null
          }}
        >
          {geom.cells.map((c) => (
            <Box key={c.key} pos="absolute" top={0} h={H} style={{ left: c.left, width: c.width, overflow: 'hidden' }}>
              <img
                src={c.url}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  maxWidth: 'none',
                  userSelect: 'none',
                  left: c.imgLeft,
                  top: c.imgTop,
                  width: c.imgW,
                  height: c.imgH,
                }}
              />
            </Box>
          ))}
          {box && (
            <Box
              pos="absolute"
              style={{
                ...box,
                pointerEvents: 'none',
                border: '2px solid var(--accent)',
                background: 'var(--tint-select)',
              }}
            />
          )}
        </Box>
      </Box>
    </Box>
  )
}
