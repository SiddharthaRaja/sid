/* ============================================================
   release.js — the master tab for the song

   One song at a time. This page owns the two things everything
   else hangs off: what the song is, and whether the project is
   being *planned* (T-offsets only, no calendar) or *executed*
   (a real release date, so every offset becomes a real day).
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, btn, card, cardHead, field, modal, toast, empty,
  fmtDate, tLabel, relativeDay, todayISO, addDays, daysBetween, resolveDate,
} from '../ui.js';
import { collectPlanned } from '../agenda.js';
import { PHASES, phaseOfOffset, phaseTitle, offsetOf, isISO } from '../phases.js';

/** The next Friday at least `minDays` away — releases go out on Fridays. */
function nextFriday(minDays = 56) {
  let d = addDays(todayISO(), minDays);
  for (let i = 0; i < 7; i++) {
    const day = new Date(d + 'T00:00:00').getDay();
    if (day === 5) return d;
    d = addDays(d, 1);
  }
  return d;
}

export function renderRelease() {
  const root = h('div');
  const set = S.get('settings');

  const draw = () => {
    clear(root);
    const planning = set.mode === 'planning';

    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: set.song ? `“${set.song}”` : 'The release' }),
        h('div', { class: 'sub', text: planning
          ? 'Planning mode — everything is scheduled in days before and after release.'
          : set.releaseDate
            ? `Out ${fmtDate(set.releaseDate, { long: true })} · ${relativeDay(set.releaseDate)}`
            : 'Execution mode with no date set — set one below.' })),
      h('div', { class: 'spacer' })));

    root.append(modeCard(planning));
    root.append(planning ? planningPane() : executionPane());
    root.append(identityPane());
  };

  /* ---------- the switch ---------- */

  function modeCard(planning) {
    const opt = (on, title, body, onPick) => h('button', {
      class: `mode-opt ${on ? 'on' : ''}`, onClick: on ? null : onPick,
    },
      h('div', { class: 'row', style: { gap: '8px' } },
        h('span', { class: 'mode-dot' }),
        h('strong', { text: title }),
        on ? h('span', { class: 'tag ok', text: 'current' }) : null),
      h('div', { class: 'small muted', style: { marginTop: '6px' }, text: body }));

    return card(
      cardHead('Mode'),
      h('p', { class: 'small muted' },
        'One song at a time. Planning mode keeps every date relative, so you can build the whole campaign before you know the day. Execution mode pins it to a real Friday and hands you a calendar.'),
      h('div', { class: 'mode-opts' },
        opt(planning, 'Planning', 'Dates are T-minus / T-plus days only. No calendar, no overdue, nothing can be late.', toPlanning),
        opt(!planning, 'Execution', 'A release date is set. Every offset resolves to a real day, and the calendar, queue and reminders come alive.', toExecution)));
  }

  function toPlanning() {
    modal({
      title: 'Back to planning?',
      body: h('div',
        h('p', { class: 'small muted' },
          'The release date is put aside and every T-offset stops resolving to a real day. Nothing is deleted — items written as fixed calendar dates keep those dates, and the release date is remembered so you can switch back in one tap.'),
        set.releaseDate ? h('p', { class: 'small' },
          `Currently set to ${fmtDate(set.releaseDate, { long: true })}.`) : null),
      actions: [{ label: 'Cancel' }, {
        label: 'Switch to planning', cls: 'btn-primary',
        onClick: () => {
          if (set.releaseDate) set.draftRelease = set.releaseDate;
          set.releaseDate = '';
          set.mode = 'planning';
          S.touch('settings');
          toast('Planning mode — offsets only');
          window.__sid?.rerender();
        },
      }],
    });
  }

  function toExecution() {
    let pick = set.draftRelease || nextFriday();
    const preview = h('div', { class: 'list', style: { marginTop: '12px' } });

    const paint = () => {
      clear(preview);
      const items = collectPlanned().filter(i => i.off !== null).slice(0, 8);
      if (!items.length) {
        preview.append(h('div', { class: 'small muted', text: 'Nothing is dated yet, so there is nothing to preview.' }));
        return;
      }
      items.forEach(i => preview.append(h('div', { class: 'item' },
        h('div', { class: 'item-head' },
          h('span', { class: 'tag mono', text: i.off === 0 ? 'T' : i.off > 0 ? `T+${i.off}` : `T${i.off}` }),
          h('span', { class: 'item-title', text: i.title }),
          h('span', { class: 'small muted', text: fmtDate(addDays(pick, i.off), { long: true }) })))));
      const total = collectPlanned().filter(i => i.off !== null).length;
      if (total > 8) preview.append(h('div', { class: 'small muted', style: { marginTop: '6px' }, text: `…and ${total - 8} more.` }));
    };

    const dayName = h('div', { class: 'small', style: { marginTop: '6px' } });
    const paintDay = () => {
      const d = new Date(pick + 'T00:00:00');
      const friday = d.getDay() === 5;
      dayName.textContent = `${fmtDate(pick, { long: true })} · ${relativeDay(pick)}${friday ? '' : ' — not a Friday. DSP release weeks start on Friday; a Tuesday release forfeits a week of playlist consideration.'}`;
      dayName.style.color = friday ? 'var(--fg-2)' : 'var(--warn)';
    };

    const input = h('input', {
      type: 'date', class: 'inp', style: { maxWidth: '190px' }, value: pick,
      onInput: (e) => { pick = e.target.value; paintDay(); paint(); },
    });
    paintDay(); paint();

    modal({
      title: 'Set the release date',
      wide: true,
      body: h('div',
        h('p', { class: 'small muted' },
          'Every T-offset in the app resolves against this one date. Change it later and the whole plan re-dates itself — nothing has to be redone by hand.'),
        h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Release date' }), input, dayName),
        h('div', { class: 'hr' }),
        h('div', { class: 'small muted', text: 'What the first few things become:' }),
        preview),
      actions: [{ label: 'Cancel' }, {
        label: 'Set it and switch to execution', cls: 'btn-primary',
        onClick: () => {
          if (!pick) { toast('Pick a date first'); return false; }
          set.releaseDate = pick;
          set.draftRelease = pick;
          set.mode = 'execution';
          S.touch('settings');
          toast('Execution mode — everything has a date now');
          window.__sid?.rerender();
        },
      }],
    });
  }

  /* ---------- planning ---------- */

  function planningPane() {
    const items = collectPlanned();
    const dated = items.filter(i => i.off !== null);
    const fixed = items.filter(i => i.off === null && isISO(i.when));
    const none  = items.filter(i => i.off === null && !isISO(i.when));

    const box = h('div');

    box.append(card(
      cardHead('Where the plan sits', btn('Set a release date', toExecution, { cls: 'btn-sm btn-primary' })),
      h('div', { class: 'grid g3' },
        h('div', { class: 'stat' }, h('div', { class: 'k', text: 'On the T-axis' }), h('div', { class: 'v', text: String(dated.length) }),
          h('div', { class: 'd', text: dated.length ? `${Math.min(...dated.map(d => d.off))} to +${Math.max(...dated.map(d => d.off))} days` : 'nothing scheduled yet' })),
        h('div', { class: 'stat' }, h('div', { class: 'k', text: 'Fixed dates' }), h('div', { class: 'v', text: String(fixed.length) }),
          h('div', { class: 'd', text: 'real days, unaffected by the release date' })),
        h('div', { class: 'stat' }, h('div', { class: 'k', text: 'Undated' }), h('div', { class: 'v', text: String(none.length) }),
          h('div', { class: 'd', text: 'written but not placed' }))),
      h('p', { class: 'small muted', style: { marginTop: '14px' } },
        'A pencilled-in date, if you have one in mind, is kept here without switching modes — nothing resolves until you actually switch.'),
      h('label', { class: 'field' },
        h('span', { class: 'lab', text: 'Pencilled-in release date (not applied)' }),
        h('input', {
          type: 'date', class: 'inp', style: { maxWidth: '190px' }, value: set.draftRelease || '',
          onChange: (e) => { set.draftRelease = e.target.value; S.touch('settings'); },
        }))));

    const byPhase = PHASES.map(p => ({ p, n: dated.filter(d => phaseOfOffset(d.off).key === p.key).length }))
      .filter(x => x.n);
    if (byPhase.length) {
      box.append(card(cardHead('By phase'),
        h('div', { class: 'list' }, byPhase.map(x => h('a', { class: 'item', href: '#/plan', style: { display: 'block', textDecoration: 'none', color: 'inherit' } },
          h('div', { class: 'item-head' },
            h('span', { class: 'item-title', text: phaseTitle(x.p) }),
            h('span', { class: 'tag mono', text: String(x.n) })))))));
    }
    return box;
  }

  /* ---------- execution ---------- */

  function executionPane() {
    const box = h('div');
    const today = todayISO();

    box.append(card(
      cardHead('Release date'),
      h('p', { class: 'small muted' },
        'Change it and every relative date in the app moves with it. Dates you wrote as fixed calendar dates stay where they are.'),
      field('Release date (a Friday)', set, 'releaseDate', {
        slice: 'settings', type: 'date',
        onInput: (v) => { set.draftRelease = v; setTimeout(() => { S.touch('settings'); window.__sid?.rerender(); }, 500); },
      }),
      set.releaseDate ? h('div', { class: 'small muted' },
        `${fmtDate(set.releaseDate, { long: true })} · ${relativeDay(set.releaseDate)} · today is ${tLabel(today, set.releaseDate)}`) : null,
      h('div', { style: { marginTop: '14px' } },
        btn('Back to planning mode', toPlanning, { cls: 'btn-sm' }))));

    if (set.releaseDate) {
      const items = collectPlanned().filter(i => i.off !== null);
      const near = items
        .map(i => ({ ...i, iso: addDays(set.releaseDate, i.off) }))
        .filter(i => i.iso >= today && !i.done)
        .sort((a, b) => a.iso.localeCompare(b.iso))
        .slice(0, 8);
      box.append(card(cardHead('Next up', h('a', { class: 'small', href: '#/calendar', text: 'open calendar' })),
        near.length
          ? h('div', { class: 'list' }, near.map(i => h('a', { class: 'item', href: i.hash, style: { display: 'block', textDecoration: 'none', color: 'inherit' } },
              h('div', { class: 'item-head' },
                h('span', { class: 'tag mono', text: i.off === 0 ? 'T' : i.off > 0 ? `T+${i.off}` : `T${i.off}` }),
                h('span', { class: 'item-title', text: i.title }),
                h('span', { class: 'small muted', text: `${fmtDate(i.iso)} · ${relativeDay(i.iso)}` }))))
            )
          : h('div', { class: 'small muted', text: 'Nothing ahead on the T-axis.' })));
    }
    return box;
  }

  /* ---------- the song itself ---------- */

  function identityPane() {
    return h('div',
      card(
        cardHead('The song'),
        h('div', { class: 'grid g2' },
          field('Artist name — exact capitalisation', set, 'artist', { slice: 'settings', placeholder: 'Byte-identical everywhere, forever' }),
          field('Song title', set, 'song', { slice: 'settings' }),
          field('Universal handle', set, 'handle', { slice: 'settings', placeholder: '@…' }),
          field('Smart link', set, 'link', { slice: 'settings', placeholder: 'https://' }),
          field('Artist email', set, 'email', { slice: 'settings', placeholder: 'never your personal address' }),
          field('City', set, 'city', { slice: 'settings' }),
          field('Genre', set, 'genre', { slice: 'settings' }))),

      card(cardHead('For fans of'),
        field(null, set, 'comps', { slice: 'settings', multiline: true,
          placeholder: 'Three comparison artists. Every pitch, bio, ad audience and playlist submission derives from this one sentence.' })),

      card(cardHead('Codes & partners'),
        h('div', { class: 'grid g2' },
          field('ISRC', set, 'isrc', { slice: 'settings', cls: 'mono' }),
          field('UPC / EAN', set, 'upc', { slice: 'settings', cls: 'mono' }),
          field('Label name', set, 'label', { slice: 'settings' }),
          field('Distributor', set, 'distributor', { slice: 'settings' }),
          field('PRO', set, 'pro', { slice: 'settings' }),
          field('Publisher / admin', set, 'publisher', { slice: 'settings' }))));
  }

  draw();
  return root;
}
