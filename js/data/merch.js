/* ============================================================
   merch.js — the numbers behind a t-shirt

   Costs are Hyderabad-area estimates in rupees, for sanity-
   checking a quote rather than replacing one. Every one of them
   should be overwritten with a real number from a real vendor
   before you commit money.
   ============================================================ */

export const ROUTES = [
  {
    key: 'pod', name: 'Print on demand',
    upfront: 'Nothing', risk: 'None', margin: 'Thin',
    lead: 'Ships in 5–10 days, per order',
    note: 'Qikink, Printrove and Blinkstore all print and ship from India. You never touch stock and you never lose money — you also make about a third of what local printing makes, and you cannot control the blank quality.',
    good: 'The first run, and anything you are not sure will sell.',
  },
  {
    key: 'screen', name: 'Local screen printing',
    upfront: '₹8,000 – ₹25,000', risk: 'You own the stock', margin: 'Good past 50 units',
    lead: '7–14 days, then you ship each order yourself',
    note: 'Screens cost per colour and are a one-time setup, so the per-unit price falls off a cliff after about 50 pieces. Balanagar and Jeedimetla have most of the trade printers; Begum Bazaar is where the blanks are.',
    good: 'A design you have already sold 30 of on pre-order.',
  },
  {
    key: 'dtf', name: 'DTF / digital transfer',
    upfront: '₹2,000 – ₹6,000', risk: 'Small batches possible', margin: 'Middling',
    lead: '3–7 days',
    note: 'No screen setup, so ten pieces is viable and full-colour art costs the same as one colour. The print sits on the fabric rather than in it — it feels heavier and it is the first thing to crack in a hot wash.',
    good: 'Photographic or many-coloured artwork in small runs.',
  },
  {
    key: 'embroid', name: 'Embroidery',
    upfront: '₹1,500 digitising + per-stitch', risk: 'Medium', margin: 'Good on caps',
    lead: '10–14 days',
    note: 'Priced by stitch count, not by colour. Works on caps, hoodies and heavyweight tees; useless for detail or gradients.',
    good: 'A logo, small, on something that is not a t-shirt.',
  },
];

/* Seed cost lines, in rupees, per unit unless marked. */
export const COST_SEED = [
  { id: 'blank',    label: 'Blank garment',            amount: 260, per: 'unit', note: '180–200 GSM cotton tee, bought in Begum Bazaar. Heavier blanks run 380–520.' },
  { id: 'print',    label: 'Printing',                 amount: 90,  per: 'unit', note: 'Screen printing, 2 colours, front only, at 50 units.' },
  { id: 'setup',    label: 'Screen setup',             amount: 3000, per: 'run', note: 'One-time per design per colour. This is the number that makes small runs pointless.' },
  { id: 'label',    label: 'Neck label & tag',         amount: 18,  per: 'unit' },
  { id: 'pack',     label: 'Packaging',                amount: 25,  per: 'unit', note: 'Poly mailer, insert card, sticker.' },
  { id: 'ship',     label: 'Shipping to the buyer',    amount: 75,  per: 'unit', note: 'Surface, within India. Delhivery or Shiprocket at volume.' },
  { id: 'fees',     label: 'Payment gateway',          amount: 2.4, per: 'pct',  note: 'Razorpay standard on domestic cards and UPI.' },
  { id: 'waste',    label: 'Spoilage & returns',       amount: 4,   per: 'pct',  note: 'Misprints, wrong sizes, a lost parcel. Never zero.' },
];

export const SIZE_CURVE = [
  ['XS', 4], ['S', 14], ['M', 26], ['L', 28], ['XL', 18], ['XXL', 10],
];

export const MERCH_RULES = [
  'Sell the pre-order before you print the stock. A design with 30 pre-orders is a business; a design with 30 printed shirts in your room is a hobby that cost ₹15,000.',
  'Price at 2.5–3× the all-in unit cost, not at cost plus a number that feels nice. Below 2.5× a single lost parcel eats the profit on ten orders.',
  'Order one sample from every vendor before the run, and wash it twice before you decide.',
  'Sizes: order to the curve, not evenly. M and L are over half of everything you will sell.',
  'GST applies on printed apparel; registration is not required below the turnover threshold, but the vendor will charge it to you either way, so quote inclusive.',
  'A merch drop needs its own launch: it competes with the song for attention, so it goes at T+21 or later, never in release week.',
];
