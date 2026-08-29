// Typed façade over the vanilla whl-* modules in mockups/lib. Those modules are
// owned by fork/platform and are imported as source, never edited from here; this
// file is the only place their shapes are described. Contract: mockups/lib/API.md.

import { createBus as _createBus } from '@lib/whl-bus.js'
import { createStore as _createStore } from '@lib/whl-store.js'
import { createViewer as _createViewer } from '@lib/whl-viewer.js'
import { createTextPane as _createTextPane } from '@lib/whl-text.js'
import { createLinker as _createLinker } from '@lib/whl-linker.js'
import { createRoll as _createRoll, COLS as _COLS, DATA_COLS as _DATA_COLS, hieroHTML as _hieroHTML } from '@mockups/explore-common.js'

export type PageKey = string
export type Weight = 'hlC' | 'hlR' | 'sel'

export interface Region {
  type?: string
  box: [number, number, number, number]
  text?: string
  translation?: string
  lines?: number[]
  case_label?: string
  hl?: { ref: string; t: string; rub?: [number, number][] }[]
}
export interface SourceLayer { book: string; page_key: string; px: [number, number]; language?: string; regions: Region[] }
export interface Entity { id: string; type: 'author' | 'plant' | 'citation' | 'substance'; label: string; summary?: string; canonical?: unknown }
export interface PageData { source?: SourceLayer; entities?: Entity[] }

export interface Highlight {
  regions: Map<string, Weight>
  words: Map<string, Weight>
  groups: Map<string, Weight>
}
export interface ViewportRect { x: number; y: number; w: number; h: number }

export interface Bus {
  on(type: string, fn: (p: any) => void): () => void
  off(type: string, fn: (p: any) => void): void
  emit(type: string, payload: any): void
}

export interface Store {
  load(page: PageKey): Promise<PageData>
  get(page: PageKey): PageData | undefined
  status(page: PageKey): Record<string, string>
  prefetch(page: PageKey): void
}

export interface ViewerPage {
  key: PageKey
  url: string
  w: number
  h: number
  clip?: { top?: number; bottom?: number; left?: number; right?: number }
}

export interface Viewer {
  goto(page: PageKey, opts?: { immediate?: boolean }): void
  next(): void
  prev(): void
  current(): PageKey
  select(page: PageKey, region: number): void
  applyHighlight(h: Highlight): void
  setRegionsVisible(on: boolean): void
  setWordBoxes(page: PageKey, on: boolean): void
  addOverlayEl(page: PageKey, box: number[], el: HTMLElement): void
  viewportInfo(): ViewportRect | null
  worldRect(page: PageKey): ViewportRect | null
  destroy(): void
}

export interface TextPane {
  applyHighlight(h: Highlight): void
  scrollTo(region: number, opts?: { instant?: boolean }): void
  setLayout(layout: TextLayout): void
  setRegion(i: number): void
  destroy(): void
}
export type TextLayout = 'pair' | 'stacked' | 'strip'

export const createBus = _createBus as unknown as () => Bus
export const createStore = _createStore as unknown as (o: {
  base?: string; book: string; bus: Bus; pages: PageKey[]
  layers?: Record<string, string[]>; latency?: 0 | '3g'
}) => Store
export const createViewer = _createViewer as unknown as (o: {
  el: HTMLElement; bus: Bus; store?: Store; book: string
  profile: {
    layout: 'single' | 'scroll-h'; direction?: 'rtl'; gap?: number
    zoom?: { max?: number; min?: number }; zoomOnSelect?: boolean; viewportEvents?: boolean
  }
  pages: ViewerPage[]; regions?: boolean; start?: PageKey
}) => Viewer
export const createTextPane = _createTextPane as unknown as (o: {
  el: HTMLElement; bus: Bus; store: Store; book: string; page: PageKey
  layout?: TextLayout; stripShow?: 'both'
}) => TextPane
export const createLinker = _createLinker as unknown as (o: { bus: Bus; store: Store }) => { destroy(): void }

export const createRoll = _createRoll as unknown as (o: {
  el: HTMLElement; bus: Bus; start?: PageKey; latency?: 0 | '3g'
  viewerOpts?: { profile?: Record<string, unknown> }
}) => { viewer: Viewer; store: Store }
export const COLS = _COLS as unknown as ViewerPage[]
export const DATA_COLS = _DATA_COLS as unknown as PageKey[]
export const hieroHTML = _hieroHTML as unknown as (r: Region | undefined) => string
