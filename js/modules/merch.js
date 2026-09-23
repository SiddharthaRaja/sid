/* ============================================================
   merch.js — unit economics, vendors, and a pre-order gate

   The point of this tab is one number: what you actually keep
   per shirt, after everything. Everything else here exists to
   make that number honest.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, subtabs, selectField,
  toast, copy, confirmDelete, todayISO, fmtDate, fmtNum, prose,
  removeFrom
} from '../ui.js';
import { ROUTES, COST_SEED, SIZE_CURVE, MERCH_RULES } from '../data/merch.js';

const rs = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

export function renderMerch(sub) {
  const root = h('div');
  const m = S.get('merch');
  let tab = ['economics', 'vendors', 'routes', 'orders'].includes(sub) ? sub : 'economics';

  if (!m.costs) { m.costs = COST_SEED.map(c => ({ ...c })); S.touch('merch'); }
  if (m.price === undefined) { m.price = 899; m.units = 50; S.touch('merch'); }

  const draw = () => {
    clear(root);
    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: 'Merch' }),
        h('div', { class: 'sub', text: 'What you keep per unit, and who prints it.' })),
      h('div', { class: 'spacer' })));

    root.append(subtabs([['economics', 'Unit economics'], ['routes', 'How to print it'],
      ['vendors', 'Vendors'], ['orders', 'Pre-orders']], tab, k => { tab = k; draw(); }));

    if (tab === 'routes')  { root.append(routesPane()); return; }
    if (tab === 'vendors') { root.append(vendorsPane()); return; }
    if (tab === 'orders')  { root.append(ordersPane()); return; }
    root.append(economicsPane());
  };

  /* ---------------------------------------------------------- */
  /*  unit economics                                             */
  /* ---------------------------------------------------------- */

  function economicsPane() {
    const box = h('div');

    const calc = (units) => {
      let perUnit = 0, perRun = 0, pct = 0;
      m.costs.forEach(c => {
        const a = Number(c.amount) || 0;
        if (c.per === 'unit') perUnit += a;
        else if (c.per === 'run') perRun += a;
        else if (c.per === 'pct') pct += a;
      });
      const price = Number(m.price) || 0;
      const pctCost = price * pct / 100;
      const allIn = perUnit + pctCost + (units ? perRun / units : 0);
      const margin = price - allIn;
      const breakEven = margin > 0 ? Math.ceil(perRun / (price - perUnit - pctCost)) : Infinity;
      return { perUnit, perRun, pct, pctCost, allIn, margin, breakEven, price };
    };

    const out = h('div');
    const paint = () => {
      clear(out);
      const units = Math.max(1, Number(m.units) || 1);
      const r = calc(units);
      const pctMargin = r.price ? Math.round(r.margin / r.price * 100) : 0;

      out.append(h('div', { class: 'grid g4' },
        h('div', { class: 'stat' },
          h('div', { class: 'k', text: 'All-in cost' }),
          h('div', { class: 'v', text: rs(r.allIn) }),
          h('div', { class: 'd', text: `at ${units} units` })),
        h('div', { class: 'stat' },
          h('div', { class: 'k', text: 'You keep' }),
          h('div', { class: 'v', style: { color: r.margin > 0 ? 'var(--ok)' : 'var(--bad)' }, text: rs(r.margin) }),
          h('div', { class: 'd', text: `${pctMargin}% of the price` })),
        h('div', { class: 'stat' },
          h('div', { class: 'k', text: 'Break-even' }),
          h('div', { class: 'v', text: isFinite(r.breakEven) ? String(Math.max(0, r.breakEven)) : '—' }),
          h('div', { class: 'd', text: isFinite(r.breakEven) ? 'units to clear the setup' : 'never at this price' })),
        h('div', { class: 'stat' },
          h('div', { class: 'k', text: 'Multiple' }),
          h('div', { class: 'v', text: r.allIn ? (r.price / r.allIn).toFixed(2) + '×' : '—' }),
          h('div', { class: 'd', text: r.price / r.allIn < 2.5 ? 'under 2.5× — too thin' : 'healthy' }))));

      if (r.margin <= 0) {
        out.append(h('div', { class: 'mode-banner', style: { marginTop: '14px' } },
          h('div', {}, h('strong', { text: 'You lose money on every shirt' }),
            h('div', { class: 'small', text: `At ${rs(r.price)} you are ${rs(-r.margin)} short per unit before you have shipped anything. Raise the price or cut the spec.` }))));
      } else if (r.price / r.allIn < 2.5) {
        out.append(h('div', { class: 'mode-banner', style: { marginTop: '14px' } },
          h('div', {}, h('strong', { text: 'Margin is too thin to survive one bad parcel' }),
            h('div', { class: 'small', text: `One lost order wipes out the profit on ${Math.ceil(r.allIn / r.margin)} others. Price at 2.5–3× all-in — that is ${rs(r.allIn * 2.5)} to ${rs(r.allIn * 3)}.` }))));
      }

      /* the MOQ table — the actual decision */
      const rows = [10, 25, 50, 100, 200, 300].map(u => {
        const x = calc(u);
        return { u, allIn: x.allIn, margin: x.margin, total: x.margin * u, cash: (x.perUnit * u) + x.perRun };
      });
      out.append(h('div', { class: 'table-wrap', style: { marginTop: '18px' } },
        h('table', { class: 'tbl' },
          h('thead', {}, h('tr', {}, ['Run size', 'All-in per unit', 'You keep each', 'If it all sells', 'Cash up front'].map(t => h('th', { text: t })))),
          h('tbody', {}, rows.map(x => h('tr', { style: x.u === units ? { background: 'var(--accent-soft)' } : {} },
            h('td', { class: 'mono', text: String(x.u) }),
            h('td', { class: 'mono', text: rs(x.allIn) }),
            h('td', { class: 'mono', style: { color: x.margin > 0 ? 'var(--ok)' : 'var(--bad)' }, text: rs(x.margin) }),
            h('td', { class: 'mono', text: rs(x.total) }),
            h('td', { class: 'mono', text: rs(x.cash) })))))));
      out.append(h('p', { class: 'small muted' },
        'Cash up front is the column that decides this. A 200-unit run has the best margin on paper and needs money you do not have back until people buy.'));
    };

    box.append(card(
      cardHead('Price and run size'),
      h('div', { class: 'grid g2' },
        field('Selling price (₹)', m, 'price', { slice: 'merch', type: 'number', onInput: paint }),
        field('Run size', m, 'units', { slice: 'merch', type: 'number', onInput: paint })),
      out));
    paint();

    const costBox = h('div');
    const drawCosts = () => {
      clear(costBox);
      m.costs.forEach((c, i) => costBox.append(h('div', { class: 'row', style: { marginBottom: '6px', alignItems: 'flex-start' } },
        h('input', { class: 'inp', style: { maxWidth: '210px' }, value: c.label,
          onInput: (e) => { c.label = e.target.value; S.touch('merch'); } }),
        h('input', { class: 'inp mono', style: { maxWidth: '110px' }, type: 'number', value: c.amount,
          onInput: (e) => { c.amount = Number(e.target.value); S.touch('merch'); paint(); } }),
        h('div', { class: 'seg' }, [['unit', 'per unit'], ['run', 'per run'], ['pct', '% of price']].map(([k, label]) =>
          h('button', { class: c.per === k ? 'on' : '', onClick: () => { c.per = k; S.touch('merch'); drawCosts(); paint(); } }, label))),
        h('button', { class: 'icon-btn', html: '&times;', onClick: () => { m.costs.splice(i, 1); S.touch('merch'); drawCosts(); paint(); } }))));
    };
    drawCosts();

    box.append(card(
      cardHead('Every cost', btn('Add a line', () => {
        m.costs.push({ id: uid(), label: '', amount: 0, per: 'unit' }); S.touch('merch'); drawCosts();
      }, { cls: 'btn-sm' })),
      h('p', { class: 'small muted' },
        'Seeded with Hyderabad-area estimates so the maths has something to chew on. Replace every one with a real quote before you spend anything.'),
      costBox,
      h('div', { class: 'small muted', style: { marginTop: '10px' } },
        m.costs.filter(c => c.note).map(c => h('div', { text: `${c.label}: ${c.note}` })))));

    box.append(card(cardHead('Size curve'),
      h('p', { class: 'small muted' }, 'Order to this, not evenly. Getting it wrong leaves you holding XS forever.'),
      h('div', { class: 'row', style: { flexWrap: 'wrap' } },
        SIZE_CURVE.map(([s, pct]) => h('div', { class: 'stat', style: { minWidth: '92px' } },
          h('div', { class: 'k', text: s }),
          h('div', { class: 'v', text: `${pct}%` }),
          h('div', { class: 'd', text: `${Math.round((Number(m.units) || 0) * pct / 100)} units` }))))));

    box.append(card(cardHead('Rules that cost money to learn'),
      h('ul', { class: 'prose' }, MERCH_RULES.map(r => h('li', { text: r })))));

    return box;
  }

  /* ---------------------------------------------------------- */
  /*  routes                                                     */
  /* ---------------------------------------------------------- */

  function routesPane() {
    const box = h('div');
    box.append(card(cardHead('Four ways to make it'),
      h('div', { class: 'table-wrap' },
        h('table', { class: 'tbl' },
          h('thead', {}, h('tr', {}, ['Route', 'Up front', 'Risk', 'Margin', 'Lead time'].map(t => h('th', { text: t })))),
          h('tbody', {}, ROUTES.map(r => h('tr', {},
            h('td', { text: r.name }),
            h('td', { class: 'mono', text: r.upfront }),
            h('td', { text: r.risk }),
            h('td', { text: r.margin }),
            h('td', { class: 'muted', text: r.lead })))))) ));

    ROUTES.forEach(r => box.append(card(
      cardHead(r.name, h('span', { class: 'tag', text: r.upfront })),
      h('p', { class: 'small', style: { color: 'var(--fg-2)' }, text: r.note }),
      h('div', { class: 'small muted', text: `Best for: ${r.good}` }))));

    box.append(card(cardHead('The Hyderabad version'),
      prose(`- **Blanks**: Begum Bazaar for cotton tees in quantity; ask for 180–200 GSM bio-washed and feel it before you commit. Cheaper blanks shrink a size in the first wash and every complaint you get will be about that.
- **Screen printing**: the trade printers are around Balanagar and Jeedimetla. Prices drop sharply past 50 pieces because the screen cost stops mattering.
- **DTF transfers**: several shops around Secunderabad take ten-piece jobs and full-colour art at the same price as one colour.
- **Shipping**: Delhivery and Shiprocket both pick up from home at volume. Surface within India is roughly ₹60–90 for a 500g parcel; air doubles it for no benefit on a t-shirt.
- **Sampling**: order one of everything from two vendors, wash both twice, and pick the one whose print survives. That ₹1,500 is the cheapest insurance in this whole tab.`)));
    return box;
  }

  /* ---------------------------------------------------------- */
  /*  vendors                                                    */
  /* ---------------------------------------------------------- */

  function vendorsPane() {
    m.vendors = m.vendors || [];
    const box = h('div');

    const open = (existing) => {
      const isNew = !existing;
      const v = existing || { id: uid(), name: '', kind: 'screen', area: '', contact: '',
        moq: '', quote: '', sample: 'not ordered', rating: '', notes: '', added: todayISO() };
      modal({
        title: isNew ? 'Add a vendor' : v.name || 'Vendor',
        wide: true,
        body: h('div',
          h('div', { class: 'grid g2' },
            field('Name', v, 'name', { slice: 'merch' }),
            selectField('What they do', v, 'kind', ROUTES.map(r => [r.key, r.name]), { slice: 'merch' }),
            field('Area', v, 'area', { slice: 'merch', placeholder: 'Balanagar, Begum Bazaar…' }),
            field('Contact', v, 'contact', { slice: 'merch', placeholder: 'phone / WhatsApp' }),
            field('MOQ', v, 'moq', { slice: 'merch', placeholder: 'minimum order' }),
            field('Quote', v, 'quote', { slice: 'merch', placeholder: '₹ per unit at that MOQ' }),
            selectField('Sample', v, 'sample', ['not ordered', 'ordered', 'arrived', 'washed twice', 'rejected'], { slice: 'merch' }),
            selectField('Verdict', v, 'rating', ['', 'use them', 'backup', 'no'], { slice: 'merch' })),
          field('Notes', v, 'notes', { slice: 'merch', multiline: true, placeholder: 'What the print felt like. Whether they answered the phone.' })),
        actions: [
          !isNew ? { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => { removeFrom(m.vendors, v); S.touch('merch'); draw(); } } : null,
          'spacer',
          { label: 'Save', cls: 'btn-primary', onClick: () => { if (isNew && !v.name) { toast('Give the vendor a name first — nothing has been lost', 3000); return false; }
            if (isNew) m.vendors.push(v); S.touch('merch'); draw(); } },
        ].filter(Boolean),
      });
    };

    box.append(card(
      cardHead('Vendors', btn('Add one', () => open(null), { cls: 'btn-sm btn-primary', icon: 'plus' })),
      h('p', { class: 'small muted' },
        'Three quotes minimum, and nobody gets the run until their sample has been washed twice.')));

    if (!m.vendors.length) {
      box.append(empty('No vendors yet', 'Walk Begum Bazaar for blanks and Balanagar for printing, or start with two phone quotes.'));
      return box;
    }

    box.append(h('div', { class: 'list' }, m.vendors.map(v => h('div', { class: 'item', style: { cursor: 'pointer' }, onClick: () => open(v) },
      h('div', { class: 'item-head' },
        h('span', { class: 'item-title', text: v.name }),
        h('span', { class: 'tag', text: (ROUTES.find(r => r.key === v.kind) || {}).name || v.kind }),
        v.rating ? h('span', { class: `tag ${v.rating === 'use them' ? 'ok' : v.rating === 'no' ? 'bad' : ''}`, text: v.rating }) : null,
        h('span', { class: `tag ${/washed/.test(v.sample) ? 'ok' : v.sample === 'not ordered' ? 'warn' : ''}`, text: `sample: ${v.sample}` })),
      h('div', { class: 'item-meta' },
        v.area ? h('span', { text: v.area }) : null,
        v.moq ? h('span', { text: `MOQ ${v.moq}` }) : null,
        v.quote ? h('span', { class: 'mono', text: v.quote }) : null,
        v.contact ? h('span', { text: v.contact }) : null),
      v.notes ? h('div', { class: 'item-body', text: v.notes }) : null))));

    return box;
  }

  /* ---------------------------------------------------------- */
  /*  pre-orders                                                 */
  /* ---------------------------------------------------------- */

  function ordersPane() {
    m.preorders = m.preorders || [];
    m.gate = m.gate || 30;
    const box = h('div');

    const n = m.preorders.reduce((a, o) => a + (Number(o.qty) || 1), 0);
    const pct = Math.min(100, Math.round(n / (Number(m.gate) || 1) * 100));
    const revenue = n * (Number(m.price) || 0);

    box.append(card(
      cardHead('The gate'),
      h('p', { class: 'small muted' },
        'Nothing gets printed until this bar fills. A design with pre-orders is a business; a pile of printed shirts is an expensive hobby.'),
      h('div', { class: 'prog', style: { marginTop: '8px' } }, h('i', { style: { width: `${pct}%` } })),
      h('div', { class: 'grid g3', style: { marginTop: '14px' } },
        h('div', { class: 'stat' }, h('div', { class: 'k', text: 'Pre-ordered' }),
          h('div', { class: 'v', text: String(n) }), h('div', { class: 'd', text: `of ${m.gate} needed` })),
        h('div', { class: 'stat' }, h('div', { class: 'k', text: 'Collected' }),
          h('div', { class: 'v', text: rs(revenue) }), h('div', { class: 'd', text: 'at the current price' })),
        h('div', { class: 'stat' }, h('div', { class: 'k', text: 'Verdict' }),
          h('div', { class: 'v', style: { fontSize: '15px', color: n >= m.gate ? 'var(--ok)' : 'var(--warn)' },
            text: n >= m.gate ? 'print it' : 'keep selling' }),
          h('div', { class: 'd', text: n >= m.gate ? 'the run is paid for' : `${m.gate - n} to go` }))),
      field('How many before you print', m, 'gate', { slice: 'merch', type: 'number', onInput: () => setTimeout(draw, 400) })));

    const open = (existing) => {
      const isNew = !existing;
      const o = existing || { id: uid(), who: '', size: 'M', qty: 1, paid: false, addr: '', at: todayISO() };
      modal({
        title: isNew ? 'Log a pre-order' : o.who || 'Pre-order',
        body: h('div',
          h('div', { class: 'grid g2' },
            field('Who', o, 'who', { slice: 'merch' }),
            selectField('Size', o, 'size', SIZE_CURVE.map(([s]) => s), { slice: 'merch' }),
            field('Quantity', o, 'qty', { slice: 'merch', type: 'number' }),
            selectField('Paid', o, 'paid', [[false, 'not yet'], [true, 'paid']], { slice: 'merch' })),
          field('Where it ships', o, 'addr', { slice: 'merch', multiline: true })),
        actions: [
          !isNew ? { label: 'Delete', cls: 'btn-danger btn-ghost', onClick: () => { removeFrom(m.preorders, o); S.touch('merch'); draw(); } } : null,
          'spacer',
          { label: 'Save', cls: 'btn-primary', onClick: () => { if (isNew && o.who) m.preorders.push(o); S.touch('merch'); draw(); } },
        ].filter(Boolean),
      });
    };

    box.append(card(
      cardHead('Pre-orders', btn('Log one', () => open(null), { cls: 'btn-sm btn-primary', icon: 'plus' })),
      m.preorders.length
        ? h('div', { class: 'list' }, m.preorders.map(o => h('div', { class: 'item', style: { cursor: 'pointer' }, onClick: () => open(o) },
            h('div', { class: 'item-head' },
              h('span', { class: 'item-title', text: o.who }),
              h('span', { class: 'tag', text: `${o.qty || 1} × ${o.size}` }),
              h('span', { class: `tag ${o.paid ? 'ok' : 'warn'}`, text: o.paid ? 'paid' : 'unpaid' })),
            h('div', { class: 'item-meta' }, h('span', { text: fmtDate(o.at) }), o.addr ? h('span', { text: o.addr }) : null))))
        : h('div', { class: 'small muted', text: 'Nobody yet. The first ten come from people you can name — ask them directly, not in a story.' })));

    if (m.preorders.length) {
      const bySize = SIZE_CURVE.map(([s]) => [s, m.preorders.filter(o => o.size === s).reduce((a, o) => a + (Number(o.qty) || 1), 0)]);
      box.append(card(cardHead('What to actually order'),
        h('div', { class: 'row', style: { flexWrap: 'wrap' } },
          bySize.map(([s, c]) => h('div', { class: 'stat', style: { minWidth: '86px' } },
            h('div', { class: 'k', text: s }), h('div', { class: 'v', text: String(c) })))),
        h('p', { class: 'small muted', style: { marginTop: '10px' } },
          'Add roughly 15% on top of the pre-orders for spoilage and the people who order late. Not 50%.')));
    }

    return box;
  }

  draw();
  return root;
}
