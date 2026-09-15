/* ============================================================
   svara/timeline.js — one shape for both kinds of exercise

   A mechanical exercise is a list of steps with durations in
   seconds. A Carnatic one is a phrase of aksharas at a tempo. They
   compile down to the same list of segments here, which is why one
   player, one graph and one scorer serve both: a hum held on C3 for
   five seconds and a sarali akshara at 60 bpm differ only in how
   their seconds and pitches were worked out.

   Pitch is always semitones above the exercise's base note — Sa for
   Carnatic, the singer's comfortable base for mechanical — so
   nothing here needs to know what key anyone sings in.
   ============================================================ */

import { RAGAS, TALAS, semitoneForDegree, degreeLabel, swaraName } from '../data/svara.js';

/**
 * segment = {
 *   start, end,          seconds
 *   semitones,           target above base, or null for a rest / free step
 *   glideTo,             end value when the step slides
 *   label, cue,
 *   attack,              true when a new note starts here
 *   aksharaIndex,        set for Carnatic, so the tala position can be shown
 * }
 */

const seg = (o) => ({ glideTo: null, label: '', cue: null, attack: true, aksharaIndex: null, ...o });

/** Interpolated target at absolute time t, in semitones above base. */
export function targetAt(tl, t) {
  const s = segmentAt(tl, t);
  if (!s || s.semitones === null) return null;
  if (s.glideTo === null) return s.semitones;
  const dur = s.end - s.start;
  if (dur <= 0) return s.semitones;
  const f = Math.max(0, Math.min(1, (t - s.start) / dur));
  return s.semitones + (s.glideTo - s.semitones) * f;
}

export function segmentAt(tl, t) {
  for (const s of tl.segments) if (t >= s.start && t < s.end) return s;
  return null;
}

export const indexAt = (tl, t) => tl.segments.findIndex(s => t >= s.start && t < s.end);

/* ---------------------------------------------------------- */
/*  mechanical                                                 */
/* ---------------------------------------------------------- */

/**
 * Steps play in order, then the whole pattern repeats, shifted up by
 * repeatShift semitones each time — which is how range work climbs.
 */
function fromSteps(ex, { pace = 1 } = {}) {
  const segments = [];
  let t = 0;
  const repeats = Math.max(1, ex.repeats || 1);

  for (let r = 0; r < repeats; r++) {
    const shift = (ex.repeatShift || 0) * r + (ex.baseOffset || 0);
    for (const st of ex.steps) {
      const dur = Math.max(0.05, (st.seconds || 1) / pace);
      segments.push(seg({
        start: t, end: t + dur,
        semitones: st.semitones === null || st.semitones === undefined ? null : st.semitones + shift,
        glideTo: st.glideTo === null || st.glideTo === undefined ? null : st.glideTo + shift,
        label: st.label || '',
        cue: st.cue || null,
      }));
      t += dur;
    }
    if (r < repeats - 1 && ex.restBetweenRepeatsSec) {
      segments.push(seg({ start: t, end: t + ex.restBetweenRepeatsSec, semitones: null, label: 'Rest' }));
      t += ex.restBetweenRepeatsSec;
    }
  }
  return { segments, totalSeconds: t, kind: 'mechanical' };
}

/* ---------------------------------------------------------- */
/*  carnatic                                                   */
/* ---------------------------------------------------------- */

/**
 * One akshara per beat at the given tempo, divided by the speed —
 * first, second and third speed are 1, 2 and 4 aksharas to the beat,
 * which is what the syllabus means by the three speeds.
 */
function fromPhrase(ex, { bpm, speed = 1 } = {}) {
  const raga = RAGAS[ex.raga] || RAGAS.mayamalavagowla;
  const dur = 60 / ((bpm || ex.bpm || 60) * speed);
  const segments = [];
  let t = 0;
  let held = null;                    // the last real note, for dheergams

  ex.phrase.aksharas.forEach((a, i) => {
    const anga = (ex.phrase.angaStarts || []).includes(i);
    if (a.extend) {
      /* a dheergam continues the previous swara rather than restarting it */
      segments.push(seg({
        start: t, end: t + dur,
        semitones: held === null ? null : held,
        label: ',', attack: false, aksharaIndex: i,
        cue: anga ? 'new anga' : null,
      }));
    } else if (a.degree === null) {
      segments.push(seg({ start: t, end: t + dur, semitones: null, label: '_', aksharaIndex: i }));
      held = null;
    } else {
      held = semitoneForDegree(raga, a.degree);
      segments.push(seg({
        start: t, end: t + dur,
        semitones: held,
        label: degreeLabel(a.degree),
        cue: anga ? swaraName(raga, a.degree) : null,
        aksharaIndex: i,
      }));
    }
    t += dur;
  });

  return { segments, totalSeconds: t, kind: 'carnatic', aksharaSeconds: dur };
}

/* ---------------------------------------------------------- */

export function buildTimeline(ex, opts = {}) {
  if (ex.steps && ex.steps.length) return fromSteps(ex, opts);
  if (ex.phrase && ex.phrase.aksharas.length) return fromPhrase(ex, opts);
  return { segments: [], totalSeconds: 0, kind: 'none' };
}

/** Tala position for display: which anga and which count within it. */
export function talaPosition(ex, aksharaIndex) {
  const t = TALAS[ex.tala];
  if (!t || aksharaIndex == null) return '';
  let i = aksharaIndex % t.aksharas;
  for (let a = 0; a < t.counts.length; a++) {
    if (i < t.counts[a]) {
      const name = t.angas[a] === 'L' ? 'laghu' : t.angas[a] === 'D' ? 'drutam' : 'anudrutam';
      return `${name} ${i + 1}/${t.counts[a]}`;
    }
    i -= t.counts[a];
  }
  return '';
}

/** Every distinct pitch target, for drawing the graph's horizontal lines. */
export function targetLines(tl) {
  const set = new Map();
  tl.segments.forEach(s => {
    [s.semitones, s.glideTo].forEach(v => {
      if (v === null || v === undefined) return;
      const k = Math.round(v * 100) / 100;
      if (!set.has(k)) set.set(k, s.label);
    });
  });
  return [...set.entries()].map(([semitones, label]) => ({ semitones, label }))
    .sort((a, b) => a.semitones - b.semitones);
}
