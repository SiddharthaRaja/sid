/* ============================================================
   app.js — boot, auth gate, nav, routing, theme, search
   ============================================================ */

import * as B from './backend.js';
import * as S from './store.js';
import { $, $$, h, clear, toast, modal } from './ui.js';
import { icon, PCOLORS } from './icons.js';
import { PLATFORMS, PLATFORM_GROUPS, platformsIn } from './data/platforms.js';

import { renderDashboard } from './modules/dashboard.js';
import { renderRelease }   from './modules/release.js';
import { renderWrite }     from './modules/write.js';
import { renderSeo }       from './modules/seo.js';
import { renderStudio }    from './modules/studio.js';
import { renderMerch }     from './modules/merch.js';
import { renderSite }      from './modules/site.js';
import { renderMailList }  from './modules/maillist.js';
import { renderPlaylists } from './modules/playlists.js';
import { renderRunsheet }  from './modules/runsheet.js';
import { renderCalendar }  from './modules/calendar.js';
import { renderPlan }      from './modules/plan.js';
import { renderPlatform }  from './modules/platform.js';
import { renderRadio }     from './modules/radio.js';
import { renderRights }    from './modules/rights.js';
import { renderFinance }   from './modules/finance.js';
import { renderVideo }     from './modules/video.js';
import { renderStats }     from './modules/stats.js';
import { renderNotes }     from './modules/notes.js';
import { renderSettings }  from './modules/settings.js';
import { renderCopy }      from './modules/copy.js';
import { renderContacts }  from './modules/contacts.js';
import { renderQueue }     from './modules/queue.js';
import { renderAds }       from './modules/ads.js';
import { renderEpk }       from './modules/epk.js';
import { renderAssets }    from './modules/assets.js';
import { renderReview }    from './modules/review.js';
import { renderHistory }   from './modules/history.js';
import { renderMeta }      from './modules/meta.js';
import { renderInbox, drainShares, inboxCount } from './modules/inbox.js';
import { renderNotepad }  from './modules/notepad.js';
import { renderSvara, leaveSvara } from './modules/svara.js';
import { calendarExportModal } from './modules/calexport.js';
import * as R from './reader.js';
import { applyTheme, cycleTheme, watchSystemTheme, themeMode } from './theme.js';
import { initMobile, setSwipeSections } from './mobile.js';
import { initCapture } from './capture.js';
import { initPaste } from './paste.js';
import * as PUSH from './push.js';

import { SEED_MILESTONES } from './data/masterplan.js';
import { REGISTRATIONS_SEED } from './data/rights.js';
import { FORMS_SEED, ACCOUNTS_SEED, BUDGET_SEED } from './data/finance.js';
import { RADIO_SEED } from './data/radio.js';
import { CAMPAIGNS_SEED, AD_ACCOUNTS_SEED } from './data/ads.js';
import { COPY_BANK } from './data/templates.js';
import { ASSETS_SEED } from './data/assets.js';

/* ---------------------------------------------------------- */
/*  slice defaults                                             */
/* ---------------------------------------------------------- */

const emptyPlatform = () => ({ content: {}, setupDone: {}, notes: '', stats: [], handle: '', profileUrl: '' });

S.register('settings', () => ({
  artist: '', song: '', handle: '', link: '', city: '', genre: '',
  releaseDate: '', draftRelease: '', mode: '', label: '', email: '', comps: '',
  isrc: '', upc: '', distributor: 'DistroKid', pro: 'BMI', publisher: 'Songtrust',
  theme: 'dark', themeMode: 'dark', accent: 'ember',
}));
S.register('calendar', () => ({ events: [], visible: {} }));
S.register('plan',     () => ({ milestones: null, custom: [] }));
S.register('radio',    () => ({ stations: null, notes: '', submissions: [] }));
S.register('rights',   () => ({ checks: {}, works: [], registrations: null, notes: '' }));
S.register('finance',  () => ({ accounts: [], forms: null, ledger: [], notes: '', budget: null }));
S.register('video',    () => ({ schedules: [], notes: '' }));
S.register('stats',    () => ({ entries: [], notes: '' }));
S.register('notes',    () => ({ items: [] }));
S.register('copy',     () => ({ edits: {}, done: {} }));
S.register('contacts', () => ({ items: [], notes: '' }));
S.register('ads',      () => ({ campaigns: null, accounts: null, creatives: [], creativeDone: {}, notes: '' }));
S.register('assets',   () => ({ items: null, notes: '' }));
S.register('review',   () => ({ reviews: [] }));
S.register('history',  () => ({ read: {}, pos: {}, saved: {}, rate: 1, voiceURI: '' }));
S.register('meta',     () => ({ v: {}, splits: [], masters: [], notes: '' }));
S.register('inbox',    () => ({ items: [] }));
S.register('links',    () => ({ items: [], draft: null }));
S.register('pitch',    () => ({ v: {}, promo: {}, history: [], playlists: [], submittedAt: '' }));
S.register('push',      () => ({ sub: null, kinds: null, hour: 8, schedule: [], builtAt: '', device: '', tzOffset: 330 }));
S.register('maillist',  () => ({ provider: '', dashUrl: '', signupUrl: '', offer: '', goal: 100, counts: [], sources: null, sends: [] }));
S.register('playlists', () => ({ items: [] }));
S.register('runsheet',  () => ({ done: {}, custom: [] }));
S.register('studio',   () => ({ have: {}, notes: '' }));
S.register('sprofile', () => ({ bio: '', tags: '', pickKind: 'song', pickUrl: '', pickNote: '', presaveUrl: '', presaves: 0, market: 'India' }));
S.register('merch',    () => ({ costs: null, vendors: [], preorders: [], price: 899, units: 50, gate: 30 }));
S.register('site',     () => ({ scenes: null, eggs: null, notes: '' }));
S.register('write',    () => ({ phrases: [], swipe: [], batch: null }));
S.register('seo',      () => ({ sets: null, keywords: [], yt: { title: '', desc: '', tags: '' } }));
/* The two guest apps. They keep their own slices and share nothing
   with the release side — see the header of each module. */
S.register('notepad',  () => ({ songs: [], open: null }));
S.register('svara',    () => ({ tonicMidi: 50, raga: 'mayamalavagowla', droneVol: 0.22, current: null, speed: 1, bpm: null, click: true, log: [] }));
S.register('epk',      () => ({ photos: [], quotes: [], downloads: [], links: [], tagline: '', videoUrl: '', embedUrl: '', showFacts: true }));
PLATFORMS.forEach(p => S.register(`p_${p.key}`, emptyPlatform));

const ALL_SLICES = [
  'settings', 'calendar', 'plan', 'radio', 'rights', 'finance', 'video', 'stats', 'notes', 'copy', 'contacts', 'ads', 'epk', 'assets', 'review', 'history', 'meta', 'inbox', 'links', 'pitch', 'write', 'seo', 'studio', 'sprofile', 'merch', 'site', 'maillist', 'playlists', 'runsheet', 'push', 'notepad', 'svara',
  ...PLATFORMS.map(p => `p_${p.key}`),
];

/* Fill the reference-heavy modules on first run so the dashboard,
   calendar and progress bars are right before you have visited them. */
function seedDefaults() {
  const clone = (arr) => arr.map(x => ({ ...x }));

  /* First run: fill it. Later runs: add anything new the app has
     learned since, matched on `key`, without touching your edits. */
  const merge = (existing, seed, key, extra = {}) => {
    if (!existing) return { list: clone(seed).map((x, i) => ({ ...x, ...extra, id: x.id || `s${i}` })), changed: true };
    const have = new Set(existing.map(x => String(x[key] || '').trim()));
    const added = seed.filter(x => !have.has(String(x[key] || '').trim()));
    if (!added.length) return { list: existing, changed: false };
    return { list: [...existing, ...clone(added).map((x, i) => ({ ...x, ...extra, id: x.id || `n${Date.now()}${i}` }))], changed: true };
  };

  const plan = S.get('plan');
  const mPlan = merge(plan.milestones, SEED_MILESTONES, 'title');
  if (mPlan.changed) { plan.milestones = mPlan.list; S.touch('plan'); }

  const rights = S.get('rights');
  const mReg = merge(rights.registrations, REGISTRATIONS_SEED, 'id');
  if (mReg.changed) { rights.registrations = mReg.list; S.touch('rights'); }

  const fin = S.get('finance');
  let finDirty = false;
  const mForms = merge(fin.forms, FORMS_SEED, 'id');
  if (mForms.changed) { fin.forms = mForms.list; finDirty = true; }
  const mAcc = merge(fin.accounts?.length ? fin.accounts : null, ACCOUNTS_SEED, 'id');
  if (mAcc.changed) { fin.accounts = mAcc.list; finDirty = true; }
  const mBud = merge(fin.budget, BUDGET_SEED, 'id');
  if (mBud.changed) { fin.budget = mBud.list; finDirty = true; }
  if (finDirty) S.touch('finance');

  const radio = S.get('radio');
  const mRadio = merge(radio.stations, RADIO_SEED, 'name', { status: 'not sent' });
  if (mRadio.changed) { radio.stations = mRadio.list; S.touch('radio'); }

  const ads = S.get('ads');
  const mAds = merge(ads.campaigns, CAMPAIGNS_SEED, 'id');
  if (mAds.changed) { ads.campaigns = mAds.list; S.touch('ads'); }
  const mAcct = merge(ads.accounts?.length ? ads.accounts : null, AD_ACCOUNTS_SEED, 'id');
  if (mAcct.changed) { ads.accounts = mAcct.list; S.touch('ads'); }

  /* point the seeded campaigns at the seeded accounts so the Ads
     tab groups by real account rather than by a bare platform string */
  let linked = false;
  (ads.campaigns || []).forEach(c => {
    if (c.accountId) return;
    const a = (ads.accounts || []).find(x => x.platform === c.platform);
    if (a) { c.accountId = a.id; linked = true; }
  });
  if (linked) S.touch('ads');

  const assets = S.get('assets');
  const mAssets = merge(assets.items, ASSETS_SEED, 'id', { done: 0 });
  if (mAssets.changed) { assets.items = mAssets.list; S.touch('assets'); }
}

/* ---------------------------------------------------------- */
/*  routes                                                     */
/* ---------------------------------------------------------- */

const ROUTES = {
  today:     { title: 'Today',              icon: 'dashboard',  render: (sub) => renderDashboard(sub, { merged: true }) },
  release:   { title: 'Release',            icon: 'settings',   render: renderRelease },
  write:     { title: 'Writing desk',        icon: 'copy',       render: renderWrite },
  seo:       { title: 'Discovery',           icon: 'stats',      render: renderSeo },
  studio:    { title: 'Asset studio',        icon: 'assets',     render: renderStudio },
  list:      { title: 'Mailing list',        icon: 'contacts',   render: renderMailList },
  playlists: { title: 'Playlists',           icon: 'spotify',    render: renderPlaylists },
  runsheet:  { title: 'Release day',         icon: 'calendar',   render: renderRunsheet },
  merch:     { title: 'Merch',               icon: 'finance',    render: renderMerch },
  site:      { title: 'Website',             icon: 'epk',        render: renderSite },
  dashboard: { title: 'Dashboard',          icon: 'dashboard',  render: renderDashboard },
  queue:     { title: 'Queue',              icon: 'queue',      render: renderQueue },
  review:    { title: 'Weekly review',      icon: 'review',     render: renderReview },
  calendar:  { title: 'Calendar',           icon: 'calendar',   render: renderCalendar },
  plan:      { title: 'Master plan',        icon: 'masterplan', render: renderPlan },
  copy:      { title: 'Copy bank',          icon: 'copy',       render: renderCopy },
  contacts:  { title: 'Contacts & outreach',icon: 'contacts',   render: renderContacts },
  ads:       { title: 'Paid ads',           icon: 'ads',        render: renderAds },
  epk:       { title: 'Press kit',          icon: 'epk',        render: renderEpk },
  radio:     { title: 'Radio',              icon: 'radio',      render: renderRadio },
  rights:    { title: 'Rights & licensing', icon: 'rights',     render: renderRights },
  finance:   { title: 'Finance',            icon: 'finance',    render: renderFinance },
  video:     { title: 'Music video',        icon: 'video',      render: renderVideo },
  assets:    { title: 'Assets',             icon: 'assets',     render: renderAssets },
  stats:     { title: 'Statistics',         icon: 'stats',      render: renderStats },
  history:   { title: 'History',            icon: 'history',    render: renderHistory },
  meta:      { title: 'Metadata',           icon: 'rights',     render: renderMeta },
  inbox:     { title: 'Inbox',              icon: 'queue',      render: renderInbox },
  notes:     { title: 'Notes',              icon: 'notes',      render: renderNotes },
  settings:  { title: 'Settings',           icon: 'settings',   render: renderSettings },

  /* the two guest apps, deliberately last and deliberately separate */
  np:        { title: 'Notepad',            icon: 'notepad',    render: renderNotepad,  guest: true },
  sv:        { title: 'Svara',              icon: 'svara',      render: renderSvara,    guest: true },
};

function parseHash() {
  const raw = (location.hash || '#/today').replace(/^#\/?/, '');
  const [seg, ...rest] = raw.split('/');
  if (seg === 'p') return { kind: 'platform', key: rest[0], sub: rest[1] };
  return { kind: 'route', key: ROUTES[seg] ? seg : 'today', sub: rest[0] };
}

export function go(hash) { location.hash = hash; }

/* ---------------------------------------------------------- */
/*  nav                                                        */
/* ---------------------------------------------------------- */

const navItem = (label, hash, ico, color) =>
  h('button', {
    class: 'nav-item', 'data-hash': hash,
    onClick: () => { go(hash); closeNav(); },
  },
    h('span', { html: icon(ico), style: color ? { color } : {} }),
    h('span', { class: 'label', text: label }));

/* The nav has 30+ entries now. Sections collapse, and a filter
   box beats scrolling once you know what you want. */
const navCollapsed = () => S.get('settings').navCollapsed || {};

function navSection(label) {
  const collapsed = !!navCollapsed()[label];
  return h('div', {
    class: `nav-sect clickable ${collapsed ? 'collapsed' : ''}`,
    'data-sect': label,
    onClick: () => {
      const set = S.get('settings');
      set.navCollapsed = set.navCollapsed || {};
      set.navCollapsed[label] = !set.navCollapsed[label];
      S.touch('settings');
      buildNav();
      markActive(location.hash || '#/today');
    },
  }, h('span', { text: label }), h('span', { class: 'caret', text: '\u25be' }));
}

/* Everything that is not one of the five. One list, used by the
   sidebar's More section and by the phone's More sheet. */
const MORE = [
  ['Writing desk', '#/write', 'copy'],
  ['Discovery', '#/seo', 'stats'],
  ['Mailing list', '#/list', 'contacts'],
  ['Playlists', '#/playlists', 'spotify', PCOLORS.spotify],
  ['Release day', '#/runsheet', 'calendar'],
  ['Asset studio', '#/studio', 'assets'],
  ['Merch', '#/merch', 'finance'],
  ['Website', '#/site', 'epk'],
  ['Queue', '#/queue', 'queue'],
  ['Inbox', '#/inbox', 'queue'],
  ['Weekly review', '#/review', 'review'],
  ['Copy bank', '#/copy', 'copy'],
  ['Assets', '#/assets', 'assets'],
  ['Music video', '#/video', 'video'],
  ['Statistics', '#/stats', 'stats'],
  ['Paid ads', '#/ads', 'ads'],
  ['Press kit', '#/epk', 'epk'],
  ['Radio', '#/radio', 'radio', PCOLORS.radio],
  ['Metadata', '#/meta', 'rights'],
  ['Rights & licensing', '#/rights', 'rights'],
  ['Finance', '#/finance', 'finance'],
  ['Notes', '#/notes', 'notes'],
  ['History', '#/history', 'history'],
  ['Settings', '#/settings', 'settings'],
];

function buildNav() {
  const box = clear($('#nav-scroll'));

  const filter = h('input', {
    placeholder: 'Filter\u2026', 'aria-label': 'Filter navigation',
    onInput: (e) => {
      const q = e.target.value.toLowerCase().trim();
      $$('#nav-scroll .nav-item').forEach(b => {
        b.hidden = !!q && !b.textContent.toLowerCase().includes(q);
      });
      $$('#nav-scroll .nav-sect').forEach(sec => { sec.hidden = !!q; });
      $$('#nav-scroll .nav-item').forEach(b => { if (q) b.hidden = b.hidden; });
      // while filtering, ignore collapsed state
      if (q) $$('#nav-scroll .nav-item').forEach(b => b.style.display = b.hidden ? 'none' : '');
      else $$('#nav-scroll .nav-item').forEach(b => b.style.display = '');
    },
  });
  box.append(h('div', { class: 'nav-filter' }, filter));

  const section = (label, items) => {
    box.append(navSection(label));
    if (navCollapsed()[label]) return;
    items.forEach(el => box.append(el));
  };

  /* Five that earn a permanent place. Everything else is one tap
     away under More, which stays collapsed until you open it. */
  box.append(
    navItem('Today', '#/today', 'dashboard'),
    navItem('Calendar', '#/calendar', 'calendar'),
    navItem('Release', '#/release', 'settings'),
    navItem('Master plan', '#/plan', 'masterplan'),
    navItem('Contacts', '#/contacts', 'contacts'),
  );

  for (const g of PLATFORM_GROUPS) {
    section(g, platformsIn(g).map(p => navItem(p.name, `#/p/${p.key}`, p.icon, PCOLORS[p.key])));
  }

  if (navCollapsed()['More'] === undefined) {
    const set = S.get('settings');
    set.navCollapsed = set.navCollapsed || {};
    set.navCollapsed['More'] = true;          // starts closed
  }
  section('More', MORE.map(([label, hash, ico, color]) => navItem(label, hash, ico, color)));

  /* Their own section, not folded into More: they are separate apps
     that happen to live in the same shell, not more release tools. */
  box.append(navSection('Apps'));
  if (!navCollapsed()['Apps']) {
    box.append(navItem('Notepad', '#/np', 'notepad'), navItem('Svara', '#/sv', 'svara'));
  }

  // mobile bottom bar — the sections you swipe between, plus More
  const tb = clear($('#tabbar'));
  BOTTOM.forEach(([hash, label, ico]) => {
    tb.append(h('button', { 'data-hash': hash, onClick: () => go(hash) },
      h('span', { html: icon(ico) }), h('span', { text: label })));
  });
  tb.append(h('button', { 'data-hash': '#more', onClick: moreSheet },
    h('span', { html: icon('more') }), h('span', { text: 'More' })));
}

/* The phone's top-level sections: the bottom bar, and what a
   sideways flick moves between. Order is the swipe order. */
export const BOTTOM = [
  ['#/today', 'Today', 'dashboard'],
  ['#/calendar', 'Calendar', 'calendar'],
  ['#/release', 'Release', 'settings'],
  ['#/p/instagram', 'Platforms', 'instagram'],
  ['#/np', 'Notepad', 'notepad'],
  ['#/sv', 'Svara', 'svara'],
];

/* Everything not on the bottom bar, one tap away. */
function moreSheet() {
  const link = (label, hash, ico, color) => h('a', {
    class: 'stat', href: hash,
    style: { textDecoration: 'none', color: 'inherit', display: 'block' },
    onClick: () => setTimeout(close, 0),
  }, h('div', { class: 'row', style: { gap: '9px' } },
      h('span', { html: icon(ico), style: color ? { color } : { color: 'var(--fg-3)' } }),
      h('span', { style: { fontWeight: 500 }, text: label })));

  const body = h('div',
    h('div', { class: 'grid g3' },
      link('Master plan', '#/plan', 'masterplan'),
      link('Contacts', '#/contacts', 'contacts'),
      MORE.map(([label, hash, ico, color]) => link(label, hash, ico, color))),
    h('div', { class: 'nav-sect', style: { paddingLeft: 0 } }, 'Apps'),
    h('div', { class: 'grid g3' },
      link('Notepad', '#/np', 'notepad'),
      link('Svara', '#/sv', 'svara')),
    h('div', { class: 'nav-sect', style: { paddingLeft: 0 } }, 'Platforms'),
    h('div', { class: 'grid g3' },
      PLATFORMS.map(p => link(p.name, `#/p/${p.key}`, p.icon, PCOLORS[p.key]))));

  const { close } = modal({ title: 'Everything else', body, wide: true });
}

function markActive(hash) {
  $$('#nav-scroll .nav-item').forEach(b => b.classList.toggle('on', b.dataset.hash === hash));
  const base = hash.startsWith('#/p/') ? '#/p/' : hash;
  $$('#tabbar button').forEach(b =>
    b.classList.toggle('on', b.dataset.hash === hash || (base === '#/p/' && b.dataset.hash.startsWith('#/p/'))));
}

const openNav  = () => { $('#nav').classList.add('open'); $('#nav-backdrop').classList.add('on'); };
const closeNav = () => { $('#nav').classList.remove('open'); $('#nav-backdrop').classList.remove('on'); };

/* ---------------------------------------------------------- */
/*  render                                                     */
/* ---------------------------------------------------------- */

let rerenderTimer = null;
export function rerender() {
  clearTimeout(rerenderTimer);
  rerenderTimer = setTimeout(route, 0);
}

let lastKey = null;

function route() {
  const r = parseHash();
  const view = clear($('#view'));
  window.scrollTo(0, 0);

  /* Svara holds the microphone and an oscillator. Leaving the section
     has to release both, or the phone shows a recording indicator for
     a page you are no longer looking at. */
  if (lastKey === 'sv' && !(r.kind === 'route' && r.key === 'sv')) leaveSvara();
  lastKey = r.kind === 'route' ? r.key : `p/${r.key}`;

  try {
    if (r.kind === 'platform') {
      const p = PLATFORMS.find(x => x.key === r.key) || PLATFORMS[0];
      $('#top-title').textContent = p.name;
      markActive(`#/p/${p.key}`);
      view.append(renderPlatform(p, r.sub));
    } else {
      const def = ROUTES[r.key];
      $('#top-title').textContent = def.title;
      markActive(`#/${r.key}`);
      view.append(def.render(r.sub));
    }
  } catch (e) {
    console.error(e);
    view.append(h('div', { class: 'empty' },
      h('strong', { text: 'Something went wrong rendering this page' }),
      h('div', { class: 'mono small', text: String(e && e.message || e) })));
  }
  document.title = `${$('#top-title').textContent} · Sid`;
}

/* ---------------------------------------------------------- */
/*  theme                                                      */
/* ---------------------------------------------------------- */

/* ---------------------------------------------------------- */
/*  search palette                                             */
/* ---------------------------------------------------------- */

function palette() {
  const targets = [
    ...Object.entries(ROUTES).map(([k, v]) => ({ label: v.title, hash: `#/${k}`, where: 'Section', ico: v.icon })),
    ...PLATFORMS.map(p => ({ label: p.name, hash: `#/p/${p.key}`, where: p.group, ico: p.icon })),
  ];
  // plus content items
  PLATFORMS.forEach(p => {
    const sl = S.get(`p_${p.key}`);
    Object.entries(sl.content || {}).forEach(([tk, items]) =>
      (items || []).forEach(it => targets.push({
        label: it.title || (it.body || '').slice(0, 60) || 'Untitled',
        hash: `#/p/${p.key}/${tk}`, where: `${p.name} · ${tk}`, ico: p.icon,
      })));
  });
  S.get('notes').items.forEach(n => targets.push({ label: n.title || 'Untitled note', hash: '#/notes', where: 'Notes', ico: 'notes' }));
  (S.get('contacts').items || []).forEach(c => targets.push({
    label: c.name || c.org || 'Unnamed contact',
    hash: `#/contacts/${c.kind}`, where: `Contacts · ${c.playlist || c.org || c.kind}`, ico: 'contacts',
  }));
  (S.get('video').schedules || []).forEach(sc => targets.push({
    label: sc.name || 'Shoot day', hash: '#/video', where: 'Music video', ico: 'video',
  }));
  (S.get('ads').campaigns || []).forEach(c => targets.push({
    label: c.name || 'Campaign', hash: '#/ads', where: `Ads · ${c.platform}`, ico: 'ads',
  }));
  COPY_BANK.forEach(g => g.items.forEach(i => targets.push({
    label: i.label, hash: `#/copy/${encodeURIComponent(g.group)}`, where: `Copy bank · ${g.group}`, ico: 'copy',
  })));
  (S.get('inbox').items || []).forEach(i => targets.push({
    label: i.title || (i.text || '').slice(0, 60) || 'Shared item', hash: '#/inbox', where: 'Inbox', ico: 'queue',
  }));
  (S.get('links').items || []).forEach(i => targets.push({
    label: i.label || i.url, hash: '#/ads/links', where: 'Links & UTM', ico: 'ads',
  }));
  S.get('radio').stations?.forEach(st => targets.push({
    label: st.name, hash: '#/radio', where: `Radio · ${st.region}`, ico: 'radio',
  }));

  const root = h('div', { class: 'pal' });
  const list = h('div', { class: 'pal-list' });
  const input = h('input', { placeholder: 'Jump to…', autofocus: true });
  let cur = 0, shown = [];

  const draw = () => {
    const q = input.value.toLowerCase().trim();
    shown = (q ? targets.filter(t => (t.label + ' ' + t.where).toLowerCase().includes(q)) : targets).slice(0, 40);
    cur = 0;
    clear(list);
    shown.forEach((t, i) => list.append(h('div', {
      class: `pal-item ${i === 0 ? 'on' : ''}`,
      onClick: () => { go(t.hash); close(); },
    }, h('span', { html: icon(t.ico), style: { color: PCOLORS[t.ico] || 'inherit' } }),
       h('span', { text: t.label }), h('span', { class: 'where', text: t.where }))));
  };
  const close = () => { root.remove(); document.removeEventListener('keydown', key); };
  const key = (e) => {
    if (e.key === 'Escape') return close();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      cur = Math.max(0, Math.min(shown.length - 1, cur + (e.key === 'ArrowDown' ? 1 : -1)));
      $$('.pal-item', list).forEach((el, i) => el.classList.toggle('on', i === cur));
      $$('.pal-item', list)[cur]?.scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter' && shown[cur]) { go(shown[cur].hash); close(); }
  };
  input.addEventListener('input', draw);
  document.addEventListener('keydown', key);
  root.onclick = (e) => { if (e.target === root) close(); };
  root.append(h('div', { class: 'pal-box' }, input, list));
  document.body.append(root);
  draw();
  input.focus();
}

/* ---------------------------------------------------------- */
/*  boot                                                       */
/* ---------------------------------------------------------- */

const bootMsg = (t) => { const e = $('#boot-msg'); if (e) e.textContent = t; };

async function start() {
  bootMsg(B.HAS_FIREBASE ? 'connecting…' : 'starting in local mode…');

  try { await B.initBackend(); }
  catch (e) {
    console.error(e);
    bootMsg('Could not load Firebase. Check your keys in js/firebase-config.js');
    return;
  }

  B.onAuth(async (u, err) => {
    if (!u) {
      $('#boot').hidden = true;
      $('#gate').hidden = false;
      if (err) { const e = $('#gate-err'); e.hidden = false; e.textContent = err; }
      return;
    }
    $('#gate').hidden = true;
    bootMsg('loading your data…');

    await S.loadAll(ALL_SLICES);
    seedDefaults();

    /* anything shared into Sid from another app while it was closed */
    try {
      const n = await drainShares();
      if (n && !location.hash.startsWith('#/inbox')) location.hash = '#/inbox';
    } catch (e) { console.warn('share drain failed', e); }

    const set = S.get('settings');

    /* Which mode is this project in? Older saves have no `mode`,
       so infer it once from whether a release date was ever set. */
    if (!set.mode) { set.mode = set.releaseDate ? 'execution' : 'planning'; S.touch('settings'); }
    if (set.mode === 'execution' && !set.draftRelease && set.releaseDate) {
      set.draftRelease = set.releaseDate; S.touch('settings');
    }
    if (!set.themeMode) { set.themeMode = set.theme === 'light' ? 'light' : 'dark'; S.touch('settings'); }

    applyTheme();

    $('#user-name').textContent = u.displayName || u.email || 'Local';
    if (u.photoURL) $('#user-pic').src = u.photoURL; else $('#user-pic').remove();

    buildNav();
    route();

    $('#boot').hidden = true;
    $('#app').hidden = false;

    // a snapshot every time you open the app
    S.snapshotNow('session-open').catch(() => {});

    /* Refresh the notification plan. The sender only ever forwards
       what was planned here, so opening the app is what keeps the
       notifications alive — said plainly in Settings. */
    try { PUSH.rebuild(); } catch (e) { console.warn('push plan', e); }
  });
}

/* ---------- wiring ---------- */

S.onStatus((s) => {
  const el = $('#sync');
  if (!el) return;
  el.dataset.state = s;
  $('#sync-text').textContent =
    s === 'saving' ? 'saving…' : s === 'offline' ? 'offline — queued' : s === 'error' ? 'retrying' : 'saved';
});

window.addEventListener('hashchange', route);

$('#btn-google').addEventListener('click', async () => {
  const e = $('#gate-err'); e.hidden = true;
  try { await B.signIn(); }
  catch (err) { e.hidden = false; e.textContent = err.message || String(err); }
});

$('#btn-theme').addEventListener('click', () => {
  const next = cycleTheme();
  toast(next === 'system' ? 'Theme: matching your device' : `Theme: ${next}`);
});

$('#nav-open').addEventListener('click', openNav);
$('#nav-close').addEventListener('click', closeNav);
$('#nav-backdrop').addEventListener('click', closeNav);
$('#nav-user').addEventListener('click', () => go('#/settings'));
$('#btn-search').addEventListener('click', palette);

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette(); }

  /* the rest only when you are not typing into something */
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
  if (document.activeElement?.isContentEditable) return;

  if (e.key === 'Escape') closeNav();
  if (e.key === '?' || (e.key === '/' && e.shiftKey)) { e.preventDefault(); shortcutSheet(); }
});

function shortcutSheet() {
  const row = (keys, what) => h('div', { class: 'item' },
    h('div', { class: 'item-head' },
      h('span', { class: 'kbd', text: keys }),
      h('span', { class: 'item-title', text: what })));

  modal({
    title: 'Shortcuts',
    body: h('div', { class: 'list' },
      row('⌘K / Ctrl K', 'Jump to anything — pages, posts, contacts, campaigns'),
      row('⌘⇧N / Ctrl ⇧N', 'Quick capture: a line, a photo, a voice note'),
      row('?', 'This list'),
      row('Esc', 'Close a dialog, or the menu'),
      row('Space', 'Play or pause the reader, when something is loaded'),
      row('Paste', 'Anywhere outside a text box — Sid works out what it is'),
      row('Swipe', 'On a phone: sideways to change sub-tab, or across a queue row to post or snooze it')),
    actions: [{ label: 'Done', cls: 'btn-primary' }],
  });
}

applyTheme();
watchSystemTheme();
initMobile(S.pendingCount);
setSwipeSections(BOTTOM);          // a flick past the last subtab moves section
initCapture();
initPaste();
start();

/* ---------------------------------------------------------- */
/*  audiobook player                                           */
/* ---------------------------------------------------------- */

const playerEl = $('#player');

R.onUpdate((snap, meta) => {
  if (!snap.article) {
    playerEl.hidden = true;
    document.body.classList.remove('has-player');
    return;
  }
  playerEl.hidden = false;
  document.body.classList.add('has-player');

  $('#pl-title').textContent = snap.article.title;
  $('#pl-line').textContent = snap.text.slice(0, 120);
  $('#pl-fill').style.width = snap.pct + '%';
  $('.pl-ico-play').hidden = snap.playing;
  $('.pl-ico-pause').hidden = !snap.playing;

  // remember where you got to, and mark it read when it finishes
  const hist = S.get('history');
  hist.pos[snap.article.id] = snap.index;
  if (meta && meta.ended) hist.read[snap.article.id] = true;
  S.touch('history');
});

$('#pl-play').addEventListener('click', () => R.toggle());
$('#pl-prev').addEventListener('click', () => R.prev());
$('#pl-next').addEventListener('click', () => R.next());
$('#pl-close').addEventListener('click', () => R.stop());
$('#pl-cfg').addEventListener('click', playerSettings);

function playerSettings() {
  const hist = S.get('history');
  const snap = R.snapshot();

  const rateRow = h('div', { class: 'row' },
    [0.8, 1, 1.15, 1.3, 1.5, 1.75, 2].map(r => h('button', {
      class: `chip ${Math.abs(snap.rate - r) < 0.01 ? 'on' : ''}`,
      onClick: (e) => {
        R.setRate(r); hist.rate = r; S.touch('history');
        [...e.target.parentNode.children].forEach(c => c.classList.remove('on'));
        e.target.classList.add('on');
      },
    }, r + '\u00d7')));

  const vs = R.voices();
  const voiceSel = h('select', { class: 'inp',
    onChange: (e) => { R.setVoice(e.target.value); hist.voiceURI = e.target.value; S.touch('history'); } },
    h('option', { value: '' }, 'Device default'),
    vs.map(v => h('option', { value: v.voiceURI, selected: v.voiceURI === snap.voiceURI },
      `${v.name} (${v.lang})`)));

  modal({
    title: 'Read aloud',
    body: h('div',
      h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Speed' }), rateRow),
      h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Voice' }), voiceSel),
      h('div', { class: 'hr' }),
      h('p', { class: 'small muted' },
        'This uses the voice built into your device, so it costs nothing and works offline once the voice is downloaded.'),
      h('p', { class: 'small', style: { color: 'var(--warn)' } },
        R.isIOS()
          ? 'On iPhone and iPad, reading stops when you lock the screen or switch apps. That is an iOS restriction on web speech, not something the app can work around — keep Sid open and the screen on, or use the phone\'s own Speak Screen accessibility feature for background listening.'
          : 'On Android with the screen off this usually keeps playing, and the lock screen shows play and skip controls. If your phone aggressively suspends background tabs it may still stop.'),
      h('p', { class: 'small muted' },
        'Proper background playback would need pre-generated audio files from a text-to-speech service — a paid add-on rather than something free and offline.')),
    actions: [{ label: 'Done', cls: 'btn-primary' }],
  });
}

/* restore saved speed and voice once voices are available */
R.onVoices(() => {
  const hist = S.get('history');
  if (hist.rate) R.setRate(hist.rate);
  if (hist.voiceURI) R.setVoice(hist.voiceURI);
});

/* space bar toggles playback when nothing is focused */
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
  if (!R.snapshot().article) return;
  e.preventDefault();
  R.toggle();
});

/* expose for modules that need to re-render after a structural change */
window.__sid = { go, rerender, calendarExportModal };
