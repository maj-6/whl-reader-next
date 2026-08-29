import { BookOpen, Moon, PanelLeft, PanelRight, Settings2, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BOOKS, BOOK_IDS, type Book } from '@/whl/books'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-1.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
      <dd className="text-[12.5px] leading-relaxed">{children}</dd>
    </div>
  )
}

interface Props {
  book: Book
  dark: boolean
  leftOpen: boolean
  rightOpen: boolean
  onDark(v: boolean): void
  onLeft(v: boolean): void
  onRight(v: boolean): void
  onSettings(): void
  settingsOpen: boolean
}

export function Masthead({ book, dark, leftOpen, rightOpen, onDark, onLeft, onRight, onSettings, settingsOpen }: Props) {
  const b = book.bib
  const imprint = [b.place, b.printer].filter(Boolean).join(': ')

  return (
    <header className="panel z-50 flex h-14 shrink-0 items-center gap-3 border-x-0 border-t-0 px-3">
      <a
        href="index.html"
        className="shrink-0 text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Mockups
      </a>
      <Separator orientation="vertical" className="!h-6" />

      {/* bibliographic line for the book on view */}
      <div className="flex min-w-0 flex-1 flex-col justify-center leading-tight">
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="truncate text-[14px] font-semibold tracking-tight">{b.titleShort}</h1>
          <span className="truncate text-[12px] text-muted-foreground">{b.author}</span>
        </div>
        <div className="truncate text-[11.5px] text-muted-foreground">
          {[imprint, b.date, b.language].filter(Boolean).join(' · ')}
        </div>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 text-[11.5px]">
            <BookOpen className="size-3.5" />
            Record
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[30rem] p-0">
          <ScrollArea className="max-h-[70vh]">
            <div className="p-4">
              <h2 className="mb-1 text-[13px] font-semibold leading-snug">{b.title}</h2>
              <dl className="divide-y divide-border/60">
                <Field label="Author">{b.author}</Field>
                <Field label="Date">{b.date}</Field>
                <Field label="Place">{b.place}</Field>
                <Field label="Printer">{b.printer}</Field>
                <Field label="Language">{b.language}</Field>
                <Field label="Script">{b.script}</Field>
                <Field label="Extent">{b.extent}</Field>
                <Field label="Held by">{b.institution}</Field>
                <Field label="Identifiers">
                  <ul className="space-y-0.5">
                    {(b.identifier ?? []).map((id) => (
                      <li key={id.label + id.value}>
                        <span className="text-muted-foreground">{id.label}: </span>
                        {id.href ? (
                          <a className="text-primary underline-offset-4 hover:underline" href={id.href} target="_blank" rel="noreferrer">
                            {id.value}
                          </a>
                        ) : (
                          <span className="break-all">{id.value}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Field>
                <Field label="Note">{b.note}</Field>
              </dl>
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="!h-6" />

      <nav className="flex shrink-0 items-center gap-0.5" aria-label="Book">
        {BOOK_IDS.map((id) => (
          <Button
            key={id}
            asChild
            size="sm"
            variant={id === book.id ? 'secondary' : 'ghost'}
            className="h-8 px-2 text-[11.5px] font-medium"
          >
            <a href={`?book=${id}`} aria-current={id === book.id ? 'page' : undefined}>
              {BOOKS[id].id}
            </a>
          </Button>
        ))}
      </nav>

      <Separator orientation="vertical" className="!h-6" />

      <div className="flex shrink-0 items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => onLeft(!leftOpen)} aria-label="Toggle navigation">
              <PanelLeft className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Navigation [</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => onRight(!rightOpen)} aria-label="Toggle information">
              <PanelRight className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Information ]</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => onDark(!dark)} aria-label="Toggle dark mode">
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{dark ? 'Light' : 'Dark'}</TooltipContent>
        </Tooltip>
        <Button
          variant={settingsOpen ? 'secondary' : 'outline'}
          size="sm"
          className="h-8 gap-1.5 text-[11.5px]"
          onClick={onSettings}
          aria-expanded={settingsOpen}
        >
          <Settings2 className="size-3.5" />
          Settings
        </Button>
      </div>
    </header>
  )
}
