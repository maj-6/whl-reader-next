/* Page-scoped theming. Every token is written as an inline custom property on
   <html>, so it overrides the shadcn :root/.dark blocks without touching them
   and without touching mockups/assets/tokens.css. Schemes are generated from a
   few oklch parameters rather than hand-authored, which is what makes the list
   cheap to extend. */

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
  { id: 'rounded', label: 'Rounded', v: '0.625rem' },
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
  { id: 'geist', label: 'Geist', v: "'Geist Variable', system-ui, sans-serif" },
  { id: 'inter', label: 'Inter', v: "'Inter', system-ui, sans-serif" },
  { id: 'plex', label: 'Plex Sans', v: "'IBM Plex Sans', system-ui, sans-serif" },
  { id: 'system', label: 'System', v: 'system-ui, -apple-system, Segoe UI, sans-serif' },
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
const pick = <T extends { id: string }>(list: readonly T[], id: string) => list.find((x) => x.id === id) ?? list[0]

/** Entity + rubric inks. Hues are fixed by meaning (author blue, plant green,
 *  citation amber, substance magenta, rubric red); only lightness follows mode. */
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

/** The whole token set, shadcn names plus the legacy whl-* names the vanilla
 *  modules read, so both systems follow one theme. */
export function themeTokens(t: ThemeInput): Record<string, string> {
  const s = pick(SCHEMES, t.scheme) as Scheme
  const { h, c, ah, ac } = s
  const d = t.dark
  const mid = !!s.midtone

  const bgL = d ? 0.155 : mid ? 0.855 : 0.975
  const cardL = d ? 0.205 : mid ? 0.905 : 0.995
  const mutedL = d ? 0.265 : mid ? 0.815 : 0.955
  const borderL = d ? 0.32 : mid ? 0.735 : 0.9
  const inputL = d ? 0.37 : mid ? 0.7 : 0.87
  const fgL = d ? 0.93 : 0.19
  const mfgL = d ? 0.68 : mid ? 0.41 : 0.5
  const sunkL = d ? 0.115 : mid ? 0.775 : 0.935
  const accL = d ? 0.78 : 0.45
  const accFg = d ? 0.16 : 0.99

  const accent = ok(accL, ac, ah)
  const stageV = pick(STAGES, t.stage).v || ok(sunkL, c * 0.8, h)

  return {
    /* shadcn surface tokens */
    '--background': ok(bgL, c, h),
    '--foreground': ok(fgL, c * 0.6, h),
    '--card': ok(cardL, c * 0.85, h),
    '--card-foreground': ok(fgL, c * 0.6, h),
    '--popover': ok(cardL, c * 0.85, h),
    '--popover-foreground': ok(fgL, c * 0.6, h),
    '--primary': accent,
    '--primary-foreground': ok(accFg, c * 0.4, h),
    '--secondary': ok(mutedL, c * 0.9, h),
    '--secondary-foreground': ok(fgL, c * 0.6, h),
    '--muted': ok(mutedL, c * 0.9, h),
    '--muted-foreground': ok(mfgL, c * 0.7, h),
    '--accent': ok(mutedL, c, h),
    '--accent-foreground': ok(fgL, c * 0.6, h),
    '--border': ok(borderL, c * 0.9, h),
    '--input': ok(inputL, c * 0.9, h),
    '--ring': accent,
    '--sidebar': ok(d ? 0.185 : mid ? 0.885 : 0.985, c * 0.9, h),
    '--sidebar-foreground': ok(fgL, c * 0.6, h),
    '--sidebar-primary': accent,
    '--sidebar-primary-foreground': ok(accFg, c * 0.4, h),
    '--sidebar-accent': ok(mutedL, c, h),
    '--sidebar-accent-foreground': ok(fgL, c * 0.6, h),
    '--sidebar-border': ok(borderL, c * 0.9, h),
    '--sidebar-ring': accent,
    '--radius': pick(CORNERS, t.corner).v,

    /* page extras */
    '--stage': stageV,
    '--tint-region': `color-mix(in oklab, ${accent} ${d ? 16 : 12}%, transparent)`,
    '--tint-select': `color-mix(in oklab, ${accent} ${d ? 32 : 26}%, transparent)`,
    '--tint-translation': ok(d ? 0.235 : mid ? 0.845 : 0.965, c * 1.1, h),
    '--panel-alpha': String(t.panelAlpha),
    '--panel-blur': t.panelBlur + 'px',

    /* typography */
    '--font-sans': pick(UI_FONTS, t.uiFont).v,
    '--font-chrome': pick(UI_FONTS, t.uiFont).v,
    '--font-read': pick(READ_FONTS, t.readFont).v,
    '--font-display': pick(READ_FONTS, t.readFont).v,
    '--read-size': t.readSize + 'px',
    '--read-leading': String(t.readLeading),

    /* legacy names read by the vanilla whl-* modules */
    '--bg': ok(bgL, c, h),
    '--bg-raise': ok(cardL, c * 0.85, h),
    '--bg-sunk': ok(sunkL, c, h),
    '--ink': ok(fgL, c * 0.6, h),
    '--ink-2': ok(d ? 0.78 : 0.35, c * 0.7, h),
    '--ink-3': ok(mfgL, c * 0.7, h),
    '--line': ok(borderL, c * 0.9, h),
    '--line-2': ok(inputL, c * 0.9, h),
    '--accent-ink': ok(accFg, c * 0.4, h),
    ...inks(d),
  }
}

export function applyTheme(t: ThemeInput) {
  const root = document.documentElement
  const tokens = themeTokens(t)
  for (const [k, v] of Object.entries(tokens)) root.style.setProperty(k, v)
  root.classList.toggle('dark', t.dark)
  root.dataset.scheme = t.scheme
}
