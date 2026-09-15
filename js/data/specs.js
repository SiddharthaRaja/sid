/* ============================================================
   specs.js — every asset the release needs, with the numbers
   the platform actually enforces

   Checked against platform documentation in September 2026.
   `w`/`h` are the required or recommended pixel size; `min`
   means anything at or above that passes. Where a platform
   publishes no number, the field is left out rather than
   invented — the checker then says "no published requirement"
   instead of failing a file for no reason.
   ============================================================ */

export const SPEC_GROUPS = [
  ['spotify',  'Spotify'],
  ['social',   'Social profiles'],
  ['video',    'Video & motion'],
  ['release',  'The release itself'],
];

export const SPECS = [
  /* ---------------- Spotify ---------------- */
  {
    id: 'sp-avatar', group: 'spotify', label: 'Spotify artist avatar',
    w: 750, h: 750, min: true, formats: ['jpeg', 'jpg', 'png', 'gif'], maxMB: 20,
    note: 'Square. Shown as a circle in most places, so keep the face out of the corners.',
    where: 'Spotify for Artists → Profile',
  },
  {
    id: 'sp-header', group: 'spotify', label: 'Spotify artist header',
    w: 2660, h: 1140, min: true, formats: ['jpeg', 'jpg', 'png', 'gif'], maxMB: 20,
    note: 'Only the middle strip survives on a phone — the outer thirds get cropped. Nothing important there.',
    safe: { x: 0.28, y: 0.08 },
    where: 'Spotify for Artists → Profile',
  },
  {
    id: 'sp-gallery', group: 'spotify', label: 'Spotify artist gallery image',
    w: 690, h: 500, formats: ['jpeg', 'jpg', 'png', 'gif'], maxMB: 20, count: 10,
    note: 'Up to ten. Spotify does not publish this size prominently — confirm it against the upload dialog when you are in there.',
    unverified: true,
    where: 'Spotify for Artists → Profile → Images',
  },
  {
    id: 'sp-canvas', group: 'spotify', label: 'Spotify Canvas',
    kind: 'video', durMin: 3, durMax: 8, ratio: 9 / 16, hMin: 720, hMax: 1080,
    formats: ['mp4', 'jpeg', 'jpg'], silent: true,
    note: 'Vertical, 3–8 seconds, silent — any audio track is rejected. It loops forever, so a hard cut at the end shows on every repeat. Mobile app only.',
    where: 'Spotify for Artists → Music → the track → Canvas',
  },
  {
    id: 'sp-video', group: 'spotify', label: 'Spotify video upload',
    kind: 'video', durMin: 30, durMax: 1200, w: 1920, h: 1080, min: true,
    formats: ['mp4', 'mov'], maxMB: 50000,
    note: 'Landscape 16:9, longer than 30 seconds and under 20 minutes. Official videos, live sessions, studio sessions and covers qualify; visualisers and lyric videos do not. The uploader is still in beta — if it is not in your account, join the waitlist or go through the distributor.',
    where: 'Spotify for Artists → Video & Visuals (desktop)',
  },

  /* ---------------- social profiles ---------------- */
  {
    id: 'ig-avatar', group: 'social', label: 'Instagram profile photo',
    w: 1000, h: 1000, min: true, formats: ['jpeg', 'jpg', 'png'],
    note: 'Square, displayed as a circle.',
  },
  {
    id: 'ig-post', group: 'social', label: 'Instagram feed post',
    w: 1080, h: 1350, formats: ['jpeg', 'jpg', 'png'],
    note: '4:5 portrait takes the most vertical space in the feed. 1080×1080 square also works.',
  },
  {
    id: 'ig-story', group: 'social', label: 'Instagram story / reel cover',
    w: 1080, h: 1920, formats: ['jpeg', 'jpg', 'png'],
    note: '9:16. Keep text out of the top and bottom 250px — the UI sits there.',
    safe: { x: 0.06, y: 0.14 },
  },
  {
    id: 'yt-thumb', group: 'social', label: 'YouTube thumbnail',
    w: 1280, h: 720, formats: ['jpeg', 'jpg', 'png'], maxMB: 2,
    note: 'Worth more than everything else on the video page combined. Legible at phone size or it does not exist.',
  },
  {
    id: 'yt-banner', group: 'social', label: 'YouTube channel banner',
    w: 2560, h: 1440, min: true, formats: ['jpeg', 'jpg', 'png'], maxMB: 6,
    note: 'Only the central 1546×423 shows on every device. Everything else is decoration.',
    safe: { x: 0.30, y: 0.35 },
  },
  {
    id: 'yt-icon', group: 'social', label: 'YouTube channel icon',
    w: 800, h: 800, formats: ['jpeg', 'jpg', 'png'], maxMB: 4,
  },

  /* ---------------- video & motion ---------------- */
  {
    id: 'reel', group: 'video', label: 'Reel / Short / TikTok',
    kind: 'video', ratio: 9 / 16, hMin: 1280, durMax: 180, formats: ['mp4', 'mov'],
    note: 'Burn the hook into the first frame as text. No watermark from another app — a TikTok watermark is demoted on both Reels and Shorts.',
  },
  {
    id: 'lyric', group: 'video', label: 'Lyric video',
    kind: 'video', w: 1920, h: 1080, min: true, formats: ['mp4', 'mov'],
    note: 'For YouTube. Not eligible for a Spotify video upload.',
  },

  /* ---------------- the release ---------------- */
  {
    id: 'cover', group: 'release', label: 'Cover art',
    w: 3000, h: 3000, formats: ['jpeg', 'jpg', 'png', 'tiff'],
    note: 'Square, minimum 640×640, 3000×3000 recommended. No URLs, no social handles, no "out now" text — distributors reject those.',
  },
  {
    id: 'press', group: 'release', label: 'Press photo',
    w: 2000, h: 1333, min: true, formats: ['jpeg', 'jpg'],
    note: 'Horizontal and vertical versions. Publications crop; give them room.',
  },
];

export const specById = (id) => SPECS.find(s => s.id === id);

/** The set a single master still can be cropped into. */
export const DERIVABLE = ['sp-avatar', 'sp-header', 'sp-gallery', 'ig-avatar', 'ig-post', 'ig-story', 'yt-thumb', 'yt-icon'];

/* ---------------- style variants ---------------- */

export const STYLES = [
  { key: 'none',      label: 'Original' },
  { key: 'negative',  label: 'Negative' },
  { key: 'mono',      label: 'Black & white' },
  { key: 'duotone',   label: 'Duotone' },
  { key: 'posterize', label: 'Posterise' },
  { key: 'threshold', label: 'Threshold' },
  { key: 'halftone',  label: 'Halftone' },
  { key: 'grain',     label: 'Grain' },
  { key: 'bloom',     label: 'Bloom' },
  { key: 'chroma',    label: 'Chromatic split' },
];

export const MOTIONS = [
  { key: 'zoom',   label: 'Slow zoom',    note: 'Pushes in ~6%. The safest loop — nothing to cut on.' },
  { key: 'pan',    label: 'Drift',        note: 'Slides sideways and back, so the loop point is seamless.' },
  { key: 'grain',  label: 'Living grain', note: 'Still frame, moving film grain. Reads as texture, not motion.' },
  { key: 'pulse',  label: 'Breath',       note: 'Barely-there brightness pulse, timed to a slow tempo.' },
  { key: 'flicker',label: 'Projector',    note: 'Irregular exposure flicker plus grain. Heavier — use once.' },
];
