/* ============================================================
   sprofile.js — the Spotify profile pane

   The bio with its real limit, the artist pick, the image slots
   with their real sizes, a pre-save countdown, and the ladder of
   things that are not available to you yet.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, selectField, toast, copy,
  fmtDate, todayISO, daysBetween, relativeDay, prose,
} from '../ui.js';
import { SPECS, specById } from '../data/specs.js';
import { UNLOCKS, MARKETS } from '../data/unlocks.js';
import { PLATFORMS } from '../data/platforms.js';

const BIO_LIMIT = 1500;

export function spotifyProfilePanel() {
  const root = h('div');
  const sp = S.get('sprofile');
  const set = S.get('settings');

  const draw = () => {
    clear(root);
    root.append(bioCard());
    root.append(pickCard());
    root.append(imagesCard());
    root.append(countdownCard());
    root.append(unlockCard());
  };

  /* ---------------- bio ---------------- */

  function bioCard() {
    const counter = h('div', { class: 'small muted', style: { textAlign: 'right' } });
    const paint = () => {
      const n = (sp.bio || '').length;
      counter.textContent = `${n} / ${BIO_LIMIT}`;
      counter.style.color = n > BIO_LIMIT ? 'var(--bad)' : n > BIO_LIMIT * 0.9 ? 'var(--warn)' : '';
    };
    const input = field(null, sp, 'bio', {
      slice: 'sprofile', multiline: true, tall: true,
      placeholder: 'Who you are, where you are from, what this sounds like, and one specific detail nobody else could write.',
      onInput: paint,
    });
    paint();

    return card(
      cardHead('Artist bio', h('span', { class: 'tag', text: `${BIO_LIMIT} characters` }),
        btn('Copy', () => copy(sp.bio || ''), { cls: 'btn-sm btn-ghost' })),
      h('p', { class: 'small muted' },
        'Spotify reads @tags: typing @ inside the field on Spotify links to another artist, album, playlist or track, and pasted Spotify links become live links. Write those markers in here as plain text and re-do them when you paste it over — this field cannot render them.'),
      input, counter,
      h('div', { class: 'hr' }),
      h('div', { class: 'small muted' }, 'A bio that works, in order:'),
      h('ol', { class: 'prose small' },
        h('li', { text: 'One sentence that says what it sounds like, in the words a listener would use.' }),
        h('li', { text: 'Where you are from — specific, not "India". The city is the hook.' }),
        h('li', { text: 'One concrete fact: where it was recorded, what it was written on, who played on it.' }),
        h('li', { text: 'Anything verifiable — a placement, a support slot, a number. No adjectives you cannot prove.' }),
        h('li', { text: 'What is next, with a date.' })),
      h('div', { class: 'row', style: { marginTop: '10px' } },
        h('span', { class: 'small muted', text: 'Artists to @tag when you paste it in:' }),
        field(null, sp, 'tags', { slice: 'sprofile', placeholder: '@artist, @artist…' })));
  }

  /* ---------------- artist pick ---------------- */

  function pickCard() {
    return card(
      cardHead('Artist Pick'),
      h('p', { class: 'small muted' },
        'One item pinned to the top of your profile for as long as you leave it there. It does not affect ranking — it converts the visits you already get, which is exactly what matters in release week.'),
      h('div', { class: 'grid g2' },
        selectField('What to pin', sp, 'pickKind', [
          ['song', 'This single'], ['playlist', 'A playlist'], ['album', 'An album'], ['concert', 'A show'],
        ], { slice: 'sprofile' }),
        field('Link', sp, 'pickUrl', { slice: 'sprofile', placeholder: 'https://open.spotify.com/…' })),
      field('The one line that goes with it', sp, 'pickNote', {
        slice: 'sprofile', multiline: true,
        placeholder: 'A sentence, not a paragraph. "The one I almost didn\'t release." Changed on release day and again at T+30.' }),
      h('div', { class: 'small muted', style: { marginTop: '6px' },
        text: 'Set it on release day, and set a reminder to change it at T+30 — a stale pick is worse than none.' }));
  }

  /* ---------------- images ---------------- */

  function imagesCard() {
    const ids = ['sp-avatar', 'sp-header', 'sp-gallery'];
    const st = S.get('studio');
    return card(
      cardHead('Images', h('a', { class: 'small', href: '#/studio', text: 'open the asset studio' })),
      h('div', { class: 'list' }, ids.map(id => {
        const s = specById(id);
        const have = (st.have || {})[id];
        return h('div', { class: 'item' },
          h('div', { class: 'item-head' },
            h('span', { class: 'item-title', text: s.label }),
            h('span', { class: `tag ${have ? 'ok' : ''}`, text: have ? 'checked' : 'missing' }),
            s.unverified ? h('span', { class: 'tag warn', text: 'confirm the size in the upload dialog' }) : null),
          h('div', { class: 'item-meta' },
            h('span', { class: 'mono', text: `${s.w}×${s.h}${s.min ? ' min' : ''} · ${s.formats.map(f => '.' + f).join('/')} · ≤${s.maxMB}MB${s.count ? ` · up to ${s.count}` : ''}` })),
          s.note ? h('div', { class: 'small muted', style: { marginTop: '4px' }, text: s.note }) : null);
      })),
      h('div', { class: 'row', style: { marginTop: '10px' } },
        h('a', { class: 'btn btn-sm btn-primary', href: '#/studio/resize', text: 'Crop them from one still' })));
  }

  /* ---------------- pre-save countdown ---------------- */

  function countdownCard() {
    const c = card(cardHead('Pre-save'));
    if (!set.releaseDate) {
      c.append(h('p', { class: 'small muted' },
        'No release date yet — the countdown appears once you switch to execution mode on the Release tab.'));
      return c;
    }
    const n = daysBetween(todayISO(), set.releaseDate);
    const opened = sp.presaveUrl ? true : false;

    c.append(h('div', { class: 'grid g3' },
      h('div', { class: 'stat' }, h('div', { class: 'k', text: n > 0 ? 'Days to release' : 'Since release' }),
        h('div', { class: 'v', text: n === 0 ? 'TODAY' : String(Math.abs(n)) }),
        h('div', { class: 'd', text: fmtDate(set.releaseDate, { long: true }) })),
      h('div', { class: 'stat' }, h('div', { class: 'k', text: 'Pre-save link' }),
        h('div', { class: 'v', style: { fontSize: '15px' }, text: opened ? 'live' : 'not set up' }),
        h('div', { class: 'd', text: opened ? 'points at the smart link' : 'set it up at T-21' })),
      h('div', { class: 'stat' }, h('div', { class: 'k', text: 'Pre-saves logged' }),
        h('div', { class: 'v', text: String(sp.presaves || 0) }),
        h('div', { class: 'd', text: 'type the number in as it grows' }))));

    c.append(h('div', { class: 'grid g2', style: { marginTop: '12px' } },
      field('Pre-save URL', sp, 'presaveUrl', { slice: 'sprofile', placeholder: 'https://' }),
      field('Pre-saves so far', sp, 'presaves', { slice: 'sprofile', type: 'number' })));

    c.append(h('p', { class: 'small muted', style: { marginTop: '10px' } },
      'Every pre-save becomes a library add and a first-day stream at the moment of release, which is the window Spotify weighs most heavily. One person pre-saving is worth more than ten people streaming in week three.'));

    if (n > 0 && n <= 21 && !opened) {
      c.append(h('div', { class: 'mode-banner', style: { marginTop: '12px' } },
        h('div', {}, h('strong', { text: 'The pre-save is not set up' }),
          h('div', { class: 'small', text: `${n} day${n === 1 ? '' : 's'} left. It has to exist before you can promote it, and promoting it is most of what the next three weeks are for.` }))));
    }
    return c;
  }

  /* ---------------- unlock ladder ---------------- */

  function unlockCard() {
    sp.market = sp.market || 'India';
    const stats = S.get('p_spotify').stats || [];
    const latest = stats.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).pop();
    const read = (name) => {
      if (!latest || !latest.m) return null;
      const key = Object.keys(latest.m).find(k => k.toLowerCase().includes(name));
      const v = key ? Number(latest.m[key]) : NaN;
      return isFinite(v) ? v : null;
    };
    const have = { streams: read('stream'), listeners: read('listener') };

    const box = card(
      cardHead('What unlocks next',
        h('span', { class: 'small muted', text: latest ? `from your stats on ${fmtDate(latest.date)}` : 'no stats logged yet' })),
      h('p', { class: 'small muted' },
        'Spotify gates these on numbers, and the numbers are counted per market. Nothing here is a task until its line turns green.'));

    UNLOCKS.forEach(u => {
      const n = u.metric ? have[u.metric] : null;
      const met = u.metric ? (n !== null && n >= u.threshold) : true;
      const pct = u.metric && n !== null ? Math.min(100, Math.round(n / u.threshold * 100)) : null;

      box.append(h('div', { class: 'item', style: { borderLeft: `3px solid ${met ? 'var(--ok)' : 'var(--line)'}` } },
        h('div', { class: 'item-head' },
          h('span', { class: 'item-title', text: u.name }),
          u.metric
            ? h('span', { class: `tag ${met ? 'ok' : 'warn'}`, text: met ? 'available' : 'locked' })
            : h('span', { class: 'tag ok', text: 'available now' }),
          u.deadline ? h('span', { class: 'tag bad', text: 'deadline' }) : null,
          u.caution ? h('span', { class: 'tag warn', text: 'read the arithmetic' }) : null),
        h('div', { class: 'item-meta' }, h('span', { text: u.need })),
        h('div', { class: 'small', style: { marginTop: '6px', color: 'var(--fg-2)' }, text: u.what }),
        h('div', { class: 'small muted', style: { marginTop: '4px' }, text: u.how }),
        u.metric ? h('div', { style: { marginTop: '8px' } },
          h('div', { class: 'prog' }, h('i', { style: { width: `${pct || 0}%` } })),
          h('div', { class: 'small muted', style: { marginTop: '4px' },
            text: n === null
              ? `Nothing logged for ${u.metric} yet — add a Spotify stats entry and this fills in.`
              : met ? `${n.toLocaleString()} — past the ${u.threshold.toLocaleString()} threshold.`
                    : `${n.toLocaleString()} of ${u.threshold.toLocaleString()} — ${(u.threshold - n).toLocaleString()} to go.` })) : null));
    });

    box.append(h('div', { class: 'row', style: { marginTop: '12px' } },
      selectField('Market you are tracking', sp, 'market', MARKETS, { slice: 'sprofile' })));
    box.append(h('p', { class: 'small muted' },
      'Eligibility is per market, so 5,000 listeners spread across six countries unlocks nothing. Concentrating on one market is the whole reason the plan has an India phase before a diaspora phase.'));

    return box;
  }

  draw();
  return root;
}
