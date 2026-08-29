import type { MantineColorsTuple } from '@mantine/core'

/* Page-scoped theming. One generated token map feeds two consumers: Mantine (via
   the provider's theme + cssVariablesResolver) and the vanilla whl-* modules,
   which read the older --ink/--line/--tint-* names. Schemes are generated from a
   few oklch parameters rather than hand-authored, which is what makes the list
   cheap to extend. assets/tokens.css is not loaded and not modified. */

export interface Scheme {
  id: string
  label: string
  /** surface hue */
  h: number
  /** surface chroma */
  c: number
  /** accent hue / chroma */
  ah: number
  ac: number
  /** mid-tone registers sit the light ground well below paper white */
  midtone?: boolean
}

export const SCHEMES: Scheme[] = [
  { id: 'archive', label: 'Archive', h: 75, c: 0.022, ah: 55, ac: 0.085 },
  { id: 'herbarium', label: 'Herbarium', h: 140, c: 0.018, ah: 148, ac: 0.08 },
  { id: 'oxford', label: 'Oxford', h: 260, c: 0.016, ah: 262, ac: 0.095 },
  { id: 'parchment', label: 'Parchment', h: 85, c: 0.032, ah: 62, ac: 0.09 },
  { id: 'vellum', label: 'Vellum', h: 95, c: 0.02, ah: 70, ac: 0.07 },
  { id: 'ink', label: 'Ink', h: 0, c: 0, ah: 0, ac: 0 },
  { id: 'slate', label: 'Slate', h: 250, c: 0.012, ah: 248, ac: 0.06, midtone: true },
  { id: 'olive', label: 'Olive', h: 122, c: 0.035, ah: 128, ac: 0.09, midtone: true },
  { id: 'ochre', label: 'Ochre', h: 82, c: 0.055, ah: 68, ac: 0.11, midtone: true },
  { id: 'umber', label: 'Umber', h: 52, c: 0.042, ah: 45, ac: 0.1, midtone: true },
  { id: 'verdigris', label: 'Verdigris', h: 178, c: 0.032, ah: 184, ac: 0.085, midtone: true },
  { id: 'porphyry', label: 'Porphyry', h: 18, c: 0.038, ah: 12, ac: 0.1, midtone: true },
]

export const ELEMENT_STYLES = [
  { id: 'bordered', label: 'Bordered' },
  { id: 'shaded', label: 'Shaded' },
  { id: 'flat', label: 'Flat' },
  { id: 'outlined', label: 'Outlined' },
  { id: 'inset', label: 'Inset' },
  { id: 'ruled', label: 'Ruled' },
] as const
export type ElementStyle = (typeof ELEMENT_STYLES)[number]['id']

export const CORNERS = [
  { id: 'square', label: 'Square', v: '0rem' },
  { id: 'subtle', label: 'Subtle', v: '0.25rem' },
  { id: 'rounded', label: 'Rounded', v: '0.5rem' },
  { id: 'soft', label: 'Soft', v: '1rem' },
] as const
export type Corner = (typeof CORNERS)[number]['id']

export const STAGES = [
  { id: 'black', label: 'Black', v: '#000000' },
  { id: 'charcoal', label: 'Charcoal', v: 'oklch(0.19 0 0)' },
  { id: 'scheme', label: 'Scheme', v: '' },
  { id: 'paper', label: 'Paper', v: 'oklch(0.97 0 0)' },
] as const
export type Stage = (typeof STAGES)[number]['id']

export const UI_FONTS = [
  { id: 'inter', label: 'Inter', v: "'Inter', system-ui, sans-serif" },
  { id: 'plex', label: 'Plex Sans', v: "'IBM Plex Sans', system-ui, sans-serif" },
  { id: 'system', label: 'System', v: 'system-ui, -apple-system, Segoe UI, sans-serif' },
  { id: 'mono', label: 'Plex Mono', v: "'IBM Plex Mono', ui-monospace, monospace" },
] as const
export type UiFont = (typeof UI_FONTS)[number]['id']

export const READ_FONTS = [
  { id: 'source-serif', label: 'Source Serif', v: "'Source Serif 4', Georgia, serif" },
  { id: 'garamond', label: 'Garamond', v: "'EB Garamond', Georgia, serif" },
  { id: 'lora', label: 'Lora', v: "'Lora', Georgia, serif" },
  { id: 'spectral', label: 'Spectral', v: "'Spectral', Georgia, serif" },
  { id: 'plex-sans', label: 'Plex Sans', v: "'IBM Plex Sans', system-ui, sans-serif" },
  { id: 'plex-mono', label: 'Plex Mono', v: "'IBM Plex Mono', ui-monospace, monospace" },
] as const
export type ReadFont = (typeof READ_FONTS)[number]['id']

const ok = (l: number, c: number, h: number) => `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h})`
export const pick = <T extends { id: string }>(list: readonly T[], id: string) =>
  list.find((x) => x.id === id) ?? list[0]

export interface ThemeInput {
  scheme: string
  dark: boolean
  corner: Corner
  stage: Stage
  uiFont: UiFont
  readFont: ReadFont
  readSize: number
  readLeading: number
  panelAlpha: number
  panelBlur: number
}

interface Ramp {
  bg: string
  card: string
  sunk: string
  muted: string
  border: string
  input: string
  fg: string
  dimmed: string
  ink2: string
  accent: string
  accentFg: string
  stage: string
  tintTranslation: string
}

function ramp(t: ThemeInput): Ramp {
  const s = pick(SCHEMES, t.scheme) as Scheme
  const { h, c, ah, ac } = s
  const d = t.dark
  const mid = !!s.midtone
  const sunkL = d ? 0.115 : mid ? 0.775 : 0.935
  const accent = ok(d ? 0.78 : 0.45, ac, ah)
  return {
    bg: ok(d ? 0.155 : mid ? 0.855 : 0.975, c, h),
    card: ok(d ? 0.205 : mid ? 0.905 : 0.995, c * 0.85, h),
    sunk: ok(sunkL, c, h),
    muted: ok(d ? 0.265 : mid ? 0.815 : 0.955, c * 0.9, h),
    border: ok(d ? 0.32 : mid ? 0.735 : 0.9, c * 0.9, h),
    input: ok(d ? 0.37 : mid ? 0.7 : 0.87, c * 0.9, h),
    fg: ok(d ? 0.93 : 0.19, c * 0.6, h),
    dimmed: ok(d ? 0.68 : mid ? 0.41 : 0.5, c * 0.7, h),
    ink2: ok(d ? 0.78 : 0.35, c * 0.7, h),
    accent,
    accentFg: ok(d ? 0.16 : 0.99, c * 0.4, h),
    stage: pick(STAGES, t.stage).v || ok(sunkL, c * 0.8, h),
    tintTranslation: ok(d ? 0.235 : mid ? 0.845 : 0.965, c * 1.1, h),
  }
}

/** Mantine wants ten shades, lightest first. */
export function primaryShades(schemeId: string, dark: boolean): MantineColorsTuple {
  const s = pick(SCHEMES, schemeId) as Scheme
  const from = dark ? 0.94 : 0.96
  const to = dark ? 0.34 : 0.3
  const out: string[] = []
  for (let i = 0; i < 10; i++) {
    const l = from + ((to - from) * i) / 9
    const c = s.ac * (0.25 + (0.75 * i) / 9)
    out.push(ok(l, c, s.ah))
  }
  return out as unknown as MantineColorsTuple
}

/** Entity + rubric inks. Hues are fixed by meaning; only lightness follows mode. */
function inks(dark: boolean) {
  const l = dark ? 0.78 : 0.48
  const c = dark ? 0.11 : 0.14
  return {
    '--ent-author': ok(l, c, 255),
    '--ent-plant': ok(l, c, 150),
    '--ent-cite': ok(l, c, 75),
    '--ent-substance': ok(l, c, 350),
    '--rubric': ok(dark ? 0.68 : 0.5, dark ? 0.15 : 0.18, 28),
  }
}

/** Variables handed to Mantine's cssVariablesResolver, so Mantine's own
 *  components sit on the generated palette rather than its stock greys. */
export function mantineVars(t: ThemeInput): Record<string, string> {
  const r = ramp(t)
  return {
    '--mantine-color-body': r.bg,
    '--mantine-color-text': r.fg,
    '--mantine-color-dimmed': r.dimmed,
    '--mantine-color-default': r.card,
    '--mantine-color-default-hover': r.muted,
    '--mantine-color-default-border': r.border,
    '--mantine-color-default-color': r.fg,
    '--mantine-color-placeholder': r.dimmed,
    '--mantine-color-anchor': r.accent,
    '--mantine-color-error': ok(t.dark ? 0.7 : 0.5, 0.18, 28),
  }
}

/** Everything the page and the vanilla modules read. */
export function pageVars(t: ThemeInput): Record<string, string> {
  const r = ramp(t)
  return {
    '--panel-bg': r.card,
    '--panel-solid-bg': r.sunk === r.bg ? r.card : r.bg,
    '--panel-border': r.border,
    '--panel-alpha': String(t.panelAlpha),
    '--panel-blur': t.panelBlur + 'px',
    '--stage': r.stage,
    '--muted': r.muted,
    '--input': r.input,

    '--font-read': pick(READ_FONTS, t.readFont).v,
    '--read-size': t.readSize + 'px',
    '--read-leading': String(t.readLeading),

    /* legacy names read by the vanilla whl-* modules */
    '--bg': r.bg,
    '--bg-raise': r.card,
    '--bg-sunk': r.sunk,
    '--ink': r.fg,
    '--ink-2': r.ink2,
    '--ink-3': r.dimmed,
    '--line': r.border,
    '--line-2': r.input,
    '--accent': r.accent,
    '--accent-ink': r.accentFg,
    '--tint-translation': r.tintTranslation,
    '--tint-region': `color-mix(in oklab, ${r.accent} ${t.dark ? 16 : 12}%, transparent)`,
    '--tint-select': `color-mix(in oklab, ${r.accent} ${t.dark ? 32 : 26}%, transparent)`,
    '--font-chrome': pick(UI_FONTS, t.uiFont).v,
    '--font-display': pick(READ_FONTS, t.readFont).v,
    '--radius': pick(CORNERS, t.corner).v,
    ...inks(t.dark),
  }
}

export function applyPageVars(t: ThemeInput) {
  const root = document.documentElement
  for (const [k, v] of Object.entries(pageVars(t))) root.style.setProperty(k, v)
  root.dataset.scheme = t.scheme
}
