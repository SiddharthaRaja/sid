/* ============================================================
   notepad/metronome.js — a click that survives navigation

   The metronome belongs to the app, not to the page it was started
   from: you set 96 BPM, close the sheet, keep writing, and it keeps
   going. So the state lives here as a module singleton and the UI
   subscribes to it.

   Timing is setInterval rather than a scheduled audio graph. At
   40–240 BPM the drift you can hear over a verse is small, and the
   alternative — scheduling clicks ahead on the audio clock — makes
   every tempo change a rebuild. Mentioned so the choice is not
   mistaken for an oversight.
   ============================================================ */

const KEY = 'sid.metro';

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
};
const saved = read();

const M = {
  bpm: Number(saved.bpm) || 96,
  muted: saved.muted === true,
  playing: false,
  accent: saved.accent !== false,      // louder click on beat one
  beatsPerBar: Number(saved.beatsPerBar) || 4,
  beat: 0,
};

let timer = null;
let ctx = null;
const listeners = new Set();

const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      bpm: M.bpm, muted: M.muted, accent: M.accent, beatsPerBar: M.beatsPerBar,
    }));
  } catch {}
};

/** fn(state, isBeat) — called on every change and on every click. */
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const emit = (isBeat) => listeners.forEach(fn => { try { fn(M, isBeat); } catch {} });

export const state = () => M;

function click(strong) {
  if (M.muted) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = strong ? 1400 : 1000;
    gain.gain.setValueAtTime(strong ? 0.22 : 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch { /* no audio on this device — the flash still works */ }
}

function tick() {
  const strong = M.accent && M.beat === 0;
  click(strong);
  emit(true);
  M.beat = (M.beat + 1) % Math.max(1, M.beatsPerBar);
}

export function start() {
  stop();
  M.beat = 0;
  M.playing = true;
  tick();
  timer = setInterval(tick, 60000 / M.bpm);
  emit(false);
}

export function stop() {
  clearInterval(timer);
  timer = null;
  M.playing = false;
  M.beat = 0;
  emit(false);
}

export const toggle = () => (M.playing ? stop() : start());

export function setBpm(v) {
  M.bpm = Math.max(40, Math.min(240, Math.round(Number(v) || 96)));
  persist();
  if (M.playing) start();            // restart so the new tempo takes now
  else emit(false);
}

export function setMuted(v) { M.muted = !!v; persist(); emit(false); }
export function setAccent(v) { M.accent = !!v; persist(); emit(false); }
export function setBar(n) { M.beatsPerBar = Math.max(1, Math.min(12, Number(n) || 4)); persist(); emit(false); }

/** Tap four times to set the tempo. Older taps age out. */
let taps = [];
export function tap() {
  const now = Date.now();
  taps = taps.filter(t => now - t < 3000);
  taps.push(now);
  if (taps.length < 2) return M.bpm;
  const gaps = taps.slice(1).map((t, i) => t - taps[i]);
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  setBpm(60000 / avg);
  return M.bpm;
}
