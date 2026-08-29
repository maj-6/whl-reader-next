import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { TextPane } from './TextPane'
import type { Book } from '@/whl/books'
import type { Reader } from '@/whl/useReader'
import type { Settings } from '@/whl/settings'

function Section({
  title,
  children,
  right,
  grow,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  right?: React.ReactNode
  grow?: boolean
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn('flex min-h-0 flex-col', grow && open ? 'flex-1' : 'flex-none')}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {title}
          </span>
          <ChevronDown className={cn('size-3 shrink-0 text-muted-foreground transition-transform', !open && '-rotate-90')} />
        </CollapsibleTrigger>
        {right}
      </div>
      <CollapsibleContent className="flex min-h-0 flex-1 flex-col">{children}</CollapsibleContent>
    </Collapsible>
  )
}

interface Props {
  book: Book
  reader: Reader
  settings: Settings
  patch(p: Partial<Settings>): void
  hieroAvailable: boolean
}

export function RightPanels({ book, reader, settings, patch, hieroAvailable }: Props) {
  const { curPage, curRegion, layerTick } = reader
  const regions = reader.regionsOf(curPage)
  const noData = !reader.hasData(curPage)
  const entities = (reader.store?.get(curPage)?.entities ?? []).filter((e) => e.type !== 'citation')
  const comm = book.comm[curPage] ?? []
  const layout = settings.rightWidth >= 420 ? 'pair' : 'stacked'

  return (
    <div
      className="pointer-events-auto absolute bottom-3 right-3 top-3 z-30 flex flex-col gap-2"
      style={{ width: settings.rightWidth }}
      aria-label="Information"
    >
      {/* Text */}
      <div
        className="panel panel-floating flex min-h-0 flex-col overflow-hidden shadow-lg"
        style={{ flex: `0 0 ${settings.rightSplit}%` }}
      >
        <Section
          title="Text"
          grow
          right={
            hieroAvailable ? (
              <Button
                variant={settings.hiero ? 'secondary' : 'outline'}
                size="sm"
                className="h-6 px-2 font-[Noto_Sans_Egyptian_Hieroglyphs,'Segoe_UI_Historic',sans-serif] text-[13px] leading-none"
                aria-pressed={settings.hiero}
                aria-label="Hieroglyphic lines"
                onClick={() => patch({ hiero: !settings.hiero })}
              >
                &#x1332A;
              </Button>
            ) : undefined
          }
        >
          <ScrollArea className="min-h-0 flex-1">
            {noData ? (
              <p className="p-3 text-[13px] text-muted-foreground">—</p>
            ) : (
              <TextPane
                domId="whlTextMain"
                bus={reader.bus}
                store={reader.store}
                book={book.id}
                page={curPage}
                layout={layout}
                hiero={settings.hiero}
                regions={regions}
                measureKey={`${layout}:${settings.rightWidth}:${settings.readSize}:${settings.readLeading}:${settings.readFont}:${settings.hiero}:${layerTick}`}
                pairAuto={settings.pairAuto}
                pairFrac={settings.pairFrac}
                onPairFrac={(f) => patch({ pairFrac: f })}
              />
            )}
          </ScrollArea>
        </Section>
      </div>

      {/* Commentary / Entities / Ask */}
      <div className="panel panel-floating flex min-h-0 flex-1 flex-col overflow-hidden shadow-lg">
        <ScrollArea className="min-h-0 flex-1">
          <Section title="Commentary">
            {comm.length === 0 ? (
              <p className="px-3 pb-3 text-[12px] text-muted-foreground">—</p>
            ) : (
              <div className="space-y-2 px-3 pb-3">
                {comm.map(([h, t]) => (
                  <div key={h}>
                    <div className="text-[11.5px] font-semibold">{h}</div>
                    <p className="text-[12.5px] leading-relaxed text-muted-foreground" style={{ fontFamily: 'var(--font-read)' }}>
                      {t}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Entities">
            {entities.length === 0 ? (
              <p className="px-3 pb-3 text-[12px] text-muted-foreground">{noData ? '—' : '…'}</p>
            ) : (
              <div className="space-y-1.5 px-3 pb-3">
                {entities.map((e) => (
                  <div
                    key={e.id}
                    className="border-l-2 pl-2"
                    style={{ borderColor: `var(--ent-${e.type === 'citation' ? 'cite' : e.type})` }}
                  >
                    <div className="text-[12px] font-semibold" style={{ color: `var(--ent-${e.type === 'citation' ? 'cite' : e.type})` }}>
                      {e.label}
                    </div>
                    <p className="line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">{e.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Ask" defaultOpen={false}>
            <div className="px-3 pb-3">
              <div className="text-[12.5px] font-medium">{book.qa[0]}</div>
              <p className="mt-1 border-l-2 border-border pl-2 text-[12.5px] leading-relaxed text-muted-foreground">
                {book.qa[1]}
              </p>
              <Input placeholder="Ask about this passage" aria-label="Ask about this passage" className="mt-2 h-7 text-[12px]" />
            </div>
          </Section>
        </ScrollArea>
      </div>

      <span className="sr-only">{curRegion}</span>
    </div>
  )
}
