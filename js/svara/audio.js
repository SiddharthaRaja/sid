/* ============================================================
   svara/audio.js — microphone pitch, and a drone to sing against

   Two independent things live here:

     • a pitch tracker: normalised autocorrelation over a 2048-sample
       window, parabolic interpolation on the peak, then a one-euro
       filter so a held note reads as a line rather than a scribble
     • a drone: Sa and Pa, sustained, with a little detune and a slow
       filter movement so it does not sound like a test tone

   Both are deliberately conservative. The browser is not the place
   to do the Android app's job — this is for checking pitch while you
   practise, not for recording takes.

   Everything is explicit about failure: no microphone permission is
   the normal case on a desktop, and the pane has to say so rather
   than sitting silent.
   ============================================================ */

let ctx = null;
const audio = () => (ctx = ctx || new (window.AudioContext || window.webkitAudioContext)());

export const resume = async () => { const c = audio(); if (c.state === 'suspended') await c.resume(); return c; };

/* ---------------------------------------------------------- */
/*  one-euro filter                                            */
/* ---------------------------------------------------------- */

/**
 * Smooths hard when the pitch is steady and gets out of the way when
 * it moves, which is exactly what a held note versus a leap needs.
 */
class OneEuro {
  constructor(minCutoff = 1.2, beta = 0.02, dCutoff = 1) {
    this.minCutoff = minCutoff; this.beta = beta; this.dCutoff = dCutoff;
    this.x = null; this.dx = 0; this.t = null;
  }
  alpha(cutoff, dt) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }
  filter(value, tSec) {
    if (this.x === null) { this.x = value; this.t = tSec; return value; }
    const dt = Math.max(1e-3, tSec - this.t);
    this.t = tSec;
    const dxRaw = (value - this.x) / dt;
    this.dx = this.dx + this.alpha(this.dCutoff, dt) * (dxRaw - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x = this.x + this.alpha(cutoff, dt) * (value - this.x);
    return this.x;
  }
  reset() { this.x = null; this.dx = 0; this.t = null; }
}

/* ---------------------------------------------------------- */
/*  pitch detection                                            */
/* ---------------------------------------------------------- */

const MIN_HZ = 70, MAX_HZ = 1100;

/**
 * Normalised square difference, McLeod-style. Returns { hz, clarity }
 * with hz 0 when nothing periodic is there — silence, a consonant, or
 * a room full of noise.
 */
export function detectPitch(buf, sampleRate) {
  const n = buf.length;

  /* RMS first: below this it is silence and correlation is noise */
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < 0.008) return { hz: 0, clarity: 0, rms };

  const maxLag = Math.min(n - 2, Math.floor(sampleRate / MIN_HZ));
  const minLag = Math.max(2, Math.floor(sampleRate / MAX_HZ));

  let bestLag = -1, bestVal = 0;
  let prev = 0, rising = false;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let acf = 0, sq = 0;
    for (let i = 0; i < n - lag; i++) {
      acf += buf[i] * buf[i + lag];
      sq += buf[i] * buf[i] + buf[i + lag] * buf[i + lag];
    }
    const nsdf = sq > 0 ? (2 * acf) / sq : 0;

    /* take the first peak past the initial dip, not the tallest —
       the tallest is often the octave below */
    if (!rising && nsdf > 0.3 && nsdf > prev) rising = true;
    if (rising && nsdf < prev) {
      if (prev > bestVal) { bestVal = prev; bestLag = lag - 1; }
      break;
    }
    prev = nsdf;
  }

  if (bestLag < 0 || bestVal < 0.45) return { hz: 0, clarity: bestVal, rms };

  /* parabolic interpolation around the peak, for sub-sample accuracy */
  const y = (lag) => {
    let acf = 0, sq = 0;
    for (let i = 0; i < n - lag; i++) {
      acf += buf[i] * buf[i + lag];
      sq += buf[i] * buf[i] + buf[i + lag] * buf[i + lag];
    }
    return sq > 0 ? (2 * acf) / sq : 0;
  };
  const y0 = y(bestLag - 1), y1 = bestVal, y2 = y(bestLag + 1);
  const denom = 2 * (2 * y1 - y0 - y2);
  const shift = denom !== 0 ? (y2 - y0) / denom : 0;
  const hz = sampleRate / (bestLag + shift);

  if (!isFinite(hz) || hz < MIN_HZ || hz > MAX_HZ) return { hz: 0, clarity: bestVal, rms };
  return { hz, clarity: bestVal, rms };
}

/* ---------------------------------------------------------- */
/*  the microphone                                             */
/* ---------------------------------------------------------- */

let mic = null;
let workletReady = null;

/** Loads a worklet once per context. Resolves false when unsupported. */
async function loadWorklet(url) {
  const c = await resume();
  if (!c.audioWorklet) return false;
  workletReady = workletReady || {};
  if (workletReady[url]) return workletReady[url];
  workletReady[url] = c.audioWorklet.addModule(url).then(() => true).catch(() => false);
  return workletReady[url];
}

/**
 * start(onFrame) — onFrame({ hz, cents, clarity, rms, t }) roughly 60
 * times a second. Throws with a readable message if the microphone
 * is unavailable; the caller shows it.
 */
export async function startMic(onFrame) {
  if (mic) stopMic();
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser will not give a web page microphone access.');
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,     // all three mangle pitch
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    });
  } catch (e) {
    throw new Error(e && e.name === 'NotAllowedError'
      ? 'Microphone permission was refused. On Android, allow it in the site settings for this page.'
      : 'No microphone available on this device.');
  }

  const c = await resume();
  const src = c.createMediaStreamSource(stream);

  /* Preferred path: detection on the audio thread, so a busy render
     cannot stall it. The analyser path below is the fallback. */
  if (await loadWorklet('./js/svara/pitch-worklet.js')) {
    const node = new AudioWorkletNode(c, 'sid-pitch', { numberOfInputs: 1, numberOfOutputs: 0 });
    const smooth = new OneEuro();
    node.port.onmessage = (e) => {
      const { hz, clarity, rms, t } = e.data;
      let out = 0;
      if (hz) out = smooth.filter(hz, t);
      else smooth.reset();
      onFrame({ hz: out, raw: hz, clarity, rms, t, worklet: true });
    };
    src.connect(node);
    mic = {
      worklet: true,
      stop() {
        try { node.port.postMessage('stop'); node.disconnect(); } catch {}
        try { src.disconnect(); } catch {}
        stream.getTracks().forEach(t => t.stop());
      },
    };
    return mic;
  }

  const analyser = c.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0;
  src.connect(analyser);

  const buf = new Float32Array(analyser.fftSize);
  const smooth = new OneEuro();
  let raf = 0, stopped = false;

  const tick = () => {
    if (stopped) return;
    analyser.getFloatTimeDomainData(buf);
    const { hz, clarity, rms } = detectPitch(buf, c.sampleRate);
    const t = c.currentTime;
    let out = 0;
    if (hz) out = smooth.filter(hz, t);
    else smooth.reset();
    onFrame({ hz: out, raw: hz, clarity, rms, t });
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  mic = {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      try { src.disconnect(); } catch {}
      stream.getTracks().forEach(t => t.stop());
    },
  };
  return mic;
}

export function stopMic() { if (mic) { mic.stop(); mic = null; } }
export const micRunning = () => !!mic;

/* ---------------------------------------------------------- */
/*  the drone                                                  */
/* ---------------------------------------------------------- */

let drone = null;

/**
 * Sa and Pa, plus Sa an octave down, each as a pair of slightly
 * detuned saw voices through a low-pass — the cheapest thing that
 * sounds like a room rather than an oscilloscope.
 */
export async function startDrone(tonicHz, volume = 0.22) {
  stopDrone();
  const c = await resume();

  const out = c.createGain();
  out.gain.value = 0;
  out.connect(c.destination);

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  filter.Q.value = 0.6;
  filter.connect(out);

  const voices = [];
  const add = (hz, level, detune) => {
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = hz;
    osc.detune.value = detune;
    const g = c.createGain();
    g.gain.value = level;
    osc.connect(g); g.connect(filter);
    osc.start();
    voices.push(osc);
  };

  const pa = tonicHz * Math.pow(2, 7 / 12);
  add(tonicHz, 0.30, -4);
  add(tonicHz, 0.30, +4);
  add(tonicHz / 2, 0.24, 0);
  add(pa, 0.16, -3);
  add(pa, 0.16, +3);

  /* a slow sweep on the filter so it breathes instead of droning flat */
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 320;
  lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
  lfo.start();
  voices.push(lfo);

  out.gain.setTargetAtTime(volume, c.currentTime, 0.4);

  drone = {
    setVolume(v) { out.gain.setTargetAtTime(v, c.currentTime, 0.1); },
    stop() {
      out.gain.setTargetAtTime(0, c.currentTime, 0.2);
      setTimeout(() => { voices.forEach(v => { try { v.stop(); } catch {} }); try { out.disconnect(); } catch {} }, 600);
    },
  };
  return drone;
}

export function stopDrone() { if (drone) { drone.stop(); drone = null; } }
export const droneRunning = () => !!drone;

/** A short sine, for playing a target swara back. */
export async function beep(hz, ms = 420, level = 0.2) {
  const c = await resume();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = hz;
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(level, c.currentTime + 0.02);
  g.gain.setTargetAtTime(0, c.currentTime + ms / 1000, 0.05);
  osc.connect(g); g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + ms / 1000 + 0.4);
}

/* ---------------------------------------------------------- */
/*  helpers                                                    */
/* ---------------------------------------------------------- */

export const hzToMidi = (hz) => 69 + 12 * Math.log2(hz / 440);
export const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** How far off, in cents, hz is from the nearest degree of a set. */
export function nearestOf(hz, targetsHz) {
  if (!hz || !targetsHz.length) return null;
  let best = null;
  targetsHz.forEach((t, i) => {
    const cents = 1200 * Math.log2(hz / t.hz);
    if (!best || Math.abs(cents) < Math.abs(best.cents)) best = { ...t, index: i, cents };
  });
  return best;
}

/* ---------------------------------------------------------- */
/*  the reference voice                                        */
/* ---------------------------------------------------------- */

let voice = null;

/**
 * Sings a timeline, as something to imitate. Synthetic, and audibly
 * so — see the worklet's header for why that is the honest ceiling
 * rather than a shortcut.
 */
export async function startVoice(timeline, baseHz, { vowel = 'a', gain = 0.3, onEnd } = {}) {
  stopVoice();
  const c = await resume();
  if (!(await loadWorklet('./js/svara/voice-worklet.js'))) {
    throw new Error('This browser cannot run the reference voice.');
  }
  const node = new AudioWorkletNode(c, 'sid-voice', {
    numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1],
    processorOptions: {
      segments: timeline.segments.map(s => ({
        start: s.start, end: s.end, semitones: s.semitones, glideTo: s.glideTo, attack: s.attack,
      })),
      totalSeconds: timeline.totalSeconds,
      baseHz, vowel, gain,
    },
  });
  node.port.onmessage = (e) => { if (e.data === 'ended') { stopVoice(); onEnd && onEnd(); } };
  node.connect(c.destination);
  voice = { node };
  return voice;
}

export function stopVoice() {
  if (!voice) return;
  try { voice.node.port.postMessage('stop'); voice.node.disconnect(); } catch {}
  voice = null;
}

export const voiceRunning = () => !!voice;
export const VOWELS = [['a', 'aa'], ['i', 'ee'], ['u', 'oo'], ['m', 'hum']];

/** Stop everything — called when leaving the section. */
export function stopAll() { stopMic(); stopDrone(); stopVoice(); }
