import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Masthead } from '@/components/Masthead'
import { SettingsPanel } from '@/components/SettingsPanel'
import { LeftSidebar } from '@/components/LeftSidebar'
import { RightPanels } from '@/components/RightPanels'
import { ReadingWindow } from '@/components/ReadingWindow'
import { Minimap } from '@/components/Minimap'
import { BOOKS, resolveBook } from '@/whl/books'
import { useSettings } from '@/whl/settings'
import { applyTheme } from '@/whl/theme'
import { useReader } from '@/whl/useReader'

const clamp = (lo: number, hi: number, v: number) => Math.max(lo, Math.min(hi, v))

export default function App() {
  const bookId = useMemo(() => resolveBook(new URLSearchParams(location.search).get('book')), [])
  const book = BOOKS[bookId]
  const { settings, patch, reset } = useSettings(bookId)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const reader = useReader(book, settings.opening)

  /* theme + element register live on <html> */
  useEffect(() => {
    applyTheme({
      scheme: settings.scheme,
      dark: settings.dark,
      corner: settings.corner,
      stage: settings.stage,
      uiFont: settings.uiFont,
      readFont: settings.readFont,
      readSize: settings.readSize,
      readLeading: settings.readLeading,
      panelAlpha: settings.panelAlpha,
      panelBlur: settings.panelBlur,
    })
    document.documentElement.dataset.element = settings.element
  }, [settings])

  /* hieroglyph control appears only where the data does */
  const { dataPages, regionsOf, hasData, curPage, curRegion } = reader
  const hieroAvailable = useMemo(
    () => dataPages.some((k) => regionsOf(k).some((r) => Array.isArray(r.hl) && r.hl.length > 0)),
    [dataPages, regionsOf],
  )

  const entryLabel = useMemo(() => {
    const regs = regionsOf(curPage)
    const r = regs[curRegion]
    if (!r) return hasData(curPage) ? '…' : '—'
    if (book.kind === 'roll') return r.case_label ?? (r.type === 'header' ? 'column header' : '')
    const row = book.rows(regs).filter((x) => x.i <= curRegion).pop()
    return row ? row.r1 : (r.type ?? '')
  }, [book, curPage, curRegion, hasData, regionsOf])

  /* ---- drag handles: sidebar width, panel width, panel division ---- */
  const dragRef = useRef<{ kind: 'left' | 'right' | 'split'; x: number; y: number; v: number; id: number } | null>(null)
  const startDrag = (kind: 'left' | 'right' | 'split') => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const v = kind === 'left' ? settings.leftWidth : kind === 'right' ? settings.rightWidth : settings.rightSplit
    dragRef.current = { kind, x: e.clientX, y: e.clientY, v, id: e.pointerId }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    document.body.style.userSelect = 'none'
    e.preventDefault()
  }
  const moveDrag = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d || d.id !== e.pointerId) return
    if (d.kind === 'left') patch({ leftWidth: clamp(200, 460, d.v + (e.clientX - d.x)) })
    else if (d.kind === 'right') patch({ rightWidth: clamp(300, 640, d.v - (e.clientX - d.x)) })
    else {
      const h = window.innerHeight - 56 - 24
      patch({ rightSplit: clamp(20, 85, d.v + ((e.clientY - d.y) / h) * 100) })
    }
  }
  const endDrag = () => {
    dragRef.current = null
    document.body.style.userSelect = ''
  }

  /* ---- keyboard ---- */
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const tag = (e.target as HTMLElement | null)?.tagName ?? ''
      if (e.key === 'Escape') {
        setSettingsOpen(false)
        reader.bus.emit('select:clear', {})
        ;(document.activeElement as HTMLElement | null)?.blur()
        return
      }
      if (/input|select|textarea/i.test(tag)) return
      if (e.key === 'ArrowLeft') {
        book.kind === 'roll' ? reader.viewer?.next() : reader.step(-1)
        e.preventDefault()
      } else if (e.key === 'ArrowRight') {
        book.kind === 'roll' ? reader.viewer?.prev() : reader.step(1)
        e.preventDefault()
      } else if (e.key === '[') {
        patch({ leftOpen: !settings.leftOpen })
        e.preventDefault()
      } else if (e.key === ']') {
        patch({ rightOpen: !settings.rightOpen })
        e.preventDefault()
      }
    },
    [book.kind, patch, reader, settings.leftOpen, settings.rightOpen],
  )
  useEffect(() => {
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onKey])

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-full flex-col" onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <Masthead
          book={book}
          dark={settings.dark}
          leftOpen={settings.leftOpen}
          rightOpen={settings.rightOpen}
          onDark={(v) => patch({ dark: v })}
          onLeft={(v) => patch({ leftOpen: v })}
          onRight={(v) => patch({ rightOpen: v })}
          onSettings={() => setSettingsOpen((v) => !v)}
          settingsOpen={settingsOpen}
        />

        <div className="relative flex min-h-0 flex-1">
          {settings.leftOpen && (
            <>
              <LeftSidebar
                book={book}
                reader={reader}
                opening={settings.opening}
                onOpening={(v) => patch({ opening: v })}
                width={settings.leftWidth}
              />
              <div
                className="absolute bottom-0 top-0 z-40 w-1.5 cursor-ew-resize touch-none hover:bg-primary/40"
                style={{ left: settings.leftWidth - 3 }}
                onPointerDown={startDrag('left')}
                role="separator"
                aria-label="Resize navigation"
              />
            </>
          )}

          {/* facsimile stage */}
          <div className="relative min-w-0 flex-1">
            <div id="stage" ref={reader.stageRef} />

            <div className="pointer-events-none absolute inset-0">
              {settings.minimap && <Minimap book={book} reader={reader} opening={settings.opening} />}

              {settings.rightOpen && (
                <>
                  <RightPanels
                    book={book}
                    reader={reader}
                    settings={settings}
                    patch={patch}
                    hieroAvailable={hieroAvailable}
                  />
                  <div
                    className="pointer-events-auto absolute bottom-3 top-3 z-40 w-2.5 cursor-ew-resize touch-none rounded-full hover:bg-primary/40"
                    style={{ right: settings.rightWidth + 7 }}
                    onPointerDown={startDrag('right')}
                    role="separator"
                    aria-label="Resize information panels"
                  />
                  <div
                    className="pointer-events-auto absolute z-40 h-2 cursor-ns-resize touch-none rounded-full hover:bg-primary/40"
                    style={{
                      right: 12,
                      width: settings.rightWidth,
                      top: `calc(0.75rem + (100% - 1.5rem) * ${settings.rightSplit / 100} - 4px)`,
                    }}
                    onPointerDown={startDrag('split')}
                    role="separator"
                    aria-label="Resize panel division"
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {!settings.rightOpen && (
          <ReadingWindow book={book} reader={reader} settings={settings} patch={patch} entryLabel={entryLabel} />
        )}

        {settingsOpen && <SettingsPanel settings={settings} patch={patch} reset={reset} onClose={() => setSettingsOpen(false)} />}
      </div>
    </TooltipProvider>
  )
}
