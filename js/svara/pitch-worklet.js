/* ============================================================
   svara/pitch-worklet.js — pitch detection on the audio thread

   Runs inside an AudioWorklet, so a busy render or a re-layout on
   the main thread cannot stall it. That matters here: on the main
   thread the pitch line stutters exactly when the UI is doing the
   most work, which on a phone is most of the time.

   Same algorithm as before — normalised square difference, the
   first peak past the initial dip rather than the tallest (the
   tallest is usually the octave below), parabolic interpolation on
   that peak — but now fed a hop at a time from a ring buffer, and
   posting a message rather than being polled.
   ============================================================ */

const MIN_HZ = 70;
const MAX_HZ = 1100;
const WINDOW = 2048;
const HOP = 512;                 // ~85 analyses a second at 44.1 kHz

class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(WINDOW);
    this.filled = 0;
    this.sinceHop = 0;
    this.running = true;
    this.port.onmessage = (e) => {
      if (e.data === 'stop') this.running = false;
    };
  }

  nsdf(lag) {
    const b = this.buf, n = WINDOW;
    let acf = 0, sq = 0;
    for (let i = 0; i < n - lag; i++) {
      acf += b[i] * b[i + lag];
      sq += b[i] * b[i] + b[i + lag] * b[i + lag];
    }
    return sq > 0 ? (2 * acf) / sq : 0;
  }

  analyse() {
    const b = this.buf, n = WINDOW;

    let rms = 0;
    for (let i = 0; i < n; i++) rms += b[i] * b[i];
    rms = Math.sqrt(rms / n);
    if (rms < 0.008) return { hz: 0, clarity: 0, rms };

    const maxLag = Math.min(n - 2, Math.floor(sampleRate / MIN_HZ));
    const minLag = Math.max(2, Math.floor(sampleRate / MAX_HZ));

    let bestLag = -1, bestVal = 0, prev = 0, rising = false;
    for (let lag = minLag; lag <= maxLag; lag++) {
      const v = this.nsdf(lag);
      if (!rising && v > 0.3 && v > prev) rising = true;
      if (rising && v < prev) { if (prev > bestVal) { bestVal = prev; bestLag = lag - 1; } break; }
      prev = v;
    }
    if (bestLag < 0 || bestVal < 0.45) return { hz: 0, clarity: bestVal, rms };

    const y0 = this.nsdf(bestLag - 1), y1 = bestVal, y2 = this.nsdf(bestLag + 1);
    const denom = 2 * (2 * y1 - y0 - y2);
    const shift = denom !== 0 ? (y2 - y0) / denom : 0;
    const hz = sampleRate / (bestLag + shift);

    if (!isFinite(hz) || hz < MIN_HZ || hz > MAX_HZ) return { hz: 0, clarity: bestVal, rms };
    return { hz, clarity: bestVal, rms };
  }

  process(inputs) {
    if (!this.running) return false;
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;

    /* slide the window along by one render quantum */
    const n = ch.length;
    this.buf.copyWithin(0, n);
    this.buf.set(ch, WINDOW - n);
    this.filled = Math.min(WINDOW, this.filled + n);
    this.sinceHop += n;

    if (this.filled >= WINDOW && this.sinceHop >= HOP) {
      this.sinceHop = 0;
      const r = this.analyse();
      this.port.postMessage({ hz: r.hz, clarity: r.clarity, rms: r.rms, t: currentTime });
    }
    return true;
  }
}

registerProcessor('sid-pitch', PitchProcessor);
