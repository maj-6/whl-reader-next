import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { Book } from '@/whl/books'
import type { PageKey } from '@/whl/vanilla'

/** Where the leaf on view sits in the whole book: a scale of the complete
 *  span, the stretch this edition actually carries, and a marker on the
 *  current page. Clicking inside the carried stretch navigates to it. */
export function PositionIndicator({
  book,
  page,
  pages,
  onGoto,
}: {
  book: Book
  page: PageKey
  pages: PageKey[]
  onGoto(key: PageKey): void
}) {
  const { total, unit } = book.span
  const held = useMemo(
    () =>
      pages
        .map((k) => ({ key: k, n: book.span.ordinal(k) }))
        .filter((x): x is { key: PageKey; n: number } => x.n != null)
        .sort((a, b) => a.n - b.n),
    [book, pages],
  )
  const current = book.span.ordinal(page)
  const lo = held.length ? held[0].n : 1
  const hi = held.length ? held[held.length - 1].n : 1
  const pct = (n: number) => ((n - 0.5) / total) * 100

  return (
    <div className="px-3 pb-2.5 pt-2">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="truncate text-[11.5px] font-medium">{book.span.label(page)}</span>
        <span className="shrink-0 text-[10.5px] tabular-nums text-muted-foreground">
          {current ?? '—'} / {total} {unit}s
        </span>
      </div>

      <div
        className="relative h-3 w-full cursor-pointer rounded-full bg-muted"
        role="group"
        aria-label={`Position in ${total} ${unit}s`}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const n = ((e.clientX - r.left) / r.width) * total
          let best: { key: PageKey; n: number } | null = null
          for (const h of held) if (!best || Math.abs(h.n - n) < Math.abs(best.n - n)) best = h
          if (best) onGoto(best.key)
        }}
      >
        {/* the stretch this edition carries */}
        <div
          className="absolute inset-y-0 rounded-full bg-primary/25"
          style={{ left: `${((lo - 1) / total) * 100}%`, width: `${Math.max(1.2, ((hi - lo + 1) / total) * 100)}%` }}
        />
        {/* every held leaf */}
        {held.map((h) => (
          <span
            key={h.key}
            className={cn(
              'absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full',
              h.key === page ? 'bg-transparent' : 'bg-primary/60',
            )}
            style={{ left: `${pct(h.n)}%` }}
          />
        ))}
        {/* the leaf on view */}
        {current != null && (
          <span
            className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-background"
            style={{ left: `${pct(current)}%` }}
          />
        )}
      </div>

      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>1</span>
        <span>{total}</span>
      </div>
    </div>
  )
}
