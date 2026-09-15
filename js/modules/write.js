/* ============================================================
   write.js — the writing desk

   Batch: ten captions in one screen instead of ten modals.
   Bank:  hooks, endings and your own saved lines.
   Swipe: captions from other people, kept to steal shapes from.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, subtabs, selectField,
  toast, copy, confirmDelete, todayISO, fmtDate,
} from '../ui.js';
import { PLATFORMS } from '../data/platforms.js';
import { icon, PCOLORS } from '../icons.js';
import { HOOKS, HOOK_KINDS, CTAS, OPENERS, TRANSITIONS, STRUCTURES } from '../data/phrasebank.js';
import { fillTemplate } from '../data/templates.js';
import { lintSummary } from '../lint.js';
import { writingAids, phraseModal, recentBodies } from './compose.js';
import { scheduleRow } from './shared.js';

export function renderWrite(sub) {
  const root = h('div');
  const w = S.get('write');
  let tab = ['batch', 'bank', 'swipe'].includes(sub) ? sub : 'batch';

  const draw = () => {
    clear(root);
    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: 'Writing desk' }),
        h('div', { class: 'sub', text: 'Write several at once, steal a shape, or find a first line.' })),
      h('div', { class: 'spacer' })));

    root.append(subtabs([['batch', 'Batch write'], ['bank', 'Hooks & phrases'], ['swipe', 'Swipe file']],
      tab, k => { tab = k; draw(); }));

    if (tab === 'bank')  { root.append(bankPane()); return; }
    if (tab === 'swipe') { root.append(swipePane()); return; }
    root.append(batchPane());
  };

  /* ---------------------------------------------------------- */
  /*  batch write                                                */
  /* ---------------------------------------------------------- */

  function batchPane() {
    w.batch = w.batch || { platform: 'instagram', type: 'caption', rows: [], when: '' };
    const b = w.batch;
    const box = h('div');

    const plat = () => PLATFORMS.find(p => p.key === b.platform) || PLATFORMS[0];
    const type = () => plat().types.find(t => t.key === b.type) || plat().types[0];

    const ensure = (n = 3) => {
      while (b.rows.length < n) b.rows.push({ id: uid(), body: '', title: '' });
    };
    ensure();

    const rowsBox = h('div');
    const saveBtn = btn('Save to the bank', save, { cls: 'btn-primary' });
    const refreshSave = () => {
      const n = b.rows.filter(r => (r.body || '').trim()).length;
      saveBtn.lastChild.textContent = n ? `Save ${n} to ${plat().name}` : `Nothing to save yet`;
      saveBtn.disabled = !n;
    };

    const drawRows = () => {
      clear(rowsBox);
      const t = type();
      b.rows.forEach((r, i) => {
        const ta = h('textarea', {
          class: 'inp tall', rows: 4, value: r.body,
          placeholder: i === 0 ? (t.hint || 'Write it exactly as it will be posted…') : 'Next one…',
          onInput: (e) => { r.body = e.target.value; S.touch('write'); paint(); refreshSave(); },
        });
        const meta = h('div', { class: 'row small muted', style: { marginTop: '4px' } });
        const paint = () => {
          clear(meta);
          const n = (r.body || '').length;
          const sum = lintSummary(r.body, { platform: b.platform, type: b.type, limit: t.limit, recent: recentBodies(b.platform) });
          meta.append(
            h('span', { text: t.limit ? `${n}/${t.limit}` : `${n} characters`,
              style: t.limit && n > t.limit ? { color: 'var(--bad)' } : {} }),
            h('span', { class: `tag ${sum.level === 'ok' ? 'ok' : sum.level === 'bad' ? 'bad' : 'warn'}`, text: sum.text }),
            h('div', { style: { flex: 1 } }),
            btn('Aids', () => openAids(r, drawRows), { cls: 'btn-sm btn-ghost' }),
            btn('Hook', () => phraseModal({ platform: b.platform, onInsert: (x) => {
              r.body = r.body ? `${x}\n\n${r.body}` : x; S.touch('write'); drawRows();
            } }), { cls: 'btn-sm btn-ghost' }),
            r.body ? btn('Clear', () => { r.body = ''; S.touch('write'); drawRows(); }, { cls: 'btn-sm btn-ghost' }) : null);
        };
        paint();
        rowsBox.append(h('div', { class: 'batch-row' },
          h('div', { class: 'batch-n mono', text: String(i + 1) }),
          h('div', { style: { flex: 1, minWidth: 0 } }, ta, meta)));
      });
    };

    function openAids(r, after) {
      const aids = writingAids({
        getText: () => r.body,
        setText: (t) => { r.body = t; S.touch('write'); },
        platform: b.platform, type: b.type,
      });
      aids.setLimit(type().limit);
      modal({
        title: `Draft ${b.rows.indexOf(r) + 1}`,
        wide: true,
        body: h('div',
          h('textarea', { class: 'inp tall', rows: 7, value: r.body,
            onInput: (e) => { r.body = e.target.value; S.touch('write'); aids.refresh(); } }),
          aids.el),
        actions: [{ label: 'Done', cls: 'btn-primary' }],
        onClose: after,
      });
    }

    drawRows();
    refreshSave();

    box.append(card(
      cardHead('What are you writing?'),
      h('div', { class: 'grid g3' },
        selectField('Platform', b, 'platform', PLATFORMS.map(p => [p.key, p.name]), {
          slice: 'write', onChange: () => { b.type = plat().types[0].key; S.touch('write'); draw(); } }),
        selectField('Type', b, 'type', plat().types.map(t => [t.key, t.label]), { slice: 'write', onChange: () => draw() }),
        h('div', { class: 'field' },
          h('span', { class: 'lab', text: 'How many' }),
          h('div', { class: 'row' },
            [3, 5, 10].map(n => h('button', { class: `chip ${b.rows.length === n ? 'on' : ''}`,
              onClick: () => { ensure(n); S.touch('write'); draw(); } }, String(n))))) ),
      type().hint ? h('p', { class: 'small muted', text: type().hint }) : null));

    box.append(card(cardHead('Drafts'), rowsBox,
      h('div', { class: 'row', style: { marginTop: '12px' } },
        btn('Add another', () => { b.rows.push({ id: uid(), body: '', title: '' }); S.touch('write'); draw(); }, { cls: 'btn-sm' }))));

    box.append(card(
      cardHead('Where they land'),
      h('p', { class: 'small muted' },
        'Saving drops each non-empty draft into the platform\'s content bank as a draft. Give them a starting offset and each one lands a few days after the last.'),
      scheduleRow(b, 'write', null, { key: 'when', label: 'First one at' }),
      h('div', { class: 'row', style: { marginTop: '12px' } },
        saveBtn,
        btn('Clear the desk', () => confirmDelete('every draft on the desk', () => {
          b.rows = []; ensure(); S.touch('write'); draw();
        }), { cls: 'btn-ghost btn-danger btn-sm' }))));

    function save() {
      const live = b.rows.filter(r => r.body.trim());
      if (!live.length) { toast('Nothing written yet'); return; }
      const slice = `p_${b.platform}`;
      const store = S.get(slice);
      store.content = store.content || {};
      store.content[b.type] = store.content[b.type] || [];

      live.forEach((r, i) => {
        store.content[b.type].push({
          id: uid(),
          title: r.title || (r.body.split('\n')[0] || '').slice(0, 40),
          body: r.body,
          status: 'draft',
          when: stepWhen(b.when, i * 3),
          media: [],
        });
      });
      S.touch(slice);
      b.rows = []; ensure(); S.touch('write');
      toast(`${live.length} saved to ${plat().name}`);
      draw();
    }

    return box;
  }

  /* ---------------------------------------------------------- */
  /*  hooks & phrases                                            */
  /* ---------------------------------------------------------- */

  function bankPane() {
    w.phrases = w.phrases || [];
    const box = h('div');

    box.append(card(
      cardHead('Your saved lines', btn('Save a phrase', () => {
        const p = { id: uid(), text: '', tag: '' };
        modal({
          title: 'Save a phrase',
          body: h('div',
            field('The line', p, 'text', { multiline: true, placeholder: 'Anything you want to reuse. [BRACKETS] fill from the Release tab.' }),
            field('Tag', p, 'tag', { placeholder: 'hook, cta, bio…' })),
          actions: [{ label: 'Cancel' }, { label: 'Save', cls: 'btn-primary', onClick: () => {
            if (!p.text.trim()) return;
            w.phrases.push(p); S.touch('write'); draw();
          } }],
        });
      }, { cls: 'btn-sm btn-primary' })),
      w.phrases.length
        ? h('div', { class: 'list' }, w.phrases.map(p => h('div', { class: 'item' },
            h('div', { class: 'item-head' },
              h('span', { class: 'item-title', text: p.text }),
              p.tag ? h('span', { class: 'tag', text: p.tag }) : null),
            h('div', { class: 'row', style: { marginTop: '6px' } },
              btn('Copy', () => copy(fillTemplate(p.text, S.get('settings'))), { cls: 'btn-sm btn-ghost' }),
              btn('Delete', () => { w.phrases.splice(w.phrases.indexOf(p), 1); S.touch('write'); draw(); }, { cls: 'btn-sm btn-ghost btn-danger' })))))
        : h('div', { class: 'small muted', text: 'Nothing yet. When a line works, save it here rather than digging through old posts for it.' })));

    const group = (title, items, note) => {
      const c = card(cardHead(title, h('span', { class: 'small muted mono', text: String(items.length) })));
      if (note) c.append(h('p', { class: 'small muted', text: note }));
      c.append(h('div', { class: 'list' }, items.map(x => h('div', { class: 'item', style: { cursor: 'pointer' },
        onClick: () => copy(fillTemplate(x.text || x, S.get('settings'))) },
        h('div', { class: 'item-head' },
          h('span', { class: 'item-title', text: fillTemplate(x.text || x, S.get('settings')) }),
          x.kind ? h('span', { class: 'tag', text: x.kind }) : null)))));
      return c;
    };

    HOOK_KINDS.forEach(([k, label]) => {
      const items = HOOKS.filter(x => x.kind === k);
      if (items.length) box.append(group(`Hooks — ${label}`, items));
    });
    box.append(group('Endings', CTAS, 'One ask per post. Two asks is zero asks.'));
    box.append(group('Openers & transitions', [...OPENERS, ...TRANSITIONS].map(t => ({ text: t }))));

    box.append(card(cardHead('Shapes that work'),
      h('div', { class: 'list' }, STRUCTURES.map(st => h('div', { class: 'item' },
        h('div', { class: 'item-head' }, h('span', { class: 'item-title', text: st.label })),
        h('div', { class: 'item-meta' }, h('span', { text: st.note })))))));

    box.append(h('p', { class: 'small muted', style: { marginTop: '10px' }, text: 'Tap any line to copy it.' }));
    return box;
  }

  /* ---------------------------------------------------------- */
  /*  swipe file                                                 */
  /* ---------------------------------------------------------- */

  function swipePane() {
    w.swipe = w.swipe || [];
    const box = h('div');

    const open = (existing) => {
      const isNew = !existing;
      const s = existing || { id: uid(), text: '', who: '', why: '', platform: '', added: todayISO() };
      modal({
        title: isNew ? 'Add to the swipe file' : 'Swipe',
        wide: true,
        body: h('div',
          field('The post', s, 'text', { multiline: true, tall: true, placeholder: 'Paste the caption exactly as they wrote it.' }),
          h('div', { class: 'grid g2' },
            field('Who', s, 'who', { placeholder: 'artist or account' }),
            field('Where', s, 'platform', { placeholder: 'Instagram, TikTok…' })),
          field('Why it works', s, 'why', { multiline: true, placeholder: 'The thing you want to steal — the shape, not the words.' })),
        actions: [
          !isNew ? { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => { w.swipe.splice(w.swipe.indexOf(s), 1); S.touch('write'); draw(); } } : null,
          'spacer',
          { label: 'Save', cls: 'btn-primary', onClick: () => {
            if (!s.text.trim()) return;
            if (isNew) w.swipe.unshift(s);
            S.touch('write'); draw();
          } },
        ].filter(Boolean),
      });
    };

    box.append(card(
      cardHead('Swipe file', btn('Add one', () => open(null), { cls: 'btn-sm btn-primary', icon: 'plus' })),
      h('p', { class: 'small muted' },
        'Captions from other people that made you stop scrolling. Keep the reason, not just the post — the reason is the reusable part.')));

    if (!w.swipe.length) {
      box.append(empty('Nothing saved yet', 'Next time a post works on you, paste it here and write one line about why.'));
      return box;
    }

    box.append(h('div', { class: 'list' }, w.swipe.map(s => h('div', { class: 'item', style: { cursor: 'pointer' }, onClick: () => open(s) },
      h('div', { class: 'item-head' },
        h('span', { class: 'item-title', text: s.who || 'Unknown' }),
        s.platform ? h('span', { class: 'tag', text: s.platform }) : null,
        h('span', { class: 'small muted', text: fmtDate(s.added) })),
      h('div', { class: 'item-body', text: s.text }),
      s.why ? h('div', { class: 'item-meta' }, h('span', { text: s.why })) : null))));

    return box;
  }

  draw();
  return root;
}

/* Step a T-offset or a date forward by n days, keeping its notation. */
function stepWhen(when, n) {
  const s = String(when || '').trim();
  if (!s) return '';
  const m = s.match(/^T\s*([+-]\s*\d+)?$/i);
  if (m) {
    const cur = (m[1] ? parseInt(m[1].replace(/\s/g, ''), 10) : 0) + n;
    return cur === 0 ? 'T' : cur > 0 ? `T+${cur}` : `T${cur}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return s;
}
