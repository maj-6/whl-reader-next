import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActionIcon,
  Box,
  Divider,
  Group,
  ScrollArea,
  SegmentedControl,
  Select,
  Slider,
  Switch,
  Tabs,
  Text,
  UnstyledButton,
} from '@mantine/core'
import { IconGripHorizontal, IconRotate, IconX } from '@tabler/icons-react'
import {
  CORNERS,
  ELEMENT_STYLES,
  READ_FONTS,
  SCHEMES,
  STAGES,
  UI_FONTS,
  pageVars,
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
    <Group gap="sm" wrap="nowrap" align="center" py={5}>
      <Text w={62} flex="none" size="10px" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.08em' }}>
        {label}
      </Text>
      <Group gap={8} wrap="nowrap" flex={1} miw={0}>
        {children}
      </Group>
    </Group>
  )
}

const seg = (items: readonly { id: string; label: string }[]) => items.map((i) => ({ value: i.id, label: i.label }))

export function SettingsPanel({ settings, patch, reset, onClose }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ dx: number; dy: number; id: number } | null>(null)
  const [pos, setPos] = useState(settings.pop)

  /* first open: park under the masthead, right-aligned — but only once the
     viewport is real, or an unsized pane pins it to the top-left corner */
  useEffect(() => {
    if (pos.x >= 0 || pos.y >= 0) return
    if (window.innerWidth < 400) return
    const w = ref.current?.offsetWidth ?? 340
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
    const w = ref.current?.offsetWidth ?? 340
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
    <Box
      ref={ref}
      className="panel panel-floating"
      pos="fixed"
      w={344}
      style={{ left: pos.x, top: pos.y, zIndex: 70, overflow: 'hidden', boxShadow: 'var(--mantine-shadow-lg)' }}
      role="dialog"
      aria-label="Settings"
    >
      <Group
        gap={8}
        px="sm"
        py={6}
        wrap="nowrap"
        style={{ borderBottom: '1px solid var(--panel-border)', cursor: 'grab', touchAction: 'none', userSelect: 'none' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <IconGripHorizontal size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
        <Text flex={1} size="11px" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.08em' }}>
          Settings
        </Text>
        <ActionIcon size="sm" variant="subtle" color="gray" onClick={reset} aria-label="Reset to defaults">
          <IconRotate size={14} />
        </ActionIcon>
        <ActionIcon size="sm" variant="subtle" color="gray" onClick={onClose} aria-label="Close settings">
          <IconX size={14} />
        </ActionIcon>
      </Group>

      <Tabs defaultValue="colour">
        <Tabs.List grow px="sm" pt={6}>
          <Tabs.Tab value="colour" fz="11px">Colour</Tabs.Tab>
          <Tabs.Tab value="elements" fz="11px">Elements</Tabs.Tab>
          <Tabs.Tab value="type" fz="11px">Type</Tabs.Tab>
        </Tabs.List>

        <ScrollArea.Autosize mah={420} type="auto">
          <Box px="sm" pb="sm">
            <Tabs.Panel value="colour" pt={10}>
              <Box
                style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}
              >
                {SCHEMES.map((sc) => {
                  const v = pageVars({ ...s, scheme: sc.id })
                  const on = s.scheme === sc.id
                  return (
                    <UnstyledButton
                      key={sc.id}
                      onClick={() => patch({ scheme: sc.id })}
                      aria-pressed={on}
                      p={4}
                      style={{
                        borderRadius: 'var(--mantine-radius-default)',
                        border: `1px solid ${on ? 'var(--mantine-primary-color-filled)' : 'var(--panel-border)'}`,
                        outline: on ? '1px solid var(--mantine-primary-color-filled)' : 'none',
                      }}
                    >
                      <Group gap={0} h={24} style={{ borderRadius: 3, overflow: 'hidden', border: '1px solid var(--panel-border)' }} wrap="nowrap">
                        <Box flex={1} h="100%" style={{ background: v['--bg'] }} />
                        <Box flex={1} h="100%" style={{ background: v['--bg-raise'] }} />
                        <Box w={8} h="100%" style={{ background: v['--accent'] }} />
                      </Group>
                      <Text size="10px" c="dimmed" mt={3} truncate>
                        {sc.label}
                      </Text>
                    </UnstyledButton>
                  )
                })}
              </Box>
              <Divider my="sm" />
              <Row label="Dark">
                <Switch size="sm" checked={s.dark} onChange={(e) => patch({ dark: e.currentTarget.checked })} />
              </Row>
              <Row label="Stage">
                <SegmentedControl
                  size="xs"
                  fullWidth
                  data={seg(STAGES)}
                  value={s.stage}
                  onChange={(v) => patch({ stage: v as Stage })}
                />
              </Row>
            </Tabs.Panel>

            <Tabs.Panel value="elements" pt={10}>
              <Row label="Style">
                <SegmentedControl
                  size="xs"
                  orientation="vertical"
                  fullWidth
                  data={seg(ELEMENT_STYLES)}
                  value={s.element}
                  onChange={(v) => patch({ element: v as ElementStyle })}
                />
              </Row>
              <Row label="Corners">
                <SegmentedControl
                  size="xs"
                  fullWidth
                  data={seg(CORNERS)}
                  value={s.corner}
                  onChange={(v) => patch({ corner: v as Corner })}
                />
              </Row>
              <Divider my="xs" />
              <Row label="Opacity">
                <Slider flex={1} min={30} max={100} step={1} value={s.panelAlpha} onChange={(v) => patch({ panelAlpha: v })} label={null} />
                <Text w={36} ta="right" size="11px" c="dimmed">{s.panelAlpha}%</Text>
              </Row>
              <Row label="Blur">
                <Slider flex={1} min={0} max={28} step={1} value={s.panelBlur} onChange={(v) => patch({ panelBlur: v })} label={null} />
                <Text w={36} ta="right" size="11px" c="dimmed">{s.panelBlur}px</Text>
              </Row>
              <Divider my="xs" />
              <Row label="Minimap">
                <Switch size="sm" checked={s.minimap} onChange={(e) => patch({ minimap: e.currentTarget.checked })} />
              </Row>
            </Tabs.Panel>

            <Tabs.Panel value="type" pt={10}>
              <Row label="Interface">
                <Select
                  size="xs"
                  flex={1}
                  data={UI_FONTS.map((f) => ({ value: f.id, label: f.label }))}
                  value={s.uiFont}
                  onChange={(v) => v && patch({ uiFont: v as UiFont })}
                  allowDeselect={false}
                  comboboxProps={{ withinPortal: true }}
                />
              </Row>
              <Row label="Reading">
                <Select
                  size="xs"
                  flex={1}
                  data={READ_FONTS.map((f) => ({ value: f.id, label: f.label }))}
                  value={s.readFont}
                  onChange={(v) => v && patch({ readFont: v as ReadFont })}
                  allowDeselect={false}
                  comboboxProps={{ withinPortal: true }}
                />
              </Row>
              <Row label="Size">
                <Slider flex={1} min={11} max={22} step={0.5} value={s.readSize} onChange={(v) => patch({ readSize: v })} label={null} />
                <Text w={36} ta="right" size="11px" c="dimmed">{s.readSize}</Text>
              </Row>
              <Row label="Leading">
                <Slider flex={1} min={1.2} max={2.2} step={0.02} value={s.readLeading} onChange={(v) => patch({ readLeading: v })} label={null} />
                <Text w={36} ta="right" size="11px" c="dimmed">{s.readLeading.toFixed(2)}</Text>
              </Row>
              <Divider my="xs" />
              <Row label="Columns">
                <Switch
                  size="sm"
                  checked={s.pairAuto}
                  onChange={(e) => patch({ pairAuto: e.currentTarget.checked })}
                  label={<Text size="11px" c="dimmed">Auto</Text>}
                />
              </Row>
              {!s.pairAuto && (
                <Row label="Divide">
                  <Slider
                    flex={1}
                    min={25}
                    max={75}
                    step={1}
                    value={Math.round(s.pairFrac * 100)}
                    onChange={(v) => patch({ pairFrac: v / 100 })}
                    label={null}
                  />
                  <Text w={36} ta="right" size="11px" c="dimmed">{Math.round(s.pairFrac * 100)}%</Text>
                </Row>
              )}
            </Tabs.Panel>
          </Box>
        </ScrollArea.Autosize>
      </Tabs>
    </Box>
  )
}
