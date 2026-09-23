/* ============================================================
   svara.js — the vocal practice section

   Svara proper is the Android app. This is everything of it that a
   browser can do honestly, on the same screen as the rest of Sid:
   the drone, the tuner, the full exercise library — mechanical and
   Carnatic — a run-along that sings the exercise and marks what
   landed, recording with an effects chain, the vocal-health
   guidance and the syllabus.

   Two things the browser still gets wrong, both stated in About
   rather than hidden: latency of 60–150 ms, and audio that stops
   when you switch apps. Recording works, but takes live on this
   device only — audio is far too big to sync the way the text does.

   Nothing here touches the release side of Sid.
   ============================================================ */

import * as S from '../store.js';
import * as L from '../local.js';
import {
  h, clear, btn, card, cardHead, pageHead, subtabs, empty, toast, uid,
  fmtDate, todayISO, confirmDelete, fmtNum, modal, download, prose,
} from '../ui.js';
import {
  RAGAS, TALAS, EXERCISES, GROUPS, findExercise, semitoneForDegree,
  swaraName, degreeLabel, tonicOptions, NOTE_NAMES,
} from '../data/svara.js';
import { MECHANICAL, MECH_GROUPS } from '../data/svara-mechanical.js';
import { TIP_SECTIONS } from '../data/svara-tips.js';
import { ROUTINES, SYLLABUS } from '../data/svara-library.js';
import { buildTimeline, targetAt, segmentAt, indexAt, talaPosition, targetLines } from '../svara/timeline.js';
import * as A from '../svara/audio.js';
import * as REC from '../svara/record.js';

const SV = () => S.get('svara');
const save = () => S.touch('svara');

const APK = 'https://github.com/SiddharthaRaja/svara';

/** Everything, both disciplines. */
const ALL = [...MECHANICAL, ...EXERCISES];
const byId = (id) => ALL.find(e => e.id === id) || null;
const inGroup = (g) => ALL.filter(e => e.group === g);

let pane = 'tuner';

/* the live pitch, shared by whatever is on screen */
let latest = { hz: 0, clarity: 0, rms: 0 };
const frameHooks = new Set();
const onFrame = (f) => { latest = f; frameHooks.forEach(fn => { try { fn(f); } catch {} }); };

/* ---------------------------------------------------------- */
/*  helpers                                                    */
/* ---------------------------------------------------------- */

const tonicHz = () => A.midiToHz(SV().tonicMidi || 50);
const tonicName = () => {
  const m = SV().tonicMidi || 50;
  return `${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
};
const raga = () => RAGAS[SV().raga || 'mayamalavagowla'];

/** Mechanical exercises hang off their own base note, not Sa. */
const baseHzFor = (ex) => (ex.discipline === 'Mechanical'
  ? A.midiToHz(SV().baseMidi || SV().tonicMidi || 50)
  : tonicHz());

function degreeTargets(from = 0, to = 7) {
  const r = raga(), base = tonicHz(), out = [];
  for (let d = from; d <= to; d++) {
    out.push({
      degree: d, label: degreeLabel(d), swara: swaraName(r, d),
      hz: base * Math.pow(2, semitoneForDegree(r, d) / 12),
    });
  }
  return out;
}

function rerenderPane() {
  const host = document.querySelector('#view');
  if (!host) return;
  clear(host);
  host.append(renderSvara(pane));
}

/* ---------------------------------------------------------- */
/*  entry                                                      */
/* ---------------------------------------------------------- */

const PANES = [
  ['tuner', 'Tuner'],
  ['practice', 'Practice'],
  ['library', 'Library'],
  ['takes', 'Takes'],
  ['learn', 'Learn'],
  ['log', 'Log'],
];

export function renderSvara(sub) {
  if (sub && PANES.some(p => p[0] === sub)) pane = sub;

  const box = h('div');
  box.append(pageHead('Svara', 'Drone, tuner, the full exercise library, and recording that stays on this device.'));
  box.append(subtabs(PANES, pane, (k) => { location.hash = `#/sv/${k}`; }));

  const body = h('div');
  try {
    if (pane === 'practice') body.append(practicePane());
    else if (pane === 'library') body.append(libraryPane());
    else if (pane === 'takes') body.append(takesPane());
    else if (pane === 'learn') body.append(learnPane());
    else if (pane === 'log') body.append(logPane());
    else body.append(tunerPane());
  } catch (e) {
    console.error(e);
    body.append(empty('Something went wrong on this tab', String(e && e.message || e)));
  }
  box.append(body);
  return box;
}

/** Called by the router when leaving, so the microphone light goes out. */
export function leaveSvara() {
  A.stopAll();
  frameHooks.clear();
  stopRun();
  /* A take in progress used to be stopped and thrown away — one
     sideways swipe and three minutes of singing were gone with no
     prompt. Now leaving ends the take and keeps it. */
  if (REC.recording()) {
    const save = pendingTakeSaver;
    const out = REC.stopRecording();
    if (save && out && out.samples && out.samples.length) {
      save(out).then(
        () => toast('Recording saved to Svara takes', 3000),
        (e) => {
          /* This was a console.warn. You would swipe away mid-take and
             be told nothing at all while the audio disappeared. */
          L.problem('A recording could not be saved: ' + (e.message || e));
          toast('That recording could NOT be saved: ' + (e.message || e), 6000);
        });
    }
  }
  pendingTakeSaver = null;
}

/* Set by the recorder pane so leaveSvara() can finish its work. */
let pendingTakeSaver = null;

/* Closing the tab mid-take used to lose it outright: the lifecycle
   handlers in store.js only flush slices, and an in-progress recording
   is not a slice. Now the audio is stopped and written like any other
   take, and the leave-page prompt fires while it happens. */
let recordingGuardInstalled = false;
function installRecordingGuard() {
  if (recordingGuardInstalled) return;
  recordingGuardInstalled = true;
  const rescue = () => {
    if (!REC.recording()) return false;
    const save = pendingTakeSaver;
    const out = REC.stopRecording();
    if (save && out && out.samples && out.samples.length) {
      save(out).catch(e => L.problem('A recording could not be saved as the app closed: ' + (e.message || e)));
      return true;
    }
    return false;
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') rescue(); });
  window.addEventListener('pagehide', rescue);
  window.addEventListener('beforeunload', (e) => {
    if (!REC.recording()) return;
    rescue();
    e.preventDefault();
    e.returnValue = '';
  });
}

/* ---------------------------------------------------------- */
/*  shared controls                                            */
/* ---------------------------------------------------------- */

function noteGrid(current, onPick) {
  return h('div', { class: 'sv-grid' }, tonicOptions().map(o => h('button', {
    class: `sv-sw ${o.midi === current ? 'on' : ''}`,
    onClick: (e) => {
      [...e.target.parentElement.children].forEach(b => b.classList.remove('on'));
      e.target.classList.add('on');
      onPick(o.midi);
    },
    text: o.name,
  })));
}

function tonicCard(onChange) {
  const label = h('div', { class: 'small muted' });
  const paint = () => {
    label.textContent = `Sa is ${tonicName()} — ${tonicHz().toFixed(1)} Hz. Everything Carnatic follows from this.`;
  };
  paint();

  const baseLabel = h('div', { class: 'small muted' });
  const paintBase = () => {
    const m = SV().baseMidi || SV().tonicMidi || 50;
    baseLabel.textContent = `Mechanical exercises start from ${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}.`;
  };
  paintBase();

  return h('div',
    card(
      cardHead('Your Sa'),
      label,
      h('p', { class: 'small muted' },
        'Pick the pitch your voice actually sits on, not the one you wish it did. If you are unsure, start the drone and move up and down until the low Sa is comfortable to hold.'),
      noteGrid(SV().tonicMidi || 50, (m) => {
        SV().tonicMidi = m; save(); paint();
        if (A.droneRunning()) A.startDrone(tonicHz(), SV().droneVol ?? 0.22);
        onChange && onChange();
      })),
    card(
      cardHead('Your base note'),
      baseLabel,
      h('p', { class: 'small muted' },
        'Mechanical exercises are written in semitones from a base note rather than in a key, so a bass and a tenor sing the same exercise at different pitches. An app that hardcodes C3 is telling half its singers to strain.'),
      noteGrid(SV().baseMidi || SV().tonicMidi || 50, (m) => { SV().baseMidi = m; save(); paintBase(); })));
}

function droneRow() {
  const row = h('div', { class: 'row' });
  const b = btn(A.droneRunning() ? 'Stop drone' : 'Start drone', async () => {
    if (A.droneRunning()) { A.stopDrone(); b.textContent = 'Start drone'; b.classList.remove('on'); }
    else {
      await A.startDrone(tonicHz(), SV().droneVol ?? 0.22);
      b.textContent = 'Stop drone'; b.classList.add('on');
    }
  }, { cls: 'btn-sm' });
  if (A.droneRunning()) b.classList.add('on');

  const vol = h('input', {
    type: 'range', min: 0, max: 60, value: Math.round((SV().droneVol ?? 0.22) * 100),
    style: { flex: '1', accentColor: 'var(--accent)' },
    onInput: (e) => {
      const v = Number(e.target.value) / 100;
      SV().droneVol = v; save();
      if (A.droneRunning()) A.startDrone(tonicHz(), v);
    },
  });
  row.append(b, vol);
  return row;
}

function micButton(onError) {
  const b = btn(A.micRunning() ? 'Microphone on' : 'Use the microphone', async () => {
    if (A.micRunning()) {
      A.stopMic(); b.textContent = 'Use the microphone'; b.classList.remove('on'); return;
    }
    try { await A.startMic(onFrame); b.textContent = 'Microphone on'; b.classList.add('on'); }
    catch (e) { onError && onError(e.message); }
  }, { cls: 'btn-sm' });
  if (A.micRunning()) b.classList.add('on');
  return b;
}

/* ---------------------------------------------------------- */
/*  tuner                                                      */
/* ---------------------------------------------------------- */

function tunerPane() {
  const box = h('div');

  const note = h('div', { class: 'sv-note' }, h('b', { text: '—' }), h('span', { text: '' }));
  const barIn = h('i');
  const bar = h('div', { class: 'sv-cents' }, h('em'), barIn);
  const readout = h('div', { class: 'small muted', text: 'Microphone off.' });

  const canvas = h('canvas', { width: 640, height: 240 });
  const meter = h('div', { class: 'sv-meter' }, canvas);

  const history = [];
  const draw = () => {
    const c = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    c.clearRect(0, 0, W, H);

    const targets = degreeTargets(-1, 8);
    const lo = targets[0].hz, hi = targets[targets.length - 1].hz;
    const yFor = (hz) => H - ((Math.log2(hz / lo) / Math.log2(hi / lo)) * H);

    const css = getComputedStyle(document.body);
    const line = css.getPropertyValue('--line') || '#333';
    const dim = css.getPropertyValue('--fg-3') || '#888';
    const accent = css.getPropertyValue('--accent') || '#e0603a';

    c.font = '11px ui-monospace, monospace';
    targets.forEach(t => {
      const y = yFor(t.hz);
      c.strokeStyle = t.degree % 7 === 0 ? dim : line;
      c.lineWidth = t.degree % 7 === 0 ? 1.2 : 1;
      c.beginPath(); c.moveTo(26, y); c.lineTo(W, y); c.stroke();
      c.fillStyle = dim;
      c.fillText(t.label, 4, y + 4);
    });

    c.strokeStyle = accent;
    c.lineWidth = 2;
    c.beginPath();
    let started = false;
    history.forEach((p, i) => {
      const x = 26 + ((W - 26) * i) / Math.max(1, history.length - 1);
      if (!p) { started = false; return; }
      const y = yFor(p);
      if (!started) { c.moveTo(x, y); started = true; } else c.lineTo(x, y);
    });
    c.stroke();
  };

  const hook = (f) => {
    history.push(f.hz || null);
    if (history.length > 220) history.shift();

    if (!f.hz) {
      note.firstChild.textContent = '—';
      note.lastChild.textContent = '';
      barIn.style.left = '50%';
      bar.classList.remove('sv-in-tune');
      readout.textContent = 'Listening — sing a steady note.';
    } else {
      const near = A.nearestOf(f.hz, degreeTargets(-2, 9));
      note.firstChild.textContent = near ? near.label : '—';
      note.lastChild.textContent = near ? `${near.swara} · ${f.hz.toFixed(1)} Hz` : '';
      const cents = near ? Math.max(-50, Math.min(50, near.cents)) : 0;
      barIn.style.left = `${50 + cents}%`;
      bar.classList.toggle('sv-in-tune', Math.abs(near?.cents || 99) < 12);
      readout.textContent = near
        ? `${near.cents > 0 ? '+' : ''}${near.cents.toFixed(0)} cents ${Math.abs(near.cents) < 12 ? '— in tune' : near.cents > 0 ? 'sharp' : 'flat'}`
        : '';
    }
    draw();
  };

  const micBtn = btn(A.micRunning() ? 'Stop listening' : 'Start listening', async () => {
    if (A.micRunning()) {
      A.stopMic(); frameHooks.delete(hook);
      micBtn.textContent = 'Start listening'; micBtn.classList.remove('on');
      readout.textContent = 'Microphone off.';
      return;
    }
    try {
      await A.startMic(onFrame);
      frameHooks.add(hook);
      micBtn.textContent = 'Stop listening'; micBtn.classList.add('on');
    } catch (e) { readout.textContent = e.message; }
  }, { cls: 'btn-sm btn-primary' });
  if (A.micRunning()) { micBtn.classList.add('on'); frameHooks.add(hook); }

  box.append(card(
    cardHead('Tuner', h('span', { class: 'tag mono', text: `Sa = ${tonicName()}` })),
    h('div', { class: 'row' }, micBtn, droneRow()),
    note, bar, readout, meter,
    h('p', { class: 'small muted', style: { marginTop: '10px' } },
      'The line is your pitch against the swaras of the raga. A held note should read as a flat line — a wobble is nearly always breath pressure rather than the throat.')));

  box.append(tonicCard(draw));
  draw();
  return box;
}

/* ---------------------------------------------------------- */
/*  library                                                    */
/* ---------------------------------------------------------- */

function exerciseRow(ex) {
  return h('button', {
    class: 'item', style: { width: '100%', textAlign: 'left' },
    onClick: () => { SV().current = ex.id; save(); location.hash = '#/sv/practice'; },
  },
    h('div', { class: 'item-head' },
      h('span', { class: 'item-title', text: ex.name }),
      ex.intensity === 'Demanding' ? h('span', { class: 'tag warn', text: 'demanding' }) : null,
      ex.verifyWithTeacher ? h('span', { class: 'tag', text: 'check with your teacher' }) : null),
    h('div', { class: 'small muted', style: { marginTop: '3px' }, text: ex.subtitle || '' }));
}

function libraryPane() {
  const box = h('div');
  const which = SV().libTab || 'carnatic';

  box.append(h('div', { class: 'seg', style: { marginBottom: '12px' } },
    [['carnatic', 'Carnatic'], ['mechanical', 'Technique'], ['routines', 'Routines']].map(([k, label]) =>
      h('button', { class: which === k ? 'on' : '', onClick: () => { SV().libTab = k; save(); rerenderPane(); } }, label))));

  if (which === 'routines') {
    box.append(card(
      h('p', { class: 'small muted' },
        'A routine is an ordered set of exercises — the order is the advice. Tapping one drops you at its first exercise and the rest follow.')));
    ROUTINES.forEach(r => {
      const found = r.exerciseIds.map(byId).filter(Boolean);
      box.append(card(
        cardHead(r.name, h('span', { class: 'tag mono', text: `${r.estimatedMinutes} min` })),
        h('p', { class: 'small muted', text: r.description }),
        h('div', { class: 'chips' }, found.map(e => h('button', {
          class: 'chip', text: e.name,
          onClick: () => { SV().current = e.id; SV().routine = r.id; save(); location.hash = '#/sv/practice'; },
        }))),
        found.length < r.exerciseIds.length
          ? h('div', { class: 'small muted', style: { marginTop: '6px' },
              text: `${r.exerciseIds.length - found.length} of these are not in the web library yet.` })
          : null));
    });
    return box;
  }

  const groups = which === 'mechanical' ? MECH_GROUPS : GROUPS;
  groups.forEach(g => {
    const items = inGroup(g);
    if (!items.length) return;
    box.append(card(
      cardHead(g, h('span', { class: 'tag', text: String(items.length) })),
      h('div', { class: 'list' }, items.map(exerciseRow))));
  });

  box.append(card(
    cardHead('About this material'),
    h('p', { class: 'small muted' }, which === 'mechanical'
      ? 'Ordered as a session should run, not alphabetically: SOVT first because it is the best-evidenced way to start, then breath, then the register work, then range, then agility, then cool-down.'
      : 'Sarali and janta notation varies between schools, and the alankarams are generated from the anga structure of each tala rather than transcribed line by line. Anything marked "check with your teacher" is where that variation actually bites.')));

  return box;
}

/* ---------------------------------------------------------- */
/*  practice                                                   */
/* ---------------------------------------------------------- */

let run = null;

function stopRun() {
  if (!run) return;
  cancelAnimationFrame(run.raf);
  if (run.collect) frameHooks.delete(run.collect);
  A.stopVoice();
  run = null;
}

function practicePane() {
  const ex = byId(SV().current) || ALL[0];
  if (!ex) return empty('No exercises', '');
  SV().current = ex.id;

  const box = h('div');
  const mech = ex.discipline === 'Mechanical';
  const base = baseHzFor(ex);
  const bpm = SV().bpm?.[ex.id] || ex.bpm || 60;
  const speed = mech ? 1 : (SV().speed || 1);
  const pace = mech ? (SV().pace || 1) : 1;

  const tl = buildTimeline(ex, { bpm, speed, pace });
  const lines = targetLines(tl);
  const angaStarts = (ex.phrase && ex.phrase.angaStarts) || [];

  /* Study cards — the geethams and nottuswarams whose notation is
     deliberately not shipped — have nothing to play. They still get
     the drone, the tuner and their tips, which is what they are for. */
  if (!tl.segments.length) return studyPane(ex);

  /* ---- the graph: target and voice, on one axis ---- */
  const canvas = h('canvas', { width: 720, height: 250 });
  const meter = h('div', { class: 'sv-meter' }, canvas);
  const sung = [];                        // {t, semis} while running

  const lo = Math.min(...lines.map(l => l.semitones), 0) - 2;
  const hi = Math.max(...lines.map(l => l.semitones), 12) + 2;

  const draw = (now = 0) => {
    const c = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    c.clearRect(0, 0, W, H);
    const css = getComputedStyle(document.body);
    const lineC = css.getPropertyValue('--line') || '#333';
    const dim = css.getPropertyValue('--fg-3') || '#888';
    const accent = css.getPropertyValue('--accent') || '#e0603a';
    const ok = css.getPropertyValue('--ok') || '#4a4';

    const total = Math.max(1, tl.totalSeconds);
    const win = Math.min(total, 12);                    // seconds on screen
    const t0 = Math.max(0, Math.min(now - win * 0.35, total - win));
    const xFor = (t) => 30 + ((t - t0) / win) * (W - 30);
    const yFor = (s) => H - ((s - lo) / (hi - lo)) * H;

    c.font = '11px ui-monospace, monospace';
    lines.forEach(l => {
      const y = yFor(l.semitones);
      c.strokeStyle = l.semitones % 12 === 0 ? dim : lineC;
      c.beginPath(); c.moveTo(30, y); c.lineTo(W, y); c.stroke();
      c.fillStyle = dim; c.fillText(l.label, 3, y + 4);
    });

    /* the target line */
    c.strokeStyle = ok; c.lineWidth = 3; c.globalAlpha = 0.55;
    c.beginPath();
    let pen = false;
    for (let t = t0; t < t0 + win; t += win / 400) {
      const v = targetAt(tl, t);
      if (v === null) { pen = false; continue; }
      const x = xFor(t), y = yFor(v);
      if (!pen) { c.moveTo(x, y); pen = true; } else c.lineTo(x, y);
    }
    c.stroke();
    c.globalAlpha = 1;

    /* what you actually sang */
    c.strokeStyle = accent; c.lineWidth = 2;
    c.beginPath(); pen = false;
    sung.forEach(p => {
      if (p.t < t0 || p.t > t0 + win) { pen = false; return; }
      if (p.semis === null) { pen = false; return; }
      const x = xFor(p.t), y = yFor(p.semis);
      if (!pen) { c.moveTo(x, y); pen = true; } else c.lineTo(x, y);
    });
    c.stroke();

    /* the playhead */
    if (run) {
      c.strokeStyle = dim; c.lineWidth = 1;
      c.beginPath(); c.moveTo(xFor(now), 0); c.lineTo(xFor(now), H); c.stroke();
    }
  };

  /* ---- the current step, big ---- */
  const bigLabel = h('b', { text: mech ? (ex.steps[0]?.label || '—') : '—' });
  const cueLine = h('div', { class: 'small muted', text: ex.instruction });
  const posLine = h('span', { class: 'small mono muted', text: '' });

  /* ---- notation chips for Carnatic ---- */
  const chips = [];
  const steps = h('div', { class: 'sv-steps' });
  if (!mech && ex.phrase) {
    ex.phrase.aksharas.forEach((a, i) => {
      const el = h('span', { class: 'sv-step',
        text: a.extend ? ',' : a.degree === null ? '_' : degreeLabel(a.degree) });
      if (ex.phrase.angaStarts.includes(i) && i !== 0) el.style.marginLeft = '14px';
      chips.push(el); steps.append(el);
    });
  }

  const score = h('div', { class: 'small muted', text: 'Switch the microphone on and it will mark what landed.' });

  /* ---- transport ---- */
  const goBtn = btn('Start', () => (run ? stop() : start()), { cls: 'btn-sm btn-primary' });
  const voiceBtn = btn(SV().voiceOn ? 'Guide voice on' : 'Guide voice', () => {
    SV().voiceOn = !SV().voiceOn; save();
    voiceBtn.textContent = SV().voiceOn ? 'Guide voice on' : 'Guide voice';
    voiceBtn.classList.toggle('on', !!SV().voiceOn);
  }, { cls: 'btn-sm' });
  if (SV().voiceOn) voiceBtn.classList.add('on');

  const vowel = h('select', {
    class: 'inp', style: { maxWidth: '90px' },
    onChange: (e) => { SV().vowel = e.target.value; save(); },
  }, A.VOWELS.map(([k, label]) => h('option', { value: k, selected: (SV().vowel || 'a') === k }, label)));

  function stop() {
    stopRun();
    goBtn.textContent = 'Start';
    goBtn.classList.remove('on');
  }

  async function start() {
    stopRun();
    sung.length = 0;
    chips.forEach(c => c.classList.remove('on', 'hit'));

    const hits = [];
    const samples = [];
    const collect = (f) => { if (f.hz) samples.push({ t: performance.now(), hz: f.hz }); };
    frameHooks.add(collect);

    const t0 = performance.now();
    let lastIdx = -1;
    let litAt = 0;

    if (SV().voiceOn) {
      try { await A.startVoice(tl, base, { vowel: SV().vowel || 'a', gain: 0.26 }); }
      catch (e) { score.textContent = e.message; }
    }

    const scoreSegment = (i) => {
      const s = tl.segments[i];
      if (!s || s.semitones === null || s.attack === false) return;
      const dur = (s.end - s.start) * 1000;
      const from = litAt + dur * 0.35, to = litAt + dur * 0.95;
      const win = samples.filter(x => x.t >= from && x.t <= to).map(x => x.hz);
      if (!win.length) return;
      win.sort((a, b) => a - b);
      const median = win[Math.floor(win.length / 2)];
      const cents = 1200 * Math.log2(median / (base * Math.pow(2, s.semitones / 12)));
      const good = Math.abs(cents) < 45;
      hits.push(good);
      if (good && s.aksharaIndex != null) chips[s.aksharaIndex]?.classList.add('hit');
    };

    const tick = () => {
      const now = (performance.now() - t0) / 1000;

      if (latest.hz) sung.push({ t: now, semis: 12 * Math.log2(latest.hz / base) });
      else sung.push({ t: now, semis: null });

      const i = indexAt(tl, now);
      if (i !== lastIdx) {
        scoreSegment(lastIdx);
        lastIdx = i; litAt = performance.now();
        const s = tl.segments[i];
        if (s) {
          bigLabel.textContent = s.label || '—';
          cueLine.textContent = s.cue || ex.instruction;
          posLine.textContent = mech ? '' : talaPosition(ex, s.aksharaIndex);
          if (s.aksharaIndex != null) {
            chips.forEach(c => c.classList.remove('on'));
            chips[s.aksharaIndex]?.classList.add('on');
            chips[s.aksharaIndex]?.scrollIntoView({ block: 'nearest', inline: 'center' });
          }
          /* a click on each akshara, accented at the anga starts.
             Mechanical steps are written in seconds, not beats, so
             they get no click at all. */
          if (!mech && SV().click !== false && s.aksharaIndex != null) {
            A.beep(angaStarts.includes(s.aksharaIndex) ? 1300 : 950,
                   angaStarts.includes(s.aksharaIndex) ? 35 : 30,
                   angaStarts.includes(s.aksharaIndex) ? 0.12 : 0.08);
          }
        }
      }

      draw(now);

      if (now >= tl.totalSeconds) {
        scoreSegment(lastIdx);
        stop();
        const n = hits.length, good = hits.filter(Boolean).length;
        score.textContent = n
          ? `${good} of ${n} targets within 45 cents. ${good / n > 0.8 ? 'Clean.' : 'The graph shows where the two lines parted.'}`
          : 'Finished. Switch the microphone on next time and it will mark what landed.';
        logRun(ex, Math.round(tl.totalSeconds));
        return;
      }
      run.raf = requestAnimationFrame(tick);
    };

    run = { raf: requestAnimationFrame(tick), collect };
    goBtn.textContent = 'Stop';
    goBtn.classList.add('on');
  }

  /* ---- tempo / pace ---- */
  const paceLabel = h('span', { class: 'small muted' });
  const paceInput = h('input', {
    type: 'range',
    min: mech ? 60 : 30, max: mech ? 160 : 140,
    value: mech ? Math.round(pace * 100) : bpm,
    style: { flex: 1, accentColor: 'var(--accent)' },
    onInput: (e) => {
      if (mech) { SV().pace = Number(e.target.value) / 100; }
      else { SV().bpm = { ...(SV().bpm || {}), [ex.id]: Number(e.target.value) }; }
      save(); paintPace();
      if (run) { stop(); start(); }
    },
  });
  const paintPace = () => {
    paceLabel.textContent = mech
      ? `${Math.round((SV().pace || 1) * 100)}% of the written timing`
      : `${SV().bpm?.[ex.id] || ex.bpm} BPM`;
  };
  paintPace();

  const speedSeg = mech ? null : h('div', { class: 'seg' }, [1, 2, 4].map(m => h('button', {
    class: (SV().speed || 1) === m ? 'on' : '',
    onClick: (e) => {
      SV().speed = m; save();
      [...e.target.parentElement.children].forEach(b => b.classList.remove('on'));
      e.target.classList.add('on');
      if (run) { stop(); start(); }
      else rerenderPane();
    },
  }, `${m}×`)));

  box.append(card(
    cardHead(ex.name, h('span', { class: 'tag mono',
      text: mech ? ex.group : `${(RAGAS[ex.raga] || {}).name || ''} · ${(TALAS[ex.tala] || {}).name || ''}` })),
    h('div', { class: 'sv-note' }, bigLabel, posLine),
    cueLine,
    meter,
    chips.length ? steps : null,
    h('div', { class: 'row', style: { marginTop: '12px' } },
      goBtn, speedSeg, micButton(m => { score.textContent = m; }), voiceBtn, vowel),
    h('div', { class: 'row', style: { marginTop: '8px' } }, paceInput, paceLabel),
    h('div', { style: { marginTop: '8px' } }, score),
    droneRow(),
    ex.caution ? h('p', { class: 'small', style: { color: 'var(--warn)', marginTop: '10px' }, text: ex.caution }) : null,
    ex.verifyWithTeacher
      ? h('p', { class: 'small muted', style: { marginTop: '6px' },
          text: 'This one varies between schools — check it against your teacher’s copy.' })
      : null));

  if (ex.tips && ex.tips.length) {
    box.append(card(cardHead('While you sing'),
      h('ul', { class: 'prose' }, ex.tips.map(t => h('li', { text: t })))));
  }

  box.append(card(
    cardHead('Another exercise'),
    h('div', { class: 'chips' }, ALL.map(e => h('button', {
      class: `chip ${e.id === ex.id ? 'on' : ''}`,
      onClick: () => { stopRun(); SV().current = e.id; save(); rerenderPane(); },
      text: e.name.replace('Varisai ', '').replace('Alankaram — ', ''),
    })))));

  draw(0);
  return box;
}

/** An exercise with no notation of its own: drone, monitor, and tips. */
function studyPane(ex) {
  const box = h('div');
  const readout = h('div', { class: 'small muted', text: 'Microphone off.' });

  box.append(card(
    cardHead(ex.name, h('span', { class: 'tag', text: 'from your teacher\u2019s copy' })),
    h('p', { class: 'small muted', text: ex.instruction }),
    h('p', { class: 'small muted' },
      'No notation is shipped for this one. Inventing it would be worse than leaving it out — you would learn the app\u2019s guess instead of the piece.'),
    h('div', { class: 'row' }, micButton(m => { readout.textContent = m; })),
    droneRow(), readout));

  if (ex.tips && ex.tips.length) {
    box.append(card(cardHead('While you work on it'),
      h('ul', { class: 'prose' }, ex.tips.map(t => h('li', { text: t })))));
  }

  box.append(card(
    cardHead('Another exercise'),
    h('div', { class: 'chips' }, ALL.map(e => h('button', {
      class: `chip ${e.id === ex.id ? 'on' : ''}`,
      onClick: () => { stopRun(); SV().current = e.id; save(); rerenderPane(); },
      text: e.name.replace('Varisai ', '').replace('Alankaram — ', ''),
    })))));

  return box;
}

/* ---------------------------------------------------------- */
/*  takes                                                      */
/* ---------------------------------------------------------- */

function takesPane() {
  const box = h('div');
  const status = h('div', { class: 'small muted', text: '' });
  const level = h('i');
  const levelBar = h('div', { class: 'sv-cents', style: { height: '10px' } }, level);
  let timer = null;

  /* One place that turns captured audio into a stored take, used by
     the Record button AND by leaveSvara() when you navigate away
     mid-take. */
  async function saveTake(out) {
    const ex = byId(SV().current);
    return REC.putTake({
      id: uid(), at: Date.now(),
      name: ex ? ex.name : 'Take',
      seconds: out.samples.length / out.sampleRate,
      sampleRate: out.sampleRate,
      samples: out.samples,                    // the master, never rewritten
      effects: { ...REC.NO_EFFECTS },
    });
  }
  pendingTakeSaver = saveTake;
  installRecordingGuard();

  const recBtn = btn('Record', async () => {
    if (REC.recording()) {
      clearInterval(timer);
      const out = REC.stopRecording();
      recBtn.textContent = 'Record'; recBtn.classList.remove('on');
      if (!out || !out.samples.length) { status.textContent = 'Nothing was captured.'; return; }
      try { await saveTake(out); status.textContent = 'Saved on this device.'; rerenderPane(); }
      catch (e) { status.textContent = `Could not save: ${e.message}`; }
      return;
    }

    /* Check there is room before you sing, not after. The old flow's
       first contact with storage was the save at the end — three
       minutes in, with the audio already captured and nowhere to go. */
    try {
      const room = await REC.roomFor(60 * 1024 * 1024);
      if (!room.ok) {
        status.textContent = `Not enough storage room to record (about ${((room.free || 0) / 1048576).toFixed(0)} MB free). Export and delete some takes first — Settings → Backup can download them all.`;
        return;
      }
    } catch {}

    try {
      const live = await REC.startRecording(p => { level.style.left = `${Math.min(100, p * 140)}%`; });
      recBtn.textContent = 'Stop'; recBtn.classList.add('on');
      if (!live.canCapture) status.textContent = 'This browser will show the level but cannot capture audio.';
      timer = setInterval(() => {
        status.textContent = `Recording — ${live.seconds.toFixed(1)}s`;
      }, 200);
    } catch (e) { status.textContent = e.message; }
  }, { cls: 'btn-sm btn-primary' });

  box.append(card(
    cardHead('Record a take', h('span', { class: 'tag', text: 'this device only' })),
    h('p', { class: 'small muted' },
      'Captured raw and kept as a 32-bit float master, the way the Android app does it — no compression, and the master is never rewritten. Effects are a recipe applied when you export, so "back to the original" is free.'),
    h('p', { class: 'small muted' },
      'Takes live in this browser’s storage on this phone. They do not sync, they are not in your snapshots, and clearing site data deletes them. Export anything you want to keep.'),
    h('div', { class: 'row' }, recBtn, status),
    levelBar));

  const list = h('div', h('div', { class: 'small muted', text: 'loading…' }));
  box.append(list);

  REC.listTakes().then(async takes => {
    clear(list);
    const { used, quota } = await REC.usage();
    if (!takes.length) {
      list.append(empty('No takes yet', 'Record one above. A minute of audio is about ten megabytes.'));
      return;
    }
    list.append(h('div', { class: 'small muted', style: { margin: '10px 0' },
      text: `${takes.length} take${takes.length === 1 ? '' : 's'}${quota ? ` · about ${(used / 1048576).toFixed(0)} MB of the ${(quota / 1048576).toFixed(0)} MB this browser allows` : ''}` }));
    takes.forEach(t => list.append(takeCard(t)));
  }).catch(() => {
    clear(list);
    list.append(empty('Storage unavailable', 'This browser will not give the page a place to keep recordings.'));
  });

  return box;
}

/* `take` here is METADATA ONLY — the audio is fetched when you ask for
   it. Building a WAV blob for every take on render meant ten
   three-minute takes put ~350 MB of live blobs in the page the moment
   you opened the tab, which on a phone gets the tab killed — taking
   any recording in progress with it. */
function takeCard(take) {
  const audio = h('audio', { controls: true, preload: 'none', style: { width: '100%', marginTop: '8px', display: 'none' } });
  const note = h('span', { class: 'small muted' });
  let url = null;

  const release = () => { if (url) { URL.revokeObjectURL(url); url = null; } };

  const load = async () => {
    note.textContent = 'loading…';
    try {
      const full = await REC.getTake(take.id);
      if (!full || !full.samples) { note.textContent = 'The audio for this take is missing.'; return null; }
      const samples = REC.effectsActive(take.effects)
        ? await REC.renderWithEffects(full.samples, full.sampleRate, take.effects)
        : full.samples;
      release();
      url = URL.createObjectURL(REC.encodeWav(samples, full.sampleRate));
      audio.src = url;
      audio.style.display = '';
      note.textContent = '';
      return full;
    } catch (e) { note.textContent = 'Could not load it: ' + (e.message || e); return null; }
  };

  /* Hand the blob back as soon as playback is done with it. */
  audio.addEventListener('ended', () => {}, { passive: true });

  return card(
    cardHead(take.name,
      h('span', { class: 'tag mono', text: `${(take.seconds || 0).toFixed(1)}s` })),
    h('div', { class: 'small muted', text: fmtDate(new Date(take.at).toISOString().slice(0, 10)) }),
    audio,
    h('div', { class: 'row', style: { marginTop: '8px' } },
      btn('Play', load, { cls: 'btn-sm' }),
      note,
      h('div', { style: { flex: 1 } }),
      btn('Effects', () => effectsSheet(take, () => { if (url) load(); }), { cls: 'btn-sm' }),
      btn('Export', async (e) => {
        const b = e.target.closest('button'); b.disabled = true; b.textContent = 'preparing…';
        try {
          const full = await REC.getTake(take.id);
          if (!full || !full.samples) throw new Error('the audio is missing');
          const samples = REC.effectsActive(take.effects)
            ? await REC.renderWithEffects(full.samples, full.sampleRate, take.effects)
            : full.samples;
          const blob = REC.encodeWav(samples, full.sampleRate);
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${String(take.name || 'take').replace(/[^\w -]/g, '')}.wav`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        } catch (err) { toast('Could not export: ' + (err.message || err), 5000); }
        b.disabled = false; b.textContent = 'Export';
      }, { cls: 'btn-sm' }),
      REC.effectsActive(take.effects)
        ? btn('Back to the original', async () => {
            take.effects = { ...REC.NO_EFFECTS };
            /* metadata only — the master is never rewritten */
            try { await REC.putTakeMeta(take); if (url) await load(); toast('Effects cleared'); }
            catch (e) { toast('Could not clear the effects: ' + (e.message || e), 5000); }
          }, { cls: 'btn-sm btn-ghost' })
        : null,
      btn('Delete', () => confirmDelete('this take', async () => {
        release();
        try { await REC.deleteTake(take.id); } catch (e) { toast('Could not delete: ' + (e.message || e), 4000); }
        rerenderPane();
      }), { cls: 'btn-sm btn-ghost btn-danger' })));
}

function effectsSheet(take, onChange) {
  const s = { ...REC.NO_EFFECTS, ...(take.effects || {}) };
  const commit = async () => {
    take.effects = s;
    /* Metadata only. Re-putting the whole record meant every slider
       nudge rewrote tens of megabytes, which needs double that free to
       commit — and an abort there used to hang for ever. */
    try { await REC.putTakeMeta(take); onChange && onChange(); }
    catch (e) { toast('Could not save the effect change: ' + (e.message || e), 5000); }
  };

  const slider = (label, key, min, max, step, fmt) => {
    const out = h('span', { class: 'small mono muted', text: fmt(s[key]) });
    return h('div', { style: { marginTop: '10px' } },
      h('div', { class: 'row' }, h('span', { class: 'small', text: label }), h('div', { class: 'spacer' }), out),
      h('input', { type: 'range', min, max, step, value: s[key],
        style: { width: '100%', accentColor: 'var(--accent)' },
        onInput: (e) => { s[key] = Number(e.target.value); out.textContent = fmt(s[key]); },
        onChange: commit }));
  };

  const toggle = (label, key) => h('label', { class: 'check' },
    h('input', { type: 'checkbox', checked: !!s[key], onChange: (e) => { s[key] = e.target.checked; commit(); } }),
    h('span', { text: label }));

  const eq = h('div', { style: { marginTop: '10px' } },
    h('div', { class: 'small', text: 'EQ' }),
    h('div', { class: 'row' }, REC.EQ_BANDS.map((b, i) => {
      const out = h('div', { class: 'small mono muted', text: `${s.eqGainsDb[i] || 0}` });
      return h('div', { style: { flex: 1, textAlign: 'center' } },
        h('input', { type: 'range', min: -12, max: 12, step: 0.5, value: s.eqGainsDb[i] || 0,
          style: { width: '100%', accentColor: 'var(--accent)' },
          onInput: (e) => { s.eqGainsDb = [...s.eqGainsDb]; s.eqGainsDb[i] = Number(e.target.value); out.textContent = e.target.value; },
          onChange: commit }),
        h('div', { class: 'small muted', text: b.label }), out);
    })));

  modal({
    title: 'Effects',
    wide: true,
    body: h('div',
      h('p', { class: 'small muted' },
        'A recipe, not an edit. The master stays exactly as recorded and this is re-applied every time you play or export — which is why "back to the original" cannot fail.'),
      slider('High-pass', 'highPassHz', 0, 200, 5, v => v ? `${v} Hz` : 'off'),
      eq,
      toggle('Compressor', 'compressorOn'),
      slider('Threshold', 'compThresholdDb', -40, 0, 1, v => `${v} dB`),
      slider('Ratio', 'compRatio', 1, 12, 0.5, v => `${v}:1`),
      toggle('Echo', 'echoOn'),
      slider('Time', 'echoTimeMs', 60, 900, 10, v => `${v} ms`),
      slider('Mix', 'echoMix', 0, 0.8, 0.02, v => `${Math.round(v * 100)}%`),
      toggle('Reverb', 'reverbOn'),
      h('div', { class: 'seg', style: { marginTop: '6px' } },
        Object.entries(REC.REVERBS).map(([k, r]) => h('button', {
          class: s.reverbKind === k ? 'on' : '',
          onClick: (e) => {
            s.reverbKind = k;
            [...e.target.parentElement.children].forEach(b => b.classList.remove('on'));
            e.target.classList.add('on'); commit();
          },
        }, r.label))),
      slider('Reverb mix', 'reverbMix', 0, 0.6, 0.02, v => `${Math.round(v * 100)}%`),
      slider('Output', 'outputGainDb', -12, 12, 0.5, v => `${v} dB`)),
  });
}

/* ---------------------------------------------------------- */
/*  learn                                                      */
/* ---------------------------------------------------------- */

function learnPane() {
  const box = h('div');
  const which = SV().learnTab || 'tips';

  box.append(h('div', { class: 'seg', style: { marginBottom: '12px' } },
    [['tips', 'Vocal health'], ['syllabus', 'Syllabus'], ['about', 'About']].map(([k, label]) =>
      h('button', { class: which === k ? 'on' : '', onClick: () => { SV().learnTab = k; save(); rerenderPane(); } }, label))));

  if (which === 'syllabus') {
    box.append(card(h('p', { class: 'small muted' },
      'The fourteen sections are a deliberate progression from raw pitch control to raga grammar. The ones with no drill attached are kept as reading rather than dropped, so the progression stays visible instead of looking like it jumps from nothing straight to sarali varisai.')));
    SYLLABUS.forEach(sec => {
      const items = sec.groups.flatMap(g => inGroup(g).length ? inGroup(g) : [byId(g)].filter(Boolean));
      box.append(card(
        cardHead(`${sec.number}. ${sec.title}`, h('span', { class: 'tag', text: sec.subtitle })),
        h('p', { class: 'small muted', text: sec.body }),
        items.length
          ? h('div', { class: 'chips' }, items.map(e => h('button', {
              class: 'chip', text: e.name,
              onClick: () => { SV().current = e.id; save(); location.hash = '#/sv/practice'; },
            })))
          : h('div', { class: 'small muted', style: { color: 'var(--fg-3)' }, text: 'Reading, not a drill.' })));
    });
    return box;
  }

  if (which === 'about') return aboutPane();

  box.append(card(h('p', { class: 'small muted' },
    'Written with the same bias as the rest of the app: say what is well supported, say plainly when something is folklore, and never dress a habit up as physiology. A lot of singer advice circulates as confident fact when the evidence is thin.')));

  TIP_SECTIONS.forEach(sec => {
    box.append(card(
      cardHead(sec.title),
      h('p', { class: 'small muted', text: sec.summary }),
      h('div', { class: 'list' }, sec.items.map(t => h('div', { class: 'item' },
        h('div', { class: 'item-head' }, h('span', { class: 'item-title', text: t.heading })),
        h('div', { class: 'small muted', style: { marginTop: '3px' }, text: t.body }),
        t.caveat
          ? h('div', { class: 'small', style: { marginTop: '4px', color: 'var(--warn)' }, text: t.caveat })
          : null)))));
  });

  return box;
}

function aboutPane() {
  return h('div',
    card(
      cardHead('This is the browser half'),
      h('p', { class: 'small muted' },
        'Svara proper is an Android app. This is the part that works honestly in a browser and is worth having on the same screen as the rest of Sid — and it is now most of it: the drone, the tuner, all 77 exercises, the reference voice, recording, the guidance and the syllabus.'),
      h('a', { class: 'btn btn-sm btn-primary', href: APK, target: '_blank', rel: 'noopener', text: 'The Android app' })),

    card(
      cardHead('What the browser still gets wrong'),
      h('ul', { class: 'prose' },
        h('li', { text: 'Latency. There is 60–150 ms between you singing and the line moving, so use it to check pitch, not timing.' }),
        h('li', { text: 'Backgrounding. Android suspends audio when you switch apps, so the drone stops and the microphone light goes out.' }),
        h('li', { text: 'Takes stay on this device. Audio is orders of magnitude too big to sync the way your text does, so a recording made on the phone is not on the laptop.' }),
        h('li', { text: 'Echo cancellation is off deliberately, because it mangles pitch. Use headphones or the drone leaks into the microphone.' }))),

    card(
      cardHead('The reference voice'),
      h('p', { class: 'small muted' },
        'Synthesised, not recorded: four formant resonators driven by a shaped glottal pulse, with aspiration noise, pitch micro-jitter, portamento and vibrato that fades in on held notes. It transposes exactly to any Sa, where a recorded singer would need pitch-shifting and would arrive detuned in an app whose whole claim is pitch accuracy.'),
      h('p', { class: 'small muted' },
        'It is synthetic and it will always sound synthetic. A voice that passes as human needs a neural singing model — hundreds of megabytes of weights, no real-time path on a phone, and no pretrained Carnatic voice in existence.')),

    card(
      cardHead('Nothing here touches the release side'),
      h('p', { class: 'small muted' },
        'Svara has its own store slice and its own storage. No milestone, notification, health check or export in the rest of Sid knows it exists, and nothing in here reads your release data.')));
}

/* ---------------------------------------------------------- */
/*  log                                                        */
/* ---------------------------------------------------------- */

function logRun(ex, seconds) {
  const log = SV().log || (SV().log = []);
  const today = todayISO();
  const row = log.find(x => x.date === today && x.exercise === ex.id);
  if (row) { row.seconds += seconds; row.runs += 1; }
  else log.push({ id: uid(), date: today, exercise: ex.id, name: ex.name, seconds, runs: 1,
                  load: ex.intensity === 'Demanding' ? 1.8 : ex.intensity === 'Gentle' ? 0.4 : 1 });
  save();
}

function logPane() {
  const log = (SV().log || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const box = h('div');
  const days = [...new Set(log.map(x => x.date))];
  const totalMin = Math.round(log.reduce((n, x) => n + x.seconds, 0) / 60);

  let streak = 0;
  const has = new Set(days);
  for (let i = 0; ; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if (has.has(iso)) streak++;
    else break;
  }

  /* the load guard: demanding work counts for more than gentle work */
  const today = todayISO();
  const todayLoad = log.filter(x => x.date === today)
    .reduce((n, x) => n + (x.load || 1) * (x.seconds / 60), 0);

  box.append(card(
    cardHead('Practice'),
    h('div', { class: 'grid g3' },
      h('div', { class: 'stat' }, h('div', { class: 'k', text: 'Days' }), h('div', { class: 'v', text: String(days.length) })),
      h('div', { class: 'stat' }, h('div', { class: 'k', text: 'Minutes' }), h('div', { class: 'v', text: fmtNum(totalMin) })),
      h('div', { class: 'stat' }, h('div', { class: 'k', text: 'Streak' }), h('div', { class: 'v', text: String(streak) }))),
    todayLoad > 40
      ? h('p', { class: 'small', style: { color: 'var(--warn)', marginTop: '10px' },
          text: 'That is a heavy day by load — demanding exercises count for more than gentle ones. Voices get better on the rest day, not during it.' })
      : h('p', { class: 'small muted', style: { marginTop: '10px' },
          text: 'Logged automatically when a run finishes. Time with the drone on and nothing running is not counted — the app cannot tell practice from a forgotten tab.' })));

  if (!log.length) {
    box.append(empty('Nothing logged yet', 'Finish a run in Practice and it appears here.'));
    return box;
  }

  box.append(card(
    cardHead('By day'),
    h('div', { class: 'list' }, days.slice(0, 40).map(d => {
      const rows = log.filter(x => x.date === d);
      const mins = Math.round(rows.reduce((n, x) => n + x.seconds, 0) / 60);
      return h('div', { class: 'item' },
        h('div', { class: 'item-head' },
          h('span', { class: 'tag mono', text: fmtDate(d) }),
          h('span', { class: 'item-title', text: `${mins || '<1'} min` })),
        h('div', { class: 'small muted', style: { marginTop: '3px' },
          text: rows.map(x => `${x.name}${x.runs > 1 ? ` ×${x.runs}` : ''}`).join(' · ') }));
    }))));

  box.append(card(
    cardHead('Clear'),
    btn('Delete the practice log', () => confirmDelete('the practice log', () => {
      SV().log = []; save(); rerenderPane();
    }), { cls: 'btn-sm btn-ghost btn-danger' })));

  return box;
}
