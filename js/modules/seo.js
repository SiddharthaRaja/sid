/* ============================================================
   seo.js — Discovery: hashtags, keywords, YouTube fields,
   and what actually ranks on each platform
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, subtabs, selectField,
  toast, copy, confirmDelete, todayISO, fmtDate, prose,
} from '../ui.js';
import { PLATFORMS } from '../data/platforms.js';
import { icon, PCOLORS } from '../icons.js';
import { TIERS, tierOf, HASHTAG_SETS, TAG_RULES, BANNED_NOTE } from '../data/hashtags.js';
import { PLATFORM_SEO, YT_FIELDS, KEYWORD_PROMPTS, KEYWORD_USES } from '../data/seo.js';
import * as A from '../assist.js';
import { cut } from '../lint.js';

export function renderSeo(sub) {
  const root = h('div');
  const d = S.get('seo');
  let tab = ['tags', 'keywords', 'youtube', 'platforms'].includes(sub) ? sub : 'tags';

  const draw = () => {
    clear(root);
    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: 'Discovery' }),
        h('div', { class: 'sub', text: 'Hashtags, search phrases, and what each platform actually reads.' })),
      h('div', { class: 'spacer' })));

    root.append(subtabs([['tags', 'Hashtags'], ['keywords', 'Keywords'], ['youtube', 'YouTube'], ['platforms', 'By platform']],
      tab, k => { tab = k; draw(); }));

    if (tab === 'keywords')  { root.append(keywordPane()); return; }
    if (tab === 'youtube')   { root.append(youtubePane()); return; }
    if (tab === 'platforms') { root.append(platformPane()); return; }
    root.append(tagPane());
  };

  /* ---------------------------------------------------------- */
  /*  hashtags                                                   */
  /* ---------------------------------------------------------- */

  function tagPane() {
    if (!d.sets) { d.sets = HASHTAG_SETS.map(s => ({ ...s, tags: s.tags.map(t => ({ ...t })), used: 0, lastUsed: '' })); S.touch('seo'); }
    const box = h('div');

    box.append(card(
      cardHead('How the tiers work'),
      h('div', { class: 'grid g3' }, TIERS.map(t => h('div', { class: 'stat' },
        h('div', { class: 'k', text: t.label }),
        h('div', { class: 'v', style: { fontSize: '15px' }, text: t.range }),
        h('div', { class: 'd', text: t.note })))),
      h('p', { class: 'small muted', style: { marginTop: '12px' }, text: BANNED_NOTE })));

    box.append(card(
      cardHead('Your sets', btn('New set', () => openSet(null), { cls: 'btn-sm btn-primary', icon: 'plus' })),
      h('p', { class: 'small muted' },
        'Rotate between sets rather than pasting one block every time. The used count is there so you can see when a set is getting stale.')));

    const sorted = d.sets.slice().sort((a, b) => (a.used || 0) - (b.used || 0));
    sorted.forEach(s => box.append(setCard(s)));

    return box;

    function setCard(s) {
      const rule = TAG_RULES[s.platform] || {};
      const block = s.tags.map(t => '#' + t.t).join(' ');
      const counts = TIERS.map(t => [t.label, s.tags.filter(x => x.tier === t.key).length]);

      return card(
        cardHead(s.name,
          h('span', { class: 'tag', text: `${s.tags.length} tags` }),
          s.used ? h('span', { class: 'small muted', text: `used ${s.used}×${s.lastUsed ? ' · ' + fmtDate(s.lastUsed) : ''}` })
                 : h('span', { class: 'small muted', text: 'never used' })),
        h('div', { class: 'row', style: { flexWrap: 'wrap', gap: '6px' } },
          s.tags.map(t => h('span', { class: `tagchip t-${t.tier}`, title: tierOf(t.tier).range }, '#' + t.t))),
        rule.sweet ? h('div', { class: 'small muted', style: { marginTop: '10px' },
          text: `${s.platform}: ${rule.sweet} is the sweet spot${rule.max ? `, ${rule.max} is the cap` : ''}. ${rule.note}` }) : null,
        h('div', { class: 'small muted', style: { marginTop: '4px' },
          text: counts.filter(c => c[1]).map(c => `${c[1]} ${c[0].toLowerCase()}`).join(' · ') }),
        h('div', { class: 'row', style: { marginTop: '12px' } },
          btn('Copy block', () => {
            copy(block);
            s.used = (s.used || 0) + 1; s.lastUsed = todayISO(); S.touch('seo');
            setTimeout(draw, 300);
          }, { cls: 'btn-sm btn-primary' }),
          btn('Edit', () => openSet(s), { cls: 'btn-sm' }),
          btn('Delete', () => confirmDelete(s.name, () => {
            d.sets.splice(d.sets.indexOf(s), 1); S.touch('seo'); draw();
          }), { cls: 'btn-sm btn-ghost btn-danger' })));
    }

    function openSet(existing) {
      const isNew = !existing;
      const s = existing || { id: uid(), name: '', platform: 'instagram', use: '', tags: [], used: 0, lastUsed: '' };
      const listBox = h('div');

      const drawList = () => {
        clear(listBox);
        s.tags.forEach((t, i) => listBox.append(h('div', { class: 'row', style: { marginBottom: '6px' } },
          h('input', { class: 'inp', value: t.t, placeholder: 'tag without the #',
            onInput: (e) => { t.t = e.target.value.replace(/^#/, '').replace(/\s/g, ''); S.touch('seo'); } }),
          h('div', { class: 'seg' }, TIERS.map(tr => h('button', { class: t.tier === tr.key ? 'on' : '',
            onClick: () => { t.tier = tr.key; S.touch('seo'); drawList(); } }, tr.label))),
          h('button', { class: 'icon-btn', html: '&times;', onClick: () => { s.tags.splice(i, 1); S.touch('seo'); drawList(); } }))));
      };
      drawList();

      const ai = A.hasKey() ? btn('Suggest from a post', async (e) => {
        const b = e.target.closest('button'); b.disabled = true; b.textContent = 'thinking…';
        try {
          const set = S.get('settings');
          const text = await A.tagIdeas(`${set.song || 'the single'} — ${set.genre || ''} ${set.comps || ''}`, s.platform, set);
          text.split('\n').map(x => x.trim()).filter(Boolean).forEach(line => {
            const m = line.match(/^#?([\p{L}\p{N}_]+)\s*[—-]\s*(niche|mid|big)/iu);
            if (m) s.tags.push({ t: m[1], tier: m[2].toLowerCase() });
          });
          S.touch('seo'); drawList();
        } catch (err) { toast(err.message, 4000); }
        b.disabled = false; b.textContent = 'Suggest from a post';
      }, { cls: 'btn-sm' }) : null;

      modal({
        title: isNew ? 'New hashtag set' : 'Edit set',
        wide: true,
        body: h('div',
          h('div', { class: 'grid g2' },
            field('Name', s, 'name', { placeholder: 'Instagram — release day' }),
            selectField('Platform', s, 'platform', PLATFORMS.map(p => [p.key, p.name]))),
          h('div', { class: 'hr' }),
          listBox,
          h('div', { class: 'row', style: { marginTop: '8px' } },
            btn('Add a tag', () => { s.tags.push({ t: '', tier: 'niche' }); S.touch('seo'); drawList(); }, { cls: 'btn-sm' }),
            ai)),
        actions: [{ label: 'Done', cls: 'btn-primary', onClick: () => {
          if (isNew && (s.name || s.tags.length)) { s.name = s.name || 'Untitled set'; d.sets.push(s); }
          S.touch('seo'); draw();
        } }],
        onClose: draw,
      });
    }
  }

  /* ---------------------------------------------------------- */
  /*  keywords                                                   */
  /* ---------------------------------------------------------- */

  function keywordPane() {
    d.keywords = d.keywords || [];
    const box = h('div');

    box.append(card(
      cardHead('Search phrases', btn('Add', () => {
        d.keywords.push({ id: uid(), k: '', used: {} }); S.touch('seo'); draw();
      }, { cls: 'btn-sm btn-primary', icon: 'plus' })),
      h('p', { class: 'small muted' },
        'Twenty phrases a listener would actually type. These go in captions, the YouTube title, the Spotify pitch and the words you say out loud on TikTok — the same phrases everywhere, which is the whole point.'),
      d.keywords.length
        ? h('div', {}, d.keywords.map(k => h('div', { class: 'row', style: { marginBottom: '6px' } },
            h('input', { class: 'inp', value: k.k, placeholder: 'sad indie pop india',
              onInput: (e) => { k.k = e.target.value; S.touch('seo'); } }),
            btn('Copy', () => copy(k.k), { cls: 'btn-sm btn-ghost' }),
            h('button', { class: 'icon-btn', html: '&times;',
              onClick: () => { d.keywords.splice(d.keywords.indexOf(k), 1); S.touch('seo'); draw(); } }))))
        : h('div', { class: 'small muted', text: 'Empty. Six prompts below to fill it from.' }),
      A.hasKey() ? h('div', { style: { marginTop: '12px' } },
        btn('Suggest 20', async (e) => {
          const b = e.target.closest('button'); b.disabled = true; b.textContent = 'thinking…';
          try {
            const text = await A.keywords(S.get('settings'));
            text.split('\n').map(x => x.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean)
              .forEach(k => d.keywords.push({ id: uid(), k, used: {} }));
            S.touch('seo'); draw();
          } catch (err) { toast(err.message, 4000); b.disabled = false; b.textContent = 'Suggest 20'; }
        }, { cls: 'btn-sm' })) : null));

    box.append(card(cardHead('Where they come from'),
      h('ul', { class: 'prose' }, KEYWORD_PROMPTS.map(p => h('li', { text: p })))));

    box.append(card(cardHead('Where each one has to appear'),
      h('div', { class: 'list' }, KEYWORD_USES.map(([k, label]) => h('div', { class: 'item' },
        h('div', { class: 'item-head' }, h('span', { class: 'item-title', text: label })))))));

    return box;
  }

  /* ---------------------------------------------------------- */
  /*  youtube                                                    */
  /* ---------------------------------------------------------- */

  function youtubePane() {
    d.yt = d.yt || { title: '', desc: '', tags: '' };
    const box = h('div');
    const set = S.get('settings');

    YT_FIELDS.forEach(f => {
      const counter = h('div', { class: 'small muted', style: { textAlign: 'right' } });
      const paint = () => {
        const n = (d.yt[f.key] || '').length;
        counter.textContent = `${n} / ${f.limit}`;
        counter.style.color = n > f.limit ? 'var(--bad)' : '';
      };
      const input = field(null, d.yt, f.key, {
        slice: 'seo', multiline: f.key !== 'title', tall: f.key === 'desc',
        placeholder: f.key === 'title' ? `${set.song || '[SONG]'} (Official Video) — ${set.artist || '[ARTIST]'}` : '',
        onInput: paint,
      });
      paint();
      const extra = h('div');
      if (f.key === 'desc') {
        const preview = h('div', { class: 'pv-body', style: { marginTop: '8px' } });
        const paintPv = () => {
          clear(preview);
          const t = d.yt.desc || '';
          const [shown, hidden] = cut(t, 157);
          preview.append(h('span', { text: shown }));
          if (hidden) {
            preview.append(h('span', { class: 'pv-more', text: ' SHOW MORE' }));
            preview.append(h('span', { class: 'pv-hidden', text: hidden }));
          }
        };
        paintPv();
        input.addEventListener('input', paintPv);
        extra.append(h('div', { class: 'small muted', style: { marginTop: '10px' }, text: 'What shows above "Show more":' }), preview);
      }
      box.append(card(cardHead(f.label,
        btn('Copy', () => copy(d.yt[f.key] || ''), { cls: 'btn-sm btn-ghost' })),
        h('p', { class: 'small muted', text: f.note }),
        input, counter, extra));
    });

    if (A.hasKey()) {
      box.append(card(cardHead('Draft the description'),
        h('p', { class: 'small muted', text: 'Uses the song details from the Release tab; anything it does not know comes back as a [bracket].' }),
        btn('Write one', async (e) => {
          const b = e.target.closest('button'); b.disabled = true; b.textContent = 'thinking…';
          try {
            d.yt.desc = await A.ytDescription(`${set.song || 'the single'} official video`, set);
            S.touch('seo'); draw();
          } catch (err) { toast(err.message, 4000); b.disabled = false; b.textContent = 'Write one'; }
        }, { cls: 'btn-sm btn-primary' })));
    }

    box.append(card(cardHead('The order that matters'),
      prose(`1. **Thumbnail** — click-through rate beats everything else on this page combined. Legible at phone size or it does not exist.
2. **Title** — the searchable phrase first, your name second. About 60 characters show on mobile.
3. **First two lines of the description** — indexed, and the only part anyone sees.
4. **Watch time** — which is the song's job, not the metadata's.
5. Tags, at a distant fifth. Ten is plenty; a wall of them is a smell.`)));

    return box;
  }

  /* ---------------------------------------------------------- */
  /*  by platform                                                */
  /* ---------------------------------------------------------- */

  function platformPane() {
    const box = h('div');
    PLATFORMS.forEach(p => {
      const s = PLATFORM_SEO[p.key];
      if (!s) return;
      box.append(card(
        cardHead(p.name,
          h('span', { html: icon(p.icon), style: { color: PCOLORS[p.key], display: 'flex' } }),
          h('a', { class: 'small', href: `#/p/${p.key}`, text: 'open tab' })),
        h('p', { class: 'small', style: { color: 'var(--fg-2)' }, text: s.ranks }),
        s.do?.length ? h('ul', { class: 'prose' }, s.do.map(x => h('li', { text: x }))) : null,
        s.dont?.length ? h('div', {},
          h('div', { class: 'small', style: { color: 'var(--warn)', marginTop: '6px' }, text: 'Do not:' }),
          h('ul', { class: 'prose' }, s.dont.map(x => h('li', { text: x })))) : null));
    });
    return box;
  }

  draw();
  return root;
}
