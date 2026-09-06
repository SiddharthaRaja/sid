/* ============================================================
   ads.js — paid advertising management

   Structure: accounts (one per platform you actually spend on)
   → campaigns → a daily spend log → derived results.

   The daily log is the part that makes this more than a
   spreadsheet. Typing four numbers a day takes twenty seconds
   and turns "the campaign cost $84" into a curve you can read:
   when the cost per result started climbing, which is the day
   the creative burned out and the day to change it. A single
   end-of-campaign total cannot tell you that, and by the time
   you notice, the money is gone.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, subtabs, selectField,
  stat, fmtNum, fmtDate, resolveDate, tLabel, todayISO, addDays, daysBetween,
  relativeDay, confirmDelete, toast, download, copy, progress,
} from '../ui.js';
import {
  CAMPAIGNS_SEED, AD_PLATFORMS, OBJECTIVES, CREATIVE_SPEC, ADS_INFO,
  AD_ACCOUNTS_SEED, LOG_FIELDS, ADS_PLATFORM_INFO,
} from '../data/ads.js';
import { PLATFORMS } from '../data/platforms.js';
import { infoPanel, notesPanel, scheduleRow, mediaBlock, checklist } from './shared.js';
import { barRows, withTable, lineChart, seriesColor } from '../charts.js';
import { linksPane, linkForCampaign } from './links.js';
import { icon } from '../icons.js';

const ST_CLS = { planned: '', live: 'warn', done: 'ok', paused: '', killed: 'bad' };
const STATUSES = ['planned', 'live', 'paused', 'done', 'killed'];

export function renderAds(sub) {
  const root = h('div');
  const st = S.get('ads');
  const set = S.get('settings');
  st.campaigns = st.campaigns || [];
  st.accounts = st.accounts || [];
  st.creativeDone = st.creativeDone || {};
  st.creatives = st.creatives || [];

  const TABS = [
    ['campaigns', 'Campaigns'], ['log', 'Daily log'], ['results', 'Results'],
    ['accounts', 'Accounts'], ['creative', 'Creative'], ['links', 'Links & UTM'],
    ['info', 'Info'], ['notes', 'Notes'],
  ];
  let tab = TABS.some(t => t[0] === sub) ? sub : 'campaigns';

  /* ---------------------------------------------------------- */
  /*  numbers                                                    */
  /* ---------------------------------------------------------- */

  const startOf = (c) => resolveDate(c.when, set.releaseDate);
  const endOf = (c) => resolveDate(c.until, set.releaseDate);

  const plannedSpend = (c) => {
    const a = startOf(c), b = endOf(c);
    if (!a || !b) return 0;
    return Math.max(1, daysBetween(a, b) + 1) * (+c.dailyUsd || 0);
  };

  /* Totals come from the daily log where one exists, and fall
     back to the single typed figure where it does not. Mixing
     the two would double-count, so the log always wins. */
  const totals = (c) => {
    const log = c.log || [];
    if (log.length) {
      const sum = (k) => log.reduce((a, r) => a + (+r[k] || 0), 0);
      return { spend: sum('spend'), imp: sum('impressions'), clicks: sum('clicks'),
        conv: sum('conversions'), fromLog: true, days: log.length };
    }
    return {
      spend: +c.spendUsd || 0, imp: +c.impressions || 0,
      clicks: +c.clicks || 0, conv: +c.conversions || 0, fromLog: false, days: 0,
    };
  };

  const derived = (t) => ({
    ctr: t.imp ? t.clicks / t.imp * 100 : null,
    cpc: t.clicks ? t.spend / t.clicks : null,
    cpa: t.conv ? t.spend / t.conv : null,
    cpm: t.imp ? t.spend / t.imp * 1000 : null,
    cvr: t.clicks ? t.conv / t.clicks * 100 : null,
  });

  /* Where a campaign should be by today, against where it is. */
  const pacing = (c) => {
    const a = startOf(c), b = endOf(c);
    if (!a || !b) return null;
    const today = todayISO();
    if (today < a) return null;
    const total = Math.max(1, daysBetween(a, b) + 1);
    const elapsed = Math.min(total, daysBetween(a, today) + 1);
    const planned = plannedSpend(c);
    const expected = planned / total * elapsed;
    const actual = totals(c).spend;
    return { total, elapsed, expected, actual, planned,
      pct: expected ? actual / expected * 100 : null, over: actual - expected };
  };

  const isLive = (c) => {
    const a = startOf(c), b = endOf(c);
    return a && b && a <= todayISO() && b >= todayISO();
  };

  const accountFor = (c) => st.accounts.find(a => a.id === c.accountId)
    || st.accounts.find(a => a.platform === c.platform) || null;

  const listenerLift = (c) => {
    const a = startOf(c), b = endOf(c);
    if (!a || !b) return null;
    let best = null;
    PLATFORMS.filter(p => p.dsp).forEach(p => {
      const entries = (S.get(`p_${p.key}`).stats || []).slice().sort((x, y) => x.date.localeCompare(y.date));
      const metric = p.metrics.find(m => /monthly listeners|listeners/i.test(m)) || p.metrics[0];
      const val = (e) => e.m?.[metric];
      const before = entries.filter(e => e.date <= a && val(e) != null && val(e) !== '').pop();
      const after = entries.filter(e => e.date >= b && val(e) != null && val(e) !== '')[0]
        || entries.filter(e => val(e) != null && val(e) !== '').pop();
      if (!before || !after || before === after) return;
      const lift = +val(after) - +val(before);
      if (lift > 0 && (!best || lift > best.lift)) best = { platform: p.name, metric, lift, from: before.date, to: after.date };
    });
    return best;
  };

  function adBudgetUsd() {
    const rows = (S.get('finance').budget || []).filter(b => /\bads?\b|advertis/i.test(b.item || ''));
    const usd = rows.reduce((a, b) => a + (+b.usd || 0), 0);
    if (usd) return usd;
    const inr = rows.reduce((a, b) => a + (+b.inr || 0), 0);
    return inr ? inr / 87 : 0;
  }

  /* ---------------------------------------------------------- */
  /*  page                                                       */
  /* ---------------------------------------------------------- */

  const draw = () => {
    clear(root);
    const allT = st.campaigns.map(totals);
    const spend = allT.reduce((a, t) => a + t.spend, 0);
    const conv = allT.reduce((a, t) => a + t.conv, 0);
    const budget = adBudgetUsd();

    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: 'Paid ads' }),
        h('div', { class: 'sub', text:
          `$${spend.toFixed(2)} spent${budget ? ` of $${budget.toFixed(0)} budget` : ''} · ` +
          `${fmtNum(conv)} results · ${st.campaigns.filter(isLive).length} live` })),
      h('div', { class: 'spacer' }),
      h('div', { class: 'page-actions' },
        btn('Log today', logToday, { cls: 'btn-primary btn-sm', icon: 'plus' }),
        btn('New campaign', () => openCampaign(null), { cls: 'btn-sm' }),
        st.campaigns.length ? btn('Export', exportCsv, { cls: 'btn-sm btn-ghost' }) : null)));

    root.append(subtabs(TABS, tab, k => {
      tab = k; history.replaceState(null, '', `#/ads/${k}`); draw();
    }));

    if (tab === 'info')     { root.append(infoPanel([...ADS_INFO, { title: 'Which platform', body: platformInfoBody() }])); return; }
    if (tab === 'notes')    { root.append(notesPanel(st, 'ads', 'Ad notes')); return; }
    if (tab === 'creative') { root.append(creativePane()); return; }
    if (tab === 'links')    { root.append(linksPane()); return; }
    if (tab === 'accounts') { root.append(accountsPane()); return; }
    if (tab === 'log')      { root.append(logPane()); return; }
    if (tab === 'results')  { root.append(resultsPane()); return; }
    root.append(campaignsPane());
  };

  const platformInfoBody = () => ADS_PLATFORM_INFO + `

## Where the $200 should go

On this budget the answer is not complicated: **Meta, conversions objective, Instagram Reels placements, pixel installed.** It is the only combination that reliably optimises at $10 a day.

Everything else on the table above is a second release's problem. TikTok's minimum alone would eat the whole budget in ten days; Spotify Ad Studio's campaign minimum is larger than the budget.

The exception is YouTube in-feed discovery at $5/day, which is worth running alongside if there is a music video, because the views compound into the channel rather than disappearing.`;

  /* ---------------------------------------------------------- */
  /*  accounts                                                   */
  /* ---------------------------------------------------------- */

  function accountsPane() {
    const box = h('div');

    if (!st.accounts.length) {
      box.append(empty('No ad accounts yet', 'The platforms worth considering are seeded on first load.'));
    }

    box.append(h('p', { class: 'small muted', style: { marginTop: 0, maxWidth: '72ch' } },
      'One row per platform. Mark the ones you are actually spending on as active — the rest stay here as a reference for what each is good at, so the decision gets made once rather than re-argued every campaign.'));

    box.append(h('div', { class: 'list' }, st.accounts.map((a, i) => {
      const camps = st.campaigns.filter(c => c.accountId === a.id || (!c.accountId && c.platform === a.platform));
      const spent = camps.reduce((s, c) => s + totals(c).spend, 0);

      return h('div', { class: 'item', style: { borderColor: a.active ? 'var(--ok)' : '' } },
        h('div', { class: 'item-head' },
          h('span', { class: 'item-title', text: a.name || a.platform }),
          h('span', { class: 'tag', text: a.platform }),
          a.active ? h('span', { class: 'tag ok', text: 'active' }) : h('span', { class: 'tag', text: 'not using' }),
          a.minDaily ? h('span', { class: 'tag mono', text: `min $${a.minDaily}/day` }) : null,
          camps.length ? h('span', { class: 'tag', text: `${camps.length} campaign${camps.length === 1 ? '' : 's'}` }) : null,
          spent ? h('span', { class: 'tag mono', text: `$${spent.toFixed(2)} spent` }) : null),
        a.strength ? h('div', { class: 'item-body', text: a.strength }) : null,
        a.watch ? h('div', { class: 'item-body', style: { color: 'var(--warn)' }, text: 'Watch out: ' + a.watch }) : null,
        h('div', { class: 'row', style: { marginTop: '10px', gap: '6px', flexWrap: 'wrap' } },
          h('label', { class: 'check' },
            h('input', { type: 'checkbox', checked: !!a.active,
              onChange: e => { a.active = e.target.checked; S.touch('ads'); draw(); } }),
            h('span', { class: 'small', text: 'Using this platform' })),
          h('input', { class: 'inline-inp mono', style: { width: '170px' },
            placeholder: 'account id (for your reference)',
            value: a.ref || '',
            onInput: e => { a.ref = e.target.value; S.touch('ads'); } }),
          a.url ? h('a', { class: 'btn btn-sm btn-ghost', href: a.url, target: '_blank', rel: 'noopener' }, 'Open manager') : null,
          h('div', { style: { flex: 1 } }),
          h('button', { class: 'icon-btn', html: '&times;', title: 'Remove',
            onClick: () => confirmDelete('this account', () => { st.accounts.splice(i, 1); S.touch('ads'); draw(); }) })));
    })));

    box.append(h('div', { class: 'row', style: { marginTop: '14px' } },
      btn('Add an account', () => {
        st.accounts.push({ id: uid(), platform: 'Other', name: '', currency: 'USD',
          url: '', minDaily: 5, active: true, strength: '', watch: '' });
        S.touch('ads'); draw();
      }, { cls: 'btn-sm', icon: 'plus' })));

    return box;
  }

  /* ---------------------------------------------------------- */
  /*  campaigns                                                  */
  /* ---------------------------------------------------------- */

  function budgetCard() {
    const budget = adBudgetUsd();
    if (!budget) return null;
    const funded = st.campaigns.filter(c => c.funded !== false);
    const fundedPlanned = funded.reduce((a, c) => a + plannedSpend(c), 0);
    const allPlanned = st.campaigns.reduce((a, c) => a + plannedSpend(c), 0);
    const spent = st.campaigns.reduce((a, c) => a + totals(c).spend, 0);
    const over = allPlanned - budget;

    return card(
      cardHead('The budget'),
      h('div', { class: 'grid g4' },
        stat('Ad budget', `$${budget.toFixed(0)}`, 'from the Finance budget line'),
        stat('Spent so far', `$${spent.toFixed(2)}`, `${budget ? Math.round(spent / budget * 100) : 0}% of it`),
        stat('Funded campaigns', `$${fundedPlanned.toFixed(0)}`, `${funded.length} of ${st.campaigns.length}`),
        stat('All campaigns planned', `$${allPlanned.toFixed(0)}`,
          over > 0 ? `$${over.toFixed(0)} beyond the budget` : 'within budget')),
      progress(budget ? spent / budget * 100 : 0),
      over > 0
        ? h('p', { class: 'small muted', style: { marginTop: '12px', marginBottom: 0 },
            text: 'At these daily rates the budget is spent by the end of release week. Everything after that is marked unfunded — a decision to make at T+7 with real cost per listener in hand, not now. The Info tab has the two honest ways to resolve it.' })
        : null);
  }

  function pacingCard() {
    const live = st.campaigns.filter(isLive);
    if (!live.length) return null;

    return card(
      cardHead('Live now', h('span', { class: 'small muted', text: 'spend against where it should be by today' })),
      h('div', { class: 'list' }, live.map(c => {
        const p = pacing(c);
        const t = totals(c);
        const d = derived(t);
        const off = p && p.pct != null ? p.pct - 100 : null;
        return h('div', { class: 'item', onClick: () => openCampaign(c) },
          h('div', { class: 'item-head' },
            h('span', { class: 'item-title', text: c.name }),
            h('span', { class: 'tag warn', text: `day ${p ? p.elapsed : '?'} of ${p ? p.total : '?'}` }),
            off != null ? h('span', {
              class: `tag ${Math.abs(off) < 15 ? 'ok' : 'bad'}`,
              text: off > 0 ? `${off.toFixed(0)}% over pace` : `${(-off).toFixed(0)}% under pace`,
            }) : null,
            d.cpa != null ? h('span', {
              class: `tag ${d.cpa <= 0.5 ? 'ok' : d.cpa > 2 ? 'bad' : ''}`,
              text: `$${d.cpa.toFixed(2)} per result`,
            }) : null),
          p ? h('div', { class: 'item-meta' },
            h('span', { text: `$${p.actual.toFixed(2)} spent, $${p.expected.toFixed(2)} expected by now` }),
            h('span', { text: `$${(p.planned - p.actual).toFixed(2)} left in the plan` }),
            h('span', { text: `${t.days} day${t.days === 1 ? '' : 's'} logged` })) : null);
      })));
  }

  function campaignsPane() {
    const box = h('div');
    const bc = budgetCard(); if (bc) box.append(bc);
    const pc = pacingCard(); if (pc) box.append(pc);

    if (!st.campaigns.length) {
      box.append(empty('No campaigns yet', 'The plan\'s campaign schedule is seeded on first load — if you cleared it, add one here.'));
      return box;
    }

    /* grouped by account so the tab reads as a manager rather
       than a flat list once there is more than one platform */
    const groups = new Map();
    st.campaigns.forEach(c => {
      const a = accountFor(c);
      const key = a ? a.id : `plat:${c.platform}`;
      if (!groups.has(key)) groups.set(key, { label: a ? (a.name || a.platform) : c.platform, items: [] });
      groups.get(key).items.push(c);
    });

    [...groups.values()].forEach(g => {
      const spent = g.items.reduce((a, c) => a + totals(c).spend, 0);
      box.append(h('div', { class: 'nav-sect', style: { padding: '18px 0 8px' } },
        h('span', { text: g.label }),
        h('span', { class: 'small muted', style: { marginLeft: 'auto' }, text: `$${spent.toFixed(2)}` })));
      box.append(h('div', { class: 'list' },
        g.items.slice().sort((a, b) => order(a.when) - order(b.when)).map(campaignRow)));
    });

    return box;
  }

  function campaignRow(c) {
    const a = startOf(c), b = endOf(c);
    const t = totals(c), d = derived(t);
    return h('div', { class: 'item', onClick: () => openCampaign(c) },
      h('div', { class: 'item-head' },
        h('span', { class: 'item-title', text: c.name }),
        h('span', { class: 'tag mono', text: `${c.when} → ${c.until}` }),
        isLive(c) ? h('span', { class: 'tag warn', text: 'live window' }) : null,
        c.funded === false ? h('span', { class: 'tag bad', text: 'unfunded' }) : null,
        h('span', { class: `tag ${ST_CLS[c.status] || ''}`, text: c.status }),
        t.fromLog ? h('span', { class: 'tag ok', text: `${t.days}d logged` }) : null),
      h('div', { class: 'item-body', text: c.audience }),
      h('div', { class: 'item-meta' },
        h('span', { text: `$${c.dailyUsd || 0}/day · $${plannedSpend(c).toFixed(0)} planned` }),
        t.spend ? h('span', { text: `$${t.spend.toFixed(2)} spent` }) : null,
        t.conv ? h('span', { text: `${fmtNum(t.conv)} results` }) : null,
        d.cpa != null ? h('span', { style: { color: d.cpa <= 0.5 ? 'var(--ok)' : d.cpa > 2 ? 'var(--bad)' : '' },
          text: `$${d.cpa.toFixed(2)} each` }) : null,
        a ? h('span', { text: `${fmtDate(a)} → ${fmtDate(b)}` }) : null));
  }

  const order = (w) => {
    const m = String(w).match(/^T\s*([+-]\s*\d+)?$/i);
    return m ? (m[1] ? parseInt(m[1].replace(/\s/g, ''), 10) : 0) : 9999;
  };

  /* ---------------------------------------------------------- */
  /*  the daily log                                              */
  /* ---------------------------------------------------------- */

  /* One screen, every live campaign, four numbers each. This is
     meant to be openable on a phone at the end of the day and
     finished in under a minute. */
  function logToday() {
    const live = st.campaigns.filter(isLive);
    const targets = live.length ? live : st.campaigns.filter(c => c.status === 'live');
    if (!targets.length) {
      toast('No campaign is inside its window today', 3200);
      return;
    }
    logFor(todayISO(), targets);
  }

  function logFor(date, campaigns) {
    const dateInp = h('input', { class: 'inp', type: 'date', value: date, style: { maxWidth: '180px' } });

    const rowsBox = h('div');
    const build = () => {
      clear(rowsBox);
      campaigns.forEach(c => {
        c.log = c.log || [];
        const d = dateInp.value;
        let entry = c.log.find(r => r.date === d);
        if (!entry) { entry = { date: d }; }

        const num = (k, ph) => h('input', {
          class: 'inp tabular', type: 'number', step: k === 'spend' ? '0.01' : '1',
          placeholder: ph, value: entry[k] ?? '',
          onInput: e => {
            entry[k] = e.target.value === '' ? '' : +e.target.value;
            if (!c.log.includes(entry)) c.log.push(entry);
            c.log.sort((x, y) => x.date.localeCompare(y.date));
            S.touch('ads');
          },
        });

        rowsBox.append(h('div', { class: 'card', style: { marginTop: '10px' } },
          h('div', { class: 'row', style: { marginBottom: '8px' } },
            h('strong', { class: 'small', text: c.name }),
            h('span', { class: 'tag', text: c.platform })),
          h('div', { class: 'grid g4' },
            LOG_FIELDS.map(f => h('label', { class: 'field' },
              h('span', { class: 'lab', text: f.label + (f.money ? ' $' : '') }),
              num(f.key, '0'))))));
      });
    };
    dateInp.addEventListener('change', build);
    build();

    modal({
      title: 'Log the day', wide: true,
      body: h('div',
        h('p', { class: 'small muted', style: { marginTop: 0 } },
          'Four numbers per campaign, straight off Ads Manager. Twenty seconds a day is what turns a total into a curve you can act on.'),
        h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Date' }), dateInp),
        rowsBox),
      actions: [{ label: 'Done', cls: 'btn-primary', onClick: draw }],
      onClose: draw,
    });
  }

  function logPane() {
    const box = h('div');
    const logged = st.campaigns.filter(c => (c.log || []).length);

    box.append(h('div', { class: 'row', style: { marginBottom: '14px', gap: '8px', flexWrap: 'wrap' } },
      btn('Log today', logToday, { cls: 'btn-primary btn-sm' }),
      btn('Log another day', () => {
        const all = st.campaigns.filter(c => c.status !== 'planned' || (c.log || []).length);
        logFor(todayISO(), all.length ? all : st.campaigns);
      }, { cls: 'btn-sm' })));

    if (!logged.length) {
      box.append(empty('Nothing logged yet',
        'Once a campaign is running, log its spend and results each day. The daily curve is the only way to see a creative burning out while there is still budget left to move.'));
      return box;
    }

    /* spend over time, all campaigns */
    const series = logged.map((c, i) => ({
      name: c.name,
      color: seriesColor(i),
      points: (c.log || []).filter(r => +r.spend > 0).map(r => ({ x: r.date, y: +r.spend })),
    })).filter(s => s.points.length > 1);

    if (series.length) {
      box.append(card(
        cardHead('Daily spend'),
        lineChart(series, { yLabel: '$' })));
    }

    /* cost per result over time — the one that tells you when to stop */
    const cpaSeries = logged.map((c, i) => ({
      name: c.name,
      color: seriesColor(i),
      points: (c.log || []).filter(r => +r.conversions > 0 && +r.spend > 0)
        .map(r => ({ x: r.date, y: +(+r.spend / +r.conversions).toFixed(3) })),
    })).filter(s => s.points.length > 1);

    if (cpaSeries.length) {
      box.append(card(
        cardHead('Cost per result, day by day',
          h('span', { class: 'small muted', text: 'when this line starts climbing, the creative is burning out' })),
        lineChart(cpaSeries, { yLabel: '$' }),
        h('p', { class: 'small muted', style: { marginBottom: 0 } },
          'A rising cost per result on a flat budget means the audience has seen the ad too many times. The fix is a new creative, not more money.')));
    }

    /* the raw table, per campaign */
    logged.forEach(c => {
      const rows = (c.log || []).slice().reverse();
      box.append(card(
        cardHead(c.name, h('span', { class: 'small muted', text: `${rows.length} days` })),
        h('div', { class: 'table-wrap' }, h('table', { class: 'tbl tabular' },
          h('thead', {}, h('tr', {}, ['Date', ...LOG_FIELDS.map(f => f.label), '$ / result', ''].map(t => h('th', { text: t })))),
          h('tbody', {}, rows.map((r) => {
            const cpa = +r.conversions > 0 ? +r.spend / +r.conversions : null;
            return h('tr', {},
              h('td', { class: 'mono small', text: r.date }),
              LOG_FIELDS.map(f => h('td', {}, h('input', {
                class: 'inline-inp tabular', type: 'number', style: { width: '90px' },
                step: f.money ? '0.01' : '1', value: r[f.key] ?? '',
                onInput: e => { r[f.key] = e.target.value === '' ? '' : +e.target.value; S.touch('ads'); },
              }))),
              h('td', { style: { color: cpa == null ? '' : cpa <= 0.5 ? 'var(--ok)' : cpa > 2 ? 'var(--bad)' : '' },
                text: cpa == null ? '—' : '$' + cpa.toFixed(2) }),
              h('td', {}, h('button', { class: 'icon-btn', html: '&times;', title: 'Remove this day',
                onClick: () => confirmDelete('this day', () => {
                  c.log.splice(c.log.indexOf(r), 1); S.touch('ads'); draw();
                }) })));
          }))))));
    });

    return box;
  }

  /* ---------------------------------------------------------- */
  /*  results                                                    */
  /* ---------------------------------------------------------- */

  function resultsPane() {
    const box = h('div');
    const withSpend = st.campaigns.filter(c => totals(c).spend > 0);

    if (!withSpend.length) {
      box.append(empty('No spend logged yet',
        'Log a day, or fill in the campaign totals. Cost per result and cost per listener appear here.'));
      return box;
    }

    const T = withSpend.map(totals);
    const spend = T.reduce((a, t) => a + t.spend, 0);
    const conv = T.reduce((a, t) => a + t.conv, 0);
    const clicks = T.reduce((a, t) => a + t.clicks, 0);
    const imp = T.reduce((a, t) => a + t.imp, 0);

    box.append(h('div', { class: 'grid g4' },
      stat('Total spend', `$${spend.toFixed(2)}`, `₹${Math.round(spend * 87).toLocaleString('en-IN')} approx`),
      stat('Results', fmtNum(conv), ''),
      stat('Cost per result', conv ? `$${(spend / conv).toFixed(2)}` : '—',
        conv ? (spend / conv <= 0.5 ? 'working' : spend / conv > 2 ? 'too high — change the creative' : 'acceptable') : ''),
      stat('CPM', imp ? `$${(spend / imp * 1000).toFixed(2)}` : '—', 'what a thousand impressions cost')));

    /* by platform — the comparison that decides where next month goes */
    const byPlatform = new Map();
    withSpend.forEach(c => {
      const key = (accountFor(c)?.name) || c.platform;
      const t = totals(c);
      const cur = byPlatform.get(key) || { spend: 0, conv: 0, clicks: 0, imp: 0 };
      byPlatform.set(key, { spend: cur.spend + t.spend, conv: cur.conv + t.conv,
        clicks: cur.clicks + t.clicks, imp: cur.imp + t.imp });
    });

    if (byPlatform.size > 1) {
      const rows = [...byPlatform.entries()]
        .filter(([, v]) => v.conv > 0)
        .map(([label, v]) => ({ label, value: +(v.spend / v.conv).toFixed(2) }))
        .sort((a, b) => a.value - b.value);
      if (rows.length) {
        box.append(card(
          cardHead('Cost per result by platform', h('span', { class: 'small muted', text: 'lower is better' })),
          withTable(barRows(rows, { color: 'var(--s3)' }), ['Platform', '$ per result'],
            rows.map(r => [r.label, '$' + r.value.toFixed(2)])),
          h('p', { class: 'small muted', style: { marginBottom: 0 },
            text: 'Only compare platforms where the conversion event is the same thing. A YouTube view and a Meta pre-save are not comparable, and dividing one into the other produces a number that looks meaningful and is not.' })));
      }
    }

    const cpaRows = withSpend.map(c => ({ c, t: totals(c) }))
      .filter(x => x.t.conv > 0)
      .map(x => ({ label: x.c.name, value: +(x.t.spend / x.t.conv).toFixed(2) }))
      .sort((a, b) => a.value - b.value);
    if (cpaRows.length) {
      box.append(card(
        cardHead('Cost per result by campaign'),
        withTable(barRows(cpaRows, { color: 'var(--s2)' }), ['Campaign', '$ per result'],
          cpaRows.map(r => [r.label, '$' + r.value.toFixed(2)]))));
    }

    const spendRows = withSpend.map(c => ({ label: c.name, value: +totals(c).spend.toFixed(2) }))
      .sort((a, b) => b.value - a.value);
    box.append(card(cardHead('Where the money went'),
      withTable(barRows(spendRows), ['Campaign', '$'], spendRows.map(r => [r.label, '$' + r.value.toFixed(2)]))));

    /* cost per listener */
    const lifts = withSpend.map(c => ({ c, lift: listenerLift(c) })).filter(x => x.lift);
    box.append(card(
      cardHead('Cost per new listener', h('span', { class: 'small muted', text: 'the only number that says whether you bought an audience' })),
      lifts.length
        ? h('div', { class: 'table-wrap' }, h('table', { class: 'tbl tabular' },
            h('thead', {}, h('tr', {}, ['Campaign', 'Spend', 'Platform', 'Listener gain', 'Cost each', 'Window'].map(t => h('th', { text: t })))),
            h('tbody', {}, lifts.map(({ c, lift }) => {
              const sp = totals(c).spend;
              return h('tr', {},
                h('td', { text: c.name }),
                h('td', { text: '$' + sp.toFixed(2) }),
                h('td', { class: 'muted', text: lift.platform }),
                h('td', { text: '+' + fmtNum(lift.lift) }),
                h('td', { style: { fontWeight: 500 }, text: '$' + (sp / lift.lift).toFixed(3) }),
                h('td', { class: 'small muted', text: `${fmtDate(lift.from)} → ${fmtDate(lift.to)}` }));
            }))))
        : h('p', { class: 'small muted', style: { margin: 0 },
            text: 'Log a stats snapshot before a campaign starts and another after it ends, on any DSP, and this fills itself in.' })));

    return box;
  }

  /* ---------------------------------------------------------- */
  /*  creative                                                   */
  /* ---------------------------------------------------------- */

  function creativePane() {
    const box = h('div');
    box.append(card(cardHead('The creative spec'),
      checklist(CREATIVE_SPEC, st.creativeDone, 'ads', { prefix: 'cs' })));

    box.append(card(
      cardHead('Variants',
        btn('Add variant', () => {
          st.creatives.push({ id: uid(), name: `Variant ${st.creatives.length + 1}`, hook: '', cta: '',
            spendUsd: '', impressions: '', clicks: '', conversions: '', verdict: 'testing', media: [] });
          S.touch('ads'); draw();
        }, { cls: 'btn-sm', icon: 'plus' })),
      st.creatives.length
        ? h('div', {}, st.creatives.map((cr, i) => h('div', { class: 'card', style: { marginTop: '10px' } },
            h('div', { class: 'row', style: { marginBottom: '10px' } },
              h('input', { class: 'inline-inp', style: { flex: 1 }, value: cr.name || '',
                onInput: e => { cr.name = e.target.value; S.touch('ads'); } }),
              h('button', { class: 'icon-btn', html: '&times;',
                onClick: () => confirmDelete('this variant', () => { st.creatives.splice(i, 1); S.touch('ads'); draw(); }) })),
            h('div', { class: 'grid g2' },
              field('Hook — the first 2 seconds', cr, 'hook', { slice: 'ads' }),
              field('Call to action', cr, 'cta', { slice: 'ads' })),
            h('div', { class: 'grid g4' },
              field('Spend $', cr, 'spendUsd', { slice: 'ads', type: 'number' }),
              field('Impressions', cr, 'impressions', { slice: 'ads', type: 'number' }),
              field('Clicks', cr, 'clicks', { slice: 'ads', type: 'number' }),
              field('Conversions', cr, 'conversions', { slice: 'ads', type: 'number' })),
            selectField('Verdict after 48 hours', cr, 'verdict',
              [['testing', 'Still testing'], ['winner', 'Winner — put the budget here'], ['killed', 'Killed']], { slice: 'ads' }),
            (+cr.conversions > 0 && +cr.spendUsd > 0)
              ? h('p', { class: 'small', style: { color: 'var(--fg-2)' },
                  text: `$${(+cr.spendUsd / +cr.conversions).toFixed(2)} per result` })
              : null,
            h('div', { class: 'row' },
              btn('Tagged link for this variant', () => {
                const url = linkForCampaign(S.get('settings').song || 'release', 'instagram', 'cpc', cr.name);
                if (!url) { toast('Set your smart link in Settings first', 3200); return; }
                copy(url);
              }, { cls: 'btn-sm btn-ghost' })),
            h('label', { class: 'field' }, h('span', { class: 'lab', text: 'The cut' }),
              mediaBlock(cr, 'ads', 'ads/creatives')))))
        : h('p', { class: 'small muted', style: { margin: 0 },
            text: 'Run three. Kill the two that lose after 48 hours. Put everything behind the winner.' })));

    return box;
  }

  /* ---------------------------------------------------------- */
  /*  campaign editor                                            */
  /* ---------------------------------------------------------- */

  function openCampaign(existing) {
    const isNew = !existing;
    const c = existing || {
      id: uid(), name: '', platform: 'Meta', objective: 'Conversions — stream',
      when: 'T', until: 'T+7', dailyUsd: 10, status: 'planned', audience: '', notes: '',
      spendUsd: '', impressions: '', clicks: '', conversions: '', log: [],
    };
    if (isNew) { st.campaigns.push(c); S.touch('ads'); }
    c.log = c.log || [];

    const t = totals(c), d = derived(t), p = pacing(c);
    const lift = listenerLift(c);

    const accountSel = selectField('Ad account', c, 'accountId',
      [['', 'Not set'], ...st.accounts.map(a => [a.id, a.name || a.platform])], { slice: 'ads' });

    modal({
      title: c.name || 'New campaign', wide: true,
      body: h('div',
        field('Name', c, 'name', { slice: 'ads' }),
        h('label', { class: 'check' },
          h('input', { type: 'checkbox', checked: c.funded !== false,
            onChange: e => { c.funded = e.target.checked; S.touch('ads'); } }),
          h('span', { class: 'small', text: 'Covered by the ad budget' })),
        h('div', { class: 'grid g2' }, accountSel,
          selectField('Platform', c, 'platform', AD_PLATFORMS, { slice: 'ads' })),
        h('div', { class: 'grid g2' },
          selectField('Objective', c, 'objective', OBJECTIVES, { slice: 'ads' }),
          selectField('Status', c, 'status', STATUSES, { slice: 'ads' })),
        h('div', { class: 'grid g2' },
          scheduleRow(c, 'ads', () => {}, { key: 'when', label: 'Starts', required: true }),
          scheduleRow(c, 'ads', () => {}, { key: 'until', label: 'Ends', required: true })),
        field('Daily budget $', c, 'dailyUsd', { slice: 'ads', type: 'number' }),
        h('p', { class: 'small muted', text: `Planned total: $${plannedSpend(c).toFixed(0)}` }),
        field('Audience', c, 'audience', { slice: 'ads', multiline: true,
          placeholder: 'Countries, cities, ages, interests, placements' }),

        h('div', { class: 'hr' }),
        h('div', { class: 'row', style: { marginBottom: '8px' } },
          h('div', { class: 'lab', style: { margin: 0 } }, 'What actually happened'),
          h('div', { style: { flex: 1 } }),
          btn('Log a day', () => logFor(todayISO(), [c]), { cls: 'btn-sm' }),
          btn('Tagged link', () => {
            const url = linkForCampaign(c.name, (c.platform || '').toLowerCase().split(' ')[0], 'cpc', '');
            if (!url) { toast('Set your smart link in Settings first', 3200); return; }
            copy(url);
          }, { cls: 'btn-sm btn-ghost' })),

        t.fromLog
          ? h('p', { class: 'small muted' },
              `Totals below come from ${t.days} logged day${t.days === 1 ? '' : 's'}. Edit them on the Daily log tab.`)
          : h('div', { class: 'grid g4' },
              field('Spend $', c, 'spendUsd', { slice: 'ads', type: 'number' }),
              field('Impressions', c, 'impressions', { slice: 'ads', type: 'number' }),
              field('Clicks', c, 'clicks', { slice: 'ads', type: 'number' }),
              field('Conversions', c, 'conversions', { slice: 'ads', type: 'number' })),

        (t.spend || t.conv)
          ? h('div', { class: 'grid g4', style: { marginTop: '10px' } },
              stat('Spent', '$' + t.spend.toFixed(2), t.fromLog ? `${t.days} days` : 'typed in'),
              d.ctr != null ? stat('CTR', d.ctr.toFixed(2) + '%', 'secondary — not a goal') : null,
              d.cpc != null ? stat('Per click', '$' + d.cpc.toFixed(2), '') : null,
              d.cpa != null ? stat('Per result', '$' + d.cpa.toFixed(2),
                d.cpa <= 0.5 ? 'working' : d.cpa > 2 ? 'too high' : 'acceptable') : null)
          : null,

        p ? h('p', { class: 'small', style: { marginTop: '10px', color: Math.abs((p.pct || 100) - 100) < 15 ? 'var(--fg-2)' : 'var(--warn)' },
              text: `Day ${p.elapsed} of ${p.total}: $${p.actual.toFixed(2)} spent against $${p.expected.toFixed(2)} expected by now.` }) : null,

        lift ? h('p', { class: 'small muted', style: { marginTop: '6px' },
          text: `${lift.platform} ${lift.metric.toLowerCase()} rose by ${fmtNum(lift.lift)} across this window — $${(t.spend / lift.lift || 0).toFixed(3)} per listener.` }) : null,

        field('Notes', c, 'notes', { slice: 'ads', multiline: true })),
      actions: [
        { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => {
          st.campaigns.splice(st.campaigns.indexOf(c), 1); S.touch('ads'); draw(); } },
        'spacer',
        { label: 'Done', cls: 'btn-primary', onClick: draw },
      ],
      onClose: draw,
    });
  }

  /* ---------------------------------------------------------- */
  /*  export                                                     */
  /* ---------------------------------------------------------- */

  function exportCsv() {
    const cols = ['name', 'platform', 'objective', 'when', 'until', 'dailyUsd', 'status', 'funded',
      'spend', 'impressions', 'clicks', 'conversions', 'cpa', 'audience', 'notes'];
    const lines = [cols];
    st.campaigns.forEach(c => {
      const t = totals(c), d = derived(t);
      lines.push([c.name, c.platform, c.objective, c.when, c.until, c.dailyUsd, c.status,
        c.funded === false ? 'no' : 'yes', t.spend.toFixed(2), t.imp, t.clicks, t.conv,
        d.cpa == null ? '' : d.cpa.toFixed(3), c.audience, c.notes]);
    });
    /* the daily log as its own block, so a spreadsheet can chart it */
    lines.push([]);
    lines.push(['DAILY LOG']);
    lines.push(['campaign', 'date', ...LOG_FIELDS.map(f => f.key)]);
    st.campaigns.forEach(c => (c.log || []).forEach(r =>
      lines.push([c.name, r.date, ...LOG_FIELDS.map(f => r[f.key] ?? '')])));

    const csv = lines.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    download('sid-ads.csv', csv, 'text/csv');
  }

  draw();
  return root;
}
