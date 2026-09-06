/* ============================================================
   ics.js — calendar export

   Sid cannot send you a push notification. That needs a server
   holding a subscription and waking up on a schedule, which this
   app deliberately does not have. What it can do is hand the job
   to something that already does it well: your phone's calendar.

   This writes a standards-compliant .ics file of every dated
   thing in the app. Import it once into Google Calendar, Apple
   Calendar or Outlook and the reminders fire on the lock screen,
   offline, forever, for free.

   The trade-off, stated honestly: this is a one-way export, not a
   live subscription. A live feed would need a public URL that
   regenerates itself — again, a server. So when dates move, you
   re-export. To keep that painless, every event carries a stable
   UID derived from what it is, and the whole file is stamped with
   a bumped SEQUENCE, so re-importing updates the existing entries
   in place rather than creating duplicates. That works reliably
   in Apple Calendar and Outlook; Google Calendar's importer is
   less consistent about it, so the export offers a dedicated
   Sid calendar you can clear and re-import in one action.
   ============================================================ */

import * as S from './store.js';
import { collectEvents, calName } from './agenda.js';
import { download, fromISO, toISO, addDays } from './ui.js';

/* ---------------------------------------------------------- */
/*  the RFC 5545 bits people get wrong                         */
/* ---------------------------------------------------------- */

/* Backslash, semicolon and comma are structural in ics values.
   A comma in an event title silently splits it into two values
   in some parsers if you do not escape it. */
const esc = (s) => String(s ?? '')
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n');

/* Lines must be folded at 75 octets, and the continuation must
   start with a single space. Counting characters instead of bytes
   breaks the moment a title contains an accent or an emoji, so
   fold on the encoded byte length. */
function fold(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 74) return line;
  const out = [];
  let cur = '', curBytes = 0;
  for (const ch of line) {              // iterate by code point, not code unit
    const n = enc.encode(ch).length;
    if (curBytes + n > 74) { out.push(cur); cur = ' '; curBytes = 1; }
    cur += ch; curBytes += n;
  }
  if (cur.trim()) out.push(cur);
  return out.join('\r\n');
}

const stampUTC = (d = new Date()) =>
  d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const dateVal = (iso) => String(iso).replace(/-/g, '');

/* A stable id for an event so re-importing updates rather than
   duplicates. Derived from kind + calendar + title, deliberately
   NOT from the date — the whole point is that a moved deadline
   updates the same entry. */
function stableUid(e, i) {
  const seed = `${e.kind}|${e.cal}|${e.title}`;
  let hASH = 5381;
  for (let k = 0; k < seed.length; k++) hASH = ((hASH << 5) + hASH + seed.charCodeAt(k)) >>> 0;
  return `sid-${hASH.toString(36)}-${i.toString(36)}@sid.local`;
}

/* ---------------------------------------------------------- */
/*  building the file                                          */
/* ---------------------------------------------------------- */

/**
 * @param {object} opts
 *   cals      – array of calendar keys to include, or null for all
 *   kinds     – array of event kinds to include, or null for all
 *   done      – include things already ticked off
 *   alarmDays – array like [1, 0]: remind 1 day before, and on the day
 *   alarmHour – local hour the reminder fires (default 9)
 *   past      – include events before today
 */
export function buildICS(opts = {}) {
  const {
    cals = null, kinds = null, done = false,
    alarmDays = [1, 0], alarmHour = 9, past = false,
  } = opts;

  const set = S.get('settings');
  const today = toISO(new Date());
  const now = stampUTC();
  const seq = Math.floor(Date.now() / 60000) % 100000;   // bumps on every export

  let events = collectEvents();
  if (cals)  events = events.filter(e => cals.includes(e.cal));
  if (kinds) events = events.filter(e => kinds.includes(e.kind));
  if (!done) events = events.filter(e => !e.done);
  if (!past) events = events.filter(e => e.iso >= today);

  const L = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sid//Release manager//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(calendarName(set))}`,
    `X-WR-CALDESC:${esc('Exported from Sid on ' + new Date().toLocaleString())}`,
    'X-PUBLISHED-TTL:PT12H',
  ];

  events.forEach((e, i) => {
    L.push('BEGIN:VEVENT');
    L.push(`UID:${stableUid(e, i)}`);
    L.push(`DTSTAMP:${now}`);
    L.push(`SEQUENCE:${seq}`);
    L.push(`DTSTART;VALUE=DATE:${dateVal(e.iso)}`);
    L.push(`DTEND;VALUE=DATE:${dateVal(addDays(e.iso, 1))}`);
    L.push(`SUMMARY:${esc(prefix(e) + e.title)}`);

    const desc = [
      e.note ? e.note : '',
      `Calendar: ${calName(e.cal)}`,
      set.releaseDate ? `Release day: ${set.releaseDate}` : '',
      'From Sid — open the app for the full item.',
    ].filter(Boolean).join('\n');
    L.push(`DESCRIPTION:${esc(desc)}`);
    L.push(`CATEGORIES:${esc(calName(e.cal))}`);
    L.push(`TRANSP:TRANSPARENT`);
    if (e.done) L.push('STATUS:COMPLETED');

    /* An all-day event starts at local midnight, so a trigger of
       -PT15H is 09:00 the previous day and PT9H is 09:00 on the
       day itself. Expressing it this way keeps the alarm correct
       across time zones without pinning a VTIMEZONE. */
    alarmDays.forEach(d => {
      const hours = d * 24 - alarmHour;
      const trig = hours > 0 ? `-PT${hours}H` : `PT${-hours}H`;
      L.push('BEGIN:VALARM');
      L.push('ACTION:DISPLAY');
      L.push(`TRIGGER:${trig}`);
      L.push(`DESCRIPTION:${esc(e.title)}`);
      L.push('END:VALARM');
    });

    L.push('END:VEVENT');
  });

  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n') + '\r\n';
}

const prefix = (e) => ({
  release: '● ',        // the one that matters
  deadline: 'Due: ',
  followup: '',
  shoot: '',
  milestone: '',
  content: '',
  event: '',
}[e.kind] ?? '');

function calendarName(set) {
  const who = set.artist || 'Sid';
  const what = set.song ? ` — ${set.song}` : '';
  return `${who}${what} release`;
}

/** Convenience: build and hand the file to the browser. */
export function exportICS(opts = {}) {
  const set = S.get('settings');
  const name = `sid-${(set.song || 'release').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.ics`;
  const text = buildICS(opts);
  download(name, text, 'text/calendar');
  return text;
}

/** How many events an export with these options would contain. */
export function countICS(opts = {}) {
  return (buildICS(opts).match(/BEGIN:VEVENT/g) || []).length;
}
