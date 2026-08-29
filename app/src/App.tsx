import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, MantineProvider, createTheme, type CSSVariablesResolver } from '@mantine/core'
import { Masthead } from '@/components/Masthead'
import { SettingsPanel } from '@/components/SettingsPanel'
import { LeftSidebar } from '@/components/LeftSidebar'
import { RightPanels } from '@/components/RightPanels'
import { ReadingWindow } from '@/components/ReadingWindow'
import { Minimap } from '@/components/Minimap'
import { BOOKS, resolveBook } from '@/whl/books'
import { useSettings, type Settings } from '@/whl/settings'
import { CORNERS, READ_FONTS, UI_FONTS, applyPageVars, mantineVars, pick, primaryShades } from '@/whl/theme'
import { useReader } from '@/whl/useReader'

const clamp = (lo: number, hi: number, v: number) => Math.max(lo, Math.min(hi, v))

function Explorer({
  settings,
  patch,
  reset,
}: {
  settings: Settings
  patch(p: Partial<Settings>): void
  reset(): void
}) {
  const bookId = useMemo(() => resolveBook(new URLSearchParams(location.search).get('book')), [])
  const book = BOOKS[bookId]
  const [settingsOpen, setSettingsOpen] = useState(false)
  const reader = useReader(book, settings.opening)

  /* tokens the page and the vanilla modules read live on <html> */
  useEffect(() => {
    applyPageVars(settings)
    document.documentElement.dataset.element = settings.element
  }, [settings])

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

  const handle = { position: 'absolute' as const, zIndex: 40, touchAction: 'none' as const }

  return (
    <Box h="100%" display="flex" style={{ flexDirection: 'column' }} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
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

      <Box pos="relative" display="flex" flex={1} mih={0}>
        {settings.leftOpen && (
          <>
            <LeftSidebar
              book={book}
              reader={reader}
              opening={settings.opening}
              onOpening={(v) => patch({ opening: v })}
              width={settings.leftWidth}
            />
            <Box
              role="separator"
              aria-label="Resize navigation"
              onPointerDown={startDrag('left')}
              style={{ ...handle, top: 0, bottom: 0, left: settings.leftWidth - 3, width: 6, cursor: 'ew-resize' }}
            />
          </>
        )}

        {/* facsimile stage */}
        <Box pos="relative" flex={1} miw={0}>
          <Box id="stage" ref={reader.stageRef} />

          <Box pos="absolute" inset={0} style={{ pointerEvents: 'none' }}>
            {settings.minimap && <Minimap book={book} reader={reader} opening={settings.opening} />}

            {settings.rightOpen && (
              <>
                <RightPanels book={book} reader={reader} settings={settings} patch={patch} hieroAvailable={hieroAvailable} />
                <Box
                  role="separator"
                  aria-label="Resize information panels"
                  onPointerDown={startDrag('right')}
                  style={{
                    ...handle,
                    top: 12,
                    bottom: 12,
                    right: settings.rightWidth + 7,
                    width: 10,
                    cursor: 'ew-resize',
                    pointerEvents: 'auto',
                  }}
                />
                <Box
                  role="separator"
                  aria-label="Resize panel division"
                  onPointerDown={startDrag('split')}
                  style={{
                    ...handle,
                    right: 12,
                    width: settings.rightWidth,
                    height: 8,
                    top: `calc(12px + (100% - 24px) * ${settings.rightSplit / 100} - 4px)`,
                    cursor: 'ns-resize',
                    pointerEvents: 'auto',
                  }}
                />
              </>
            )}
          </Box>
        </Box>
      </Box>

      {!settings.rightOpen && (
        <ReadingWindow book={book} reader={reader} settings={settings} patch={patch} entryLabel={entryLabel} />
      )}

      {settingsOpen && <SettingsPanel settings={settings} patch={patch} reset={reset} onClose={() => setSettingsOpen(false)} />}
    </Box>
  )
}

export default function App() {
  const bookId = useMemo(() => resolveBook(new URLSearchParams(location.search).get('book')), [])
  const { settings, patch, reset } = useSettings(bookId)

  /* Mantine's own components sit on the generated palette: the primary colour is
     built from the scheme's accent, and the surface variables are replaced. */
  const theme = useMemo(
    () =>
      createTheme({
        primaryColor: 'brand',
        primaryShade: { light: 6, dark: 4 },
        colors: { brand: primaryShades(settings.scheme, settings.dark) },
        defaultRadius: pick(CORNERS, settings.corner).v,
        fontFamily: pick(UI_FONTS, settings.uiFont).v,
        headings: { fontFamily: pick(READ_FONTS, settings.readFont).v },
        fontSizes: { xs: '11px', sm: '12.5px', md: '14px' },
        cursorType: 'pointer',
      }),
    [settings.corner, settings.dark, settings.readFont, settings.scheme, settings.uiFont],
  )

  // Mantine emits the light/dark blocks at higher specificity than the shared
  // `variables` block, so the overrides have to go in both to take effect. The
  // colour scheme is forced, so the same map serves for each.
  const resolver: CSSVariablesResolver = useMemo(() => {
    const vars = mantineVars(settings)
    return () => ({ variables: {}, light: vars, dark: vars })
  }, [settings])

  return (
    <MantineProvider theme={theme} cssVariablesResolver={resolver} forceColorScheme={settings.dark ? 'dark' : 'light'}>
      <Explorer settings={settings} patch={patch} reset={reset} />
    </MantineProvider>
  )
}
