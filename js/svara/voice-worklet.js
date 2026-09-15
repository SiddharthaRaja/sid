/* ============================================================
   svara/voice-worklet.js — the reference voice

   Source-filter synthesis: a band-limited glottal pulse train
   driving four parallel formant resonators. Ported from the Android
   app's ReferenceVoice.kt, sample for sample.

   Synthesised rather than recorded for the same reason as the
   drone: it transposes exactly to any Sa, where a recorded singer
   would need pitch-shifting and would arrive detuned in an app
   whose whole claim is pitch accuracy.

   It is synthetic and it will always sound synthetic. A voice that
   passes as human needs a neural singing model — hundreds of
   megabytes of weights, no real-time path on a phone, and no
   pretrained Carnatic voice in existence. What it can be is musical
   rather than robotic, which is what the aspiration noise, shaped
   glottal pulse, micro-jitter and delayed vibrato below are for.

   Two touches matter most for it to be imitable:
     • portamento — real singers do not teleport between pitches
     • delayed vibrato — a perfectly straight tone reads as a
       synthesiser and teaches the singer to freeze rather than
       support
   ============================================================ */

const VOWELS = {
  /* 'aa' — akaram, the vowel Carnatic exercises graduate to */
  a: { f: [850, 1220, 2810, 3500], bw: [80, 90, 120, 140], g: [1, 0.63, 0.16, 0.08] },
  i: { f: [390, 2300, 3010, 3600], bw: [60, 100, 120, 150], g: [1, 0.25, 0.12, 0.06] },
  u: { f: [370, 950, 2670, 3300], bw: [60, 90, 120, 150], g: [1, 0.30, 0.05, 0.03] },
  m: { f: [280, 1100, 2200, 3000], bw: [70, 110, 150, 180], g: [1, 0.18, 0.05, 0.02] },
};

/** A two-pole resonator, used here as a formant. */
class Formant {
  constructor(sr, freq, bandwidth, gain) {
    this.r = Math.exp(-Math.PI * bandwidth / sr);
    this.c = 2 * this.r * Math.cos(2 * Math.PI * freq / sr);
    this.a = 1 - this.r * this.r;
    this.gain = gain;
    this.y1 = 0; this.y2 = 0;
  }
  process(x) {
    const y = this.a * x + this.c * this.y1 - this.r * this.r * this.y2;
    this.y2 = this.y1; this.y1 = y;
    return y * this.gain;
  }
}

class VoiceProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o = (options && options.processorOptions) || {};
    this.segments = o.segments || [];
    this.total = o.totalSeconds || 0;
    this.baseHz = o.baseHz || 220;
    this.gain = o.gain ?? 0.30;
    this.startOffset = o.startOffsetSec || 0;

    const v = VOWELS[o.vowel || 'a'];
    this.formants = v.f.map((f, i) => new Formant(sampleRate, f, v.bw[i], v.g[i]));

    this.t0 = null;
    this.phase = 0;
    this.currentHz = 0;
    this.amplitude = 0;
    this.noteAge = 0;
    this.lastIndex = -2;
    this.vibPhase = 0;
    this.aspiration = 0;
    this.jitter = 0; this.jitterTarget = 0; this.jitterCountdown = 0;
    this.done = false;

    /* ~45 ms reads as a sung connection rather than a slur */
    this.glideCoef = 1 - Math.exp(-1 / (0.045 * sampleRate));

    this.port.onmessage = (e) => { if (e.data === 'stop') this.done = true; };
  }

  indexAt(t) {
    const s = this.segments;
    for (let i = 0; i < s.length; i++) if (t >= s[i].start && t < s[i].end) return i;
    return -1;
  }

  targetAt(t) {
    const i = this.indexAt(t);
    if (i < 0) return null;
    const s = this.segments[i];
    if (s.semitones === null || s.semitones === undefined) return null;
    if (s.glideTo === null || s.glideTo === undefined) return s.semitones;
    const dur = s.end - s.start;
    if (dur <= 0) return s.semitones;
    const f = Math.max(0, Math.min(1, (t - s.start) / dur));
    return s.semitones + (s.glideTo - s.semitones) * f;
  }

  renderSample(hz) {
    if (hz <= 0 || this.amplitude < 1e-6) return 0;

    /* Band-limited glottal source: harmonics summed only to Nyquist, so
       the reference never aliases into notes it was not asked to sing.
       The spectral tilt eases from dark to brighter as a note
       establishes — real folds close harder as a note settles, and a
       fixed tilt makes every note sound like the same organ stop. */
    const tilt = 1.55 - 0.40 * Math.min(1, Math.max(0, this.noteAge / 0.5));
    const maxHarmonic = Math.min(24, Math.floor((sampleRate / 2) / hz));
    let source = 0;
    for (let k = 1; k <= maxHarmonic; k++) source += Math.sin(this.phase * k) / Math.pow(k, tilt);

    this.phase += 2 * Math.PI * hz / sampleRate;
    if (this.phase > 2 * Math.PI) this.phase -= 2 * Math.PI;

    /* Aspiration — low-passed so it is breath rather than hiss, and
       stronger during the attack, which is how a real onset sounds.
       A glottal source with no aspiration reads as a synthesiser
       instantly; its absence is most of what makes additive voices
       sound fake. */
    const breath = 0.020 + 0.045 * (1 - Math.min(1, this.noteAge / 0.18));
    this.aspiration = 0.06 * (Math.random() * 2 - 1) + 0.94 * this.aspiration;
    source += this.aspiration * breath * 6;

    let v = 0;
    for (const f of this.formants) v += f.process(source);
    return v * this.amplitude * this.gain * 0.5;
  }

  process(_inputs, outputs) {
    if (this.done) return false;
    const out = outputs[0][0];
    if (!out) return true;
    if (this.t0 === null) this.t0 = currentTime;

    for (let i = 0; i < out.length; i++) {
      const t = (currentTime + i / sampleRate) - this.t0 - this.startOffset;

      if (t < 0 || t > this.total) {
        this.amplitude += (0 - this.amplitude) * 0.001;
        out[i] = this.amplitude > 1e-5 ? this.renderSample(this.currentHz) : 0;
        if (t > this.total + 0.5) { this.port.postMessage('ended'); return false; }
        continue;
      }

      const idx = this.indexAt(t);
      const target = this.targetAt(t);

      if (target === null) {
        /* a rest releases rather than cuts, so phrases breathe */
        this.amplitude += (0 - this.amplitude) * 0.0016;
        this.noteAge = 0;
        this.lastIndex = idx;
        out[i] = this.renderSample(this.currentHz);
        continue;
      }

      const hz = this.baseHz * Math.pow(2, target / 12);
      if (idx !== this.lastIndex) {
        const s = this.segments[idx];
        if (!s || s.attack !== false) this.noteAge = 0;
        this.lastIndex = idx;
      }
      if (this.currentHz <= 0) this.currentHz = hz;

      /* Vibrato grows after ~350 ms, easing in and getting slightly
         faster as it deepens — what a singer actually does. */
      const prog = Math.min(1, Math.max(0, (this.noteAge - 0.35) / 0.55));
      const depth = prog * prog * 0.0135;
      const rate = 4.9 + 0.9 * prog;
      this.vibPhase += 2 * Math.PI * rate / sampleRate;
      if (this.vibPhase > 2 * Math.PI) this.vibPhase -= 2 * Math.PI;
      const vib = 1 + depth * Math.sin(this.vibPhase);

      /* micro-jitter: a new target every ~60 ms, interpolated toward.
         A perfectly constant f0 does not occur in a human and the ear
         notices. */
      if (this.jitterCountdown-- <= 0) {
        this.jitterTarget = (Math.random() - 0.5) * 0.0022;
        this.jitterCountdown = Math.floor(sampleRate * 0.06);
      }
      this.jitter += (this.jitterTarget - this.jitter) * 0.0004;

      this.currentHz += (hz - this.currentHz) * this.glideCoef;

      /* a slight overshoot on the attack, then settle — a pure
         exponential rise sounds mechanical; voices bloom a little */
      this.amplitude += ((this.noteAge < 0.12 ? 1.06 : 1) - this.amplitude) * 0.0045;
      this.noteAge += 1 / sampleRate;

      out[i] = this.renderSample(this.currentHz * vib * (1 + this.jitter));
    }
    return true;
  }
}

registerProcessor('sid-voice', VoiceProcessor);
