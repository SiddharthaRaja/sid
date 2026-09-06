/* ============================================================
   video.js — music video: shooting schedules as creatable tabs
   Storyboard · shots · locations · cast & crew · backup plans
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, subtabs, selectField,
  fmtDate, resolveDate, relativeDay, todayISO, confirmDelete, toast, move, prose,
} from '../ui.js';
import { mediaBlock, notesPanel, infoPanel, checklist, progressBar, scheduleRow } from './shared.js';
import { icon } from '../icons.js';
import { CAPTURE_LIST, VIDEO_INFO } from '../data/video.js';

const newSchedule = (name) => ({
  id: uid(), name: name || 'Shoot day 1', date: '', call: '', wrap: '',
  synopsis: '', shots: [], locations: [], cast: [], crew: [],
  backup: '', gear: '', notes: '', media: [], captureDone: {},
});

export function renderVideo(sub) {
  const root = h('div');
  const st = S.get('video');
  const set = S.get('settings');
  st.schedules = st.schedules || [];

  let current = st.schedules[0]?.id || null;
  let pane = 'overview';

  const draw = () => {
    clear(root);
    root.append(h('div', { class: 'page-head' },
      h('div', {}, h('h1', { text: 'Music video' }),
        h('div', { class: 'sub', text: st.schedules.length
          ? `${st.schedules.length} shooting schedule${st.schedules.length > 1 ? 's' : ''} · ${st.schedules.reduce((a, s) => a + s.shots.length, 0)} shots total`
          : 'One shoot day should yield 60+ pieces of content. Plan it here.' })),
      h('div', { class: 'spacer' }),
      h('div', { class: 'page-actions' },
        btn('New schedule', addSchedule, { cls: 'btn-primary btn-sm', icon: 'plus' }))));

    if (!st.schedules.length) {
      root.append(empty('No shooting schedules yet',
        'Create one per shoot day. Each gets its own storyboard, shot list, locations, cast and crew, and backup plan.'));
      root.append(card(cardHead('Before you plan anything — the capture list'),
        h('p', { class: 'small muted' }, 'Your content strategy is "chop up the music video". That works only if the video is shot with chopping in mind. Bring this to the shoot.'),
        h('ul', { class: 'prose' }, CAPTURE_LIST.map(c => h('li', { text: c })))));
      return;
    }

    if (!st.schedules.find(s => s.id === current)) current = st.schedules[0].id;
    const sc = st.schedules.find(s => s.id === current);

    /* schedule tabs */
    root.append(h('div', { class: 'subtabs' },
      st.schedules.map(s => h('button', {
        class: `subtab ${s.id === current ? 'on' : ''}`,
        onClick: () => { current = s.id; pane = 'overview'; draw(); },
      }, s.name || 'Untitled')),
      h('button', { class: 'subtab', onClick: addSchedule, html: '+' })));

    root.append(subtabs([
      ['overview', 'Overview'], ['storyboard', 'Storyboard & shots'], ['locations', 'Locations'],
      ['people', 'Cast & crew'], ['capture', 'Capture list'], ['backup', 'Backup plans'], ['info', 'Info'],
    ], pane, k => { pane = k; draw(); }));

    if (pane === 'overview')   root.append(overview(sc));
    if (pane === 'storyboard') root.append(storyboard(sc));
    if (pane === 'locations')  root.append(locations(sc));
    if (pane === 'people')     root.append(people(sc));
    if (pane === 'capture')    root.append(capture(sc));
    if (pane === 'backup')     root.append(backup(sc));
    if (pane === 'info')       root.append(infoPanel(VIDEO_INFO));
  };

  function addSchedule() {
    const sc = newSchedule(`Shoot day ${st.schedules.length + 1}`);
    st.schedules.push(sc); S.touch('video'); current = sc.id; pane = 'overview'; draw();
  }

  /* ---------- overview ---------- */

  function overview(sc) {
    const iso = resolveDate(sc.date, set.releaseDate);
    const totalMin = sc.shots.reduce((a, s) => a + (+s.duration || 0), 0);

    return h('div',
      card(
        cardHead('This schedule',
          btn('Delete schedule', () => confirmDelete(`"${sc.name}"`, () => {
            st.schedules.splice(st.schedules.indexOf(sc), 1); S.touch('video'); draw();
          }), { cls: 'btn-sm btn-danger btn-ghost' })),
        field('Name', sc, 'name', { slice: 'video', onInput: () => {} }),
        scheduleRow(sc, 'video', () => draw(), { key: 'date', label: 'Shoot date' }),
        h('div', { class: 'grid g2' },
          field('Call time', sc, 'call', { slice: 'video', type: 'time' }),
          field('Wrap time', sc, 'wrap', { slice: 'video', type: 'time' })),
        field('Synopsis — what this day is for', sc, 'synopsis', { slice: 'video', multiline: true,
          placeholder: 'What we are shooting, and what it has to deliver.' })),

      h('div', { class: 'grid g4', style: { marginTop: '12px' } },
        h('div', { class: 'stat' }, h('div', { class: 'k', text: 'Shots' }), h('div', { class: 'v', text: sc.shots.length })),
        h('div', { class: 'stat' }, h('div', { class: 'k', text: 'Est. setup time' }), h('div', { class: 'v', text: `${Math.floor(totalMin / 60)}h ${totalMin % 60}m` })),
        h('div', { class: 'stat' }, h('div', { class: 'k', text: 'Locations' }), h('div', { class: 'v', text: sc.locations.length })),
        h('div', { class: 'stat' }, h('div', { class: 'k', text: 'People' }), h('div', { class: 'v', text: sc.cast.length + sc.crew.length }))),

      card(cardHead('Reference visuals'), mediaBlock(sc, 'video', `video/${sc.id}/refs`)),
      card(cardHead('Gear list'), field(null, sc, 'gear', { slice: 'video', multiline: true, autogrow: true,
        placeholder: 'Camera, lenses, lights, audio, batteries, cards, tripod, ND filters, spare everything' })),
      notesPanel(sc, 'video', 'Day notes'));
  }

  /* ---------- storyboard & shots ---------- */

  function storyboard(sc) {
    const box = h('div');

    box.append(h('div', { class: 'row', style: { marginBottom: '12px' } },
      btn('Add shot', () => {
        sc.shots.push({ id: uid(), no: sc.shots.length + 1, desc: '', type: 'Performance', angle: 'Wide',
          duration: 20, location: '', cast: '', notes: '', done: false, media: [] });
        S.touch('video'); draw();
      }, { cls: 'btn-primary btn-sm', icon: 'plus' }),
      h('div', { style: { flex: 1 } }),
      h('span', { class: 'small muted', text: `${sc.shots.filter(s => s.done).length} of ${sc.shots.length} shot` })));

    if (!sc.shots.length) {
      box.append(empty('No shots yet',
        'Number them, describe them, attach a reference frame. On the day this becomes the running order.'));
      return box;
    }

    box.append(card(h('div', { class: 'row' },
      h('div', { style: { flex: 1 } }, progressBar(sc.shots.filter(s => s.done).length / sc.shots.length * 100)))));

    sc.shots.forEach((sh, i) => {
      box.append(h('div', { class: 'card', style: { marginTop: '10px' } },
        h('div', { class: 'row', style: { marginBottom: '10px' } },
          h('input', { type: 'checkbox', checked: !!sh.done, style: { accentColor: 'var(--accent)', width: '16px', height: '16px' },
            onChange: e => { sh.done = e.target.checked; S.touch('video'); draw(); } }),
          h('span', { class: 'mono', style: { fontWeight: 600 }, text: `S${String(i + 1).padStart(2, '0')}` }),
          h('input', { class: 'inline-inp', style: { flex: 1 }, placeholder: 'What happens in this shot',
            value: sh.desc || '', onInput: e => { sh.desc = e.target.value; S.touch('video'); } }),
          h('button', { class: 'icon-btn', html: '↑', title: 'Move up', onClick: () => { move(sc.shots, i, i - 1); S.touch('video'); draw(); } }),
          h('button', { class: 'icon-btn', html: '↓', title: 'Move down', onClick: () => { move(sc.shots, i, i + 1); S.touch('video'); draw(); } }),
          h('button', { class: 'icon-btn', html: '&times;', title: 'Delete', onClick: () => { sc.shots.splice(i, 1); S.touch('video'); draw(); } })),
        h('div', { class: 'grid g4' },
          selectField('Type', sh, 'type', ['Performance', 'Narrative', 'B-roll', 'Insert', 'Transition', 'BTS'], { slice: 'video' }),
          selectField('Framing', sh, 'angle', ['Wide', 'Medium', 'Close', 'Extreme close', 'Over shoulder', 'Top down', 'Handheld', 'Vertical 9:16'], { slice: 'video' }),
          field('Setup mins', sh, 'duration', { slice: 'video', type: 'number' }),
          field('Location', sh, 'location', { slice: 'video' })),
        field('Notes / direction', sh, 'notes', { slice: 'video', multiline: true, placeholder: 'Lens, movement, lighting, what the performer is doing' }),
        h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Storyboard frame / reference' }),
          mediaBlock(sh, 'video', `video/${sc.id}/shots`))));
    });

    return box;
  }

  /* ---------- locations ---------- */

  function locations(sc) {
    const box = h('div');
    box.append(h('div', { class: 'row', style: { marginBottom: '12px' } },
      btn('Add location', () => { sc.locations.push({ id: uid(), name: '', address: '', desc: '', permission: false, permissionNote: '', power: '', light: '', backup: '', media: [] }); S.touch('video'); draw(); }, { cls: 'btn-primary btn-sm', icon: 'plus' })));

    if (!sc.locations.length) return box.append(empty('No locations yet', 'Get location permission on the day. Chasing it later is misery.')), box;

    sc.locations.forEach((lo, i) => box.append(h('div', { class: 'card', style: { marginTop: '10px' } },
      h('div', { class: 'row', style: { marginBottom: '10px' } },
        h('input', { class: 'inline-inp', style: { flex: 1 }, placeholder: 'Location name',
          value: lo.name || '', onInput: e => { lo.name = e.target.value; S.touch('video'); } }),
        h('button', { class: 'icon-btn', html: '&times;', onClick: () => { sc.locations.splice(i, 1); S.touch('video'); draw(); } })),
      field('Address / how to get there', lo, 'address', { slice: 'video' }),
      field('Description — what it looks like and why it is right', lo, 'desc', { slice: 'video', multiline: true }),
      h('div', { class: 'grid g2' },
        field('Power & access', lo, 'power', { slice: 'video', placeholder: 'Sockets? Lift? Parking? Who has the key?' }),
        field('Light — best time of day', lo, 'light', { slice: 'video', placeholder: 'Golden hour 5.40–6.20pm; window is east-facing' })),
      h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: !!lo.permission, onChange: e => { lo.permission = e.target.checked; S.touch('video'); } }),
        h('span', { text: 'Written location permission obtained' })),
      field('Permission notes / contact', lo, 'permissionNote', { slice: 'video' }),
      field('If this location falls through', lo, 'backup', { slice: 'video', multiline: true }),
      h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Scouting photos' }), mediaBlock(lo, 'video', `video/${sc.id}/loc`)))));

    return box;
  }

  /* ---------- cast & crew ---------- */

  function people(sc) {
    const box = h('div');
    const group = (arr, title, roleHint) => {
      const c = card(cardHead(title,
        btn('Add', () => { arr.push({ id: uid(), name: '', role: '', contact: '', call: '', release: false, notes: '' }); S.touch('video'); draw(); }, { cls: 'btn-sm', icon: 'plus' })));
      if (!arr.length) { c.append(h('div', { class: 'small muted', text: 'Nobody added yet.' })); return c; }
      c.append(h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
        h('thead', {}, h('tr', {}, ['Name', 'Role', 'Contact', 'Call', 'Release signed', 'Notes', ''].map(t => h('th', { text: t })))),
        h('tbody', {}, arr.map((p, i) => h('tr', {},
          ...[['name', '120px'], ['role', '120px'], ['contact', '130px'], ['call', '80px']].map(([k, w]) =>
            h('td', {}, h('input', { class: 'inp', style: { padding: '4px 6px', minWidth: w }, placeholder: k === 'role' ? roleHint : '',
              value: p[k] || '', onInput: e => { p[k] = e.target.value; S.touch('video'); } }))),
          h('td', {}, h('input', { type: 'checkbox', checked: !!p.release, style: { accentColor: 'var(--accent)' },
            onChange: e => { p.release = e.target.checked; S.touch('video'); } })),
          h('td', {}, h('input', { class: 'inp', style: { padding: '4px 6px', minWidth: '150px' },
            value: p.notes || '', onInput: e => { p.notes = e.target.value; S.touch('video'); } })),
          h('td', {}, h('button', { class: 'icon-btn', html: '&times;', onClick: () => { arr.splice(i, 1); S.touch('video'); draw(); } }))))))));
      return c;
    };
    box.append(group(sc.cast, 'Cast — everyone on camera', 'Performer, extra…'));
    box.append(group(sc.crew, 'Crew — everyone behind it', 'DoP, gaffer, BTS…'));
    box.append(card(h('p', { class: 'small muted', style: { margin: 0 } },
      'Signed releases from every person on camera, on the day. A release chased three weeks later is a release you do not get.')));
    return box;
  }

  /* ---------- capture list ---------- */

  function capture(sc) {
    sc.captureDone = sc.captureDone || {};
    return h('div',
      card(h('p', { class: 'small muted', style: { margin: 0 } },
        'Target: 60+ discrete pieces of content from one shoot day. At 5 posts a week across platforms that covers T-30 → T+120 with room to improvise.')),
      card(cardHead('Non-negotiables'), checklist(CAPTURE_LIST, sc.captureDone, 'video', { prefix: 'c' })));
  }

  /* ---------- backup ---------- */

  function backup(sc) {
    return h('div',
      card(cardHead('If it rains, if someone drops out, if the location closes'),
        field(null, sc, 'backup', { slice: 'video', multiline: true, tall: true, autogrow: true,
          placeholder: 'Plan B for weather · plan B per location · who covers if a crew member cannot make it · what gets cut first if you run out of daylight · the minimum viable version of this day' })),
      card(cardHead('The one rule'),
        h('p', { class: 'small muted', style: { margin: 0 } },
          'Back up all footage twice before anyone leaves the location. Two physical copies, and if you can, one upload started before you go home. This is the only irreversible risk of the entire campaign.')));
  }

  draw();
  return root;
}
