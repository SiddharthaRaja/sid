/* ============================================================
   data/svara.js — the practice material

   Ported from the Svara Android app, which keeps its own copy. The
   notation strings below read exactly as they do in a printed
   primer, so they can be checked against a teacher's copy by eye
   rather than by decoding an array of integers. The parser is the
   same one, rewritten in JavaScript.

   Where the two apps disagree, the Android one is the reference:
   it is the one with the recording engine and the one being used
   for real practice.
   ============================================================ */

/* ---------------------------------------------------------- */
/*  ragas                                                      */
/* ---------------------------------------------------------- */

/** Semitones above Sa for each swara letter, in order s r g m p d n. */
export const RAGAS = {
  mayamalavagowla: {
    name: 'Mayamalavagowla',
    semitones: [0, 1, 4, 5, 7, 8, 11],
    swaraNames: ['S', 'R1', 'G3', 'M1', 'P', 'D1', 'N3'],
    note: 'Taught first because its wide, evenly spread intervals make each swarasthana easy to hear.',
  },
  shankarabharanam: {
    name: 'Shankarabharanam',
    semitones: [0, 2, 4, 5, 7, 9, 11],
    swaraNames: ['S', 'R2', 'G3', 'M1', 'P', 'D2', 'N3'],
    note: 'The same intervals as the Western major scale, which makes it a useful cross-reference.',
  },
  malahari: {
    name: 'Malahari',
    semitones: [0, 1, 4, 5, 7, 8, 11],
    swaraNames: ['S', 'R1', 'G3', 'M1', 'P', 'D1', 'N3'],
    note: 'Janya of Mayamalavagowla. No Ga or Ni ascending; G3 appears descending.',
  },
  kalyani: {
    name: 'Kalyani',
    semitones: [0, 2, 4, 6, 7, 9, 11],
    swaraNames: ['S', 'R2', 'G3', 'M2', 'P', 'D2', 'N3'],
    note: 'The sharp madhyama is the whole character of it.',
  },
};

export const semitoneForDegree = (raga, degree) => {
  const oct = Math.floor(degree / 7);
  const idx = ((degree % 7) + 7) % 7;
  return raga.semitones[idx] + 12 * oct;
};

export const swaraName = (raga, degree) => raga.swaraNames[((degree % 7) + 7) % 7];

/** How a degree is written: s, S, S', .n */
export function degreeLabel(degree) {
  const letters = ['s', 'r', 'g', 'm', 'p', 'd', 'n'];
  const oct = Math.floor(degree / 7);
  const core = letters[((degree % 7) + 7) % 7];
  if (oct > 0) return core.toUpperCase() + "'".repeat(oct - 1);
  if (oct < 0) return '.'.repeat(-oct) + core;
  return core;
}

/* ---------------------------------------------------------- */
/*  talas                                                      */
/* ---------------------------------------------------------- */

const JATI = { tisra: 3, chatusra: 4, khanda: 5, misra: 7, sankeerna: 9 };

const tala = (id, name, angas, jati, note) => {
  const counts = angas.map(a => (a === 'L' ? JATI[jati] : a === 'D' ? 2 : 1));
  return { id, name, angas, jati, counts, aksharas: counts.reduce((a, b) => a + b, 0), note };
};

export const TALAS = {
  adi:     tala('adi', 'Adi', ['L', 'D', 'D'], 'chatusra', 'Chatusra-jati Triputa. 4 + 2 + 2 = 8.'),
  dhruva:  tala('dhruva', 'Dhruva', ['L', 'D', 'L', 'L'], 'chatusra'),
  matya:   tala('matya', 'Matya', ['L', 'D', 'L'], 'chatusra'),
  rupaka:  tala('rupaka', 'Rupaka', ['D', 'L'], 'chatusra'),
  jhampa:  tala('jhampa', 'Jhampa', ['L', 'A', 'D'], 'misra'),
  triputa: tala('triputa', 'Triputa', ['L', 'D', 'D'], 'tisra'),
  ata:     tala('ata', 'Ata', ['L', 'L', 'D', 'D'], 'khanda'),
  eka:     tala('eka', 'Eka', ['L'], 'chatusra'),
};

/* ---------------------------------------------------------- */
/*  notation                                                   */
/* ---------------------------------------------------------- */

const SWARA_INDEX = { s: 0, r: 1, g: 2, m: 3, p: 4, d: 5, n: 6 };

/**
 * Parses printed swara notation into a flat list of aksharas.
 *
 *   s r g m | p d | n S     one line of Adi tala, 4 + 2 + 2
 *   s r g m | p , | s r     ',' holds the previous swara one more akshara
 *   s r - s r - | s r       '-' is a reading hyphen and carries no duration
 *
 * Lowercase is madhya sthayi, uppercase tara, a leading dot mandara.
 */
export function parse(notation, degreesPerOctave = 7) {
  const aksharas = [];
  const angaStarts = [0];
  let i = 0;

  while (i < notation.length) {
    const c = notation[i];

    if (/\s/.test(c) || c === '-') { i++; continue; }

    if (c === '|') {
      while (notation[i] === '|') i++;
      if (aksharas.length && angaStarts[angaStarts.length - 1] !== aksharas.length) {
        angaStarts.push(aksharas.length);
      }
      continue;
    }

    if (c === ',') { aksharas.push({ degree: null, extend: true }); i++; continue; }
    if (c === ';') { aksharas.push({ degree: null, extend: true }, { degree: null, extend: true }); i++; continue; }
    if (c === '_') { aksharas.push({ degree: null, extend: false }); i++; continue; }

    if (c === '.') {
      let oct = 0;
      while (notation[i] === '.') { oct--; i++; }
      const base = SWARA_INDEX[(notation[i] || '').toLowerCase()];
      if (base !== undefined) aksharas.push({ degree: base + oct * degreesPerOctave });
      i++;
      continue;
    }

    const base = SWARA_INDEX[c.toLowerCase()];
    if (base === undefined) { i++; continue; }
    let oct = c === c.toUpperCase() && /[a-z]/i.test(c) ? 1 : 0;
    i++;
    while (notation[i] === "'") { oct++; i++; }
    aksharas.push({ degree: base + oct * degreesPerOctave });
  }

  return { aksharas, angaStarts: [...new Set(angaStarts)] };
}

export function concat(phrases) {
  const aksharas = [], angaStarts = [];
  phrases.forEach(p => {
    const base = aksharas.length;
    p.angaStarts.forEach(s => angaStarts.push(base + s));
    aksharas.push(...p.aksharas);
  });
  return { aksharas, angaStarts: [...new Set(angaStarts)].sort((a, b) => a - b) };
}

/* ---------------------------------------------------------- */
/*  sarali varisai                                             */
/* ---------------------------------------------------------- */

const SARALI_LINES = [
  ['1',  ['s r g m | p d | n S', 'S n d p | m g | r s'], 'plain ascent and descent'],
  ['2',  ['s r - s r - | s r | g m', 's r g m | p d | n S', 'S n - S n - | S n | d p', 'S n d p | m g | r s'], 'R and N'],
  ['3',  ['s r g - s | r g - | s r', 's r g m | p d | n S', 'S n d - s | n d - | s n', 'S n d p | m g | r s'], 'G and D'],
  ['4',  ['s r g m - | s r | g m -', 's r g m | p d | n S', 'S n d p - | S n | d p -', 'S n d p | m g | r s'], 'M and P'],
  ['5',  ['s r g m | p , - | s r', 's r g m | p d | n S', 'S n d p | m , - | S n', 'S n d p | m g | r s'], 'dheergam on P and M'],
  ['6',  ['s r g m | p d - | s r', 's r g m | p d | n S', 'S n d p | m g - | S n', 'S n d p | m g | r s'], 'G and D'],
  ['7',  ['s r g m | p d | n ,', 's r g m | p d | n S', 'S n d p | m g | r ,', 'S n d p | m g | r s'], 'dheergam on N and R'],
  ['8',  ['s r g m | p m | g r', 's r g m | p d | n S', 'S n d p | m p | d n', 'S n d p | m g | r s'], 'zig-zag: pmgr and mpdn'],
  ['9',  ['s r g m | p m | d p', 's r g m | p d | n S', 'S n d p | m p | g m', 'S n d p | m g | r s'], 'zig-zag: pmdp and mpgm'],
  ['10', ['s r g m | p , | g m', 'p , , , | p , | , ,', 'g m p d | n d | p m', 'g m p - g | m g | r s'], 'long P, and the region between G and N'],
  ['11', ['S , n d | n , | d p', 'd , p m | p , | p ,', 'g m p d | n d | p m', 'g m p - g | m g | r s'], 'dheergams at S, N, D, P'],
  ['12', ['S S n d | n n | d p', 'd d p m | p , | p ,', 'g m p d | n d | p m', 'g m p - g | m g | r s'], 'a preview of janta'],
  ['13', ['s r g r | g , - | g m', 'p m p , - | d p | d ,', 'm p d p | d n | d p', 'm p d p | m g | r s'], 'zig-zag patterns'],
  ['14', ['s r g m | p , | p ,', 'd d p , | m m | p ,', 'd n S , | S n | d p', 'S n d p | m g | r s'], 'dheergam at P and S; jantas at D and M'],
];

const SARALI_TIPS = {
  '1': ['This is the pitch reference for everything that follows. If Sa drifts here, it drifts everywhere.',
        'Check yourself against the drone at the end of each line — you should land back on exactly the Sa you started from.'],
  '2': ['The repeated swaras are where drift hides. The second one must be the same pitch as the first, not a second attempt at it.'],
  '3': ['The repeated swaras are where drift hides. The second one must be the same pitch as the first, not a second attempt at it.'],
  '4': ['The repeated swaras are where drift hides. The second one must be the same pitch as the first, not a second attempt at it.'],
  '5': ['A dheergam is a held note, not a pause. Keep the tone alive and steady for its full length.'],
  '6': ['A dheergam is a held note, not a pause. Keep the tone alive and steady for its full length.'],
  '7': ['A dheergam is a held note, not a pause. Keep the tone alive and steady for its full length.'],
  '8': ['On the zig-zags, know the target note before you sing it. Sliding up to find it is the habit these exist to break.'],
  '9': ['On the zig-zags, know the target note before you sing it. Sliding up to find it is the habit these exist to break.'],
  '10': ['Long held notes expose breath management. Take a low, quiet breath before the line rather than a gasp mid-phrase.'],
  '11': ['Long held notes expose breath management. Take a low, quiet breath before the line rather than a gasp mid-phrase.'],
  '12': ['The doubled notes preview janta varisai. Both notes get a clean attack; do not let the second sag.'],
  '13': ['These move quickly between registers. Let the pitch move without letting the volume jump with it.'],
  '14': ['These move quickly between registers. Let the pitch move without letting the volume jump with it.'],
};

const COMMON_TIPS = [
  'Keep the tala going with your hand throughout. An exercise sung without tala is a different, easier exercise.',
  'Sing the swara syllables first. Move to akaram — the vowel "aa" — only once the syllable version is secure.',
];

const sarali = SARALI_LINES.map(([n, lines, focus]) => ({
  id: `sarali-${n}`,
  name: `Sarali Varisai ${n}`,
  group: 'Sarali Varisai',
  subtitle: focus,
  raga: 'mayamalavagowla',
  tala: 'adi',
  bpm: 52,
  instruction: 'Sing with the drone. Land each swara cleanly before you think about speed.',
  phrase: concat(lines.map(l => parse(l))),
  lines,
  tips: [...COMMON_TIPS, ...(SARALI_TIPS[n] || []),
    'If your pitch line wobbles on a held note, the cause is usually breath pressure, not the throat.'],
  verifyWithTeacher: Number(n) >= 10,
}));

/* ---------------------------------------------------------- */
/*  janta varisai                                              */
/* ---------------------------------------------------------- */

/* One pattern applied from each rung of the scale, generated rather
   than typed out ten times — a typo cannot then exist in only one
   line. null in a pattern is a dheergam. */
function generate(startDegrees, pattern) {
  return concat(startDegrees.map(start => ({
    aksharas: pattern.map(off => (off === null
      ? { degree: null, extend: true }
      : { degree: start + off })),
    angaStarts: [0, 4, 6],
  })));
}

const JANTA_SPECS = [
  ['1', 'Plain jantas', 'each swara doubled', [0, 0, 1, 1, 2, 2, 3, 3], true,
    'The simplest form and the most revealing. Both notes of a pair must be the same pitch and the same weight.'],
  ['2', 'Doubled with return', 'pairs that step and fall back', [0, 0, 1, 1, 0, 0, 1, 1], true,
    'Returning to the lower note tests whether you actually left it or just leaned.'],
  ['3', 'Janta with a single note', 'ssr — ssr — sr', [0, 0, 1, 0, 0, 1, 0, 1], true,
    'The single note between pairs must not be swallowed. Give it the same clarity as the doubled ones.'],
  ['4', 'Janta over three', 'ssrrg — srg', [0, 0, 1, 1, 2, 0, 1, 2], true,
    'Watch the transition from the doubled group into the plain run — tempo usually slips there.'],
  ['5', 'Janta with dheergams', 'ss, — rr, — gg', [0, 0, null, 1, 1, null, 2, 2], true,
    'The hold is part of the exercise. Keep the tone alive rather than letting it fade into the gap.'],
  ['6', 'Triple janta', 'sss — rrr — gg', [0, 0, 0, 1, 1, 1, 2, 2], true,
    'Three identical attacks in a row. By the third the throat wants to push — let the breath do it instead.'],
  ['7', 'Janta with skips', 'ss mm gg rr', [0, 0, 3, 3, 2, 2, 1, 1], true,
    'Doubled notes across a leap. Both notes of the far pair must be in tune, not just the first.'],
  ['8', 'Descending jantas', 'pairs falling from each degree', [0, 0, -1, -1, -2, -2, -3, -3], false,
    'Descending pairs tend to go flat. The graph will show it before your ear does.'],
];

const ASC = [0, 1, 2, 3, 4, 5, 6, 7];
const DESC = [7, 6, 5, 4, 3, 2, 1, 0];

const janta = JANTA_SPECS.map(([n, name, focus, pattern, mirror, tip]) => {
  const starts = (mirror ? [...ASC, ...DESC.slice(1)] : DESC)
    .filter(st => pattern.filter(o => o !== null).every(o => st + o >= -7 && st + o <= 14));
  return {
    id: `janta-${n}`,
    name: `Janta Varisai ${n}`,
    group: 'Janta Varisai',
    subtitle: focus,
    raga: 'mayamalavagowla',
    tala: 'adi',
    bpm: 76,
    instruction: 'Both notes of every pair are the same pitch. Attack each one cleanly.',
    phrase: generate(starts, pattern),
    tips: [tip, ...COMMON_TIPS,
      'If the second note of a pair drops on the graph, you are running out of breath support, not out of voice.'],
    verifyWithTeacher: true,
  };
});

/* ---------------------------------------------------------- */
/*  alankaram                                                  */
/* ---------------------------------------------------------- */

const ALANKARAM_SPECS = [
  ['dhruva',  [0, 1, 2, 3, 2, 1, 0, 1, 2, 1, 0, 1, 2, 3],
    'Longest of the seven at fourteen aksharas. Count the laghus honestly — this is where hands start guessing.'],
  ['matya',   [0, 1, 2, 1, 0, 1, 0, 1, 2, 3],
    'Ten aksharas. The drutam in the middle is the landmark; if you lose your place, find it there.'],
  ['rupaka',  [0, 1, 0, 1, 2, 3],
    'Six aksharas, the shortest cycle here. Starting on the drutam rather than the laghu takes getting used to.'],
  ['triputa', [0, 1, 2, 0, 1, 2, 3],
    'Tisra laghu — three, not four. The most common place for a chatusra habit to intrude.'],
  ['jhampa',  [0, 1, 2, 0, 1, 0, 1, 2, 3, null],
    'Misra laghu of seven plus a single anudrutam beat. The lone anudrutam is easy to drop.'],
  ['ata',     [0, 1, null, 2, null, 0, null, 1, 2, null, 3, null, 3, null],
    'Two khanda laghus of five. Fourteen aksharas like Dhruva but grouped completely differently.'],
  ['eka',     [0, 1, 2, 3],
    'Four aksharas. Deceptively hard to keep honest at slow speeds.'],
];

const alankaram = ALANKARAM_SPECS.map(([talaId, offsets, note]) => {
  const t = TALAS[talaId];
  const starts = [...ASC, ...DESC.slice(1)]
    .filter(st => offsets.filter(o => o !== null).every(o => st + o >= 0 && st + o <= 14));
  return {
    id: `alankaram-${talaId}`,
    name: `Alankaram — ${t.name}`,
    group: 'Alankaram',
    subtitle: `${t.aksharas} aksharas · ${t.jati} jati`,
    raga: 'mayamalavagowla',
    tala: talaId,
    bpm: 60,
    instruction: 'The tala is the exercise. Keep the hand going even when the voice is unsure.',
    phrase: generate(starts, offsets),
    tips: [note, ...COMMON_TIPS],
    verifyWithTeacher: true,
  };
});

/* ---------------------------------------------------------- */

export const CARNATIC_BASE = [...sarali, ...janta, ...alankaram];

/* Groups in syllabus order, not alphabetical: the fourteen sections
   are a deliberate progression from raw pitch control to raga
   grammar, and reordering them to suit navigation breaks it. */
export const GROUPS = [
  'Shruti', 'Sarali Varisai', 'Janta Varisai', 'Dhatu Varisai',
  'Mel / Sthayi Varisai', 'Alankaram', 'Geetham', 'Nottuswaram',
];



/** Western note names, only as a cross-reference for setting the tonic. */
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** A sensible range of tonics for a singer to pick from, by frequency. */
export function tonicOptions() {
  const out = [];
  for (let midi = 48; midi <= 72; midi++) {          // C3 to C5
    out.push({
      midi,
      name: `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`,
      hz: 440 * Math.pow(2, (midi - 69) / 12),
    });
  }
  return out;
}

/* ---------------------------------------------------------- */
/*  shruti — section 1, and the most important of the lot      */
/* ---------------------------------------------------------- */

/* These are the only exercises where the pitch monitor is the whole
   point rather than a diagnostic: the target is a single flat line,
   and how flat your trace is *is* the score. Everything downstream
   assumes a stable tonal centre — if Sa drifts, every varisai above
   it is practising the wrong intervals accurately. */

const step = (seconds, label, cue = null, semitones = null, glideTo = null) =>
  ({ seconds, label, cue, semitones, glideTo });

const shruti = [
  {
    id: 'drone-sa', name: 'Sustained Sa', group: 'Shruti', subtitle: 'against the drone',
    raga: 'mayamalavagowla', tala: 'adi', bpm: 40, intensity: 'Gentle',
    instruction: 'Hold Sa against the drone. One flat line, for as long as you can.',
    steps: [
      step(6, 'Listen', 'let the drone settle in your ear before you sing'),
      step(12, 'S', 'match it exactly — not near it', 0),
      step(4, 'Breathe'),
      step(12, 'S', 'same note, same steadiness', 0),
      step(4, 'Breathe'),
      step(15, 'S', 'longest hold — do not let it sag at the end', 0),
    ],
    tips: [
      'You are aiming for a straight horizontal line on the graph. Any wobble is breath, not pitch memory.',
      'Learn to hear whether you are above or below the drone before you look at the screen. Then check.',
      'Match the note directly rather than approaching it by trial and error. Scooping up to Sa is a habit that will follow you into every exercise.',
      'Sa is the reference point against which every other swara is heard. Time spent here is not warm-up, it is the foundation.',
    ],
  },
  {
    id: 'drone-sa-pa', name: 'Sa — Pa — Sa', group: 'Shruti', subtitle: 'the fifth, and back',
    raga: 'mayamalavagowla', tala: 'adi', bpm: 36, intensity: 'Gentle',
    instruction: 'S–P–S then S–M–S, slowly. Return to exactly the Sa you left.',
    phrase: concat([parse('s , , , | p , | s ,'), parse('s , , , | m , | s ,')]),
    tips: [
      'Sa, Pa and Ma are the notes the drone reinforces. They should feel like they lock in rather than like they are being placed.',
      'The returning Sa is the test. If it is a few cents off the one you started on, the fifth pulled you.',
      'Sing it slowly enough that you can hear each note settle before moving.',
    ],
  },
  {
    id: 'drone-sthayi-sa', name: 'Sa across the sthayis', group: 'Shruti',
    subtitle: 'same swara, three registers',
    raga: 'mayamalavagowla', tala: 'adi', bpm: 32,
    instruction: 'Mandara Sa, madhya Sa, tara Sa. One tonal centre, three octaves.',
    phrase: parse('.s , , , | s , , , | S , , , | s , , ,'),
    tips: [
      'Each octave must be exactly 1200 cents from the last. The graph will show you if the upper Sa is sharp — it usually is.',
      'Keep the tone stable while crossing register boundaries rather than pushing volume to get there.',
      'If the tara Sa is a struggle, lower your Sa setting. Working from a Sa that is too high for you poisons everything.',
    ],
  },
];

/* ---------------------------------------------------------- */
/*  dhatu varisai — non-sequential movement                    */
/* ---------------------------------------------------------- */

const DHATU_ONE = [
  's m g m | r g | s r', 's g r g | s r | g m',
  'r p m p | g m | r g', 'r m g m | r g | m p',
  'g d p d | m p | g m', 'g p m p | g m | p d',
  'm n d n | p d | m p', 'm d p d | m p | d n',
  'p S n S | d n | p d', 'p n d n | p d | n S',
  'S p d p | n d | S n', 'S d n d | S n | d p',
  'n m p m | d p | n d', 'n p d p | n d | p m',
  'd g m g | p m | d p', 'd m p m | d p | m g',
  'p r g r | m g | p m', 'p g m g | p m | g r',
  'm s r s | g r | m g', 'm r g r | m g | r s',
];

const DHATU_TWO = [
  's r s g | r g | r m', 's m g r | s r | g m',
  'r g r m | g m | g p', 'r p m g | r g | m p',
  'g m g p | m p | m d', 'g d p m | g m | p d',
  'm p m d | p d | p n', 'm n d p | m p | d n',
  'p d p n | d n | d S', 'p S n d | p d | n S',
  'S n S d | n d | n p', 'S p d n | S n | d p',
  'n d n p | d p | d m', 'n m p d | n d | p m',
  'd p d m | p m | p g', 'd g m p | d p | m g',
  'p m p g | m g | m r', 'p r g m | p m | g r',
  'm g m r | g r | g s', 'm s r g | m g | r s',
];

const dhatuOf = (id, name, lines, focus, tip) => ({
  id, name, group: 'Dhatu Varisai', subtitle: focus,
  raga: 'mayamalavagowla', tala: 'adi', bpm: 44,
  instruction: 'Know the target note before you sing it. Do not slide up to find it.',
  phrase: concat(lines.map(l => parse(l))),
  verifyWithTeacher: true,
  tips: [
    tip,
    'Start slowly and identify every target note before singing it.',
    'Use the drone and check each note’s relationship to Sa, not just to the note before it.',
    'Increase speed only once the intervallic pattern is secure — the graph will show scooping long before your ear admits it.',
    'Later, practise the same patterns in the lower and upper registers.',
  ],
});

const dhatu = [
  dhatuOf('dhatu-1', 'Dhatu Varisai — Set 1', DHATU_ONE, 'leaps with a turn',
    'Each line jumps away and turns back. The turn is where pitch usually collapses.'),
  dhatuOf('dhatu-2', 'Dhatu Varisai — Set 2', DHATU_TWO, 'wider intervallic movement',
    'Wider skips than Set 1. Anticipate the interval; do not let the voice approach it gradually.'),
];

/* ---------------------------------------------------------- */
/*  mel / sthayi varisai — connecting the registers            */
/* ---------------------------------------------------------- */

const melOf = (id, name, subtitle, lines, instruction, tips, bpm = 46) => ({
  id, name, subtitle, group: 'Mel / Sthayi Varisai',
  raga: 'mayamalavagowla', tala: 'adi', bpm,
  intensity: 'Demanding', instruction,
  phrase: concat(lines.map(l => parse(l))),
  tips,
  caution: 'Stop before the top of your range, not at it. Reaching is how strain starts.',
});

const melsthayi = [
  melOf('melsthayi-1', 'Madhya to Tara', 'crossing upward',
    ['s r g m | p d | n S', 'S n d p | m g | r s', 'p d n S | R G | M P', 'P M G R | S n | d p'],
    'Same swara identity in both octaves. Reach with breath, not with volume.',
    ['The upper Sa must be the same swara as the lower one, an octave up — not a brighter, pushier note that happens to be high.',
     'Use controlled breath rather than force to reach higher notes.',
     'If your tone changes character at the crossing point, you have found your passaggio. That is useful information, not a failure.']),
  melOf('melsthayi-2', 'Madhya to Mandara', 'crossing downward',
    ['s r g m | p d | n S', 'S n d p | m g | r s', '.n .d .p .d | .n s | r s', 's .n .d .p | .d .n | s ,'],
    'Keep the tone steady as you go low. Do not let it fall into a rattle.',
    ['Low notes lose support before they lose pitch. Keep the breath moving.',
     'If the tone breaks into vocal fry, you are below your usable range for today — come back up.',
     'The tonal centre must not move. Check against the drone at every phrase end.']),
  melOf('melsthayi-3', 'Three sthayis', 'mandara → madhya → tara → back',
    ['.p .d .n s | r g | m p', 'd n S R | G M | P ,', 'P M G R | S n | d p', 'm g r s | .n .d | .p ,'],
    'One continuous journey through all three registers and back.',
    ['This is the checkpoint exercise for register control. Aim for no audible seam.',
     'Keep the tone stable while crossing register boundaries rather than pushing volume.',
     'Sing it slowly first. Speed hides seams rather than removing them.',
     'Do this near the end of a session, once you are warm — not cold.'], 38),
];

/* ---------------------------------------------------------- */
/*  geetham and nottuswaram                                    */
/* ---------------------------------------------------------- */

/* Sree Gananatha is the only one shipped with notation, transcribed
   from a published source and marked for checking. The rest are
   study cards: raga, tala and sahitya, with the notation left to
   your teacher's copy rather than invented here. */

const SREE_GANANATHA = [
  'm p | d S S R || R S | d p m p',
  'r m | p d m p || d p | m g r s',
  's , | r m g r || s r | g r s ,',
  'r m | p d m p || d p | m g r s',
  's , | r m g r || s r | g r s ,',
  'm p | d S S R || R S | d p m p',
  'r m | p d m p || d p | m g r s',
  's , | r m g r || s r | g r s ,',
];

const studyCard = (id, name, ragaName, talaName, sahitya, note) => ({
  id, name, group: 'Geetham',
  subtitle: `${ragaName} · ${talaName} · notation from your teacher`,
  bpm: 52,
  instruction: 'Notation not included. Use the drone and monitor while you work from your teacher’s copy.',
  tips: [
    note,
    `Sahitya: ${sahitya}`,
    'Learn through swara accuracy, sahitya and pronunciation, tala, raga identity, prescribed gamaka, breath placement, and the meaning of the words.',
    'Understand whether this is a samanya geetham or a lakshana geetham — the latter illustrates the features of its raga in the composition itself.',
  ],
});

const geetham = [
  {
    id: 'geetham-sree-gananatha', name: 'Sree Gananatha', group: 'Geetham',
    subtitle: 'Malahari · Rupaka · the first geetham',
    raga: 'malahari', tala: 'rupaka', bpm: 66, verifyWithTeacher: true,
    instruction: 'Sing the swaras until secure, then the sahitya. Keep the tala unbroken through both.',
    phrase: concat(SREE_GANANATHA.map(l => parse(l))),
    tips: [
      'Learn it in this order: swara accuracy, then sahitya and pronunciation, then tala, then raga identity, then breath placement and phrase structure.',
      'Malahari has no Ga ascending but uses G3 descending. Feel that asymmetry rather than treating the raga as a scale.',
      'Sahitya: lambodara lakumikara / ambāsuta amaravinuta — sing the words, don’t recite them over the tune.',
      'This is the transition from abstract exercise to music. Expect it to feel harder than a varisai that uses the same notes.',
      'Plan your breaths at phrase ends before you start, rather than taking one wherever you run out.',
      'Octave placement in line 1 was reconstructed from the melodic contour — check it against your teacher’s copy before memorising.',
    ],
  },
  studyCard('geetham-kereya-neeriya', 'Kereya Neeriya', 'Malahari', 'Rupaka',
    'kereya nīranu kerege cellidu',
    'The second of the pillari geethams. Same raga and tala as Sree Gananatha, so the raga should start feeling familiar rather than new.'),
  studyCard('geetham-padumanabha', 'Padumanabha', 'Malahari', 'Triputa',
    'padumanābha paramapurusha',
    'Third pillari geetham. The tala changes here, which is the point — the same raga in a different rhythmic frame.'),
  studyCard('geetham-analekara', 'Analekara', 'Shuddha Saveri', 'Triputa',
    'analēkara vidhi',
    'Moves out of Malahari for the first time. Notice how differently the same tala sits under a different raga.'),
  studyCard('geetham-kamalajadala', 'Kamalajadala', 'Kalyani', 'Triputa',
    'kamalajādaḷa vinuta',
    'Kalyani has prati madhyama (M2). If M sounds like the Ma you know from Mayamalavagowla, you are singing the wrong note.'),
];

const nottuCard = (id, name, ragaName, note) => ({
  id, name, group: 'Nottuswaram', subtitle: `${ragaName} · notation from your teacher`,
  bpm: 60, intensity: 'Gentle',
  instruction: 'Plain-note singing. Clean pitch, clear pronunciation, strict rhythm.',
  tips: [
    note,
    'These use relatively plain note movement rather than the gamaka-rich treatment of most Carnatic compositions.',
    'That plainness is the training value: with no ornamentation to hide behind, the pitch monitor will show every inaccuracy.',
    'Do not treat every composition as if it uses identical ornamentation — recognising stylistic context is the skill here.',
  ],
});

const nottuswaram = [
  nottuCard('nottu-santatam', 'Santatam Pahimam', 'Shankarabharanam',
    'One of the best known nottuswarams. Shankarabharanam maps onto the major scale, so this is unusually easy to check against a keyboard.'),
  nottuCard('nottu-jagadisa', 'Jagadisa Guro', 'Shankarabharanam',
    'Steady rhythmic movement. Use the metronome and watch your onsets, not just your pitches.'),
  nottuCard('nottu-varasiva', 'Varashiva Balam', 'Shankarabharanam',
    'Good for practising clean attacks — every note starts where it should, with no scoop.'),
];

export const CARNATIC_EXTRA = [...shruti, ...dhatu, ...melsthayi, ...geetham, ...nottuswaram];

/** Everything Carnatic, in syllabus order. */
export const EXERCISES = [...shruti, ...sarali, ...janta, ...dhatu,
                          ...melsthayi, ...alankaram, ...geetham, ...nottuswaram]
  .map(e => ({ discipline: 'Carnatic', intensity: 'Moderate', tips: [], ...e }));

export const findExercise = (id) => EXERCISES.find(e => e.id === id) || null;
