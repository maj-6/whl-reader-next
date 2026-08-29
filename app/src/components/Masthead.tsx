import {
  ActionIcon,
  Anchor,
  Box,
  Button,
  Divider,
  Group,
  Popover,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import {
  IconBook,
  IconLayoutSidebar,
  IconLayoutSidebarRight,
  IconMoon,
  IconSettings,
  IconSun,
} from '@tabler/icons-react'
import { BOOKS, BOOK_IDS, type Book } from '@/whl/books'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null
  return (
    <Group align="flex-start" gap="sm" wrap="nowrap" py={3}>
      <Text w={112} flex="none" size="10px" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.08em' }}>
        {label}
      </Text>
      <Text size="12.5px" style={{ lineHeight: 1.55 }}>
        {children}
      </Text>
    </Group>
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
    <Box component="header" className="panel" h={56} px="xs" style={{ borderTop: 0, borderInline: 0, zIndex: 50 }}>
      <Group h="100%" gap="sm" wrap="nowrap">
        <Anchor href="index.html" size="12px" c="dimmed" underline="hover" flex="none">
          ← Mockups
        </Anchor>
        <Divider orientation="vertical" my={12} />

        {/* the bibliographic line for the book on view */}
        <Stack gap={1} flex={1} miw={0} justify="center">
          <Group gap={8} wrap="nowrap" align="baseline">
            <Text size="14px" fw={600} truncate>
              {b.titleShort}
            </Text>
            <Text size="12px" c="dimmed" truncate>
              {b.author}
            </Text>
          </Group>
          <Text size="11.5px" c="dimmed" truncate>
            {[imprint, b.date, b.language].filter(Boolean).join(' · ')}
          </Text>
        </Stack>

        <Popover width={480} position="bottom-end" shadow="md" withinPortal>
          <Popover.Target>
            <Button variant="default" size="compact-sm" leftSection={<IconBook size={14} />} fz="11.5px" flex="none">
              Record
            </Button>
          </Popover.Target>
          <Popover.Dropdown p={0}>
            <ScrollArea.Autosize mah="70vh" type="auto">
              <Box p="md">
                <Text size="13px" fw={600} mb={6} style={{ lineHeight: 1.4 }}>
                  {b.title}
                </Text>
                <Stack gap={0}>
                  <Field label="Author">{b.author}</Field>
                  <Field label="Date">{b.date}</Field>
                  <Field label="Place">{b.place}</Field>
                  <Field label="Printer">{b.printer}</Field>
                  <Field label="Language">{b.language}</Field>
                  <Field label="Script">{b.script}</Field>
                  <Field label="Extent">{b.extent}</Field>
                  <Field label="Held by">{b.institution}</Field>
                  <Field label="Identifiers">
                    <Stack gap={2}>
                      {(b.identifier ?? []).map((id) => (
                        <span key={id.label + id.value}>
                          <Text span c="dimmed" inherit>
                            {id.label}:{' '}
                          </Text>
                          {id.href ? (
                            <Anchor href={id.href} target="_blank" rel="noreferrer" inherit>
                              {id.value}
                            </Anchor>
                          ) : (
                            <Text span inherit style={{ wordBreak: 'break-all' }}>
                              {id.value}
                            </Text>
                          )}
                        </span>
                      ))}
                    </Stack>
                  </Field>
                  <Field label="Note">{b.note}</Field>
                </Stack>
              </Box>
            </ScrollArea.Autosize>
          </Popover.Dropdown>
        </Popover>

        <Divider orientation="vertical" my={12} />

        <Group gap={2} wrap="nowrap" flex="none" aria-label="Book">
          {BOOK_IDS.map((id) => (
            <Button
              key={id}
              component="a"
              href={`?book=${id}`}
              size="compact-sm"
              fz="11.5px"
              variant={id === book.id ? 'light' : 'subtle'}
              color={id === book.id ? undefined : 'gray'}
              aria-current={id === book.id ? 'page' : undefined}
            >
              {BOOKS[id].id}
            </Button>
          ))}
        </Group>

        <Divider orientation="vertical" my={12} />

        <Group gap={2} wrap="nowrap" flex="none">
          <Tooltip label="Navigation [" openDelay={400}>
            <ActionIcon variant={leftOpen ? 'light' : 'subtle'} color="gray" onClick={() => onLeft(!leftOpen)} aria-label="Toggle navigation">
              <IconLayoutSidebar size={17} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Information ]" openDelay={400}>
            <ActionIcon variant={rightOpen ? 'light' : 'subtle'} color="gray" onClick={() => onRight(!rightOpen)} aria-label="Toggle information">
              <IconLayoutSidebarRight size={17} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={dark ? 'Light' : 'Dark'} openDelay={400}>
            <ActionIcon variant="subtle" color="gray" onClick={() => onDark(!dark)} aria-label="Toggle dark mode">
              {dark ? <IconSun size={17} /> : <IconMoon size={17} />}
            </ActionIcon>
          </Tooltip>
          <Button
            size="compact-sm"
            fz="11.5px"
            variant={settingsOpen ? 'light' : 'default'}
            leftSection={<IconSettings size={14} />}
            onClick={onSettings}
            aria-expanded={settingsOpen}
          >
            Settings
          </Button>
        </Group>
      </Group>
    </Box>
  )
}
