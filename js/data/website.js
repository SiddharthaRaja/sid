/* ============================================================
   website.js — the scroll site and its easter eggs

   One page you scroll through, leading to hidden pages. Seeded
   from Si's sketch: dotted image → HD → audio → tile puzzle.
   ============================================================ */

export const SCENE_SEED = [
  {
    id: 'sc1', name: 'Halftone open', kind: 'image',
    brief: 'The dotted one. Big, slow, almost abstract until you scroll — the halftone style from the Asset studio at full bleed.',
    assets: '2400×3200 halftone still', tech: 'Serve at 2× the container, not the original 6000px file.', done: false,
  },
  {
    id: 'sc2', name: 'The HD frame', kind: 'image',
    brief: 'The one clean, high-resolution portrait. Earns its weight by being the only sharp thing on the page.',
    assets: '3000px wide JPEG, quality 85', tech: 'Preload this one — it is the image people will screenshot.', done: false,
  },
  {
    id: 'sc3', name: 'Sound', kind: 'audio',
    brief: 'The track fades in as this section enters the viewport. A visible mute control from the first pixel.',
    assets: '30–45s loop, 128kbps MP3', tech: 'Browsers block autoplay until a click. Start muted, unmute on the first interaction, and never surprise anyone with sound.', done: false,
  },
  {
    id: 'sc4', name: 'Negative', kind: 'image',
    brief: 'The inverted version of an earlier frame, so scrolling back feels like a different site.',
    assets: 'Negative style from the studio', tech: 'Reuse the same source file at a different filter — no extra download.', done: false,
  },
  {
    id: 'sc5', name: 'The tile puzzle', kind: 'interactive',
    brief: 'A sliding-tile version of the cover art. Solving it reveals a hidden page.',
    assets: '1200×1200 crop of the cover', tech: '3×3, not 4×4 — nobody finishes 4×4 on a phone. Always shippable with a Skip link, and it must be keyboard-operable.', done: false,
  },
  {
    id: 'sc6', name: 'The ask', kind: 'cta',
    brief: 'Where it lands: listen, follow, the mailing list. One screen, three links, no scroll trap.',
    assets: 'Smart link, socials', tech: 'The only part of the page that must work with JavaScript disabled.', done: false,
  },
];

export const EGG_SEED = [
  { id: 'eg1', name: 'Solve the puzzle', trigger: 'Finishing the tile puzzle', leads: '/unreleased', reward: 'A demo version, streamable, not downloadable.', findable: 'Anyone who plays', done: false },
  { id: 'eg2', name: 'Konami code', trigger: '↑↑↓↓←→←→BA on a keyboard', leads: '/negative', reward: 'The whole site inverted, permanently, until they clear storage.', findable: 'Desktop only — say so somewhere', done: false },
  { id: 'eg3', name: 'The lyric', trigger: 'Typing a line from the song anywhere on the page', leads: '/notebook', reward: 'Scans of the handwritten draft.', findable: 'Only people who know the words — the right kind of hard', done: false },
  { id: 'eg4', name: 'Long press the cover', trigger: 'Holding the cover art for three seconds', leads: '/alt', reward: 'The rejected cover art, with a line about why it lost.', findable: 'Phone users who fidget', done: false },
  { id: 'eg5', name: 'View source', trigger: 'An ASCII comment in the HTML with a URL in it', leads: '/source', reward: 'Stems, or a thank-you.', findable: 'Developers. Costs nothing to add', done: false },
];

export const SITE_NOTES = [
  'Audio cannot start on its own. Every browser blocks it until a click or a tap, so the page starts silent, shows an unmute control, and never makes noise unasked.',
  'Full-bleed images are the entire weight of a site like this. Export at 2× the widest container, not the camera original, use AVIF or WebP with a JPEG fallback, and lazy-load everything below the first screen.',
  'Scroll effects must survive prefers-reduced-motion. Honouring it is four lines of CSS and the alternative makes some people physically ill.',
  'Hidden pages are still pages: give each one a title and an OG image, or every share of an easter egg looks broken.',
  'The puzzle needs a skip link and keyboard controls. A gate nobody can pass is not mysterious, it is a bug report.',
  'One page that loads in two seconds beats five that load in six. Budget: under 2 MB for the first screen.',
  'It lives in the same GitHub Pages setup as Sid — a second repo, or a folder in this one, published at a subpath.',
];
