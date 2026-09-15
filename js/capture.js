/* ============================================================
   capture.js — one button, always there

   The reason ideas do not get written down is that writing one
   down costs four taps of navigation first. This costs one.
   Everything lands in the Inbox to be filed later.
   ============================================================ */

import * as S from './store.js';
import * as B from './backend.js';
import { h, clear, $, btn, modal, toast, uid, field } from './ui.js';
import { icon } from './icons.js';

function push(item) {
  const st = S.get('inbox');
  st.items = st.items || [];
  st.items.unshift({
    id: uid(),
    at: new Date().toISOString(),
    title: item.title || '',
    text: item.text || '',
    url: item.url || '',
    files: item.files || [],
    filed: false,
  });
  S.touch('inbox');
}

/* ---------------------------------------------------------- */
/*  the sheet                                                  */
/* ---------------------------------------------------------- */

export function captureSheet(prefill = {}) {
  const item = { text: prefill.text || '', title: prefill.title || '', url: prefill.url || '' };
  const files = [];
  const shelf = h('div', { class: 'row', style: { flexWrap: 'wrap' } });

  const ta = h('textarea', {
    class: 'inp', rows: 3, autofocus: true,
    placeholder: 'A line, a lyric, a link, a thing to do…',
    value: item.text,
    onInput: (e) => { item.text = e.target.value; },
  });

  const addFiles = async (list) => {
    for (const f of list) {
      const chip = h('span', { class: 'tagchip', text: `${f.name} — uploading…` });
      shelf.append(chip);
      try {
        files.push(await B.uploadMedia(f, 'inbox'));
        chip.textContent = f.name;
      } catch (err) {
        chip.textContent = `${f.name} — ${err.message}`;
        chip.style.color = 'var(--warn)';
      }
    }
  };

  const filePick = h('input', {
    type: 'file', accept: 'image/*,video/*,audio/*', multiple: true, hidden: true,
    onChange: async (e) => { await addFiles([...e.target.files]); e.target.value = ''; },
  });

  /* a photo taken now, rather than one chosen from the roll */
  const camera = h('input', {
    type: 'file', accept: 'image/*', capture: 'environment', hidden: true,
    onChange: async (e) => { await addFiles([...e.target.files]); e.target.value = ''; },
  });

  const rec = recorderControl(files, shelf);

  const { close } = modal({
    title: 'Quick capture',
    body: h('div',
      ta,
      h('div', { class: 'row', style: { marginTop: '10px', flexWrap: 'wrap' } },
        filePick, camera,
        btn('Photo or video', () => filePick.click(), { cls: 'btn-sm' }),
        btn('Take a photo', () => camera.click(), { cls: 'btn-sm' }),
        rec.el),
      shelf,
      h('p', { class: 'small muted', style: { marginTop: '10px' },
        text: 'Lands in the Inbox. File it into a post, a note or a task whenever you get to it.' })),
    actions: [
      { label: 'Cancel' },
      { label: 'Save', cls: 'btn-primary', onClick: () => {
        rec.stop();
        if (!item.text.trim() && !files.length) return;
        push({ ...item, files });
        toast('Saved to the Inbox');
      } },
    ],
    onClose: () => rec.stop(),
  });

  setTimeout(() => ta.focus(), 60);
  return close;
}

/* ---------------------------------------------------------- */
/*  voice notes                                                */
/* ---------------------------------------------------------- */

function recorderControl(files, shelf) {
  let mr = null, chunks = [], timer = null, secs = 0;
  const label = h('span', { text: 'Voice note' });
  const el = btn('', toggle, { cls: 'btn-sm' });
  clear(el); el.append(label);

  async function toggle() {
    if (mr && mr.state === 'recording') return stop();
    if (!navigator.mediaDevices?.getUserMedia) { toast('This browser cannot record audio'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(timer);
        label.textContent = 'Voice note';
        el.classList.remove('btn-danger');
        if (!chunks.length) return;
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
        const name = `voice-${Date.now()}.${/mp4/.test(blob.type) ? 'm4a' : 'webm'}`;
        const chip = h('span', { class: 'tagchip', text: `${name} — uploading…` });
        shelf.append(chip);
        try {
          files.push(await B.uploadMedia(new File([blob], name, { type: blob.type }), 'inbox'));
          chip.textContent = `${name} · ${secs}s`;
        } catch (err) { chip.textContent = err.message; chip.style.color = 'var(--warn)'; }
      };
      mr.start();
      secs = 0;
      el.classList.add('btn-danger');
      timer = setInterval(() => { secs++; label.textContent = `Stop · ${secs}s`; }, 1000);
      label.textContent = 'Stop · 0s';
    } catch {
      toast('Microphone permission was refused', 3500);
    }
  }
  function stop() { if (mr && mr.state === 'recording') mr.stop(); }

  return { el, stop };
}

/* ---------------------------------------------------------- */
/*  the button                                                 */
/* ---------------------------------------------------------- */

export function initCapture() {
  const fab = h('button', {
    class: 'fab', title: 'Quick capture', 'aria-label': 'Quick capture',
    onClick: () => captureSheet(),
  }, h('span', { html: icon('plus') }));
  document.body.append(fab);

  /* the same thing from a keyboard, on a laptop */
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      captureSheet();
    }
  });
}
