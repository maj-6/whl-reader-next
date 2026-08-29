import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
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
  const currentRow =
    book.kind === 'roll' ? curRegion : (rows.filter((r) => r.i <= curRegion).pop() ?? { i: -1 }).i

  const match = (s: string) => !query || s.toLowerCase().includes(query)
  const spanPages = book.kind === 'roll' ? COLS.map((c) => c.key) : reader.dataPages

  return (
    <aside
      className="panel panel-solid relative z-40 flex shrink-0 flex-col border-y-0 border-l-0"
      style={{ width }}
      aria-label="Navigation"
    >
      <PositionIndicator book={book} page={viewPage} pages={spanPages} onGoto={(k) => reader.goto(k)} />

      {book.facing && (
        <div className="px-3 pb-2">
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            className="w-full"
            value={opening ? 'opening' : 'single'}
            onValueChange={(v) => v && onOpening(v === 'opening')}
          >
            <ToggleGroupItem value="single" className="flex-1 text-[11px]">
              Single
            </ToggleGroupItem>
            <ToggleGroupItem value="opening" className="flex-1 text-[11px]">
              Opening
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      <Separator />

      <div className="relative px-3 py-2">
        <Search className="pointer-events-none absolute left-5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              setQ('')
            }
          }}
          placeholder="Filter"
          aria-label="Filter lists"
          className="h-7 pl-7 text-[12px]"
        />
      </div>

      <Separator />

      <ScrollArea className="min-h-0 flex-1">
        {book.kind === 'roll' && (
          <section aria-label="Columns">
            <h2 className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Columns
            </h2>
            {COLS.map(({ key }) => {
              const label = `Column ${Number(key.slice(4))}`
              const sub = colRange(key)
              if (!match(label + ' ' + sub)) return null
              return (
                <button
                  key={key}
                  onClick={() => reader.goto(key)}
                  className={cn(
                    'block w-full border-l-2 px-3 py-1.5 text-left transition-colors hover:bg-accent',
                    key === viewPage ? 'border-l-primary bg-accent' : 'border-l-transparent',
                  )}
                >
                  <span
                    className={cn(
                      'block truncate text-[12.5px]',
                      key === viewPage ? 'font-semibold' : 'font-medium',
                      !reader.hasData(key) && 'text-muted-foreground',
                    )}
                  >
                    {label}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">{sub}</span>
                </button>
              )
            })}
            <Separator className="mt-2" />
          </section>
        )}

        <section aria-label={book.entriesTitle(viewPage)}>
          <h2 className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {book.entriesTitle(viewPage)}
          </h2>
          {rows.length === 0 && (
            <p className="px-3 pb-3 text-[12px] text-muted-foreground">{reader.hasData(viewPage) ? '…' : '—'}</p>
          )}
          {rows.map((r) => {
            if (!match(`${r.r1} ${r.r2 ?? ''}`)) return null
            const cur = viewPage === curPage && r.i === currentRow
            return (
              <button
                key={r.i}
                onClick={() => reader.select(viewPage, r.i)}
                className={cn(
                  'block w-full border-l-2 py-1.5 pr-3 text-left transition-colors hover:bg-accent',
                  r.sub ? 'pl-6' : 'pl-3',
                  cur ? 'border-l-primary bg-accent' : 'border-l-transparent',
                )}
              >
                <span className={cn('block truncate text-[12.5px]', cur ? 'font-semibold' : 'font-medium')}>{r.r1}</span>
                {r.r2 && <span className="block truncate text-[11px] text-muted-foreground">{r.r2}</span>}
              </button>
            )
          })}
        </section>
        <div className="h-3" />
      </ScrollArea>
    </aside>
  )
}
