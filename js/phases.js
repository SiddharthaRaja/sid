/* ============================================================
   phases.js — the T-offset vocabulary, in one place

   Planning mode has no calendar. It has this: a number of days
   before or after release, and the phase that number falls in.
   Both the master plan and the planning timeline read from here
   so they always group the same way.
   ============================================================ */

/** "T-28" → -28, "T" → 0, "T+14" → 14, anything else → null. */
export function offsetOf(when) {
  const m = String(when || '').trim().match(/^T\s*([+-]\s*\d+)?$/i);
  if (!m) return null;
  return m[1] ? parseInt(m[1].replace(/\s/g, ''), 10) : 0;
}

/** -28 → "T-28". */
export const asT = (n) => (n === 0 ? 'T' : n > 0 ? `T+${n}` : `T${n}`);

export const isT   = (v) => offsetOf(v) !== null;
export const isISO = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '').trim());

/* Ordered, earliest first. `to` is inclusive. */
export const PHASES = [
  { key: 'build',    from: -9999, to: -61, label: 'Build in the dark',        range: 'T-90 → T-61' },
  { key: 'found',    from: -60,   to: -31, label: 'Foundations & first signal', range: 'T-60 → T-31' },
  { key: 'announce', from: -30,   to: -15, label: 'The announcement',         range: 'T-30 → T-15' },
  { key: 'count',    from: -14,   to: -1,  label: 'The countdown',            range: 'T-14 → T-1' },
  { key: 'week',     from: 0,     to: 6,   label: 'Release week',             range: 'T → T+6' },
  { key: 'india',    from: 7,     to: 28,  label: 'India phase',              range: 'T+7 → T+28' },
  { key: 'diaspora', from: 29,    to: 56,  label: 'Diaspora phase',           range: 'T+29 → T+56' },
  { key: 'cross',    from: 57,    to: 84,  label: 'Western crossover',        range: 'T+57 → T+84' },
  { key: 'sustain',  from: 85,    to: 9999, label: 'Sustain & pivot',         range: 'T+85 onward' },
];

export const FIXED   = { key: 'fixed',   label: 'Fixed calendar dates', range: '' };
export const UNDATED = { key: 'undated', label: 'No date yet',          range: '' };

/** The phase an offset belongs to. */
export function phaseOfOffset(n) {
  if (n == null) return UNDATED;
  return PHASES.find(p => n >= p.from && n <= p.to) || PHASES[PHASES.length - 1];
}

/** The phase a raw `when` value belongs to — offsets, dates, blanks. */
export function phaseOfWhen(when) {
  const n = offsetOf(when);
  if (n !== null) return phaseOfOffset(n);
  if (isISO(when)) return FIXED;
  return UNDATED;
}

/** Heading text: "T-30 → T-15 · The announcement". */
export const phaseTitle = (p) => (p.range ? `${p.range} · ${p.label}` : p.label);

/** Sort key that keeps offsets in order and pushes the rest to the end. */
export function sortOffset(when) {
  const n = offsetOf(when);
  if (n !== null) return n;
  if (isISO(when)) return 8888;
  return 9999;
}
