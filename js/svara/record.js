/* ============================================================
   svara/record.js — takes, kept on this device

   Recording in a browser is possible; what is not possible is
   syncing it. A three-minute take is tens of megabytes, which is
   two orders of magnitude past what belongs in Firestore next to
   your text. So takes live in IndexedDB on the device that made
   them, and the app says so rather than letting you find out.

   The Android app's design is kept exactly, because it is the right
   one: the master is 32-bit float WAV and is never rewritten, and
   the effects are a recipe applied at export. That separation makes
   "revert to original" free and makes it impossible to destroy a
   take by fiddling.

   Capture goes through a ScriptProcessor-free path: raw float
   frames from a worklet-free MediaStream source into an array. The
   browser's own MediaRecorder is deliberately not used — it gives
   compressed Opus, and a pitch app should not hand you a lossy
   master.
   ============================================================ */

import { resume } from './audio.js';

/* ---------------------------------------------------------- */
/*  the store                                                  */
/* ---------------------------------------------------------- */

const DB = 'sid-svara';
const STORE = 'takes';
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error || new Error('IndexedDB is unavailable'));
  });
  return dbp;
}

const tx = async (mode, fn) => {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => res(out.result !== undefined ? out.result : out);
    t.onerror = () => rej(t.error);
  });
};

export const listTakes = () => tx('readonly', (s) => s.getAll())
  .then(rows => (rows || []).sort((a, b) => b.at - a.at))
  .catch(() => []);

export const getTake = (id) => tx('readonly', (s) => s.get(id)).catch(() => null);
export const putTake = (take) => tx('readwrite', (s) => s.put(take));
export const deleteTake = (id) => tx('readwrite', (s) => s.delete(id));

/** Roughly how much space the takes use, and what the browser allows. */
export async function usage() {
  try {
    const e = await navigator.storage?.estimate?.();
    return { used: e?.usage || 0, quota: e?.quota || 0 };
  } catch { return { used: 0, quota: 0 }; }
}

/* ---------------------------------------------------------- */
/*  capture                                                    */
/* ---------------------------------------------------------- */

let live = null;

/**
 * Records raw mono float samples. onLevel gets a 0–1 peak so the UI
 * can show something moving, which is the difference between "it is
 * recording" and "I hope it is recording".
 */
export async function startRecording(onLevel) {
  if (live) stopRecording();

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
    });
  } catch (e) {
    throw new Error(e && e.name === 'NotAllowedError'
      ? 'Microphone permission was refused.'
      : 'No microphone available on this device.');
  }

  const ctx = await resume();
  const src = ctx.createMediaStreamSource(stream);
  const node = ctx.createAnalyser();
  node.fftSize = 2048;
  node.smoothingTimeConstant = 0;
  src.connect(node);

  const chunks = [];
  const buf = new Float32Array(node.fftSize);
  let raf = 0, stopped = false, frames = 0;
  const started = ctx.currentTime;

  /* An analyser polled per frame drops samples between frames, so the
     capture path is a plain processor tap instead. */
  const tap = ctx.createScriptProcessor ? ctx.createScriptProcessor(4096, 1, 1) : null;
  if (tap) {
    tap.onaudioprocess = (e) => {
      if (stopped) return;
      const ch = e.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(ch));
      frames += ch.length;
      let peak = 0;
      for (let i = 0; i < ch.length; i += 16) peak = Math.max(peak, Math.abs(ch[i]));
      onLevel && onLevel(peak);
      /* the node must be connected to something or it never pulls */
      const out = e.outputBuffer.getChannelData(0);
      out.fill(0);
    };
    src.connect(tap);
    tap.connect(ctx.destination);
  } else {
    /* no capture path on this browser — level only, so the UI can say so */
    const tick = () => {
      if (stopped) return;
      node.getFloatTimeDomainData(buf);
      let peak = 0;
      for (let i = 0; i < buf.length; i += 16) peak = Math.max(peak, Math.abs(buf[i]));
      onLevel && onLevel(peak);
      raf = requestAnimationFrame(tick);
    };
    tick();
  }

  live = {
    sampleRate: ctx.sampleRate,
    get seconds() { return frames / ctx.sampleRate || (ctx.currentTime - started); },
    canCapture: !!tap,
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      try { if (tap) { tap.disconnect(); tap.onaudioprocess = null; } } catch {}
      try { src.disconnect(); } catch {}
      stream.getTracks().forEach(t => t.stop());
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const all = new Float32Array(total);
      let o = 0;
      chunks.forEach(c => { all.set(c, o); o += c.length; });
      return all;
    },
  };
  return live;
}

export const recording = () => live;

export function stopRecording() {
  if (!live) return null;
  const samples = live.stop();
  const sampleRate = live.sampleRate;
  live = null;
  return { samples, sampleRate };
}

/* ---------------------------------------------------------- */
/*  WAV                                                        */
/* ---------------------------------------------------------- */

/** 32-bit float WAV — the master format, never rewritten. */
export function encodeWav(samples, sampleRate, float = true) {
  const bytesPer = float ? 4 : 2;
  const buf = new ArrayBuffer(44 + samples.length * bytesPer);
  const v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };

  str(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * bytesPer, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, float ? 3 : 1, true);           // 3 = IEEE float
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * bytesPer, true);
  v.setUint16(32, bytesPer, true);
  v.setUint16(34, float ? 32 : 16, true);
  str(36, 'data');
  v.setUint32(40, samples.length * bytesPer, true);

  let o = 44;
  if (float) for (let i = 0; i < samples.length; i++, o += 4) v.setFloat32(o, samples[i], true);
  else for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

/* ---------------------------------------------------------- */
/*  effects — a recipe, applied at export                      */
/* ---------------------------------------------------------- */

export const EQ_BANDS = [
  { key: 'low', label: '80', freq: 80 },
  { key: 'lowmid', label: '300', freq: 300 },
  { key: 'mid', label: '1k', freq: 1000 },
  { key: 'highmid', label: '3.5k', freq: 3500 },
  { key: 'high', label: '10k', freq: 10000 },
];

export const REVERBS = {
  room:    { label: 'Room', seconds: 1.1, decay: 2.6 },
  hall:    { label: 'Hall', seconds: 2.4, decay: 1.8 },
  plate:   { label: 'Plate', seconds: 1.6, decay: 3.4 },
  chamber: { label: 'Chamber', seconds: 1.3, decay: 2.2 },
};

export const NO_EFFECTS = {
  highPassHz: 0,
  eqGainsDb: [0, 0, 0, 0, 0],
  compressorOn: false, compThresholdDb: -18, compRatio: 3, compAttackMs: 10, compReleaseMs: 120, compMakeupDb: 0,
  echoOn: false, echoTimeMs: 320, echoFeedback: 0.30, echoMix: 0.22,
  reverbOn: false, reverbKind: 'room', reverbMix: 0.18,
  outputGainDb: 0,
};

/** True when this chain would change the audio at all. */
export const effectsActive = (s) => !!s && (
  s.highPassHz > 0 ||
  (s.eqGainsDb || []).some(g => Math.abs(g) > 0.01) ||
  s.compressorOn || s.echoOn || s.reverbOn ||
  Math.abs(s.outputGainDb || 0) > 0.01);

/** A short exponentially-decaying noise burst, as a reverb tail. */
function impulse(ctx, kind) {
  const r = REVERBS[kind] || REVERBS.room;
  const len = Math.floor(ctx.sampleRate * r.seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, r.decay);
    }
  }
  return buf;
}

/**
 * Re-renders the master through the recipe. Offline, so it runs
 * faster than real time and the master is untouched either way.
 */
export async function renderWithEffects(samples, sampleRate, settings) {
  const s = { ...NO_EFFECTS, ...(settings || {}) };
  if (!effectsActive(s)) return samples;

  const tail = s.reverbOn ? Math.ceil(sampleRate * (REVERBS[s.reverbKind] || REVERBS.room).seconds) : 0;
  const echoTail = s.echoOn ? Math.ceil(sampleRate * (s.echoTimeMs / 1000) * 4) : 0;
  const len = samples.length + Math.max(tail, echoTail);

  const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new Off(1, len, sampleRate);

  const src = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, samples.length, sampleRate);
  buf.copyToChannel(samples, 0);
  src.buffer = buf;

  let node = src;
  const chain = (n) => { node.connect(n); node = n; return n; };

  if (s.highPassHz > 0) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = s.highPassHz; hp.Q.value = 0.707;
    chain(hp);
  }

  EQ_BANDS.forEach((b, i) => {
    const g = (s.eqGainsDb || [])[i] || 0;
    if (Math.abs(g) < 0.01) return;
    const f = ctx.createBiquadFilter();
    f.type = i === 0 ? 'lowshelf' : i === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking';
    f.frequency.value = b.freq;
    f.Q.value = 0.9;
    f.gain.value = g;
    chain(f);
  });

  if (s.compressorOn) {
    const c = ctx.createDynamicsCompressor();
    c.threshold.value = s.compThresholdDb;
    c.ratio.value = s.compRatio;
    c.attack.value = s.compAttackMs / 1000;
    c.release.value = s.compReleaseMs / 1000;
    c.knee.value = 6;
    chain(c);
    if (s.compMakeupDb) {
      const g = ctx.createGain();
      g.gain.value = Math.pow(10, s.compMakeupDb / 20);
      chain(g);
    }
  }

  /* echo and reverb are parallel sends, not inserts */
  const dry = ctx.createGain(); dry.gain.value = 1;
  node.connect(dry);
  const outGain = ctx.createGain();
  outGain.gain.value = Math.pow(10, (s.outputGainDb || 0) / 20);
  dry.connect(outGain);

  if (s.echoOn) {
    const d = ctx.createDelay(2);
    d.delayTime.value = s.echoTimeMs / 1000;
    const fb = ctx.createGain(); fb.gain.value = Math.min(0.85, s.echoFeedback);
    const mix = ctx.createGain(); mix.gain.value = s.echoMix;
    node.connect(d); d.connect(fb); fb.connect(d); d.connect(mix); mix.connect(outGain);
  }

  if (s.reverbOn) {
    const cv = ctx.createConvolver();
    cv.buffer = impulse(ctx, s.reverbKind);
    const mix = ctx.createGain(); mix.gain.value = s.reverbMix;
    node.connect(cv); cv.connect(mix); mix.connect(outGain);
  }

  outGain.connect(ctx.destination);
  src.start();

  const rendered = await ctx.startRendering();
  return rendered.getChannelData(0).slice();
}
