/* ============================================================
   health.js — find the things that will embarrass you later

   Everything here is a real defect with a real consequence, found
   by looking at your actual data. Nothing is a style opinion and
   nothing is a score. Each row says what is wrong, why it matters,
   and takes you to the place to fix it.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, btn, card, cardHead, fmtDate, todayISO, daysBetween, resolveDate, relativeDay,
} from '../ui.js';
import { PLATFORMS } from '../data/platforms.js';
import { missingPlaceholders } from '../data/templates.js';
import { SPECS } from '../data/specs.js';
import { lint } from '../lint.js';

const BAD = 'bad', WARN = 'warn';

export function checkAll() {
  const out = [];
  const add = (level, what, why, hash) => out.push({ level, what, why, hash });

  const set = S.get('settings');
  const today = todayISO();
  const execution = set.mode !== 'planning';

  /* ---- the release itself ---- */
  if (!set.artist) add(BAD, 'No artist name set', 'Every template, caption and export writes [ARTIST] verbatim without it.', '#/release');
  if (!set.song) add(BAD, 'No song title set', 'Same — [SONG] ships literally into posts.', '#/release');
  if (!set.link) add(WARN, 'No smart link', 'Half the copy bank points at a link that does not exist yet.', '#/release');
  if (execution && !set.releaseDate) add(BAD, 'Execution mode with no release date', 'Nothing relative resolves, so the calendar and queue are empty.', '#/release');
  if (set.releaseDate) {
    const d = new Date(set.releaseDate + 'T00:00:00').getDay();
    if (d !== 5) add(WARN, 'Release date is not a Friday', 'DSP release weeks start on Friday; another day forfeits a week of playlist consideration.', '#/release');
  }
  if (!set.isrc && execution) add(WARN, 'No ISRC recorded', 'You need it for radio, sync and every rights registration.', '#/meta');

  /* ---- content ---- */
  let placeholders = 0, overLimit = 0, undated = 0, noBody = 0;
  PLATFORMS.forEach(p => {
    const sl = S.get(`p_${p.key}`);
    Object.entries(sl.content || {}).forEach(([tk, items]) => {
      const type = p.types.find(t => t.key === tk) || { label: tk, limit: 0 };
      (items || []).forEach(it => {
        if (it.status === 'posted' || it.status === 'parked') return;
        if (missingPlaceholders(it.body || '').length) placeholders++;
        if (type.limit && (it.body || '').length > type.limit) overLimit++;
        if (!it.when) undated++;
        if (!(it.body || '').trim() && it.status === 'ready') noBody++;
      });
    });
  });
  if (placeholders) add(BAD, `${placeholders} post${placeholders === 1 ? '' : 's'} with unfilled [placeholders]`,
    'These post verbatim. The single most visible mistake in this app.', '#/queue');
  if (overLimit) add(BAD, `${overLimit} post${overLimit === 1 ? '' : 's'} over the character limit`,
    'They will be cut off mid-word when you paste them in.', '#/queue');
  if (noBody) add(WARN, `${noBody} marked ready with no text`, 'Ready means ready to paste.', '#/queue');
  if (undated > 6) add(WARN, `${undated} posts with no date`,
    'They are invisible to the calendar and the queue until they have one.', '#/queue');

  /* ---- overdue, but only the recoverable kind ---- */
  if (execution && set.releaseDate) {
    const plan = S.get('plan');
    const late = [...(plan.milestones || []), ...(plan.custom || [])].filter(m => {
      const iso = resolveDate(m.when, set.releaseDate);
      return iso && iso < today && !m.done;
    }).length;
    if (late) add(WARN, `${late} milestone${late === 1 ? '' : 's'} overdue`,
      'Some of these gate others — the plan is ordered for a reason.', '#/plan');

    const n = daysBetween(today, set.releaseDate);
    if (n > 0 && n <= 21 && !S.get('pitch').submittedAt) {
      add(BAD, `Spotify pitch not submitted — ${n} days left`,
        'The one deadline in this whole plan that cannot be recovered from.', '#/p/spotify/epitch');
    }
  }

  /* ---- assets ---- */
  const have = S.get('studio').have || {};
  const missingCore = SPECS.filter(sp => ['cover', 'sp-avatar', 'sp-header'].includes(sp.id) && !have[sp.id]);
  if (missingCore.length) add(WARN, `${missingCore.length} core asset${missingCore.length === 1 ? '' : 's'} unchecked`,
    `${missingCore.map(x => x.label).join(', ')} — no file has passed its spec check yet.`, '#/studio');

  /* ---- outreach ---- */
  const contacts = S.get('contacts').items || [];
  const stale = contacts.filter(c => c.followUp && c.followUp < today && !['placed', 'declined'].includes(c.status)).length;
  if (stale) add(WARN, `${stale} follow-up${stale === 1 ? '' : 's'} past due`,
    'A follow-up that never happens is the same as never having written.', '#/contacts');

  /* ---- playlists ---- */
  const pls = (S.get('playlists').items || []).filter(x => x.status === 'added');
  const unchecked = pls.filter(x => {
    const last = (x.checks || []).map(c => c.date).sort().at(-1);
    return !last || daysBetween(last, today) > 14;
  }).length;
  if (unchecked) add(WARN, `${unchecked} live playlist${unchecked === 1 ? '' : 's'} not checked in a fortnight`,
    'You want to know the week a placement disappears, not a month later.', '#/playlists/checkin');

  /* ---- media that will not load ---- */
  let unshared = 0;
  PLATFORMS.forEach(p => {
    const sl = S.get(`p_${p.key}`);
    Object.values(sl.content || {}).forEach(items => (items || []).forEach(it => {
      (it.media || []).forEach(m => { if (m.store === 'drive' && m.shared === false) unshared++; });
    }));
  });
  if (unshared) add(WARN, `${unshared} uploaded file${unshared === 1 ? '' : 's'} not shared`,
    'They uploaded but the link is private, so they will not preview in the app.', '#/settings');

  /* ---- notifications running dry ---- */
  const P = S.get('push');
  if (P.sub) {
    const last = (P.schedule || []).at(-1);
    if (!last || daysBetween(today, last.date) < 7) {
      add(WARN, 'The notification plan is nearly empty',
        'It refreshes when you open the app — press Rebuild in Settings if this keeps happening.', '#/settings/alerts');
    }
  }

  /* ---- backup ---- */
  const rev = S.get('review').reviews || [];
  if (execution && !rev.length && set.releaseDate && daysBetween(set.releaseDate, today) > 7) {
    add(WARN, 'No weekly review written yet',
      'A week of data with no note about what caused it is a week you cannot learn from.', '#/review');
  }

  return out;
}

/** The card, for Settings. */
export function healthCard(onDone) {
  const box = h('div');
  const body = h('div');

  const run = () => {
    clear(body);
    const rows = checkAll();
    const bad = rows.filter(r => r.level === BAD).length;

    body.append(h('div', { class: 'row', style: { marginBottom: '10px' } },
      h('span', { class: `tag ${bad ? 'bad' : rows.length ? 'warn' : 'ok'}`,
        text: bad ? `${bad} will bite you` : rows.length ? `${rows.length} to look at` : 'nothing found' })));

    if (!rows.length) {
      body.append(h('div', { class: 'small', style: { color: 'var(--ok)' },
        text: 'Nothing wrong that this can see. Placeholders filled, nothing over a limit, no deadline in danger.' }));
      return;
    }

    body.append(h('div', { class: 'list' }, rows.map(r => h('a', {
      class: 'item', href: r.hash,
      style: { display: 'block', textDecoration: 'none', color: 'inherit',
        borderLeft: `3px solid ${r.level === BAD ? 'var(--bad)' : 'var(--warn)'}` },
    },
      h('div', { class: 'item-head' }, h('span', { class: 'item-title', text: r.what })),
      h('div', { class: 'small muted', style: { marginTop: '3px' }, text: r.why })))));
  };

  box.append(card(
    cardHead('Check for problems', btn('Run it again', run, { cls: 'btn-sm' })),
    h('p', { class: 'small muted' },
      'Looks at your actual data for the things that are embarrassing in public or impossible to undo — unfilled placeholders, captions over the limit, the pitch deadline, assets that were never checked, placements you have stopped watching.'),
    body));
  run();
  return box;
}
