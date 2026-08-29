import { useCallback, useEffect, useRef, useState } from 'react'
import { GripHorizontal, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  CORNERS,
  ELEMENT_STYLES,
  READ_FONTS,
  SCHEMES,
  STAGES,
  UI_FONTS,
  themeTokens,
  type Corner,
  type ElementStyle,
  type ReadFont,
  type Stage,
  type UiFont,
} from '@/whl/theme'
import type { Settings } from '@/whl/settings'

interface Props {
  settings: Settings
  patch(p: Partial<Settings>): void
  reset(): void
  onClose(): void
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] items-center gap-3 py-1.5">
      <Label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</Label>
      <div className="flex min-w-0 items-center gap-2">{children}</div>
    </div>
  )
}

function Chips<T extends string>({
  items,
  value,
  onChange,
}: {
  items: readonly { id: T; label: string }[]
  value: T
  onChange(v: T): void
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((it) => (
        <Button
          key={it.id}
          size="sm"
          variant={value === it.id ? 'secondary' : 'ghost'}
          className={cn('h-6 px-2 text-[11px] font-normal', value === it.id && 'font-medium ring-1 ring-ring')}
          onClick={() => onChange(it.id)}
        >
          {it.label}
        </Button>
      ))}
    </div>
  )
}

export function SettingsPanel({ settings, patch, reset, onClose }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ dx: number; dy: number; id: number } | null>(null)
  const [pos, setPos] = useState(settings.pop)

  /* first open: park under the masthead, right-aligned — but only once the
     viewport is real, or an unsized pane pins it to the top-left corner */
  useEffect(() => {
    if (pos.x >= 0 || pos.y >= 0) return
    if (window.innerWidth < 400) return
    const w = ref.current?.offsetWidth ?? 336
    setPos({ x: Math.max(8, window.innerWidth - w - 12), y: 64 })
  }, [pos.x, pos.y])

  const commit = useCallback((p: { x: number; y: number }) => patch({ pop: p }), [patch])

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, id: e.pointerId }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const w = ref.current?.offsetWidth ?? 336
    setPos({
      x: Math.max(4, Math.min(window.innerWidth - w - 4, e.clientX - d.dx)),
      y: Math.max(4, Math.min(window.innerHeight - 40, e.clientY - d.dy)),
    })
  }
  const onUp = () => {
    if (!drag.current) return
    drag.current = null
    commit(pos)
  }

  const s = settings
  return (
    <div
      ref={ref}
      className="panel panel-floating fixed z-[70] w-[21rem] overflow-hidden shadow-lg"
      style={{ left: pos.x, top: pos.y }}
      role="dialog"
      aria-label="Settings"
    >
      <div
        className="flex cursor-grab touch-none select-none items-center gap-2 border-b border-border px-3 py-2 active:cursor-grabbing"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <GripHorizontal className="size-3.5 text-muted-foreground" />
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Settings</span>
        <Button variant="ghost" size="icon" className="size-6" onClick={reset} aria-label="Reset to defaults">
          <RotateCcw className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="size-6" onClick={onClose} aria-label="Close settings">
          <X className="size-3.5" />
        </Button>
      </div>

      <Tabs defaultValue="colour">
        <TabsList className="mx-3 mt-2 grid w-[calc(100%-1.5rem)] grid-cols-3">
          <TabsTrigger value="colour" className="text-[11px]">Colour</TabsTrigger>
          <TabsTrigger value="elements" className="text-[11px]">Elements</TabsTrigger>
          <TabsTrigger value="type" className="text-[11px]">Type</TabsTrigger>
        </TabsList>

        <ScrollArea className="max-h-[26rem]">
          <div className="px-3 pb-3">
            <TabsContent value="colour" className="mt-2">
              <div className="grid grid-cols-4 gap-1.5">
                {SCHEMES.map((sc) => {
                  const t = themeTokens({ ...s, scheme: sc.id })
                  return (
                    <button
                      key={sc.id}
                      onClick={() => patch({ scheme: sc.id })}
                      className={cn(
                        'group flex flex-col items-stretch gap-1 rounded-md border p-1 text-left transition',
                        s.scheme === sc.id ? 'border-ring ring-1 ring-ring' : 'border-border hover:border-input',
                      )}
                      aria-pressed={s.scheme === sc.id}
                    >
                      <span className="flex h-6 overflow-hidden rounded-sm border border-border/60">
                        <span className="flex-1" style={{ background: t['--background'] }} />
                        <span className="flex-1" style={{ background: t['--card'] }} />
                        <span className="w-2" style={{ background: t['--primary'] }} />
                      </span>
                      <span className="truncate text-[10px] text-muted-foreground group-hover:text-foreground">{sc.label}</span>
                    </button>
                  )
                })}
              </div>
              <Separator className="my-3" />
              <Row label="Dark">
                <Switch checked={s.dark} onCheckedChange={(v) => patch({ dark: v })} />
              </Row>
              <Row label="Stage">
                <Chips items={STAGES} value={s.stage} onChange={(v) => patch({ stage: v as Stage })} />
              </Row>
            </TabsContent>

            <TabsContent value="elements" className="mt-2">
              <Row label="Style">
                <Chips items={ELEMENT_STYLES} value={s.element} onChange={(v) => patch({ element: v as ElementStyle })} />
              </Row>
              <Row label="Corners">
                <Chips items={CORNERS} value={s.corner} onChange={(v) => patch({ corner: v as Corner })} />
              </Row>
              <Separator className="my-2" />
              <Row label="Opacity">
                <Slider min={30} max={100} step={1} value={[s.panelAlpha]} onValueChange={([v]) => patch({ panelAlpha: v })} />
                <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{s.panelAlpha}%</span>
              </Row>
              <Row label="Blur">
                <Slider min={0} max={28} step={1} value={[s.panelBlur]} onValueChange={([v]) => patch({ panelBlur: v })} />
                <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{s.panelBlur}px</span>
              </Row>
              <Separator className="my-2" />
              <Row label="Minimap">
                <Switch checked={s.minimap} onCheckedChange={(v) => patch({ minimap: v })} />
              </Row>
            </TabsContent>

            <TabsContent value="type" className="mt-2">
              <Row label="Interface">
                <Select value={s.uiFont} onValueChange={(v) => patch({ uiFont: v as UiFont })}>
                  <SelectTrigger size="sm" className="h-7 w-full text-[11.5px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UI_FONTS.map((f) => (
                      <SelectItem key={f.id} value={f.id} className="text-[12px]" style={{ fontFamily: f.v }}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Reading">
                <Select value={s.readFont} onValueChange={(v) => patch({ readFont: v as ReadFont })}>
                  <SelectTrigger size="sm" className="h-7 w-full text-[11.5px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {READ_FONTS.map((f) => (
                      <SelectItem key={f.id} value={f.id} className="text-[12px]" style={{ fontFamily: f.v }}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Size">
                <Slider min={11} max={22} step={0.5} value={[s.readSize]} onValueChange={([v]) => patch({ readSize: v })} />
                <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{s.readSize}</span>
              </Row>
              <Row label="Leading">
                <Slider min={1.2} max={2.2} step={0.02} value={[s.readLeading]} onValueChange={([v]) => patch({ readLeading: v })} />
                <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{s.readLeading.toFixed(2)}</span>
              </Row>
              <Separator className="my-2" />
              <Row label="Columns">
                <Switch checked={s.pairAuto} onCheckedChange={(v) => patch({ pairAuto: v })} />
                <span className="shrink-0 text-[11px] text-muted-foreground">Auto</span>
              </Row>
              {!s.pairAuto && (
                <Row label="Divide">
                  <Slider
                    min={25}
                    max={75}
                    step={1}
                    value={[Math.round(s.pairFrac * 100)]}
                    onValueChange={([v]) => patch({ pairFrac: v / 100 })}
                  />
                  <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                    {Math.round(s.pairFrac * 100)}%
                  </span>
                </Row>
              )}
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
