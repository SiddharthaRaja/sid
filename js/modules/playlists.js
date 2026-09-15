/* ============================================================
   playlists.js — every placement, and whether it is still live

   The point of tracking these is the check-in: a playlist add is
   worth nothing if you do not notice the week it disappears, and
   the decay curve tells you which curators actually kept you.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, subtabs, selectField,
  toast, copy, confirmDelete, todayISO, fmtDate, fmtNum, relativeDay, daysBetween, prose,
} from '../ui.js';
import { KINDS, STATUSES, STATUS_TAG, FIND_ROUTES, SCAM_SIGNS, HEALTH_NOTE } from '../data/playlists.js';
import { sparkline } from '../charts.js';

export function renderPlaylists(sub) {
  const root = h('div');
  const P = S.get('playlists');
  let tab = ['placements', 'checkin', 'find', 'kinds'].includes(sub) ? sub : 'placements';
  P.items = P.items || [];

  const live = () => P.items.filter(x => x.status === 'added');
  const reach = () => live().reduce((a, x) => a + (Number(x.followers) || 0), 0);

  const draw = () => {
    clear(root);
    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: 'Playlists' }),
        h('div', { class: 'sub', text: `${live().length} live placement${live().length === 1 ? '' : 's'} · ${fmtNum(reach())} combined followers` })),
      h('div', { class: 'spacer' }),
      h('div', { class: 'page-actions' }, btn('Add a playlist', () => open(null), { cls: 'btn-sm btn-primary', icon: 'plus' }))));

    root.append(subtabs([['placements', 'Placements'], ['checkin', 'Weekly check'],
      ['find', 'Finding them'], ['kinds', 'How they work']], tab, k => { tab = k; draw(); }));

    if (tab === 'checkin') { root.append(checkPane()); return; }
    if (tab === 'find')    { root.append(findPane()); return; }
    if (tab === 'kinds')   { root.append(kindPane()); return; }
    root.append(placementPane());
  };

  /* ---------------------------------------------------------- */
  /*  placements                                                 */
  /* ---------------------------------------------------------- */

  function placementPane() {
    const box = h('div');
    const byStatus = (st) => P.items.filter(x => x.status === st);

    const dropped = byStatus('dropped');
    const pitched = byStatus('pitched');

    box.append(h('div', { class: 'grid g4' },
      h('div', { class: 'stat' }, h('div', { class: 'k', text: 'Live' }),
        h('div', { class: 'v', text: String(live().length) }), h('div', { class: 'd', text: 'playlists carrying the song' })),
      h('div', { class: 'stat' }, h('div', { class: 'k', text: 'Combined reach' }),
        h('div', { class: 'v', text: fmtNum(reach()) }), h('div', { class: 'd', text: 'followers, not listeners' })),
      h('div', { class: 'stat' }, h('div', { class: 'k', text: 'Out for a decision' }),
        h('div', { class: 'v', text: String(pitched.length) }), h('div', { class: 'd', text: 'pitched, no answer yet' })),
      h('div', { class: 'stat' }, h('div', { class: 'k', text: 'Dropped' }),
        h('div', { class: 'v', text: String(dropped.length) }),
        h('div', { class: 'd', text: dropped.length ? 'worth asking why' : 'none yet' }))));

    box.append(h('p', { class: 'small muted', style: { marginTop: '12px' }, text: HEALTH_NOTE }));

    if (!P.items.length) {
      box.append(empty('Nothing tracked yet',
        'Start with Spotify for Artists → the track → "Discovered on". Everything already carrying you goes in here first.'));
      return box;
    }

    const groups = [
      ['added', 'Live'], ['pitched', 'Pitched, waiting'], ['found', 'Found, not pitched'],
      ['dropped', 'Dropped'], ['declined', 'Declined'], ['ignored', 'No reply'],
    ];
    groups.forEach(([st, label]) => {
      const items = P.items.filter(x => x.status === st)
        .sort((a, b) => (Number(b.followers) || 0) - (Number(a.followers) || 0));
      if (!items.length) return;
      const c = card(cardHead(label, h('span', { class: 'small muted mono', text: String(items.length) })));
      c.append(h('div', { class: 'list' }, items.map(row)));
      box.append(c);
    });

    return box;
  }

  function row(x) {
    const kind = KINDS.find(k => k.key === x.kind);
    const checks = (x.checks || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    const last = checks.at(-1);
    const first = checks[0];
    const trend = checks.length > 1 && last && first ? Number(last.streams) - Number(first.streams) : null;

    return h('div', { class: 'item', style: { cursor: 'pointer' }, onClick: () => open(x) },
      h('div', { class: 'item-head' },
        h('span', { class: 'item-title', text: x.name || 'Untitled playlist' }),
        kind ? h('span', { class: 'tag', text: kind.name }) : null,
        h('span', { class: `tag ${STATUS_TAG[x.status] || ''}`,
          text: (STATUSES.find(s => s[0] === x.status) || ['', x.status])[1] }),
        x.followers ? h('span', { class: 'small muted mono', text: `${fmtNum(x.followers)} followers` }) : null,
        checks.length > 1 ? h('span', { style: { marginLeft: 'auto' } },
          sparkline(checks.map(c => Number(c.streams) || 0), { color: 'var(--accent)' })) : null),
      h('div', { class: 'item-meta' },
        x.curator ? h('span', { text: x.curator }) : null,
        x.addedAt ? h('span', { text: `added ${fmtDate(x.addedAt)}` }) : null,
        x.position ? h('span', { text: `position ${x.position}` }) : null,
        last ? h('span', { text: `${fmtNum(last.streams)} streams at last check` }) : null,
        trend !== null ? h('span', { style: { color: trend >= 0 ? 'var(--ok)' : 'var(--warn)' },
          text: `${trend >= 0 ? '+' : ''}${fmtNum(trend)} since first check` }) : null),
      x.notes ? h('div', { class: 'small muted', style: { marginTop: '4px' }, text: x.notes }) : null);
  }

  /* ---------------------------------------------------------- */
  /*  the editor                                                 */
  /* ---------------------------------------------------------- */

  function open(existing) {
    const isNew = !existing;
    const x = existing || {
      id: uid(), name: '', curator: '', kind: 'user', platform: 'Spotify', url: '', contact: '',
      followers: '', position: '', status: 'found', pitchedAt: '', addedAt: '', removedAt: '',
      checks: [], notes: '',
    };

    const checkBox = h('div');
    const drawChecks = () => {
      clear(checkBox);
      const cs = (x.checks || []).slice().sort((a, b) => b.date.localeCompare(a.date));
      if (!cs.length) { checkBox.append(h('div', { class: 'small muted', text: 'No checks logged. One a week is enough.' })); return; }
      cs.forEach(c => checkBox.append(h('div', { class: 'row', style: { marginBottom: '6px' } },
        h('span', { class: 'small muted mono', style: { minWidth: '70px' }, text: fmtDate(c.date) }),
        h('input', { class: 'inp mono', type: 'number', style: { maxWidth: '110px' }, value: c.streams,
          placeholder: 'streams', onInput: (e) => { c.streams = Number(e.target.value); S.touch('playlists'); } }),
        h('input', { class: 'inp mono', type: 'number', style: { maxWidth: '90px' }, value: c.position,
          placeholder: 'position', onInput: (e) => { c.position = Number(e.target.value); S.touch('playlists'); } }),
        h('button', { class: 'icon-btn', html: '&times;',
          onClick: () => { x.checks.splice(x.checks.indexOf(c), 1); S.touch('playlists'); drawChecks(); } }))));
    };
    drawChecks();

    modal({
      title: isNew ? 'Add a playlist' : x.name || 'Playlist',
      wide: true,
      body: h('div',
        h('div', { class: 'grid g2' },
          field('Playlist name', x, 'name'),
          field('Curator', x, 'curator', { placeholder: 'the person, not the brand' }),
          selectField('Kind', x, 'kind', KINDS.map(k => [k.key, k.name])),
          field('Platform', x, 'platform', { placeholder: 'Spotify, Apple Music…' }),
          field('Followers', x, 'followers', { type: 'number' }),
          field('Your position in it', x, 'position', { type: 'number' }),
          selectField('Status', x, 'status', STATUSES),
          field('Contact', x, 'contact', { placeholder: 'email / handle' })),
        field('URL', x, 'url', { placeholder: 'https://open.spotify.com/playlist/…' }),
        h('div', { class: 'grid g3' },
          field('Pitched on', x, 'pitchedAt', { type: 'date' }),
          field('Added on', x, 'addedAt', { type: 'date' }),
          field('Dropped on', x, 'removedAt', { type: 'date' })),
        field('Notes', x, 'notes', { multiline: true, placeholder: 'How you found them. What you said. Whether they replied like a human.' }),
        h('div', { class: 'hr' }),
        h('div', { class: 'row' },
          h('span', { class: 'lab', text: 'Check-ins' }),
          h('div', { style: { flex: 1 } }),
          btn('Log a check today', () => {
            x.checks = x.checks || [];
            const t = todayISO();
            if (!x.checks.some(c => c.date === t)) x.checks.push({ date: t, streams: 0, position: Number(x.position) || 0 });
            S.touch('playlists'); drawChecks();
          }, { cls: 'btn-sm' })),
        checkBox),
      actions: [
        !isNew ? { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () =>
          confirmDelete(x.name || 'this playlist', () => { P.items.splice(P.items.indexOf(x), 1); S.touch('playlists'); draw(); }) } : null,
        'spacer',
        { label: 'Save', cls: 'btn-primary', onClick: () => {
          if (isNew && (x.name || x.curator)) P.items.push(x);
          /* keep the dates honest with the status */
          if (x.status === 'added' && !x.addedAt) x.addedAt = todayISO();
          if (x.status === 'pitched' && !x.pitchedAt) x.pitchedAt = todayISO();
          if (x.status === 'dropped' && !x.removedAt) x.removedAt = todayISO();
          S.touch('playlists'); draw();
        } },
      ].filter(Boolean),
      onClose: draw,
    });
  }

  /* ---------------------------------------------------------- */
  /*  weekly check                                               */
  /* ---------------------------------------------------------- */

  function checkPane() {
    const box = h('div');
    const items = live();

    box.append(card(
      cardHead('This week\'s check'),
      h('p', { class: 'small muted' },
        'Five minutes, once a week. Open each playlist, confirm the song is still in it, and put in the streams it has brought you from the Spotify for Artists playlist breakdown. The week a placement disappears is the week to ask the curator why — not a month later.')));

    if (!items.length) {
      box.append(empty('No live placements yet', 'Anything with status "Added" appears here to be checked.'));
      return box;
    }

    const today = todayISO();
    items.forEach(x => {
      const cs = (x.checks || []).slice().sort((a, b) => a.date.localeCompare(b.date));
      const last = cs.at(-1);
      const stale = !last || daysBetween(last.date, today) >= 7;
      const streams = h('input', { class: 'inp mono', type: 'number', style: { maxWidth: '130px' },
        placeholder: last ? String(last.streams) : 'streams' });
      const pos = h('input', { class: 'inp mono', type: 'number', style: { maxWidth: '110px' },
        placeholder: x.position ? `was ${x.position}` : 'position' });

      box.append(card(
        cardHead(x.name || 'Untitled',
          h('span', { class: `tag ${stale ? 'warn' : 'ok'}`, text: last ? `checked ${relativeDay(last.date)}` : 'never checked' }),
          x.url ? h('a', { class: 'small', href: x.url, target: '_blank', rel: 'noopener', text: 'open it' }) : null),
        h('div', { class: 'row' },
          streams, pos,
          btn('Save check', () => {
            x.checks = x.checks || [];
            const rec = x.checks.find(c => c.date === today) || { date: today };
            rec.streams = Number(streams.value) || (last ? last.streams : 0);
            rec.position = Number(pos.value) || Number(x.position) || 0;
            if (!x.checks.includes(rec)) x.checks.push(rec);
            if (rec.position) x.position = rec.position;
            S.touch('playlists'); toast('Logged'); draw();
          }, { cls: 'btn-sm btn-primary' }),
          btn('It dropped me', () => {
            x.status = 'dropped'; x.removedAt = today; S.touch('playlists'); draw();
          }, { cls: 'btn-sm btn-ghost' })),
        cs.length > 1 ? h('div', { style: { marginTop: '10px' } },
          sparkline(cs.map(c => Number(c.streams) || 0), { color: 'var(--accent)' })) : null));
    });

    return box;
  }

  /* ---------------------------------------------------------- */
  /*  finding them                                               */
  /* ---------------------------------------------------------- */

  function findPane() {
    return h('div',
      card(cardHead('Where to look'),
        h('ol', { class: 'prose' }, FIND_ROUTES.map(r => h('li', { text: r }))),
        h('p', { class: 'small muted' },
          'Curators you approach go in Contacts under "Playlist curators"; the ones who say yes come back here as placements.'),
        h('a', { class: 'btn btn-sm', href: '#/contacts/playlist', text: 'Open the curator list' })),

      card(cardHead('What a message should be'),
        prose(`Short, specific, and obviously written by a person who opened the playlist.

- Name the playlist and one track already in it that yours sits beside.
- One line on what the song is. No adjectives you cannot prove.
- The link, and nothing else attached.
- No follow-up before twelve days, and only one.

The conversion rate on a genuine, specific message is a few percent. On a mass mailout it is zero, and it burns the address.`)),

      card(cardHead('How to spot a fake', h('span', { class: 'tag bad', text: 'read this one' })),
        h('ul', { class: 'prose' }, SCAM_SIGNS.map(x => h('li', { text: x })))));
  }

  /* ---------------------------------------------------------- */
  /*  how they work                                              */
  /* ---------------------------------------------------------- */

  function kindPane() {
    const box = h('div');
    KINDS.forEach(k => box.append(card(
      cardHead(k.name, h('span', { class: 'tag', text: k.who })),
      h('div', { class: 'grid g2' },
        h('div', {}, h('div', { class: 'small muted', text: 'What it is worth' }),
          h('div', { class: 'small', style: { color: 'var(--fg-2)' }, text: k.worth })),
        h('div', {}, h('div', { class: 'small muted', text: 'How you get it' }),
          h('div', { class: 'small', style: { color: 'var(--fg-2)' }, text: k.how }))),
      h('p', { class: 'small muted', style: { marginTop: '10px' }, text: k.note }))));
    box.append(card(cardHead('The ratio that decides everything'),
      h('p', { class: 'small', style: { color: 'var(--fg-2)' }, text: HEALTH_NOTE })));
    return box;
  }

  draw();
  return root;
}
