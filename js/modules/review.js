/* ============================================================
   review.js — the weekly review
   Pick a week. Sid assembles what actually happened from every
   module; you write the part only you can write. Saved reviews
   accumulate into the T+90 post-mortem.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, stat, subtabs, modal,
  fmtDate, tLabel, resolveDate, todayISO, addDays, daysBetween, fmtNum,
  toISO, fromISO, MONTHS, DOW, download, copy, toast, confirmDelete,
} from '../ui.js';
import { PLATFORMS } from '../data/platforms.js';
import { icon, PCOLORS } from '../icons.js';
import { barRows, withTable } from '../charts.js';
import { progressBar } from './shared.js';

/* Monday of the week containing iso. */
const mondayOf = (iso) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toISO(d);
};
const weekLabel = (start) => {
  const end = addDays(start, 6);
  const a = fromISO(start), b = fromISO(end);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`
    : `${a.getDate()} ${MONTHS[a.getMonth()].slice(0, 3)} – ${b.getDate()} ${MONTHS[b.getMonth()].slice(0, 3)} ${b.getFullYear()}`;
};

export function renderReview(sub) {
  const root = h('div');
  const st = S.get('review');
  const set = S.get('settings');
  st.reviews = st.reviews || [];

  /* default to the last completed week */
  let weekStart = mondayOf(addDays(todayISO(), -7));
  let tab = ['week', 'past'].includes(sub) ? sub : 'week';

  const draw = () => {
    clear(root);
    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: 'Weekly review' }),
        h('div', { class: 'sub', text: 'Fifteen minutes a week. This is what makes the campaign post-mortem write itself.' })),
      h('div', { class: 'spacer' }),
      h('div', { class: 'page-actions' },
        st.reviews.length ? btn('Export all', exportAll, { cls: 'btn-sm' }) : null)));

    root.append(subtabs([['week', 'This review'], ['past', `Past reviews${st.reviews.length ? ' · ' + st.reviews.length : ''}`]],
      tab, k => { tab = k; draw(); }));

    if (tab === 'past') { root.append(pastPane()); return; }
    root.append(weekPane());
  };

  /* ---------------------------------------------------------- */
  /*  what actually happened                                     */
  /* ---------------------------------------------------------- */

  function gather(start) {
    const end = addDays(start, 6);
    const inWeek = (iso) => iso && iso >= start && iso <= end;

    /* posts */
    const posts = [];
    PLATFORMS.forEach(p => {
      const store = S.get(`p_${p.key}`);
      Object.entries(store.content || {}).forEach(([tk, items]) => {
        const type = p.types.find(t => t.key === tk) || { label: tk };
        (items || []).forEach(it => {
          if (it.status !== 'posted') return;
          // count by the day it actually went out; fall back to the schedule
          // for anything marked posted before Sid started stamping that
          const iso = it.postedAt || resolveDate(it.when, set.releaseDate);
          if (inWeek(iso)) posts.push({ p, type, item: it, iso });
        });
      });
    });

    /* stat movement — bracketing snapshots per platform */
    const movement = [];
    PLATFORMS.forEach(p => {
      const entries = (S.get(`p_${p.key}`).stats || []).slice().sort((a, b) => a.date.localeCompare(b.date));
      if (entries.length < 2) return;
      p.metrics.forEach(metric => {
        const has = entries.filter(e => e.m?.[metric] != null && e.m[metric] !== '');
        const before = has.filter(e => e.date <= start).pop() || has[0];
        const after = has.filter(e => e.date <= addDays(end, 3)).pop();
        if (!before || !after || before === after) return;
        const delta = +after.m[metric] - +before.m[metric];
        if (!delta) return;
        movement.push({
          platform: p, metric, from: +before.m[metric], to: +after.m[metric], delta,
          pct: +before.m[metric] ? delta / +before.m[metric] * 100 : null,
        });
      });
    });

    /* ad spend whose window overlapped */
    const ads = (S.get('ads').campaigns || []).map(c => {
      const a = resolveDate(c.when, set.releaseDate);
      const b = resolveDate(c.until, set.releaseDate);
      if (!a || !b || b < start || a > end) return null;
      const overlapStart = a > start ? a : start;
      const overlapEnd = b < end ? b : end;
      const days = daysBetween(overlapStart, overlapEnd) + 1;
      return { c, days, planned: days * (+c.dailyUsd || 0) };
    }).filter(Boolean);

    /* outreach sent this week */
    const outreach = (S.get('contacts').items || []).filter(c => inWeek(c.sentOn));
    const placed = (S.get('contacts').items || []).filter(c => c.status === 'placed');

    /* milestones ticked this week */
    const plan = S.get('plan');
    const milestones = [...(plan.milestones || []), ...(plan.custom || [])]
      .filter(m => m.done && inWeek(m.doneAt));

    /* assets — diff against the previous saved review's frozen totals */
    const assetsNow = (S.get('assets').items || []).reduce((x, a) =>
      x + Math.min(+a.done || 0, +a.target || 0), 0);
    const prev = st.reviews
      .filter(r => r.weekStart < start)
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart)).pop();
    const assetsDelta = prev && prev.frozen && prev.frozen.assetsTotal != null
      ? assetsNow - prev.frozen.assetsTotal : null;

    return { start, end, posts, movement, ads, outreach, placed, milestones, assetsNow, assetsDelta };
  }

  /* ---------------------------------------------------------- */
  /*  this week                                                  */
  /* ---------------------------------------------------------- */

  function weekPane() {
    const box = h('div');
    const g = gather(weekStart);
    const existing = st.reviews.find(r => r.weekStart === weekStart);
    const rel = set.releaseDate;

    /* week navigator */
    box.append(h('div', { class: 'cal-bar' },
      h('button', { class: 'icon-btn', html: '‹', style: { fontSize: '20px' },
        onClick: () => { weekStart = addDays(weekStart, -7); draw(); } }),
      h('button', { class: 'icon-btn', html: '›', style: { fontSize: '20px' },
        onClick: () => { weekStart = addDays(weekStart, 7); draw(); } }),
      h('div', { class: 'cal-title', text: weekLabel(weekStart) }),
      rel ? h('span', { class: 'tag mono', text: `${tLabel(weekStart, rel)} → ${tLabel(g.end, rel)}` }) : null,
      btn('Last week', () => { weekStart = mondayOf(addDays(todayISO(), -7)); draw(); }, { cls: 'btn-sm' }),
      btn('This week', () => { weekStart = mondayOf(todayISO()); draw(); }, { cls: 'btn-sm' }),
      h('div', { style: { flex: 1 } }),
      existing ? h('span', { class: 'tag ok', text: 'saved' }) : null));

    /* headline */
    const spend = g.ads.reduce((a, x) => a + x.planned, 0);
    box.append(h('div', { class: 'grid g4' },
      stat('Posts made', String(g.posts.length),
        g.posts.length ? `across ${new Set(g.posts.map(x => x.p.key)).size} platforms` : 'nothing logged as posted'),
      stat('Milestones ticked', String(g.milestones.length), ''),
      stat('Outreach sent', String(g.outreach.length), `${g.placed.length} placed all-time`),
      stat('Ad spend planned', spend ? `$${spend.toFixed(0)}` : '—',
        g.ads.length ? `${g.ads.length} campaign${g.ads.length > 1 ? 's' : ''} running` : 'no campaigns in window')));

    /* posts by platform */
    if (g.posts.length) {
      const byPlat = {};
      g.posts.forEach(x => { byPlat[x.p.name] = (byPlat[x.p.name] || 0) + 1; });
      const data = Object.entries(byPlat).map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
      box.append(card(cardHead('What you posted'),
        withTable(barRows(data), ['Platform', 'Posts'], data.map(d => [d.label, d.value])),
        h('div', { class: 'list', style: { marginTop: '12px' } }, g.posts.slice(0, 12).map(x =>
          h('div', { class: 'item', style: { borderLeft: `3px solid ${PCOLORS[x.p.key]}`, padding: '9px 12px' } },
            h('div', { class: 'item-head' },
              h('span', { html: icon(x.p.icon), style: { color: PCOLORS[x.p.key], display: 'flex' } }),
              h('span', { class: 'item-title', text: x.item.title || (x.item.body || '').slice(0, 60) }),
              h('span', { class: 'tag', text: x.type.label }),
              h('span', { class: 'tag mono', text: fmtDate(x.iso) })))))));
    } else {
      box.append(card(cardHead('What you posted'),
        h('p', { class: 'small muted', style: { margin: 0 } },
          'Nothing marked posted in this week. If you did post, mark it in the Queue — otherwise the review has nothing to work from and neither will the post-mortem.')));
    }

    /* stat movement */
    if (g.movement.length) {
      const rows = g.movement
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 14)
        .map(m => [
          m.platform.name, m.metric, fmtNum(m.from), fmtNum(m.to),
          `${m.delta >= 0 ? '+' : ''}${fmtNum(m.delta)}`,
          m.pct != null ? `${m.pct >= 0 ? '+' : ''}${m.pct.toFixed(1)}%` : '—',
        ]);
      box.append(card(cardHead('What moved', h('span', { class: 'small muted', text: 'between the snapshots either side of this week' })),
        withTable(h('div'), ['Platform', 'Metric', 'Before', 'After', 'Change', '%'], rows)));
    } else {
      box.append(card(cardHead('What moved'),
        h('p', { class: 'small muted', style: { margin: 0 } },
          'No stat snapshots bracket this week. Log one every Monday on your main platforms and this fills itself in — two entries is all it takes.')));
    }

    /* ads */
    if (g.ads.length) {
      box.append(card(cardHead('Ads running'),
        h('div', { class: 'list' }, g.ads.map(({ c, days, planned }) =>
          h('div', { class: 'item', style: { padding: '9px 12px' } },
            h('div', { class: 'item-head' },
              h('span', { class: 'item-title', text: c.name }),
              h('span', { class: 'tag', text: c.platform }),
              c.funded === false ? h('span', { class: 'tag bad', text: 'unfunded' }) : null,
              h('span', { class: 'tag mono', text: `${days}d · $${planned.toFixed(0)}` })))))));
    }

    /* milestones + outreach + assets */
    const side = h('div', { class: 'grid g2' });
    side.append(card(cardHead('Milestones ticked'),
      g.milestones.length
        ? h('ul', { class: 'prose', style: { margin: 0 } }, g.milestones.map(m => h('li', { text: m.title })))
        : h('p', { class: 'small muted', style: { margin: 0 } }, 'None recorded. Only milestones ticked from now on carry a date — older ticks are not backdated.')));

    side.append(card(cardHead('Outreach sent'),
      g.outreach.length
        ? h('ul', { class: 'prose', style: { margin: 0 } }, g.outreach.slice(0, 12).map(c =>
            h('li', { text: `${c.name || c.org || 'contact'} — ${c.status}` })))
        : h('p', { class: 'small muted', style: { margin: 0 } }, 'Nothing sent this week.')));
    box.append(side);

    box.append(card(cardHead('Assets'),
      h('div', { class: 'row' },
        h('span', { class: 'v', style: { fontSize: '22px', fontWeight: 600 }, text: String(g.assetsNow) }),
        h('span', { class: 'small muted', text: 'pieces made in total' }),
        g.assetsDelta != null
          ? h('span', { class: `tag ${g.assetsDelta > 0 ? 'ok' : ''}`,
              text: `${g.assetsDelta >= 0 ? '+' : ''}${g.assetsDelta} since your last review` })
          : h('span', { class: 'small muted', text: '— save this review and the next one shows the change' }))));

    /* the part only you can write */
    const r = existing || {
      id: uid(), weekStart, worked: '', didnt: '', oneThing: '', notes: '', savedAt: '',
    };

    box.append(card(
      cardHead('The part only you can write'),
      field('What worked — and why you think so', r, 'worked', { slice: 'review', multiline: true,
        placeholder: 'Be specific. "the BTS clip did 4x the hook clip" beats "reels did well".' }),
      field('What did not', r, 'didnt', { slice: 'review', multiline: true,
        placeholder: 'Including the things you did not get to. Those matter more than the ones you did.' }),
      field('The one thing next week', r, 'oneThing', { slice: 'review', multiline: true,
        placeholder: 'One. Not five.' }),
      field('Anything else', r, 'notes', { slice: 'review', multiline: true })));

    box.append(h('div', { class: 'row', style: { marginTop: '14px' } },
      btn(existing ? 'Update this review' : 'Save this review', () => {
        r.savedAt = new Date().toISOString();
        r.frozen = {
          posts: g.posts.length,
          postsByPlatform: g.posts.reduce((acc, x) => { acc[x.p.name] = (acc[x.p.name] || 0) + 1; return acc; }, {}),
          milestones: g.milestones.map(m => m.title),
          outreach: g.outreach.length,
          adSpend: spend,
          assetsTotal: g.assetsNow,
          movement: g.movement.map(m => ({ platform: m.platform.name, metric: m.metric, delta: m.delta })),
        };
        if (!existing) st.reviews.push(r);
        S.touch('review');
        toast('Review saved');
        draw();
      }, { cls: 'btn-primary' }),
      existing ? btn('Delete', () => confirmDelete('this review', () => {
        st.reviews.splice(st.reviews.indexOf(existing), 1); S.touch('review'); draw();
      }), { cls: 'btn-danger btn-ghost' }) : null,
      h('div', { style: { flex: 1 } }),
      btn('Copy as text', () => copy(asMarkdown(r, g)), { cls: 'btn-ghost btn-sm' })));

    return box;
  }

  /* ---------------------------------------------------------- */
  /*  past reviews                                               */
  /* ---------------------------------------------------------- */

  function pastPane() {
    if (!st.reviews.length) {
      return empty('No reviews saved yet',
        'Do the first one on the Sunday after your first week of posting. Fifteen minutes.');
    }
    const sorted = st.reviews.slice().sort((a, b) => b.weekStart.localeCompare(a.weekStart));

    const box = h('div');

    /* posts per week, as a trend of effort */
    const data = sorted.slice().reverse().map(r => ({
      label: weekLabel(r.weekStart).split(' ').slice(0, 2).join(' '),
      value: r.frozen?.posts || 0,
    }));
    if (data.some(d => d.value)) {
      box.append(card(cardHead('Posts per week', h('span', { class: 'small muted', text: 'consistency is the whole game' })),
        withTable(barRows(data), ['Week', 'Posts'], data.map(d => [d.label, d.value]))));
    }

    box.append(h('div', { class: 'list' }, sorted.map(r => h('div', {
      class: 'item',
      onClick: () => { weekStart = r.weekStart; tab = 'week'; draw(); },
    },
      h('div', { class: 'item-head' },
        h('span', { class: 'item-title', text: weekLabel(r.weekStart) }),
        set.releaseDate ? h('span', { class: 'tag mono', text: tLabel(r.weekStart, set.releaseDate) }) : null,
        h('span', { class: 'tag', text: `${r.frozen?.posts ?? 0} posts` }),
        r.frozen?.adSpend ? h('span', { class: 'tag', text: `$${r.frozen.adSpend.toFixed(0)}` }) : null),
      r.oneThing ? h('div', { class: 'item-body', text: `Next: ${r.oneThing}` }) : null,
      r.worked ? h('div', { class: 'item-meta' }, h('span', { text: r.worked.slice(0, 90) })) : null))));

    return box;
  }

  /* ---------------------------------------------------------- */
  /*  export                                                     */
  /* ---------------------------------------------------------- */

  function asMarkdown(r, g) {
    const f = r.frozen || {};
    let out = `## Week of ${weekLabel(r.weekStart)}`;
    if (set.releaseDate) out += ` (${tLabel(r.weekStart, set.releaseDate)})`;
    out += '\n\n';
    out += `- Posts: ${g ? g.posts.length : (f.posts ?? 0)}\n`;
    const bp = g
      ? g.posts.reduce((a, x) => { a[x.p.name] = (a[x.p.name] || 0) + 1; return a; }, {})
      : (f.postsByPlatform || {});
    if (Object.keys(bp).length) out += `- By platform: ${Object.entries(bp).map(([k, v]) => `${k} ${v}`).join(' · ')}\n`;
    const mv = g ? g.movement.map(m => ({ platform: m.platform.name, metric: m.metric, delta: m.delta })) : (f.movement || []);
    if (mv.length) out += `- Movement: ${mv.slice(0, 8).map(m => `${m.platform} ${m.metric} ${m.delta >= 0 ? '+' : ''}${m.delta}`).join(' · ')}\n`;
    const spend = g ? g.ads.reduce((a, x) => a + x.planned, 0) : (f.adSpend || 0);
    if (spend) out += `- Ad spend: $${spend.toFixed(0)}\n`;
    const ms = g ? g.milestones.map(m => m.title) : (f.milestones || []);
    if (ms.length) out += `- Milestones: ${ms.join('; ')}\n`;
    if (r.worked)   out += `\n**What worked**\n\n${r.worked}\n`;
    if (r.didnt)    out += `\n**What did not**\n\n${r.didnt}\n`;
    if (r.oneThing) out += `\n**One thing next week**\n\n${r.oneThing}\n`;
    if (r.notes)    out += `\n${r.notes}\n`;
    return out;
  }

  function exportAll() {
    const sorted = st.reviews.slice().sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    let out = `# ${set.artist || 'Artist'} — weekly reviews\n`;
    if (set.song) out += `## "${set.song}"${set.releaseDate ? ` · released ${fmtDate(set.releaseDate, { long: true })}` : ''}\n`;
    out += `\n_${sorted.length} weeks · exported ${new Date().toLocaleDateString()}_\n\n`;
    out += `This is the raw material for the T+90 post-mortem. Read it in order.\n\n---\n\n`;
    sorted.forEach(r => { out += asMarkdown(r, null) + '\n---\n\n'; });
    download(`${(set.artist || 'sid').toLowerCase().replace(/\W+/g, '-')}-weekly-reviews.md`, out, 'text/markdown');
  }

  draw();
  return root;
}
