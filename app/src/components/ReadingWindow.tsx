import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, GripHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TextPane } from './TextPane'
import type { Book } from '@/whl/books'
import type { Reader } from '@/whl/useReader'
import type { Settings } from '@/whl/settings'

interface Props {
  book: Book
  reader: Reader
  settings: Settings
  patch(p: Partial<Settings>): void
  entryLabel: string
}

/** Materialises when the information panels are closed: the same reading text,
 *  free to sit anywhere over the facsimile. */
export function ReadingWindow({ book, reader, settings, patch, entryLabel }: Props) {
  const { curPage, curRegion, layerTick } = reader
  const regions = reader.regionsOf(curPage)
  const noData = !reader.hasData(curPage)
  const ref = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ mode: 'move' | 'size'; dx: number; dy: number; id: number } | null>(null)
  const [geo, setGeo] = useState(settings.win)

  const clampGeo = useCallback((g: typeof geo) => {
    const w = Math.max(280, Math.min(g.w, window.innerWidth - 16))
    const h = Math.max(180, Math.min(g.h, window.innerHeight - 80))
    return {
      w,
      h,
      x: Math.max(8, Math.min(g.x, window.innerWidth - w - 8)),
      y: Math.max(60, Math.min(g.y, window.innerHeight - 48)),
    }
  }, [])

  /* Place once, and only against a real viewport: a pane that is still unsized
     would park the window in the top-left corner and keep it there. */
  useEffect(() => {
    if (geo.x >= 0 || geo.y >= 0) return
    if (window.innerWidth < 400 || window.innerHeight < 300) return
    setGeo(clampGeo({ ...geo, x: window.innerWidth - geo.w - 72, y: 78 }))
  }, [clampGeo, geo])

  useEffect(() => {
    const onResize = () => setGeo((g) => (g.x < 0 && g.y < 0 ? g : clampGeo(g)))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [clampGeo])

  const start = (mode: 'move' | 'size') => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    drag.current =
      mode === 'move'
        ? { mode, dx: e.clientX - geo.x, dy: e.clientY - geo.y, id: e.pointerId }
        : { mode, dx: geo.w - e.clientX, dy: geo.h - e.clientY, id: e.pointerId }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    e.preventDefault()
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    setGeo((g) =>
      clampGeo(
        d.mode === 'move'
          ? { ...g, x: e.clientX - d.dx, y: e.clientY - d.dy }
          : { ...g, w: e.clientX + d.dx, h: e.clientY + d.dy },
      ),
    )
  }
  const end = () => {
    if (!drag.current) return
    drag.current = null
    patch({ win: geo })
  }

  return (
    <div
      ref={ref}
      className="panel panel-floating fixed z-40 flex flex-col overflow-hidden shadow-lg"
      style={{ left: geo.x, top: geo.y, width: geo.w, height: geo.h }}
      aria-label="Reading window"
    >
      <div
        className="flex cursor-grab touch-none select-none items-baseline gap-2 border-b border-border px-3 py-2 active:cursor-grabbing"
        onPointerDown={start('move')}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <GripHorizontal className="size-3.5 shrink-0 self-center text-muted-foreground" />
        <span className="shrink-0 text-[12.5px] font-semibold">{book.pageLabel(curPage)}</span>
        <span className="truncate text-[11.5px] text-muted-foreground">{entryLabel && `· ${entryLabel}`}</span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {noData ? (
          <p className="p-3 text-[13px] text-muted-foreground">—</p>
        ) : (
          <TextPane
            domId="whlTextWin"
            bus={reader.bus}
            store={reader.store}
            book={book.id}
            page={curPage}
            layout="strip"
            stripShow="both"
            region={curRegion}
            hiero={settings.hiero}
            regions={regions}
            measureKey={`win:${settings.readSize}:${settings.readLeading}:${settings.hiero}:${curRegion}:${layerTick}`}
          />
        )}
      </ScrollArea>

      <div className="flex items-center gap-2 border-t border-border px-2 py-1.5">
        <Button
          variant="outline"
          size="icon"
          className="size-6"
          disabled={!regions.length || curRegion <= 0}
          onClick={() => reader.step(-1)}
          aria-label="Previous"
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        <span className="min-w-14 text-center text-[11px] tabular-nums text-muted-foreground">
          {regions.length ? `${curRegion + 1} / ${regions.length}` : ''}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-6"
          disabled={!regions.length || curRegion >= regions.length - 1}
          onClick={() => reader.step(1)}
          aria-label="Next"
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </div>

      <div
        className="absolute bottom-0 right-0 size-4 cursor-nwse-resize touch-none"
        onPointerDown={start('size')}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <span className="absolute bottom-1 right-1 size-1.5 border-b-2 border-r-2 border-muted-foreground/60" />
      </div>
    </div>
  )
}
