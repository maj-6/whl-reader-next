import { useMemo } from 'react'
import { Box, Group, Text } from '@mantine/core'
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
    <Box px="sm" pt={8} pb={10}>
      <Group justify="space-between" align="baseline" gap="xs" mb={6} wrap="nowrap">
        <Text size="11.5px" fw={500} truncate>
          {book.span.label(page)}
        </Text>
        <Text size="10.5px" c="dimmed" flex="none">
          {current ?? '—'} / {total} {unit}s
        </Text>
      </Group>

      <Box
        h={12}
        pos="relative"
        role="group"
        aria-label={`Position in ${total} ${unit}s`}
        style={{ background: 'var(--muted)', borderRadius: 999, cursor: 'pointer' }}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const n = ((e.clientX - r.left) / r.width) * total
          let best: { key: PageKey; n: number } | null = null
          for (const h of held) if (!best || Math.abs(h.n - n) < Math.abs(best.n - n)) best = h
          if (best) onGoto(best.key)
        }}
      >
        {/* the stretch this edition carries */}
        <Box
          pos="absolute"
          top={0}
          bottom={0}
          style={{
            left: `${((lo - 1) / total) * 100}%`,
            width: `${Math.max(1.2, ((hi - lo + 1) / total) * 100)}%`,
            background: 'color-mix(in oklab, var(--accent) 30%, transparent)',
            borderRadius: 999,
          }}
        />
        {/* every held leaf */}
        {held.map((h) =>
          h.key === page ? null : (
            <Box
              key={h.key}
              pos="absolute"
              w={6}
              h={6}
              style={{
                left: `${pct(h.n)}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                borderRadius: 999,
                background: 'color-mix(in oklab, var(--accent) 65%, transparent)',
              }}
            />
          ),
        )}
        {/* the leaf on view */}
        {current != null && (
          <Box
            pos="absolute"
            w={4}
            h={16}
            style={{
              left: `${pct(current)}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              borderRadius: 999,
              background: 'var(--accent)',
              boxShadow: '0 0 0 2px var(--panel-solid-bg)',
            }}
          />
        )}
      </Box>

      <Group justify="space-between" mt={3}>
        <Text size="10px" c="dimmed">1</Text>
        <Text size="10px" c="dimmed">{total}</Text>
      </Group>
    </Box>
  )
}
