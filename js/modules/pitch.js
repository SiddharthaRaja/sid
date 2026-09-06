/* ============================================================
   pitch.js — the Spotify editorial pitch panel

   Lives as a sub-tab inside the Spotify platform page, plus a
   warning card on the dashboard, because this is the one deadline
   in the whole release that cannot be recovered from.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, selectField, stat,
  copy, toast, download, confirmDelete, fmtDate, todayISO, daysBetween, addDays, progress,
} from '../ui.js';
import { PITCH_FIELDS, PROMO_OPTIONS, PITCH_INFO, PITCH_WINDOW } from '../data/pitch.js';
import { infoPanel } from './shared.js';
import { icon } from '../icons.js';

/* ---------------------------------------------------------- */
/*  the state of the deadline, used in three places            */
/* ---------------------------------------------------------- */

export function pitchState() {
  const set = S.get('settings');
  const st = S.get('pitch');
  const rel = set.releaseDate;
  if (!rel) return { known: false, submitted: !!st.submittedAt };

  const days = daysBetween(todayISO(), rel);
  const submitted = !!st.submittedAt;

  let level = 'ok';                       // colour and urgency
  if (submitted) level = 'done';
  else if (days < 0) level = 'missed';
  else if (days < PITCH_WINDOW.minimum) level = 'critical';
  else if (days < PITCH_WINDOW.recommended) level = 'warn';

  return {
    known: true, days, submitted, level,
    submittedAt: st.submittedAt || '',
    deadline: addDays(rel, -PITCH_WINDOW.minimum),
    recommendedBy: addDays(rel, -PITCH_WINDOW.recommended),
  };
}

/** A card for the dashboard. Returns null when there is nothing
    worth saying — no release date, or already pitched long ago. */
export function pitchWarning() {
  const p = pitchState();
  if (!p.known) return null;
  if (p.level === 'done') {
    if (p.days < -14) return null;        // stop nagging two weeks after release
    return card(
      cardHead('Spotify pitch',
        h('span', { class: 'tag ok', text: 'submitted' })),
      h('p', { class: 'small muted', style: { margin: 0 },
        text: `Pitched on ${fmtDate(p.submittedAt, { long: true })}. Nothing more to do — there is no response until release day, when Release Radar and any editorial placement show up in your source-of-streams breakdown.` }));
  }
  if (p.level === 'missed') {
    return card(
      cardHead('Spotify pitch', h('span', { class: 'tag bad', text: 'window closed' })),
      h('p', { class: 'small', style: { margin: 0 },
        text: 'The release date has passed and the pitch form is gone for this track. There is no late submission. Worth writing the pitch anyway while the release is fresh — the next one has the same form.' }),
      h('div', { class: 'row', style: { marginTop: '12px' } },
        h('a', { class: 'btn btn-sm', href: '#/p/spotify/epitch' }, 'Open the pitch')));
  }

  const cls = p.level === 'critical' ? 'bad' : p.level === 'warn' ? 'warn' : '';
  const line = p.level === 'critical'
    ? `${p.days} day${p.days === 1 ? '' : 's'} to release and the pitch is not submitted. Spotify's own minimum is ${PITCH_WINDOW.minimum} days — inside that, assume no editor reads it. Submit today even so: a pitched track goes into the Release Radar of everyone who follows you, which an unpitched one does not.`
    : p.level === 'warn'
      ? `${p.days} days to release. Editorial teams want the pitch ${PITCH_WINDOW.recommended} days out; you are inside that now, so this is the week to do it.`
      : `${p.days} days to release. Pitch by ${fmtDate(p.recommendedBy, { long: true })} to be read properly. The absolute cut-off is ${fmtDate(p.deadline, { long: true })}.`;

  return card(
    cardHead('Spotify editorial pitch',
      h('span', { class: `tag ${cls}`, text: p.level === 'critical' ? 'urgent' : p.level === 'warn' ? 'do this week' : 'not yet submitted' })),
    h('p', { class: 'small', style: { margin: 0, color: p.level === 'critical' ? 'var(--bad)' : '' }, text: line }),
    h('div', { class: 'row', style: { marginTop: '12px' } },
      h('a', { class: 'btn btn-sm btn-primary', href: '#/p/spotify/epitch' }, 'Open the pitch'),
      h('a', { class: 'btn btn-sm btn-ghost', href: 'https://artists.spotify.com', target: '_blank', rel: 'noopener' }, 'Spotify for Artists')));
}

/* ---------------------------------------------------------- */
/*  the panel                                                  */
/* ---------------------------------------------------------- */

export function pitchPanel() {
  const root = h('div');
  const st = S.get('pitch');
  const set = S.get('settings');
  const meta = S.get('meta');
  st.v = st.v || {};
  st.promo = st.promo || {};
  st.history = st.history || [];
  st.playlists = st.playlists || [];

  let tab = 'form';

  /* pull what we already know rather than asking twice */
  const seed = () => {
    const m = meta.v || {};
    const take = (k, v) => { if (!st.v[k] && v) { st.v[k] = v; S.touch('pitch'); } };
    take('trackTitle', m.title || set.song);
    take('primaryGenre', m.primaryGenre || set.genre);
    take('secondaryGenres', m.secondaryGenre);
    take('language', m.language);
    take('homeCity', set.city);
    take('recordedCity', m.recordedAt);
    take('moods', m.moodTags);
  };
  seed();

  const draw = () => {
    clear(root);
    const p = pitchState();

    root.append(deadlineCard(p));
    root.append(h('div', { class: 'subtabs' },
      [['form', 'The pitch'], ['promo', 'Promotion plan'], ['targets', 'Playlist targets'],
       ['history', 'History'], ['info', 'How this works']].map(([k, l]) =>
        h('button', { class: `subtab ${tab === k ? 'on' : ''}`, onClick: () => { tab = k; draw(); } }, l))));

    if (tab === 'info')    { root.append(infoPanel(PITCH_INFO)); return; }
    if (tab === 'promo')   { root.append(promoPane()); return; }
    if (tab === 'targets') { root.append(targetsPane()); return; }
    if (tab === 'history') { root.append(historyPane()); return; }
    root.append(formPane());
  };

  /* ---------- the countdown ---------- */

  function deadlineCard(p) {
    if (!p.known) {
      return card(cardHead('No release date set'),
        h('p', { class: 'small muted', style: { margin: 0 },
          text: 'Set your release date in Settings and this becomes a countdown to the pitch deadline.' }));
    }

    const box = card(
      cardHead('The window',
        p.submitted ? h('span', { class: 'tag ok', text: 'submitted' })
          : h('span', { class: `tag ${p.level === 'critical' ? 'bad' : p.level === 'warn' ? 'warn' : ''}`,
              text: p.days < 0 ? 'closed' : `${p.days} days left` })),
      h('div', { class: 'grid g3' },
        stat('Days to release', p.days < 0 ? `${-p.days} ago` : String(p.days), ''),
        stat('Pitch by', fmtDate(p.recommendedBy), 'to be read properly'),
        stat('Absolute cut-off', fmtDate(p.deadline), `${PITCH_WINDOW.minimum} days before release`)));

    if (p.submitted) {
      box.append(h('p', { class: 'small muted', style: { marginBottom: 0 },
        text: `Submitted ${fmtDate(p.submittedAt, { long: true })}. You can pitch only one unreleased track at a time — pitching another replaces this one.` }));
      box.append(h('div', { class: 'row', style: { marginTop: '10px' } },
        btn('Mark as not submitted', () => {
          st.submittedAt = ''; S.touch('pitch'); draw();
        }, { cls: 'btn-sm btn-ghost' })));
    } else {
      box.append(h('div', { class: 'row', style: { marginTop: '12px' } },
        h('a', { class: 'btn btn-sm', href: 'https://artists.spotify.com', target: '_blank', rel: 'noopener' },
          'Open Spotify for Artists'),
        btn('Copy everything for the form', copyAll, { cls: 'btn-sm btn-primary' }),
        btn('Mark submitted', markSubmitted, { cls: 'btn-sm' })));
      if (p.level === 'critical' || p.level === 'missed') {
        box.append(h('p', { class: 'small', style: { color: 'var(--bad)', marginBottom: 0 },
          text: p.level === 'missed'
            ? 'The form is gone for this track. There is no late pitch and no appeal.'
            : 'Inside the seven-day minimum. Submit anyway — a pitched track is added to the Release Radar of your followers, which an unpitched one is not. That alone is worth the ten minutes.' }));
      }
    }
    return box;
  }

  function markSubmitted() {
    st.submittedAt = todayISO();
    st.history.unshift({
      id: uid(), at: todayISO(), track: st.v.trackTitle || set.song || '',
      description: st.v.description || '',
      genres: [st.v.primaryGenre, st.v.secondaryGenres].filter(Boolean).join(', '),
      outcome: '', notes: '',
    });
    S.touch('pitch');
    toast('Logged — nothing more to do until release day');
    draw();
  }

  /* ---------- the form ---------- */

  function formPane() {
    const box = h('div');
    const missing = PITCH_FIELDS.filter(f => !String(st.v[f.key] ?? '').trim() && f.key !== 'culture' && f.key !== 'secondaryGenres');
    const filled = PITCH_FIELDS.length - missing.length;

    box.append(card(
      cardHead('Ready to paste',
        h('span', { class: 'small muted', text: `${filled} of ${PITCH_FIELDS.length} answered` }),
        btn('Copy all', copyAll, { cls: 'btn-sm btn-ghost' })),
      progress(filled / PITCH_FIELDS.length * 100),
      h('p', { class: 'small muted', style: { marginBottom: 0 },
        text: 'Write it here, then paste field by field into Spotify for Artists. The form there has no draft-saving, so anything half-written in it is lost the moment the tab closes.' })));

    const grid = h('div', { class: 'grid g2' });
    PITCH_FIELDS.forEach(f => {
      if (f.multiline) return;              // the description gets its own card
      const el = f.kind === 'select'
        ? h('select', { class: 'inp', onChange: e => { st.v[f.key] = e.target.value; S.touch('pitch'); } },
            h('option', { value: '' }, '—'),
            f.options.map(o => h('option', { value: o, selected: st.v[f.key] === o }, o)))
        : h('input', { class: 'inp', value: st.v[f.key] ?? '',
            onInput: e => { st.v[f.key] = e.target.value; S.touch('pitch'); } });

      grid.append(h('div', { class: 'field' },
        h('div', { class: 'row', style: { gap: '6px', marginBottom: '2px' } },
          h('span', { class: 'lab', style: { margin: 0 }, text: f.label }),
          h('div', { style: { flex: 1 } }),
          h('button', { class: 'icon-btn', title: 'Copy',
            onClick: () => st.v[f.key] ? copy(String(st.v[f.key])) : toast('Nothing to copy yet') },
            h('span', { html: icon('copy'), style: { display: 'flex' } }))),
        el,
        f.hint ? h('div', { class: 'small muted', style: { marginTop: '4px' }, text: f.hint }) : null));
    });
    box.append(card(cardHead('The facts'), grid));

    /* the description, with a live character count */
    const desc = PITCH_FIELDS.find(f => f.multiline);
    const counter = h('span', { class: 'small mono' });
    const ta = h('textarea', {
      class: 'inp tall', rows: 6, value: st.v[desc.key] ?? '',
      placeholder: 'What it is, what is distinctive, who it sounds like, what is happening around the release.',
      onInput: e => { st.v[desc.key] = e.target.value; S.touch('pitch'); count(); },
    });
    const count = () => {
      const n = (st.v[desc.key] || '').length;
      counter.textContent = `${n} / ${desc.limit}`;
      counter.style.color = n > desc.limit ? 'var(--bad)' : n > desc.limit * 0.85 ? 'var(--warn)' : 'var(--fg-3)';
    };
    count();

    box.append(card(
      cardHead('The pitch itself', counter,
        btn('Copy', () => copy(st.v[desc.key] || ''), { cls: 'btn-sm btn-ghost' })),
      ta,
      h('p', { class: 'small muted' },
        'Four sentences: what it is, the distinctive thing, the reference points, what is concretely happening around the release. Write it, leave it a day, cut a third.'),
      h('details', { class: 'toc' },
        h('summary', { text: 'A shape that works' }),
        h('pre', { class: 'small mono', style: { whiteSpace: 'pre-wrap', margin: 0 },
          text:
`[Genre, tempo, instrumentation, language — one sentence.]
[The distinctive thing, one clause.]
[Sounds like X meets Y.]
[Concrete plans: dates, ad spend, shows, press — one sentence.]` }))));

    if (missing.length) {
      box.append(card(
        cardHead('Still blank'),
        h('div', { class: 'list' }, missing.map(f =>
          h('div', { class: 'item' },
            h('div', { class: 'item-head' }, h('span', { class: 'item-title', text: f.label })),
            f.hint ? h('div', { class: 'item-body', text: f.hint }) : null)))));
    }

    return box;
  }

  /* ---------- promotion plan ---------- */

  function promoPane() {
    const box = h('div');
    box.append(h('p', { class: 'small muted', style: { marginTop: 0, maxWidth: '70ch' } },
      'The form asks what promotion is planned. Tick only what is actually happening — an editor is matching your plan against the traction they would expect from it, and a list of aspirations that do not materialise is worse than a short honest list.'));

    box.append(card(
      cardHead('What is actually planned'),
      h('div', { class: 'grid g2' }, PROMO_OPTIONS.map(o =>
        h('label', { class: `check ${st.promo[o] ? 'done' : ''}` },
          h('input', { type: 'checkbox', checked: !!st.promo[o],
            onChange: e => { st.promo[o] = e.target.checked; S.touch('pitch'); } }),
          h('span', { class: 'small', text: o }))))));

    const ticked = PROMO_OPTIONS.filter(o => st.promo[o]);
    box.append(card(
      cardHead('The paragraph version',
        btn('Copy', () => copy(promoText()), { cls: 'btn-sm btn-ghost' })),
      h('p', { class: 'small', style: { marginBottom: 0 }, text: promoText() })));

    function promoText() {
      if (!ticked.length) return 'Nothing ticked yet.';
      const set2 = S.get('settings');
      const ads = (S.get('ads').campaigns || []).filter(c => c.funded !== false);
      const spend = ads.reduce((a, c) => {
        const days = 7; return a + (+c.dailyUsd || 0) * days;
      }, 0);
      const bits = [`Planned: ${ticked.join(', ').toLowerCase()}.`];
      if (spend) bits.push(`Paid social budget of roughly $${spend.toFixed(0)} across the release window.`);
      if (set2.city) bits.push(`Based in ${set2.city}, with regional press and radio outreach underway.`);
      return bits.join(' ');
    }

    return box;
  }

  /* ---------- playlist targets ---------- */

  function targetsPane() {
    const box = h('div');
    box.append(h('p', { class: 'small muted', style: { marginTop: 0, maxWidth: '72ch' } },
      'You cannot request a specific playlist in the pitch, and naming one is a small mark against you. This list is for your own aim: knowing which lists your track plausibly belongs on tells you whether your genre tags are right, and gives you something concrete to check on release day.'));

    box.append(card(
      cardHead('Lists to aim at',
        btn('Add', () => {
          st.playlists.push({ id: uid(), name: '', curator: 'Spotify editorial', followers: '', why: '', got: false });
          S.touch('pitch'); draw();
        }, { cls: 'btn-sm', icon: 'plus' })),
      st.playlists.length
        ? h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
            h('thead', {}, h('tr', {}, ['Playlist', 'Curator', 'Followers', 'Why you fit', 'Landed', ''].map(t => h('th', { text: t })))),
            h('tbody', {}, st.playlists.map((pl, i) => h('tr', {},
              h('td', {}, h('input', { class: 'inline-inp', value: pl.name || '', placeholder: 'e.g. Indie India',
                onInput: e => { pl.name = e.target.value; S.touch('pitch'); } })),
              h('td', {}, h('input', { class: 'inline-inp', style: { width: '150px' }, value: pl.curator || '',
                onInput: e => { pl.curator = e.target.value; S.touch('pitch'); } })),
              h('td', {}, h('input', { class: 'inline-inp tabular', type: 'number', style: { width: '90px' },
                value: pl.followers ?? '',
                onInput: e => { pl.followers = e.target.value === '' ? '' : +e.target.value; S.touch('pitch'); } })),
              h('td', {}, h('input', { class: 'inline-inp', value: pl.why || '',
                onInput: e => { pl.why = e.target.value; S.touch('pitch'); } })),
              h('td', {}, h('input', { type: 'checkbox', checked: !!pl.got, style: { accentColor: 'var(--accent)' },
                onChange: e => { pl.got = e.target.checked; S.touch('pitch'); } })),
              h('td', {}, h('button', { class: 'icon-btn', html: '&times;',
                onClick: () => confirmDelete('this row', () => { st.playlists.splice(i, 1); S.touch('pitch'); draw(); }) })))))))
        : h('p', { class: 'small muted', style: { margin: 0 },
            text: 'Find them by looking at where artists genuinely comparable to you appear — open their Spotify page, check "Discovered on". That list is the honest version of a playlist target list.' })));

    box.append(card(
      cardHead('Where to look'),
      h('ul', { class: 'prose' },
        h('li', { text: 'On any comparable artist\'s Spotify page, the "Discovered on" section names the playlists actually driving their listeners. That is real data, not guesswork.' }),
        h('li', { text: 'Regional editorial lists are much more reachable than global ones at this size, and the culture and home-city fields in the pitch are what route you to them.' }),
        h('li', { text: 'Algorithmic placement — Release Radar, Discover Weekly — is not pitched for and cannot be pitched for. It responds to save rate and completion rate after release.' }),
        h('li', { text: 'Independent curator lists are pitched separately, through the Contacts tab, not through this form.' }))));

    return box;
  }

  /* ---------- history ---------- */

  function historyPane() {
    const box = h('div');
    if (!st.history.length) {
      box.append(empty('No pitches logged', 'Mark a pitch as submitted and it is recorded here, so the next release starts from what you actually wrote rather than from memory.'));
      return box;
    }
    box.append(h('div', { class: 'list' }, st.history.map((r, i) =>
      h('div', { class: 'item' },
        h('div', { class: 'item-head' },
          h('span', { class: 'item-title', text: r.track || 'Untitled' }),
          h('span', { class: 'tag mono', text: fmtDate(r.at, { long: true }) }),
          r.genres ? h('span', { class: 'tag', text: r.genres }) : null),
        h('div', { class: 'item-body', style: { whiteSpace: 'pre-wrap' }, text: r.description }),
        h('label', { class: 'field', style: { marginTop: '10px' } },
          h('span', { class: 'lab', text: 'What came of it' }),
          h('input', { class: 'inp', value: r.outcome || '',
            placeholder: 'Release Radar only / added to X / nothing',
            onInput: e => { r.outcome = e.target.value; S.touch('pitch'); } })),
        h('div', { class: 'row', style: { marginTop: '8px' } },
          btn('Copy', () => copy(r.description || ''), { cls: 'btn-sm btn-ghost' }),
          h('div', { style: { flex: 1 } }),
          h('button', { class: 'icon-btn', html: '&times;',
            onClick: () => confirmDelete('this record', () => { st.history.splice(i, 1); S.touch('pitch'); draw(); }) }))))));
    return box;
  }

  /* ---------- copy the lot ---------- */

  function copyAll() {
    const v = st.v;
    const ticked = PROMO_OPTIONS.filter(o => st.promo[o]);
    const text = [
      `SPOTIFY EDITORIAL PITCH`,
      ``,
      ...PITCH_FIELDS.filter(f => !f.multiline).map(f => `${f.label}: ${v[f.key] || '—'}`),
      ``,
      `Promotion planned: ${ticked.length ? ticked.join(', ') : '—'}`,
      ``,
      `Description (${(v.description || '').length} chars):`,
      v.description || '—',
    ].join('\n');
    copy(text);
  }

  draw();
  return root;
}
