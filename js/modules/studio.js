/* ============================================================
   studio.js — the asset studio

   Four jobs, all done in the browser with no upload:
     • check a file against the spec it is meant to satisfy
     • crop one master still into every size the release needs
     • restyle a still ten ways
     • build a looping motion clip from a still (Canvas, Reels)
   Plus a spec sheet you can hand a designer.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, subtabs, selectField,
  toast, copy, download, todayISO, fmtDate,
} from '../ui.js';
import { SPECS, SPEC_GROUPS, specById, DERIVABLE, STYLES, MOTIONS } from '../data/specs.js';
import {
  loadImage, probeVideo, cropTo, toBlob, applyStyle, motionClip, recorderType, extOf, mb,
} from '../imagetools.js';

/* ---------------------------------------------------------- */
/*  the checks                                                 */
/* ---------------------------------------------------------- */

const ratioName = (r) => {
  if (Math.abs(r - 1) < 0.04) return 'square';
  if (Math.abs(r - 16 / 9) < 0.06) return '16:9';
  if (Math.abs(r - 9 / 16) < 0.06) return '9:16';
  if (Math.abs(r - 4 / 5) < 0.04) return '4:5';
  if (Math.abs(r - 3 / 2) < 0.05) return '3:2';
  if (Math.abs(r - 2 / 3) < 0.05) return '2:3';
  return r > 1 ? `${r.toFixed(2)}:1 wide` : `1:${(1 / r).toFixed(2)} tall`;
};

const bad  = (msg) => ({ level: 'bad', msg });
const warn = (msg) => ({ level: 'warn', msg });
const ok   = (msg) => ({ level: 'ok', msg });

export function checkFormat(spec, file) {
  const out = [];
  const ext = extOf(file.name);
  if (spec.formats && !spec.formats.includes(ext === 'jpg' ? 'jpg' : ext)
      && !(ext === 'jpg' && spec.formats.includes('jpeg'))
      && !(ext === 'jpeg' && spec.formats.includes('jpg'))) {
    out.push(bad(`.${ext} — this slot takes ${spec.formats.map(f => '.' + f).join(', ')}.`));
  }
  if (spec.maxMB && mb(file.size) > spec.maxMB) {
    out.push(bad(`${mb(file.size).toFixed(1)} MB — over the ${spec.maxMB} MB limit.`));
  }
  return out;
}

export function checkImage(spec, file, img) {
  const out = [...checkFormat(spec, file)];
  const { width: w, height: h } = img;

  if (spec.w && spec.h) {
    if (spec.min) {
      if (w < spec.w || h < spec.h) out.push(bad(`${w}×${h} — smaller than the required ${spec.w}×${spec.h}.`));
      else out.push(ok(`${w}×${h} — at or above the ${spec.w}×${spec.h} minimum.`));
      /* a minimum is still a shape. A 3000×2000 photo clears a
         750×750 minimum and then gets cropped square by the
         uploader, usually through someone's face. */
      const want = spec.w / spec.h, got = w / h;
      if (w >= spec.w && h >= spec.h && Math.abs(want - got) > 0.04) {
        out.push(warn(`This is ${ratioName(got)}, and the slot is ${ratioName(want)} — it will be cropped. Crop it yourself in the studio so you choose what survives.`));
      }
    } else if (w === spec.w && h === spec.h) {
      out.push(ok(`${w}×${h} — exactly right.`));
    } else {
      const want = spec.w / spec.h, got = w / h;
      if (Math.abs(want - got) > 0.02) out.push(bad(`${w}×${h} is the wrong shape — this slot wants ${spec.w}×${spec.h}.`));
      else if (w < spec.w) out.push(warn(`${w}×${h} — right shape, but below ${spec.w}×${spec.h}. It will be upscaled.`));
      else out.push(ok(`${w}×${h} — right shape, larger than needed. Fine.`));
    }
  } else {
    out.push(ok(`${w}×${h}. No published size requirement for this one.`));
  }
  return out;
}

export function checkVideo(spec, file, v) {
  const out = [...checkFormat(spec, file)];
  const { w, h, duration, audio } = v;

  if (spec.durMin && duration < spec.durMin) out.push(bad(`${duration.toFixed(1)}s — shorter than the ${spec.durMin}s minimum. It will be rejected.`));
  if (spec.durMax && duration > spec.durMax) out.push(bad(`${duration.toFixed(1)}s — longer than the ${spec.durMax}s limit. It will be rejected.`));
  if (spec.durMin && spec.durMax && duration >= spec.durMin && duration <= spec.durMax) {
    out.push(ok(`${duration.toFixed(1)}s — inside the ${spec.durMin}–${spec.durMax}s window.`));
  }

  if (spec.ratio) {
    const got = w / h;
    if (Math.abs(got - spec.ratio) > 0.03) out.push(bad(`${w}×${h} is ${got > spec.ratio ? 'too wide' : 'too narrow'} — this wants ${spec.ratio < 1 ? '9:16 vertical' : '16:9 landscape'}.`));
    else out.push(ok(`${w}×${h} — correct aspect ratio.`));
  }
  if (spec.hMin && h < spec.hMin) out.push(bad(`${h}px tall — below the ${spec.hMin}px minimum.`));
  if (spec.hMax && h > spec.hMax) out.push(warn(`${h}px tall — above the ${spec.hMax}px guidance. Usually accepted, sometimes not.`));
  if (spec.w && spec.min && (w < spec.w || h < spec.h)) out.push(bad(`${w}×${h} — below the required ${spec.w}×${spec.h}.`));

  if (spec.silent) {
    if (audio === true) out.push(bad('This file has an audio track. Canvas is silent — it will be rejected. Export again with audio disabled.'));
    else if (audio === false) out.push(ok('No audio track.'));
    else out.push(warn('Could not tell whether this file has audio — this browser does not expose it. Canvas rejects anything with an audio track, so check your export settings.'));
  }
  return out;
}

/* ---------------------------------------------------------- */
/*  the page                                                   */
/* ---------------------------------------------------------- */

export function renderStudio(sub) {
  const root = h('div');
  const st = S.get('studio');
  let tab = ['specs', 'resize', 'styles', 'motion'].includes(sub) ? sub : 'specs';

  const draw = () => {
    clear(root);
    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: 'Asset studio' }),
        h('div', { class: 'sub', text: 'Check a file against its spec, or make the file. Nothing leaves this device.' })),
      h('div', { class: 'spacer' }),
      h('div', { class: 'page-actions' }, btn('Spec sheet', specSheet, { cls: 'btn-sm' }))));

    root.append(subtabs([['specs', 'Specs & checker'], ['resize', 'One still → every size'],
      ['styles', 'Style variants'], ['motion', 'Motion clips']], tab, k => { tab = k; draw(); }));

    if (tab === 'resize') { root.append(resizePane()); return; }
    if (tab === 'styles') { root.append(stylesPane()); return; }
    if (tab === 'motion') { root.append(motionPane()); return; }
    root.append(specsPane());
  };

  /* ---------------- specs & checker ---------------- */

  function specsPane() {
    st.have = st.have || {};
    const box = h('div');

    const missing = SPECS.filter(s => !st.have[s.id]);
    box.append(card(
      cardHead('What is still missing', h('span', { class: `tag ${missing.length ? 'warn' : 'ok'}`, text: `${SPECS.length - missing.length}/${SPECS.length}` })),
      missing.length
        ? h('div', {},
            h('p', { class: 'small muted' }, 'Nothing here is ticked until a real file has passed its check, so this list cannot lie to you.'),
            h('div', { class: 'row', style: { flexWrap: 'wrap', gap: '6px' } },
              missing.map(s => h('span', { class: 'tagchip', text: s.label }))))
        : h('div', { class: 'small', style: { color: 'var(--ok)' }, text: 'Every asset has a file that passed its check.' })));

    SPEC_GROUPS.forEach(([g, label]) => {
      const items = SPECS.filter(s => s.group === g);
      if (!items.length) return;
      const c = card(cardHead(label));
      items.forEach(s => c.append(specRow(s)));
      box.append(c);
    });

    return box;

    function specRow(s) {
      const have = st.have[s.id];
      const result = h('div', { class: 'lint', style: { display: 'none', marginTop: '8px' } });

      const pick = h('input', { type: 'file', hidden: true,
        accept: s.kind === 'video' ? 'video/*,image/*' : 'image/*',
        onChange: async (e) => {
          const f = e.target.files[0];
          if (!f) return;
          result.style.display = '';
          clear(result);
          result.append(h('div', { class: 'lint-row', text: 'checking…' }));
          try {
            let rows;
            const isVideo = /^video\//.test(f.type) || ['mp4', 'mov', 'webm'].includes(extOf(f.name));
            if (isVideo) rows = checkVideo(s, f, await probeVideo(f));
            else rows = checkImage(s, f, await loadImage(f));
            clear(result);
            rows.forEach(r => result.append(h('div', { class: `lint-row ${r.level}` },
              h('span', { class: 'lint-dot' }), h('span', { text: r.msg }))));
            const passed = !rows.some(r => r.level === 'bad');
            if (passed) {
              st.have[s.id] = { name: f.name, at: todayISO() };
              S.touch('studio');
              result.append(h('div', { class: 'lint-row ok' }, h('span', { class: 'lint-dot' }),
                h('span', { text: 'Passed — ticked off the missing list.' })));
              setTimeout(draw, 900);
            }
          } catch (err) {
            clear(result);
            result.append(h('div', { class: 'lint-row bad' }, h('span', { class: 'lint-dot' }), h('span', { text: err.message })));
          }
          e.target.value = '';
        } });

      const nums = [];
      if (s.w && s.h) nums.push(`${s.w}×${s.h}${s.min ? ' minimum' : ''}`);
      if (s.ratio) nums.push(s.ratio < 1 ? '9:16 vertical' : '16:9 landscape');
      if (s.hMin) nums.push(`${s.hMin}${s.hMax ? `–${s.hMax}` : '+'}px tall`);
      if (s.durMin || s.durMax) nums.push(`${s.durMin || 0}–${s.durMax}s`);
      if (s.formats) nums.push(s.formats.map(f => '.' + f).join(' / '));
      if (s.maxMB) nums.push(`under ${s.maxMB >= 1000 ? (s.maxMB / 1000) + ' GB' : s.maxMB + ' MB'}`);
      if (s.count) nums.push(`up to ${s.count}`);
      if (s.silent) nums.push('silent');

      return h('div', { class: 'item' },
        h('div', { class: 'item-head' },
          h('span', { class: 'item-title', text: s.label }),
          have ? h('span', { class: 'tag ok', text: 'have it' }) : h('span', { class: 'tag', text: 'missing' }),
          s.unverified ? h('span', { class: 'tag warn', text: 'confirm this one' }) : null),
        h('div', { class: 'item-meta' }, h('span', { class: 'mono', text: nums.join(' · ') })),
        s.note ? h('div', { class: 'small muted', style: { marginTop: '4px' }, text: s.note }) : null,
        s.where ? h('div', { class: 'small muted', style: { marginTop: '2px' }, text: `Uploaded at: ${s.where}` }) : null,
        have ? h('div', { class: 'small muted', style: { marginTop: '4px' }, text: `${have.name} · checked ${fmtDate(have.at)}` }) : null,
        h('div', { class: 'row', style: { marginTop: '8px' } },
          pick,
          btn(have ? 'Check another' : 'Check a file', () => pick.click(), { cls: 'btn-sm' }),
          have ? btn('Clear', () => { delete st.have[s.id]; S.touch('studio'); draw(); }, { cls: 'btn-sm btn-ghost' }) : null),
        result);
    }
  }

  /* ---------------- one still → every size ---------------- */

  function resizePane() {
    const box = h('div');
    let img = null, fileName = '';
    let focal = { x: 0.5, y: 0.5 };
    const chosen = new Set(DERIVABLE);

    const previewBox = h('div', { class: 'shots' });
    const status = h('div', { class: 'small muted', style: { marginTop: '10px' } });

    const drawPreviews = () => {
      clear(previewBox);
      if (!img) return;
      DERIVABLE.forEach(id => {
        const s = specById(id);
        const w = s.w, hgt = s.h;
        const thumbH = 120;
        const c = cropTo(img, Math.round(thumbH * (w / hgt)), thumbH, focal);
        const on = chosen.has(id);
        previewBox.append(h('div', { class: `shot ${on ? 'on' : ''}`, onClick: () => {
          on ? chosen.delete(id) : chosen.add(id);
          drawPreviews();
        } },
          c,
          h('div', { class: 'shot-lab' },
            h('div', { text: s.label }),
            h('div', { class: 'mono small muted', text: `${w}×${hgt}` })),
          s.safe ? h('div', { class: 'shot-safe', style: {
            left: `${s.safe.x * 100}%`, right: `${s.safe.x * 100}%`,
            top: `${s.safe.y * 100}%`, bottom: `${s.safe.y * 100}%` } }) : null));
      });
    };

    const pick = h('input', { type: 'file', accept: 'image/*', hidden: true,
      onChange: async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try {
          img = await loadImage(f); fileName = f.name.replace(/\.[^.]+$/, '');
          status.textContent = `${img.width}×${img.height} loaded. Tap a size to include or exclude it; drag the focal point on the big preview.`;
          drawPreviews(); drawFocal();
        } catch (err) { toast(err.message, 4000); }
        e.target.value = '';
      } });

    const focalBox = h('div', { class: 'focal' });
    const drawFocal = () => {
      clear(focalBox);
      if (!img) return;
      const c = cropTo(img, 420, Math.round(420 * img.height / img.width), { x: 0.5, y: 0.5 });
      const dot = h('i', { style: { left: `${focal.x * 100}%`, top: `${focal.y * 100}%` } });
      const wrap = h('div', { class: 'focal-wrap', onClick: (e) => {
        const r = wrap.getBoundingClientRect();
        focal = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
        drawFocal(); drawPreviews();
      } }, c, dot);
      focalBox.append(wrap,
        h('div', { class: 'small muted', style: { marginTop: '6px' },
          text: 'Click where the important part is. Every crop keeps that point in view.' }));
    };

    box.append(card(
      cardHead('The master still'),
      h('p', { class: 'small muted' },
        'One high-resolution image, cropped into every size the release needs. Start from something at least 2660px wide or the header will be upscaled.'),
      h('div', { class: 'row' }, pick, btn('Choose an image', () => pick.click(), { cls: 'btn-primary btn-sm' })),
      status, focalBox));

    box.append(card(
      cardHead('Sizes', btn('Export the selected', async () => {
        if (!img) { toast('Choose an image first'); return; }
        let n = 0;
        for (const id of DERIVABLE) {
          if (!chosen.has(id)) continue;
          const s = specById(id);
          const c = cropTo(img, s.w, s.h, focal);
          const blob = await toBlob(c, 'image/jpeg', 0.92);
          download(`${fileName || 'still'}-${s.id}-${s.w}x${s.h}.jpg`, blob, 'image/jpeg');
          n++;
          await new Promise(r => setTimeout(r, 350));   // browsers throttle rapid downloads
        }
        toast(`${n} file${n === 1 ? '' : 's'} saved`);
      }, { cls: 'btn-sm btn-primary' })),
      h('p', { class: 'small muted' }, 'The dotted box is the part that survives cropping on a phone — keep faces and text inside it.'),
      previewBox));

    return box;
  }

  /* ---------------- styles ---------------- */

  function stylesPane() {
    const box = h('div');
    let img = null, fileName = '';
    const grid = h('div', { class: 'shots' });
    const opts = { dark: '#1b1a18', light: '#e8e2d6', levels: 5, cutoff: 128 };

    const drawGrid = () => {
      clear(grid);
      if (!img) return;
      STYLES.forEach(s => {
        const c = cropTo(img, 200, 200, { x: 0.5, y: 0.5 });
        applyStyle(c, s.key, opts);
        grid.append(h('div', { class: 'shot', onClick: async () => {
          const full = cropTo(img, Math.min(img.width, 2400), Math.round(Math.min(img.width, 2400) * img.height / img.width), { x: 0.5, y: 0.5 });
          applyStyle(full, s.key, opts);
          download(`${fileName || 'still'}-${s.key}.jpg`, await toBlob(full, 'image/jpeg', 0.92), 'image/jpeg');
        } }, c, h('div', { class: 'shot-lab' }, h('div', { text: s.label }))));
      });
    };

    const pick = h('input', { type: 'file', accept: 'image/*', hidden: true,
      onChange: async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try { img = await loadImage(f); fileName = f.name.replace(/\.[^.]+$/, ''); drawGrid(); }
        catch (err) { toast(err.message, 4000); }
        e.target.value = '';
      } });

    box.append(card(
      cardHead('One photo, ten looks'),
      h('p', { class: 'small muted' },
        'Tap any tile to save that version at full size. Duotone and halftone use the two colours below, so a set made this way looks like a set rather than ten unrelated filters.'),
      h('div', { class: 'row' }, pick, btn('Choose an image', () => pick.click(), { cls: 'btn-primary btn-sm' }),
        h('label', { class: 'row', style: { gap: '6px' } }, h('span', { class: 'small muted', text: 'dark' }),
          h('input', { type: 'color', value: opts.dark, onInput: (e) => { opts.dark = e.target.value; drawGrid(); } })),
        h('label', { class: 'row', style: { gap: '6px' } }, h('span', { class: 'small muted', text: 'light' }),
          h('input', { type: 'color', value: opts.light, onInput: (e) => { opts.light = e.target.value; drawGrid(); } }))),
      grid));

    return box;
  }

  /* ---------------- motion ---------------- */

  function motionPane() {
    const box = h('div');
    let img = null, fileName = '';
    let motion = 'zoom', style = 'none', seconds = 6;
    const type = recorderType();

    const out = h('div', { style: { marginTop: '12px' } });
    const bar = h('div', { class: 'prog', style: { display: 'none' } }, h('i', { style: { width: '0%' } }));

    const pick = h('input', { type: 'file', accept: 'image/*', hidden: true,
      onChange: async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try { img = await loadImage(f); fileName = f.name.replace(/\.[^.]+$/, ''); toast(`${img.width}×${img.height} loaded`); }
        catch (err) { toast(err.message, 4000); }
        e.target.value = '';
      } });

    const chips = (items, get, set) => h('div', { class: 'row', style: { flexWrap: 'wrap' } },
      items.map(i => h('button', { class: `chip ${get() === i.key ? 'on' : ''}`,
        onClick: (e) => { set(i.key); [...e.target.parentNode.children].forEach(c => c.classList.remove('on')); e.target.classList.add('on'); } },
        i.label)));

    box.append(card(
      cardHead('Canvas & Reel loops'),
      h('p', { class: 'small muted' },
        'Builds a silent vertical loop from one still — 720×1280, which is inside Spotify\'s 720–1080 window. Every motion here returns to where it started, because a Canvas repeats forever and a hard cut shows on every single loop.'),
      type
        ? h('p', { class: 'small muted', text: `Recording as ${type.split(';')[0]}.${/mp4/.test(type) ? ' Spotify takes MP4 directly.' : ' This browser records WebM, and Spotify wants MP4 — convert before uploading, or run this in Chrome, which records MP4.'}` })
        : h('p', { class: 'small', style: { color: 'var(--bad)' }, text: 'This browser cannot record video from a canvas. Chrome and Edge can; Safari cannot.' }),
      h('div', { class: 'row', style: { marginTop: '10px' } }, pick, btn('Choose an image', () => pick.click(), { cls: 'btn-sm btn-primary' })),
      h('div', { class: 'field', style: { marginTop: '12px' } },
        h('span', { class: 'lab', text: 'Motion' }),
        chips(MOTIONS, () => motion, (k) => { motion = k; }),
        h('div', { class: 'small muted', style: { marginTop: '6px' },
          text: MOTIONS.map(m => `${m.label}: ${m.note}`).join('  ·  ') })),
      h('div', { class: 'field' },
        h('span', { class: 'lab', text: 'Style' }),
        chips(STYLES, () => style, (k) => { style = k; })),
      h('div', { class: 'field' },
        h('span', { class: 'lab', text: 'Length' }),
        h('div', { class: 'row' }, [3, 4, 5, 6, 7, 8].map(n => h('button', {
          class: `chip ${seconds === n ? 'on' : ''}`,
          onClick: (e) => { seconds = n; [...e.target.parentNode.children].forEach(c => c.classList.remove('on')); e.target.classList.add('on'); },
        }, `${n}s`))),
        h('div', { class: 'small muted', text: 'Spotify accepts 3 to 8 seconds. Anything outside that is rejected outright.' })),
      h('div', { class: 'row', style: { marginTop: '12px' } },
        btn('Render the loop', render, { cls: 'btn-primary' })),
      bar, out));

    async function render() {
      if (!img) { toast('Choose an image first'); return; }
      if (!type) { toast('This browser cannot record video', 4000); return; }
      clear(out);
      bar.style.display = '';
      const fill = bar.firstChild;
      try {
        const { blob, type: mime } = await motionClip(img, {
          w: 720, h: 1280, seconds, motion, style,
          onProgress: (p) => { fill.style.width = `${Math.round(p * 100)}%`; },
        });
        fill.style.width = '100%';
        const url = URL.createObjectURL(blob);
        const ext = /mp4/.test(mime) ? 'mp4' : 'webm';
        out.append(
          h('video', { src: url, autoplay: true, loop: true, muted: true, playsinline: true,
            style: { width: '220px', borderRadius: 'var(--r)', display: 'block', marginBottom: '10px' } }),
          h('div', { class: 'small muted', text: `${seconds}s · 720×1280 · ${mb(blob.size).toFixed(1)} MB · .${ext} · silent` }),
          h('div', { class: 'row', style: { marginTop: '8px' } },
            btn('Save it', () => download(`${fileName || 'canvas'}-${motion}.${ext}`, blob, mime), { cls: 'btn-sm btn-primary' }),
            ext === 'webm' ? h('span', { class: 'small', style: { color: 'var(--warn)' },
              text: 'WebM — convert to MP4 before uploading to Spotify.' } ) : null));
      } catch (err) {
        out.append(h('div', { class: 'small', style: { color: 'var(--bad)' }, text: err.message }));
      }
      setTimeout(() => { bar.style.display = 'none'; fill.style.width = '0%'; }, 600);
    }

    return box;
  }

  /* ---------------- spec sheet ---------------- */

  function specSheet() {
    const set = S.get('settings');
    const lines = [`# Asset spec sheet — ${set.artist || '[artist]'}, "${set.song || '[song]'}"`, ''];
    if (set.releaseDate) lines.push(`Release: ${set.releaseDate}`, '');
    SPEC_GROUPS.forEach(([g, label]) => {
      const items = SPECS.filter(s => s.group === g);
      if (!items.length) return;
      lines.push(`## ${label}`, '');
      items.forEach(s => {
        const nums = [];
        if (s.w && s.h) nums.push(`${s.w}×${s.h}${s.min ? ' minimum' : ''}`);
        if (s.ratio) nums.push(s.ratio < 1 ? '9:16' : '16:9');
        if (s.hMin) nums.push(`${s.hMin}${s.hMax ? `–${s.hMax}` : '+'}px tall`);
        if (s.durMin || s.durMax) nums.push(`${s.durMin || 0}–${s.durMax}s`);
        if (s.formats) nums.push(s.formats.map(f => '.' + f).join(' / '));
        if (s.maxMB) nums.push(`≤ ${s.maxMB >= 1000 ? (s.maxMB / 1000) + 'GB' : s.maxMB + 'MB'}`);
        if (s.silent) nums.push('silent');
        lines.push(`- **${s.label}** — ${nums.join(', ')}${(S.get('studio').have || {})[s.id] ? '  ✅ have it' : '  ⬜ missing'}`);
        if (s.note) lines.push(`  - ${s.note}`);
      });
      lines.push('');
    });
    lines.push('---', '', 'Generated by Sid. Sizes checked against platform documentation, September 2026.');
    download(`asset-specs-${todayISO()}.md`, lines.join('\n'), 'text/markdown');
    toast('Spec sheet saved');
  }

  draw();
  return root;
}
