/* ============================================================
   icons.js — glyph set
   Abstract marks (not trademarked logos). Each platform gets a
   distinct silhouette + its own accent colour so tabs are
   instantly identifiable. Swap in official assets by replacing
   the path data for any key below.
   ============================================================ */

const S = (inner, opts = {}) =>
  `<svg class="plogo" viewBox="0 0 24 24" fill="${opts.fill || 'none'}" stroke="${opts.stroke === false ? 'none' : 'currentColor'}" stroke-width="${opts.sw || 1.7}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const ICONS = {
  /* ---- app sections ---- */
  dashboard: S('<rect x="3" y="3" width="7.5" height="8.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="5" rx="1.6"/><rect x="3" y="14.5" width="7.5" height="6.5" rx="1.6"/><rect x="13.5" y="11" width="7.5" height="10" rx="1.6"/>'),
  calendar: S('<rect x="3" y="5" width="18" height="16" rx="2.4"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="8.5" cy="14.5" r="1.05" fill="currentColor" stroke="none"/><circle cx="12" cy="14.5" r="1.05" fill="currentColor" stroke="none"/>'),
  masterplan: S('<path d="M5 3h9l5 5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path d="M8.2 13.4l1.7 1.7 3.4-3.6M8.2 17.6h7"/>'),
  radio: S('<circle cx="12" cy="13" r="3.2"/><path d="M6.6 7.6a7.6 7.6 0 0 0 0 10.8M17.4 7.6a7.6 7.6 0 0 1 0 10.8M3.6 4.6a11.8 11.8 0 0 0 0 16.8M20.4 4.6a11.8 11.8 0 0 1 0 16.8"/>'),
  rights: S('<path d="M12 3l7.5 3.2v5.4c0 4.6-3.1 8.3-7.5 9.8-4.4-1.5-7.5-5.2-7.5-9.8V6.2z"/><path d="M14.6 10.2a3.1 3.1 0 1 0 0 4"/>'),
  finance: S('<rect x="2.6" y="6" width="18.8" height="13" rx="2.2"/><path d="M2.6 10.4h18.8"/><path d="M6.4 15h3.2"/><circle cx="17.4" cy="15" r="1.5" fill="currentColor" stroke="none"/>'),
  video: S('<rect x="2.5" y="6" width="13" height="12" rx="2.2"/><path d="M15.5 11l5.4-3.1a.6.6 0 0 1 .9.5v7.2a.6.6 0 0 1-.9.5L15.5 13z"/>'),
  stats: S('<path d="M4 20V10M9.3 20V4M14.7 20v-7M20 20V7"/>'),
  notes: S('<path d="M5.5 3h13a1 1 0 0 1 1 1v16.2a.6.6 0 0 1-.94.5L12 16.6l-6.56 4.1a.6.6 0 0 1-.94-.5V4a1 1 0 0 1 1-1z"/>'),
  info: S('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.4"/><circle cx="12" cy="7.9" r="1.05" fill="currentColor" stroke="none"/>'),
  settings: S('<circle cx="12" cy="12" r="3.1"/><path d="M12 2.6v2.7M12 18.7v2.7M21.4 12h-2.7M5.3 12H2.6M18.6 5.4l-1.9 1.9M7.3 16.7l-1.9 1.9M18.6 18.6l-1.9-1.9M7.3 7.3L5.4 5.4"/>'),
  search: S('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  trash: S('<path d="M4 7h16M9.5 7V4.8a.8.8 0 0 1 .8-.8h3.4a.8.8 0 0 1 .8.8V7M6.4 7l.9 12.4a1.2 1.2 0 0 0 1.2 1.1h7a1.2 1.2 0 0 0 1.2-1.1L17.6 7"/>'),
  link: S('<path d="M10.3 13.7a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.4 1.4"/><path d="M13.7 10.3a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.4-1.4"/>'),
  clock: S('<circle cx="12" cy="12" r="9"/><path d="M12 7.2V12l3.2 2"/>'),
  bell: S('<path d="M18 15.4V10a6 6 0 1 0-12 0v5.4L4.4 18h15.2z"/><path d="M9.8 21a2.4 2.4 0 0 0 4.4 0"/>'),
  upload: S('<path d="M12 16V4.6M7.6 9L12 4.6 16.4 9"/><path d="M4 15v3.6A1.4 1.4 0 0 0 5.4 20h13.2a1.4 1.4 0 0 0 1.4-1.4V15"/>'),
  back: S('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  check: S('<path d="M5 12.6l4.6 4.6L19 6.8"/>'),
  copy: S('<rect x="8.6" y="8.6" width="12" height="12" rx="2"/><path d="M15.4 5.4H5.4a1.8 1.8 0 0 0-1.8 1.8v10"/>'),
  queue: S('<rect x="3.2" y="4" width="17.6" height="4.4" rx="1.6"/><rect x="3.2" y="10.6" width="17.6" height="4.4" rx="1.6"/><rect x="3.2" y="17.2" width="17.6" height="3.2" rx="1.4" opacity=".45"/><path d="M6.6 6.2h.01M6.6 12.8h.01"/>'),
  ads: S('<path d="M4 9.4h3.2l6.4-4.2v13.6L7.2 14.6H4a1 1 0 0 1-1-1v-3.2a1 1 0 0 1 1-1z"/><path d="M17.4 8.6a4.6 4.6 0 0 1 0 6.8"/><path d="M7.2 14.6v4a1 1 0 0 0 1 1h1.4"/>'),
  epk: S('<rect x="3" y="6.6" width="18" height="13.4" rx="2.2"/><path d="M8.6 6.6V5a1.4 1.4 0 0 1 1.4-1.4h4A1.4 1.4 0 0 1 15.4 5v1.6"/><path d="M7 11h6M7 14.4h4"/><circle cx="16.6" cy="12.4" r="2"/>'),
  assets: S('<rect x="2.8" y="6.2" width="8.2" height="6" rx="1.4"/><rect x="13" y="6.2" width="8.2" height="6" rx="1.4"/><rect x="2.8" y="14.4" width="8.2" height="6" rx="1.4"/><path d="M14.6 17.4h5.2M17.2 14.8v5.2"/>'),
  review: S('<rect x="4.4" y="4.4" width="15.2" height="15.2" rx="2.4"/><path d="M7.8 9.4h5.4M7.8 12.6h8.4M7.8 15.8h4.2"/><path d="M15.4 8.2l1.6 1.6 2.8-3"/>'),
  history: S('<path d="M4 6.4a2 2 0 0 1 2-2h4.4a2 2 0 0 1 2 2v13.2a1.6 1.6 0 0 0-1.6-1.6H4z"/><path d="M20 6.4a2 2 0 0 0-2-2h-4.4a2 2 0 0 0-2 2v13.2a1.6 1.6 0 0 1 1.6-1.6H20z"/><path d="M6.6 9h2.6M14.8 9h2.6M6.6 12.4h2.6M14.8 12.4h2.6"/>'),
  more: S('<circle cx="5.4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="18.6" cy="12" r="1.5" fill="currentColor" stroke="none"/>'),
  contacts: S('<path d="M4 5.4A1.4 1.4 0 0 1 5.4 4h11.2A1.4 1.4 0 0 1 18 5.4v13.2a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 18.6z"/><path d="M18 8.4h2.4M18 12h2.4M18 15.6h2.4"/><circle cx="11" cy="10.2" r="2.2"/><path d="M7.6 16.4a3.6 3.6 0 0 1 6.8 0"/>'),

  /* ---- platforms: distinct silhouettes ---- */
  // photo/feed — aperture frame
  instagram: S('<rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5"/><circle cx="12" cy="12" r="4.1"/><circle cx="17.1" cy="6.9" r="1.15" fill="currentColor" stroke="none"/>'),
  // long video — screen + play
  youtube: S('<rect x="2.4" y="5.2" width="19.2" height="13.6" rx="4"/><path d="M10.2 9.4l5 2.6-5 2.6z" fill="currentColor" stroke="none"/>'),
  // shorts — vertical frame + bolt
  ytshorts: S('<rect x="7.4" y="2.8" width="9.2" height="18.4" rx="3.4"/><path d="M12.9 7.2l-2.6 4.6h2.5l-1.3 4.6 3.4-5.1h-2.4z" fill="currentColor" stroke="none"/>'),
  // tiktok — note + vertical frame
  tiktok: S('<rect x="6.6" y="2.8" width="10.8" height="18.4" rx="3.4"/><path d="M13.4 6.6v6.9a2.1 2.1 0 1 1-2.1-2.1"/><path d="M13.4 6.6c.3 1.5 1.4 2.4 2.9 2.5"/>'),
  // facebook — rounded square + f-stroke
  facebook: S('<rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5"/><path d="M14.6 8.1h-1.3a1.9 1.9 0 0 0-1.9 1.9v10.8M9.6 12.6h5"/>'),
  // spotify — arcs
  spotify: S('<circle cx="12" cy="12" r="9"/><path d="M7.4 9.6c3-.9 6.2-.6 8.9.9M8.1 13c2.4-.7 5-.4 7.2.8M8.9 16.2c1.9-.5 3.9-.3 5.7.6"/>'),
  // soundcloud — waveform bars
  soundcloud: S('<path d="M4 15.6v-3.2M7 17.2V10M10 18V7.2M13 17.6v-8.4M16 18.2v-6.4"/><path d="M18.8 18.4h1.1a2.6 2.6 0 0 0 0-5.2 4.2 4.2 0 0 0-.6-2"/>'),
  // threads — @-ish loop
  threads: S('<path d="M15.4 8.6c-1-1.3-2.3-1.9-3.9-1.7-2.7.3-4.4 2.5-4.4 5.4 0 3.2 2 5.3 4.9 5.3 2.6 0 4.3-1.5 4.3-3.2 0-1.5-1.1-2.6-3-2.6-1.6 0-2.6.8-2.6 1.8 0 .8.6 1.3 1.4 1.3 1.3 0 2-1.2 2-3.3 0-2-.6-3.4-1.8-4.2"/>'),
  // x — crossing strokes inside a badge, so it never reads as a close button
  x: S('<rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5"/><path d="M8.4 8.4l7.2 7.2M15.6 8.4l-7.2 7.2"/>'),
  // bluesky — butterfly-ish wings
  bluesky: S('<path d="M12 14.4C10 10.6 6.8 7.2 4.9 6.4 3.5 5.8 3 6.7 3 8.2c0 1.4.4 4.4.7 5.1.5 1.2 1.7 1.6 3 1.4-2 .3-2.6 1.5-1.6 2.8.9 1.2 2.7 1.9 4-.2.5-.9.9-1.7.9-1.7s.4.8.9 1.7c1.3 2.1 3.1 1.4 4 .2 1-1.3.4-2.5-1.6-2.8 1.3.2 2.5-.2 3-1.4.3-.7.7-3.7.7-5.1 0-1.5-.5-2.4-1.9-1.8-1.9.8-5.1 4.2-7.1 8z"/>'),
  // tencent — feather/penguin abstract
  tencent: S('<path d="M12 3.2c2.6 0 4.4 2.1 4.4 4.8 0 1 .9 2 1.6 3.2.8 1.4 1 3.4.2 4.4-.6.7-1.6.5-2.2-.2M12 3.2c-2.6 0-4.4 2.1-4.4 4.8 0 1-.9 2-1.6 3.2-.8 1.4-1 3.4-.2 4.4.6.7 1.6.5 2.2-.2"/><path d="M8 15.4c0 2.4 1.8 4.2 4 4.2s4-1.8 4-4.2"/>'),
  // tidal — overlapping diamonds
  tidal: S('<path d="M6.2 8.4L8.9 5.7l2.7 2.7-2.7 2.7zM12.4 8.4l2.7-2.7 2.7 2.7-2.7 2.7zM9.3 14.6l2.7-2.7 2.7 2.7-2.7 2.7z"/>'),
  // apple music — note in rounded square
  applemusic: S('<rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5"/><path d="M15.6 7.6l-6 1.5v6.6"/><circle cx="8.1" cy="16" r="1.7"/><circle cx="15.6" cy="14.3" r="1.7"/><path d="M15.6 7.6v6.7"/>'),
  // qobuz — hexagon
  qobuz: S('<path d="M12 3.2l7.4 4.3v8.6L12 20.4l-7.4-4.3V7.5z"/><circle cx="12" cy="11.8" r="2.9"/><path d="M13.6 13.6l2 2"/>'),
  // amazon music — arc smile in circle
  amazonmusic: S('<circle cx="12" cy="12" r="9"/><path d="M7.4 14.6c2.8 1.9 6.4 1.9 9.2 0"/><path d="M14.4 8.6l-3.6.9v4.1"/><circle cx="9.6" cy="14" r="1.4"/>'),
  // youtube music — circle + play
  ytmusic: S('<circle cx="12" cy="12" r="9"/><path d="M10.3 9.2l4.8 2.8-4.8 2.8z" fill="currentColor" stroke="none"/>'),
  // pandora — P block
  pandora: S('<path d="M6.4 20.4V5.2A1.4 1.4 0 0 1 7.8 3.8h4.7a5.1 5.1 0 0 1 0 10.2H9.4"/>'),
  // small platforms — stacked layers
  smallplatforms: S('<path d="M12 3.4l8.4 4.2-8.4 4.2-8.4-4.2z"/><path d="M3.6 12l8.4 4.2 8.4-4.2M3.6 16.3l8.4 4.2 8.4-4.2"/>'),
};

/* Per-platform accent colours — used for calendar overlays,
   chips, nav marks and chart series. */
export const PCOLORS = {
  instagram:'#e1436b', youtube:'#e0453a', ytshorts:'#f0664a', tiktok:'#3fc9d0',
  facebook:'#3d7ce0', spotify:'#3fb96b', soundcloud:'#f0762e', threads:'#9a7ee0',
  x:'#8d939c', bluesky:'#3fa0f0', tencent:'#2fb6a8', tidal:'#6d8fe0',
  applemusic:'#e05070', qobuz:'#4a86d8', amazonmusic:'#3fb2d8', ytmusic:'#e05a4a',
  pandora:'#5f7fe0', smallplatforms:'#c08a3e', radio:'#c0752e',
};

export const icon = (name, cls = '') => {
  const raw = ICONS[name] || ICONS.info;
  return cls ? raw.replace('class="plogo"', `class="plogo ${cls}"`) : raw;
};
