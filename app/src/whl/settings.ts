import { useCallback, useEffect, useState } from 'react'
import type { Corner, ElementStyle, ReadFont, Stage, UiFont } from './theme'

export interface Settings {
  /* appearance */
  scheme: string
  dark: boolean
  element: ElementStyle
  corner: Corner
  stage: Stage
  panelAlpha: number
  panelBlur: number
  uiFont: UiFont
  readFont: ReadFont
  readSize: number
  readLeading: number
  /* layout */
  leftOpen: boolean
  leftWidth: number
  rightOpen: boolean
  rightWidth: number
  rightSplit: number
  /* reading */
  hiero: boolean
  opening: boolean
  pairAuto: boolean
  pairFrac: number
  minimap: boolean
  /* window */
  win: { x: number; y: number; w: number; h: number }
  /* settings popover position */
  pop: { x: number; y: number }
}

export const DEFAULTS: Settings = {
  scheme: 'archive',
  dark: false,
  element: 'bordered',
  corner: 'subtle',
  stage: 'black',
  panelAlpha: 92,
  panelBlur: 14,
  uiFont: 'inter',
  readFont: 'source-serif',
  readSize: 14.5,
  readLeading: 1.66,
  leftOpen: true,
  leftWidth: 264,
  rightOpen: true,
  rightWidth: 360,
  rightSplit: 58,
  hiero: false,
  opening: false,
  pairAuto: true,
  pairFrac: 0.5,
  minimap: true,
  win: { x: -1, y: -1, w: 480, h: 420 },
  pop: { x: -1, y: -1 },
}

const key = (book: string) => `whl-explorer-shadcn-${book}`

export function loadSettings(book: string): Settings {
  try {
    const raw = sessionStorage.getItem(key(book))
    if (!raw) return { ...DEFAULTS }
    const s = JSON.parse(raw)
    if (!s || typeof s !== 'object') return { ...DEFAULTS }
    return { ...DEFAULTS, ...s, win: { ...DEFAULTS.win, ...(s.win || {}) }, pop: { ...DEFAULTS.pop, ...(s.pop || {}) } }
  } catch {
    return { ...DEFAULTS }
  }
}

export function useSettings(book: string) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings(book))

  useEffect(() => {
    try {
      sessionStorage.setItem(key(book), JSON.stringify(settings))
    } catch {
      /* private mode: run without persistence */
    }
  }, [book, settings])

  const set = useCallback(<K extends keyof Settings>(k: K, v: Settings[K]) => {
    setSettings((s) => (Object.is(s[k], v) ? s : { ...s, [k]: v }))
  }, [])

  const patch = useCallback((p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p })), [])

  return { settings, set, patch, reset: () => setSettings({ ...DEFAULTS }) }
}
