import { COLS, DATA_COLS, type PageKey, type Region, type ViewerPage } from './vanilla'

/** Bibliographic record. Every field is transcribed from the corpus sidecar
 *  reader/<LABEL>.bib.json (and <LABEL>.json / <LABEL>.pages.json for extent and
 *  identifiers). Nothing here is invented: fields the corpus does not record —
 *  shelfmark, collation, dimensions, translator — are simply absent. */
export interface Bib {
  title: string
  titleShort: string
  author: string
  date: string
  place: string
  printer?: string
  language: string
  script: string
  institution?: string
  extent: string
  identifier?: { label: string; value: string; href?: string }[]
  note?: string
}

export interface BookSpan {
  total: number
  unit: string
  /** where a page key falls in the whole book, 1-based */
  ordinal(key: PageKey): number | null
  /** how that position is named */
  label(key: PageKey): string
}

export interface BookRow { i: number; r1: string; r2?: string; sub?: boolean }

export interface Book {
  id: string
  title: string
  kind: 'roll' | 'single'
  bib: Bib
  span: BookSpan
  /* viewer */
  start: PageKey
  page?: PageKey
  img?: string
  w?: number
  h?: number
  layers?: Record<string, string[]>
  facing?: ViewerPage & { side: 'left' | 'right' }
  /* chrome */
  entriesTitle(key: PageKey): string
  pageLabel(key: PageKey): string
  rows(regs: Region[]): BookRow[]
  comm: Record<string, [string, string][]>
  qa: [string, string]
}

const first = (s: unknown, n: number) => {
  const t = String(s ?? '').split('\n')[0].trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}
const colNo = (k: PageKey) => Number(k.slice(4))

export const BOOKS: Record<string, Book> = {
  EB01: {
    id: 'EB01',
    title: 'Papyrus Ebers',
    kind: 'roll',
    bib: {
      title: 'Papyrus Ebers (Leipzig, Universitätsbibliothek, P. Ebers) — columns 44–48',
      titleShort: 'Papyrus Ebers',
      author: 'Unknown Egyptian scribe; compilation of older medical books',
      date: 'c. 1550 BC (early New Kingdom; TLA dates the copy to the reign of Amenhotep I Djeserkare)',
      place: 'Thebes (findspot); Leipzig, Universitätsbibliothek (holding institution since 1873)',
      language: 'Early and Classical Middle Egyptian',
      script:
        "Middle hieratic book hand ('Mittelhieratische Buchschrift'), horizontal lines read right to left, black ink with red rubrics for incipits, dose numerals and efficacy formulae",
      institution: 'Universitätsbibliothek Leipzig',
      extent: '110 columns; this edition covers columns 44–48 (Eb 211–262)',
      identifier: [
        { label: 'TLA text', value: 'VHKSDEIJSJEF7GWX7UIF6FBAZY', href: 'https://thesaurus-linguae-aegyptiae.de/text/VHKSDEIJSJEF7GWX7UIF6FBAZY' },
        { label: 'Project', value: 'papyrusebers.de', href: 'https://papyrusebers.de/' },
      ],
      note: 'Text after Thesaurus Linguae Aegyptiae, corpus edition 20. Facsimile reference: Georg Ebers, Papyros Ebers, Leipzig 1875, plates XLIV–XLVIII.',
    },
    span: {
      total: 110,
      unit: 'column',
      ordinal: (k) => colNo(k),
      label: (k) => 'Column ' + colNo(k),
    },
    start: 'col-0045',
    entriesTitle: (c) => 'Cases · col. ' + colNo(c),
    pageLabel: (c) => 'Column ' + colNo(c),
    rows: (regs) => regs.map((r, i) => (r.case_label ? { i, r1: r.case_label } : null)).filter(Boolean) as BookRow[],
    comm: {
      'col-0044': [
        ['Eb 217–224', 'Concordance: Grundriss der Medizin IV/1 ad loc. — = H 48–49, 79–82; the Hearst parallels run in block, variants orthographic.'],
        ['Eb 214', 'vgl. pChester Beatty VIII vso. 5,1–3, which transmits the same text in a later hand.'],
      ],
      'col-0045': [
        ['Eb 226–236', 'Concordance: Grundriss der Medizin IV/1 ad loc. for the cases of this column.'],
        ['Eb 227', 'vgl. Bln 58 — the Berlin papyrus transmits the same remedy with the drug list reordered.'],
      ],
      'col-0046': [
        ['Eb 242', 'Rubricated title case; the ḫꜣs.yt-fruit group it opens runs through Eb 245.'],
        ['Eb 243–245', '= H 71–73: the Hearst sequence keeps the order of the common Vorlage.'],
      ],
      'col-0048': [
        ['Eb 251d', 'Conclusion of a case begun in col. 47; only the final clause stands in this column.'],
        ['Eb 252–262', 'Date juice (bnj.w) is the standing vehicle through this run of prescriptions.'],
      ],
    },
    qa: [
      'Which drugs recur in Eb 226–236?',
      'Coriander (šꜣ.w), cumin (tpnn) and gum (qmy.t) each appear in more than one prescription of this column; wheat flour (sw.t) is the usual base.',
    ],
  },

  E54: {
    id: 'E54',
    title: 'Ben Cao Gang Mu',
    kind: 'single',
    bib: {
      title: 'Bencao gangmu 本草綱目 (Compendium of Materia Medica), 52 juan; volume 2: juan 1, Xuli (prolegomena)',
      titleShort: 'Bencao gangmu 本草綱目',
      author: 'Li Shizhen 李時珍 (1518–1593)',
      date: '1888 (work completed 1578; first printed Nanjing 1596)',
      place: 'Shanghai',
      printer: 'Hongbaozhai shuju 鴻寶齋書局',
      language: 'Classical Chinese',
      script: 'Traditional Han characters, vertical columns read right to left, with double-column interlinear small characters',
      institution: 'McGill University Library (copy digitised)',
      extent: 'Volume 2: 98 leaves; 12 columns per half-leaf, about 20 cm tall; woodblock',
      identifier: [
        { label: 'Wikidata', value: 'Q816658', href: 'https://www.wikidata.org/wiki/Q816658' },
        { label: 'Internet Archive', value: 'McGillLibrary-osl_ealw_ben-cao-gang-mu_WB50JC6L6931p1888_v2-21368' },
      ],
      note: 'Leaf shown: folio 19 of juan 1 (Xuli); the banxin folio glyph on the page reads 十九.',
    },
    span: { total: 98, unit: 'leaf', ordinal: () => 19, label: () => 'Leaf 19 (folio 十九)' },
    start: 'center',
    page: 'center',
    img: 'assets/pages/E54-page.jpg',
    w: 978,
    h: 1600,
    layers: { center: ['source', 'glyphs', 'associations', 'entities'] },
    entriesTitle: () => 'Entries',
    pageLabel: () => 'fol. 19',
    rows: (regs) =>
      regs
        .map((r, i) => ((r.text || '').trim() ? { i, r1: first(r.text, 15), r2: first(r.translation, 44) } : null))
        .filter(Boolean) as BookRow[],
    comm: {
      center: [
        ['E17 · 中药大辞典', 'The dictionary resolves its Bencao gangmu citations against this edition; the 1888 Hongbaozhai woodblock is its reference printing.'],
      ],
    },
    qa: [
      'How are pill sizes reckoned?',
      'By a ladder of seeds: three sesame grains (胡麻) equal one hemp seed (大麻子), three hemp seeds the small bean (赤小豆), two small beans the soy bean (大豆), two soy beans the wutong seed (梧子).',
    ],
  },

  E28: {
    id: 'E28',
    title: 'The English Physitian',
    kind: 'single',
    bib: {
      title: 'The English Physitian: or an Astrologo-Physical Discourse of the Vulgar Herbs of this Nation',
      titleShort: 'The English Physitian',
      author: 'Nicholas Culpeper (1616–1654)',
      date: '1652 (first edition)',
      place: 'London',
      printer: 'Peter Cole',
      language: 'English (manuscript annotations in English, Latin and Greek)',
      script: 'Latin script, roman type with long s; contemporary ink annotations in a 17th-century hand',
      institution: 'Wellcome Collection (copy digitised)',
      extent: '197 pages in the scanned copy; the leaf shown is printed p. 18, signature H2',
      identifier: [
        { label: 'Wing', value: 'C7500' },
        { label: 'Internet Archive', value: 'b30335310', href: 'https://archive.org/details/b30335310' },
      ],
      note:
        'The facing leaf is image only: no layer data exists for it. It comes from a different scan of the edition than the annotated leaf, so the two are joined as a demonstration of the opening view, not as a recorded opening.',
    },
    span: { total: 197, unit: 'page', ordinal: (k) => (k === 'page-0043' ? 43 : 50), label: (k) => (k === 'page-0043' ? 'p. 20 (facing)' : 'p. 18') },
    start: 'center',
    page: 'center',
    img: 'assets/pages/E28-page.jpg',
    w: 1045,
    h: 1600,
    // The annotated leaf is a recto (printed 18; number and gilt fore-edge at the
    // right), so the facing leaf sits to its LEFT: a verso, printed 20, image only.
    facing: { key: 'page-0043', url: 'assets/pages/E28-page-0043.jpg', w: 1081, h: 1600, side: 'left' },
    entriesTitle: () => 'Entries',
    pageLabel: () => 'p. 18',
    rows: (regs) =>
      regs
        .map((r, i) => {
          if (r.type !== 'title') return null
          const id = (/\[([^\]]+)\]/.exec(r.translation || '') || [])[1] || ''
          return { i, r1: r.text ?? '', r2: id, sub: !id }
        })
        .filter(Boolean) as BookRow[],
    comm: {
      center: [
        ['This copy', 'An early annotating hand runs in the margins of this copy; the printed side-notes (Feavers, Head, Eyes …) index the virtues paragraph beside them.'],
      ],
    },
    qa: [
      'What are the blites good for?',
      'Cooling, drying and binding — Culpeper has them restrain fluxes of blood in man or woman, the red kind especially.',
    ],
  },
}

export const BOOK_IDS = Object.keys(BOOKS)
export const resolveBook = (q: string | null) => (q && BOOKS[q] ? q : 'EB01')

export function viewerPagesFor(b: Book, opening: boolean): ViewerPage[] {
  if (b.kind === 'roll') return COLS
  const own: ViewerPage = { key: b.page!, url: b.img!, w: b.w!, h: b.h! }
  if (!opening || !b.facing) return [own]
  const f: ViewerPage = { key: b.facing.key, url: b.facing.url, w: b.facing.w, h: b.facing.h }
  return b.facing.side === 'left' ? [f, own] : [own, f]
}

export const dataPagesFor = (b: Book) => (b.kind === 'roll' ? DATA_COLS : [b.page!])
