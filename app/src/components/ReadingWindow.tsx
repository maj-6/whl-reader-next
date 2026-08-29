import { useCallback, useEffect, useRef, useState } from 'react'
import { ActionIcon, Box, Group, ScrollArea, Text } from '@mantine/core'
import { IconChevronLeft, IconChevronRight, IconGripHorizontal } from '@tabler/icons-react'
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
      clampGeo(d.mode === 'move' ? { ...g, x: e.clientX - d.dx, y: e.clientY - d.dy } : { ...g, w: e.clientX + d.dx, h: e.clientY + d.dy }),
    )
  }
  const end = () => {
    if (!drag.current) return
    drag.current = null
    patch({ win: geo })
  }

  return (
    <Box
      className="panel panel-floating"
      pos="fixed"
      display="flex"
      aria-label="Reading window"
      style={{
        left: geo.x,
        top: geo.y,
        width: geo.w,
        height: geo.h,
        zIndex: 40,
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: 'var(--mantine-shadow-lg)',
      }}
    >
      <Group
        gap={8}
        px="sm"
        py={7}
        wrap="nowrap"
        align="baseline"
        style={{ borderBottom: '1px solid var(--panel-border)', cursor: 'grab', touchAction: 'none', userSelect: 'none' }}
        onPointerDown={start('move')}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <IconGripHorizontal size={14} style={{ flex: 'none', alignSelf: 'center', color: 'var(--mantine-color-dimmed)' }} />
        <Text size="12.5px" fw={600} flex="none">
          {book.pageLabel(curPage)}
        </Text>
        <Text size="11.5px" c="dimmed" truncate>
          {entryLabel && `· ${entryLabel}`}
        </Text>
      </Group>

      <ScrollArea flex={1} mih={0} type="auto">
        {noData ? (
          <Text p="sm" size="13px" c="dimmed">—</Text>
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

      <Group gap="xs" px={8} py={6} style={{ borderTop: '1px solid var(--panel-border)' }}>
        <ActionIcon
          size="sm"
          variant="default"
          disabled={!regions.length || curRegion <= 0}
          onClick={() => reader.step(-1)}
          aria-label="Previous"
        >
          <IconChevronLeft size={14} />
        </ActionIcon>
        <Text miw={56} ta="center" size="11px" c="dimmed">
          {regions.length ? `${curRegion + 1} / ${regions.length}` : ''}
        </Text>
        <ActionIcon
          size="sm"
          variant="default"
          disabled={!regions.length || curRegion >= regions.length - 1}
          onClick={() => reader.step(1)}
          aria-label="Next"
        >
          <IconChevronRight size={14} />
        </ActionIcon>
      </Group>

      <Box
        pos="absolute"
        bottom={0}
        right={0}
        w={16}
        h={16}
        style={{ cursor: 'nwse-resize', touchAction: 'none' }}
        onPointerDown={start('size')}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <Box
          pos="absolute"
          bottom={4}
          right={4}
          w={6}
          h={6}
          style={{ borderRight: '2px solid var(--mantine-color-dimmed)', borderBottom: '2px solid var(--mantine-color-dimmed)' }}
        />
      </Box>
    </Box>
  )
}
