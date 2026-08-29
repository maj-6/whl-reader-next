import { useMemo, useState } from 'react'
import { Box, Divider, ScrollArea, SegmentedControl, Text, TextInput, UnstyledButton } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { PositionIndicator } from './PositionIndicator'
import { COLS, type PageKey } from '@/whl/vanilla'
import type { Book } from '@/whl/books'
import type { Reader } from '@/whl/useReader'

interface Props {
  book: Book
  reader: Reader
  opening: boolean
  onOpening(v: boolean): void
  width: number
}

function Row({
  current,
  indent,
  title,
  sub,
  dim,
  onClick,
}: {
  current: boolean
  indent?: boolean
  title: string
  sub?: string
  dim?: boolean
  onClick(): void
}) {
  return (
    <UnstyledButton
      onClick={onClick}
      display="block"
      w="100%"
      py={6}
      pr="sm"
      pl={indent ? 24 : 12}
      style={{
        textAlign: 'left',
        borderLeft: `2px solid ${current ? 'var(--accent)' : 'transparent'}`,
        background: current ? 'var(--tint-region)' : undefined,
      }}
      __vars={{ '--row-hover': 'var(--tint-region)' }}
      onMouseEnter={(e) => {
        if (!current) e.currentTarget.style.background = 'var(--tint-region)'
      }}
      onMouseLeave={(e) => {
        if (!current) e.currentTarget.style.background = ''
      }}
    >
      <Text size="12.5px" fw={current ? 600 : 500} c={dim ? 'dimmed' : undefined} truncate>
        {title}
      </Text>
      {sub && (
        <Text size="11px" c="dimmed" truncate>
          {sub}
        </Text>
      )}
    </UnstyledButton>
  )
}

export function LeftSidebar({ book, reader, opening, onOpening, width }: Props) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const { viewPage, curPage, curRegion, layerTick } = reader

  const caseNo = (l?: string) => {
    const m = /^Eb (\d+[a-z]?)/.exec(l ?? '')
    return m ? m[1] : null
  }
  const colRange = (k: PageKey) => {
    const ns = reader.regionsOf(k).map((r) => caseNo(r.case_label)).filter(Boolean) as string[]
    return ns.length ? `Eb ${ns[0]}–${ns[ns.length - 1]}` : reader.hasData(k) ? '…' : '—'
  }

  const rows = useMemo(
    () => book.rows(reader.regionsOf(viewPage)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book, viewPage, layerTick],
  )
  const currentRow = book.kind === 'roll' ? curRegion : (rows.filter((r) => r.i <= curRegion).pop() ?? { i: -1 }).i
  const match = (s: string) => !query || s.toLowerCase().includes(query)
  const spanPages = book.kind === 'roll' ? COLS.map((c) => c.key) : reader.dataPages

  const Heading = ({ children }: { children: React.ReactNode }) => (
    <Text px="sm" pt={10} pb={4} size="10px" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.08em' }}>
      {children}
    </Text>
  )

  return (
    <Box
      component="aside"
      className="panel panel-solid"
      w={width}
      display="flex"
      aria-label="Navigation"
      style={{ flexDirection: 'column', flex: 'none', borderBlock: 0, borderLeft: 0, position: 'relative', zIndex: 40 }}
    >
      <PositionIndicator book={book} page={viewPage} pages={spanPages} onGoto={(k) => reader.goto(k)} />

      {book.facing && (
        <Box px="sm" pb={8}>
          <SegmentedControl
            size="xs"
            fullWidth
            value={opening ? 'opening' : 'single'}
            onChange={(v) => onOpening(v === 'opening')}
            data={[
              { value: 'single', label: 'Single' },
              { value: 'opening', label: 'Opening' },
            ]}
          />
        </Box>
      )}

      <Divider />

      <Box px="sm" py={8}>
        <TextInput
          size="xs"
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              setQ('')
            }
          }}
          placeholder="Filter"
          aria-label="Filter lists"
          leftSection={<IconSearch size={13} />}
        />
      </Box>

      <Divider />

      <ScrollArea flex={1} mih={0} type="auto">
        {book.kind === 'roll' && (
          <Box component="section" aria-label="Columns">
            <Heading>Columns</Heading>
            {COLS.map(({ key }) => {
              const label = `Column ${Number(key.slice(4))}`
              const sub = colRange(key)
              if (!match(label + ' ' + sub)) return null
              return (
                <Row
                  key={key}
                  current={key === viewPage}
                  title={label}
                  sub={sub}
                  dim={!reader.hasData(key)}
                  onClick={() => reader.goto(key)}
                />
              )
            })}
            <Divider mt={8} />
          </Box>
        )}

        <Box component="section" aria-label={book.entriesTitle(viewPage)}>
          <Heading>{book.entriesTitle(viewPage)}</Heading>
          {rows.length === 0 && (
            <Text px="sm" pb="sm" size="12px" c="dimmed">
              {reader.hasData(viewPage) ? '…' : '—'}
            </Text>
          )}
          {rows.map((r) =>
            match(`${r.r1} ${r.r2 ?? ''}`) ? (
              <Row
                key={r.i}
                current={viewPage === curPage && r.i === currentRow}
                indent={r.sub}
                title={r.r1}
                sub={r.r2}
                onClick={() => reader.select(viewPage, r.i)}
              />
            ) : null,
          )}
        </Box>
        <Box h={12} />
      </ScrollArea>
    </Box>
  )
}
