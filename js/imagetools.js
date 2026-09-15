/* ============================================================
   imagetools.js — crop, restyle and animate in the browser

   No server, no upload, no library. Everything here runs on a
   canvas against a file the user picked, so nothing leaves the
   device unless they save the result.
   ============================================================ */

/* ---------------------------------------------------------- */
/*  loading & measuring                                        */
/* ---------------------------------------------------------- */

export function loadImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That file could not be read as an image.')); };
    img.src = url;
  });
}

/** Width, height, duration and whether a video carries audio. */
export function probeVideo(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.onloadedmetadata = () => {
      /* No standard API reports an audio track. These three cover
         Chrome, Firefox and Safari respectively; if all three are
         undefined we say "unknown" rather than guessing. */
      let audio = null;
      if (typeof v.mozHasAudio === 'boolean') audio = v.mozHasAudio;
      else if (typeof v.webkitAudioDecodedByteCount === 'number') audio = v.webkitAudioDecodedByteCount > 0;
      else if (v.audioTracks) audio = v.audioTracks.length > 0;
      res({ w: v.videoWidth, h: v.videoHeight, duration: v.duration, audio, url, el: v });
    };
    v.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That file could not be read as a video.')); };
    v.src = url;
  });
}

export const extOf = (name) => String(name || '').split('.').pop().toLowerCase();
export const mb = (bytes) => bytes / (1024 * 1024);

/* ---------------------------------------------------------- */
/*  cropping                                                   */
/* ---------------------------------------------------------- */

/** Cover-crop an image to exactly w×h, centred (or at a focal point). */
export function cropTo(img, w, h, focal = { x: 0.5, y: 0.5 }) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  const dx = (w - dw) * focal.x;
  const dy = (h - dh) * focal.y;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, dx, dy, dw, dh);
  return c;
}

export const toBlob = (canvas, type = 'image/jpeg', quality = 0.92) =>
  new Promise(res => canvas.toBlob(res, type, quality));

/* ---------------------------------------------------------- */
/*  styles                                                     */
/* ---------------------------------------------------------- */

/** Apply a named style to a canvas, in place. Returns the canvas. */
export function applyStyle(canvas, style, opts = {}) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  if (!style || style === 'none') return canvas;

  if (style === 'halftone') return halftone(canvas, opts);
  if (style === 'chroma') return chroma(canvas, opts);
  if (style === 'bloom') return bloom(canvas, opts);

  const d = ctx.getImageData(0, 0, w, h);
  const p = d.data;
  const amt = opts.amount ?? 1;

  const lo = hexToRgb(opts.dark || '#1b1a18');
  const hi = hexToRgb(opts.light || '#e8e2d6');
  const levels = Math.max(2, opts.levels || 5);
  const cutoff = opts.cutoff ?? 128;
  const grainAmt = (opts.grain ?? 28) * amt;

  for (let i = 0; i < p.length; i += 4) {
    let r = p[i], g = p[i + 1], b = p[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    switch (style) {
      case 'negative': r = 255 - r; g = 255 - g; b = 255 - b; break;
      case 'mono':     r = g = b = lum; break;
      case 'duotone': {
        const t = lum / 255;
        r = lo.r + (hi.r - lo.r) * t;
        g = lo.g + (hi.g - lo.g) * t;
        b = lo.b + (hi.b - lo.b) * t;
        break;
      }
      case 'posterize': {
        const step = 255 / (levels - 1);
        r = Math.round(r / step) * step;
        g = Math.round(g / step) * step;
        b = Math.round(b / step) * step;
        break;
      }
      case 'threshold': r = g = b = lum > cutoff ? 255 : 0; break;
      case 'grain': {
        const n = (Math.random() - 0.5) * grainAmt;
        r += n; g += n; b += n;
        break;
      }
      default: break;
    }

    p[i]     = clamp(r);
    p[i + 1] = clamp(g);
    p[i + 2] = clamp(b);
  }
  ctx.putImageData(d, 0, 0);
  return canvas;
}

const clamp = (v) => v < 0 ? 0 : v > 255 ? 255 : v;

function hexToRgb(hex) {
  const s = String(hex).replace('#', '');
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
}

/** Classic dot screen: read the average of each cell, draw a dot sized by it. */
function halftone(canvas, opts = {}) {
  const { width: w, height: h } = canvas;
  const cell = Math.max(3, Math.round(opts.cell || Math.max(w, h) / 160));
  const src = canvas.getContext('2d').getImageData(0, 0, w, h).data;

  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const o = out.getContext('2d');
  o.fillStyle = opts.light || '#f4f1ea';
  o.fillRect(0, 0, w, h);
  o.fillStyle = opts.dark || '#12110f';

  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      let sum = 0, n = 0;
      for (let yy = y; yy < Math.min(y + cell, h); yy += 2) {
        for (let xx = x; xx < Math.min(x + cell, w); xx += 2) {
          const i = (yy * w + xx) * 4;
          sum += 0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2];
          n++;
        }
      }
      const lum = n ? sum / n : 255;
      const r = (1 - lum / 255) * (cell / 1.5);
      if (r > 0.3) {
        o.beginPath();
        o.arc(x + cell / 2, y + cell / 2, r, 0, Math.PI * 2);
        o.fill();
      }
    }
  }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(out, 0, 0);
  return canvas;
}

/** Offset the red and blue channels — the cheap "broken VHS" look. */
function chroma(canvas, opts = {}) {
  const { width: w, height: h } = canvas;
  const off = Math.max(1, Math.round((opts.offset || 0.004) * w));
  const ctx = canvas.getContext('2d');
  const src = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const s = src.data, d = out.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const rx = Math.min(w - 1, x + off), bx = Math.max(0, x - off);
      d[i]     = s[(y * w + rx) * 4];
      d[i + 1] = s[i + 1];
      d[i + 2] = s[(y * w + bx) * 4 + 2];
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

/** Blurred bright pass composited back over the original. */
function bloom(canvas, opts = {}) {
  const { width: w, height: h } = canvas;
  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  const t = tmp.getContext('2d');
  t.filter = `blur(${Math.round(Math.max(w, h) / 90)}px) brightness(1.5)`;
  t.drawImage(canvas, 0, 0);
  const ctx = canvas.getContext('2d');
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = opts.amount ?? 0.45;
  ctx.drawImage(tmp, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}

/* ---------------------------------------------------------- */
/*  animation                                                  */
/* ---------------------------------------------------------- */

/** What this browser can actually record. Canvas wants MP4. */
export function recorderType() {
  const R = window.MediaRecorder;
  if (!R || !R.isTypeSupported) return null;
  for (const t of ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=h264', 'video/webm;codecs=vp9', 'video/webm']) {
    if (R.isTypeSupported(t)) return t;
  }
  return null;
}

/**
 * Render a looping motion clip from one still.
 * Returns { blob, type, seconds }. The loop is built so the last
 * frame matches the first — a Canvas repeats forever and a hard
 * cut shows every single time.
 */
export async function motionClip(img, {
  w = 720, h = 1280, seconds = 6, fps = 30, motion = 'zoom', style = 'none', styleOpts = {},
  onProgress,
} = {}) {
  const type = recorderType();
  if (!type) throw new Error('This browser cannot record video from a canvas. Chrome and Edge can; Safari cannot.');

  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');

  /* pre-style a still at double the crop area so pans have room */
  const base = cropTo(img, Math.round(w * 1.14), Math.round(h * 1.14));
  if (style && style !== 'none') applyStyle(base, style, styleOpts);

  const stream = c.captureStream(fps);
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

  const total = Math.round(seconds * fps);
  const done = new Promise(res => { rec.onstop = res; });
  rec.start();

  for (let f = 0; f < total; f++) {
    const t = f / total;                    // 0 → 1
    const loop = Math.sin(t * Math.PI);     // 0 → 1 → 0, so the ends match
    drawFrame(ctx, base, w, h, motion, t, loop);
    onProgress?.(f / total);
    await nextFrame(1000 / fps);
  }

  rec.stop();
  await done;
  const blob = new Blob(chunks, { type });
  return { blob, type, seconds };
}

function drawFrame(ctx, base, w, h, motion, t, loop) {
  const bw = base.width, bh = base.height;
  ctx.clearRect(0, 0, w, h);

  let scale = 1, dx = 0, dy = 0, alpha = 1;
  if (motion === 'zoom')  scale = 1 + 0.06 * loop;
  if (motion === 'pan')   dx = (bw - w) * (0.5 - 0.5 * Math.cos(t * Math.PI * 2)) * 0.5;
  if (motion === 'pulse') alpha = 1 - 0.10 * loop;
  if (motion === 'flicker') alpha = 1 - Math.random() * 0.12;

  const dw = bw * scale, dh = bh * scale;
  ctx.globalAlpha = alpha;
  ctx.drawImage(base, -(dw - w) / 2 + dx, -(dh - h) / 2 + dy, dw, dh);
  ctx.globalAlpha = 1;

  if (motion === 'grain' || motion === 'flicker') {
    /* fresh grain every frame is the whole effect — drawn as sparse
       dots rather than a full getImageData pass, which would not
       keep up at 30fps on a phone */
    const n = Math.round(w * h / 420);
    ctx.fillStyle = 'rgba(255,255,255,.055)';
    for (let i = 0; i < n; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);
    ctx.fillStyle = 'rgba(0,0,0,.055)';
    for (let i = 0; i < n; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);
  }
}

const nextFrame = (ms) => new Promise(res => setTimeout(() => requestAnimationFrame(res), ms));
