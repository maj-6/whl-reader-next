import { useState } from 'react'
import { ActionIcon, Box, Collapse, Group, ScrollArea, Text, TextInput, UnstyledButton } from '@mantine/core'
import { IconChevronDown } from '@tabler/icons-react'
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
    <Box display="flex" mih={0} style={{ flexDirection: 'column', flex: grow && open ? 1 : 'none' }}>
      <Group gap="xs" px="sm" py={7} wrap="nowrap">
        <UnstyledButton onClick={() => setOpen((v) => !v)} flex={1} miw={0} aria-expanded={open}>
          <Group gap={8} wrap="nowrap">
            <Text size="10px" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.08em' }} truncate>
              {title}
            </Text>
            <IconChevronDown
              size={12}
              style={{
                flex: 'none',
                color: 'var(--mantine-color-dimmed)',
                transform: open ? undefined : 'rotate(-90deg)',
                transition: 'transform 150ms ease',
              }}
            />
          </Group>
        </UnstyledButton>
        {right}
      </Group>
      <Collapse expanded={open} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: grow && open ? 1 : undefined }}>
        {children}
      </Collapse>
    </Box>
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
  const { curPage, layerTick } = reader
  const regions = reader.regionsOf(curPage)
  const noData = !reader.hasData(curPage)
  const entities = (reader.store?.get(curPage)?.entities ?? []).filter((e) => e.type !== 'citation')
  const comm = book.comm[curPage] ?? []
  const layout = settings.rightWidth >= 420 ? 'pair' : 'stacked'
  const entColor = (t: string) => `var(--ent-${t === 'citation' ? 'cite' : t})`

  return (
    <Box
      pos="absolute"
      top={12}
      bottom={12}
      right={12}
      w={settings.rightWidth}
      display="flex"
      aria-label="Information"
      style={{ flexDirection: 'column', gap: 8, zIndex: 30, pointerEvents: 'auto' }}
    >
      {/* Text */}
      <Box
        className="panel panel-floating"
        display="flex"
        mih={0}
        style={{ flex: `0 0 ${settings.rightSplit}%`, flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--mantine-shadow-lg)' }}
      >
        <Section
          title="Text"
          grow
          right={
            hieroAvailable ? (
              <ActionIcon
                size="sm"
                variant={settings.hiero ? 'light' : 'default'}
                aria-pressed={settings.hiero}
                aria-label="Hieroglyphic lines"
                onClick={() => patch({ hiero: !settings.hiero })}
                style={{ fontFamily: "'Noto Sans Egyptian Hieroglyphs','Segoe UI Historic',sans-serif", fontSize: 13 }}
              >
                &#x1332A;
              </ActionIcon>
            ) : undefined
          }
        >
          <ScrollArea flex={1} mih={0} type="auto">
            {noData ? (
              <Text p="sm" size="13px" c="dimmed">—</Text>
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
      </Box>

      {/* Commentary / Entities / Ask */}
      <Box
        className="panel panel-floating"
        display="flex"
        mih={0}
        flex={1}
        style={{ flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--mantine-shadow-lg)' }}
      >
        <ScrollArea flex={1} mih={0} type="auto">
          <Section title="Commentary">
            {comm.length === 0 ? (
              <Text px="sm" pb="sm" size="12px" c="dimmed">—</Text>
            ) : (
              <Box px="sm" pb="sm">
                {comm.map(([h, t]) => (
                  <Box key={h} mb={8}>
                    <Text size="11.5px" fw={600}>{h}</Text>
                    <Text size="12.5px" c="dimmed" ff="var(--font-read)" style={{ lineHeight: 1.55 }}>
                      {t}
                    </Text>
                  </Box>
                ))}
              </Box>
            )}
          </Section>

          <Section title="Entities">
            {entities.length === 0 ? (
              <Text px="sm" pb="sm" size="12px" c="dimmed">{noData ? '—' : '…'}</Text>
            ) : (
              <Box px="sm" pb="sm">
                {entities.map((e) => (
                  <Box key={e.id} pl={8} mb={6} style={{ borderLeft: `2px solid ${entColor(e.type)}` }}>
                    <Text size="12px" fw={600} c={entColor(e.type)}>
                      {e.label}
                    </Text>
                    <Text size="11.5px" c="dimmed" lineClamp={2} style={{ lineHeight: 1.4 }}>
                      {e.summary}
                    </Text>
                  </Box>
                ))}
              </Box>
            )}
          </Section>

          <Section title="Ask" defaultOpen={false}>
            <Box px="sm" pb="sm">
              <Text size="12.5px" fw={500}>{book.qa[0]}</Text>
              <Text size="12.5px" c="dimmed" pl={8} mt={4} style={{ borderLeft: '2px solid var(--panel-border)', lineHeight: 1.55 }}>
                {book.qa[1]}
              </Text>
              <TextInput size="xs" mt={8} placeholder="Ask about this passage" aria-label="Ask about this passage" />
            </Box>
          </Section>
        </ScrollArea>
      </Box>
    </Box>
  )
}
