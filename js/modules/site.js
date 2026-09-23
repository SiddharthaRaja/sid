/* ============================================================
   site.js — the website: scenes, easter eggs, and what it needs

   A scroll site is a list of scenes and a list of assets. Keeping
   both here means the build never stalls on "what image goes in
   the third section again".
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, subtabs, selectField,
  toast, copy, download, confirmDelete, todayISO, fmtDate, prose,
  removeFrom
} from '../ui.js';
import { SCENE_SEED, EGG_SEED, SITE_NOTES } from '../data/website.js';
import { scheduleRow } from './shared.js';

export function renderSite(sub) {
  const root = h('div');
  const w = S.get('site');
  let tab = ['scenes', 'eggs', 'notes'].includes(sub) ? sub : 'scenes';

  if (!w.scenes) { w.scenes = SCENE_SEED.map(s => ({ ...s })); S.touch('site'); }
  if (!w.eggs)   { w.eggs = EGG_SEED.map(s => ({ ...s })); S.touch('site'); }

  const draw = () => {
    clear(root);
    const done = w.scenes.filter(s => s.done).length;
    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: 'Website' }),
        h('div', { class: 'sub', text: `One page, ${w.scenes.length} scenes, ${w.eggs.length} hidden pages · ${done}/${w.scenes.length} built` })),
      h('div', { class: 'spacer' }),
      h('div', { class: 'page-actions' }, btn('Build brief', brief, { cls: 'btn-sm' }))));

    root.append(subtabs([['scenes', 'Scenes'], ['eggs', 'Easter eggs'], ['notes', 'What will bite you']],
      tab, k => { tab = k; draw(); }));

    if (tab === 'eggs')  { root.append(eggPane()); return; }
    if (tab === 'notes') { root.append(notesPane()); return; }
    root.append(scenePane());
  };

  /* ---------------- scenes ---------------- */

  function scenePane() {
    const box = h('div');

    box.append(card(
      cardHead('The scroll', btn('Add a scene', () => openScene(null), { cls: 'btn-sm btn-primary', icon: 'plus' })),
      h('p', { class: 'small muted' },
        'In order, top to bottom. Each one is a screen of the page — if it cannot be described in a sentence it is two scenes.')));

    w.scenes.forEach((s, i) => box.append(sceneRow(s, i)));
    return box;

    function sceneRow(s, i) {
      return h('div', { class: 'item', style: { borderLeft: `3px solid ${s.done ? 'var(--ok)' : 'var(--line)'}` } },
        h('div', { class: 'item-head' },
          h('input', { type: 'checkbox', checked: !!s.done, style: { accentColor: 'var(--accent)' },
            onChange: (e) => { s.done = e.target.checked; S.touch('site'); draw(); } }),
          h('span', { class: 'three-n mono', text: String(i + 1) }),
          h('span', { class: 'item-title', text: s.name }),
          h('span', { class: 'tag', text: s.kind }),
          h('button', { class: 'icon-btn', style: { marginLeft: 'auto' }, html: '⋯', onClick: () => openScene(s) })),
        h('div', { class: 'small', style: { color: 'var(--fg-2)', marginTop: '4px' }, text: s.brief }),
        h('div', { class: 'item-meta' },
          s.assets ? h('span', { text: `needs: ${s.assets}` }) : null),
        s.tech ? h('div', { class: 'small muted', style: { marginTop: '4px' }, text: s.tech }) : null,
        h('div', { class: 'row', style: { marginTop: '6px', gap: '6px' } },
          i > 0 ? btn('↑', () => { const t = w.scenes[i - 1]; w.scenes[i - 1] = s; w.scenes[i] = t; S.touch('site'); draw(); }, { cls: 'btn-sm btn-ghost' }) : null,
          i < w.scenes.length - 1 ? btn('↓', () => { const t = w.scenes[i + 1]; w.scenes[i + 1] = s; w.scenes[i] = t; S.touch('site'); draw(); }, { cls: 'btn-sm btn-ghost' }) : null));
    }

    function openScene(existing) {
      const isNew = !existing;
      const s = existing || { id: uid(), name: '', kind: 'image', brief: '', assets: '', tech: '', done: false };
      modal({
        title: isNew ? 'New scene' : s.name || 'Scene',
        wide: true,
        body: h('div',
          h('div', { class: 'grid g2' },
            field('Name', s, 'name', { slice: 'site' }),
            selectField('Kind', s, 'kind', ['image', 'video', 'audio', 'text', 'interactive', 'cta'], { slice: 'site' })),
          field('What happens', s, 'brief', { slice: 'site', multiline: true }),
          field('Assets it needs', s, 'assets', { slice: 'site', placeholder: '2400×3200 halftone still' }),
          field('Technical note', s, 'tech', { slice: 'site', multiline: true })),
        actions: [
          !isNew ? { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => { removeFrom(w.scenes, s); S.touch('site'); draw(); } } : null,
          'spacer',
          { label: 'Save', cls: 'btn-primary', onClick: () => { if (isNew && !s.name) { toast('Give the scene a name first — nothing has been lost', 3000); return false; }
            if (isNew) w.scenes.push(s); S.touch('site'); draw(); } },
        ].filter(Boolean),
      });
    }
  }

  /* ---------------- easter eggs ---------------- */

  function eggPane() {
    const box = h('div');
    box.append(card(
      cardHead('Hidden pages', btn('Add one', () => openEgg(null), { cls: 'btn-sm btn-primary', icon: 'plus' })),
      h('p', { class: 'small muted' },
        'The findability column is the one that matters. An easter egg nobody finds is a page you built for nobody — so each one names who is expected to find it.')));

    box.append(h('div', { class: 'list' }, w.eggs.map(e => h('div', { class: 'item', style: { cursor: 'pointer' }, onClick: () => openEgg(e) },
      h('div', { class: 'item-head' },
        h('input', { type: 'checkbox', checked: !!e.done, style: { accentColor: 'var(--accent)' },
          onClick: (ev) => ev.stopPropagation(),
          onChange: (ev) => { e.done = ev.target.checked; S.touch('site'); draw(); } }),
        h('span', { class: 'item-title', text: e.name }),
        h('span', { class: 'tag mono', text: e.leads })),
      h('div', { class: 'item-meta' },
        h('span', { text: `trigger: ${e.trigger}` }),
        h('span', { text: e.findable })),
      e.reward ? h('div', { class: 'small', style: { color: 'var(--fg-2)', marginTop: '4px' }, text: `Reward: ${e.reward}` }) : null))));

    box.append(card(cardHead('Rules for hidden pages'),
      prose(`- Every hidden page is still a real page: a title, an OG image, and a way back to the main site. Otherwise every share of it looks broken.
- Tell nobody, but make at least one egg findable by accident. If all five need prior knowledge, nobody ever learns there are eggs at all.
- \`robots.txt\` should not hide them. Being indexed is how the second wave finds them.
- Keep a list of which are live — a broken easter egg is the most embarrassing kind of broken.`)));

    return box;

    function openEgg(existing) {
      const isNew = !existing;
      const e = existing || { id: uid(), name: '', trigger: '', leads: '/', reward: '', findable: '', done: false };
      modal({
        title: isNew ? 'New easter egg' : e.name || 'Easter egg',
        wide: true,
        body: h('div',
          h('div', { class: 'grid g2' },
            field('Name', e, 'name', { slice: 'site' }),
            field('Path', e, 'leads', { slice: 'site', placeholder: '/unreleased' })),
          field('What triggers it', e, 'trigger', { slice: 'site', multiline: true }),
          field('What they get', e, 'reward', { slice: 'site', multiline: true }),
          field('Who will realistically find it', e, 'findable', { slice: 'site' })),
        actions: [
          !isNew ? { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => { removeFrom(w.eggs, e); S.touch('site'); draw(); } } : null,
          'spacer',
          { label: 'Save', cls: 'btn-primary', onClick: () => { if (isNew && !e.name) { toast('Give it a name first — nothing has been lost', 3000); return false; }
            if (isNew) w.eggs.push(e); S.touch('site'); draw(); } },
        ].filter(Boolean),
      });
    }
  }

  /* ---------------- notes ---------------- */

  function notesPane() {
    return h('div',
      card(cardHead('Things that will bite you'),
        h('ul', { class: 'prose' }, SITE_NOTES.map(n => h('li', { text: n })))),
      card(cardHead('Where it lives'),
        prose(`The site is static, so it goes in the same GitHub Pages setup Sid already uses — either a second repo published at its own domain, or a folder in this one served at a subpath.

Buy the domain first (it is milestone A in the master plan), point it at Pages, and put the smart link on the site rather than the other way round: the domain is the one address you own forever, and every platform in this app is rented.`)),
      card(cardHead('Notes'),
        field(null, w, 'notes', { slice: 'site', multiline: true, tall: true,
          placeholder: 'Anything about the build — copy ideas, references, what the developer said.' })));
  }

  /* ---------------- brief export ---------------- */

  function brief() {
    const set = S.get('settings');
    const lines = [
      `# Website brief — ${set.artist || '[artist]'}`, '',
      `One scrolling page with ${w.eggs.length} hidden pages behind it.`, '',
      '## Scenes', '',
    ];
    w.scenes.forEach((s, i) => {
      lines.push(`### ${i + 1}. ${s.name} (${s.kind})`, '', s.brief || '', '');
      if (s.assets) lines.push(`- Assets: ${s.assets}`);
      if (s.tech) lines.push(`- Note: ${s.tech}`);
      lines.push('');
    });
    lines.push('## Hidden pages', '');
    w.eggs.forEach(e => lines.push(`- **${e.name}** → \`${e.leads}\` — ${e.trigger}. ${e.reward}`));
    lines.push('', '## Technical requirements', '');
    SITE_NOTES.forEach(n => lines.push(`- ${n}`));
    download(`website-brief-${todayISO()}.md`, lines.join('\n'), 'text/markdown');
    toast('Brief saved');
  }

  draw();
  return root;
}
