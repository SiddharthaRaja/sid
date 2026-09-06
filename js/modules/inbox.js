/* ============================================================
   inbox.js — things shared into Sid from other apps

   Installed as a PWA, Sid registers itself as a share target. So
   a link in WhatsApp, a screenshot, an email body, a reel you
   want to remember — Share → Sid, and it lands here instead of
   in a notes app you will never open again.

   From here each item goes somewhere real: a platform draft, a
   note, a contact, or the bin.

   Where the plumbing lives: the manifest declares the share
   target, the service worker catches the POST (a share is a form
   submission, not a navigation), stashes the payload in Cache
   Storage and redirects here. This module drains that stash on
   load. On desktop and on iOS, where the OS share sheet does not
   offer installed web apps, the Paste button does the same job.
   ============================================================ */

import * as S from '../store.js';
import * as B from '../backend.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, modal, selectField,
  toast, copy, confirmDelete, fmtDate, todayISO, esc,
} from '../ui.js';
import { PLATFORMS } from '../data/platforms.js';
import { icon, PCOLORS } from '../icons.js';

const SHARE_CACHE = 'sid-share';
const PENDING = './shared/pending.json';

/* ---------------------------------------------------------- */
/*  draining what the service worker stashed                   */
/* ---------------------------------------------------------- */

/** Called on boot. Moves anything the SW caught into the inbox
    slice, then clears the stash so a refresh does not duplicate. */
export async function drainShares() {
  let added = 0;

  /* 1. the POST path — service worker stash */
  try {
    if ('caches' in window) {
      const cache = await caches.open(SHARE_CACHE);
      const res = await cache.match(PENDING);
      if (res) {
        const payload = await res.json();
        await cache.delete(PENDING);
        if (payload && (payload.text || payload.url || payload.title || payload.files?.length)) {
          push(payload); added++;
        }
      }
    }
  } catch { /* cache unavailable — not fatal */ }

  /* 2. the GET fallback — some platforms send query params */
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('shared') || q.has('text') || q.has('url') || q.has('title')) {
      const payload = {
        title: q.get('title') || '', text: q.get('text') || '',
        url: q.get('url') || '', files: [],
      };
      if (payload.title || payload.text || payload.url) { push(payload); added++; }
      // strip the params so a reload does not re-add
      history.replaceState(null, '', location.pathname + (location.hash || ''));
    }
  } catch { /* ignore */ }

  return added;
}

function push(payload) {
  const st = S.get('inbox');
  st.items = st.items || [];
  st.items.unshift({
    id: uid(),
    at: new Date().toISOString(),
    title: payload.title || '',
    text: payload.text || '',
    url: payload.url || guessUrl(payload.text),
    files: payload.files || [],
    filed: false,
  });
  S.touch('inbox');
}

/* Android often puts the URL inside the text rather than in the
   url field, and sometimes both. Pull it out so the Open button
   works either way. */
function guessUrl(text) {
  const m = String(text || '').match(/https?:\/\/[^\s]+/);
  return m ? m[0] : '';
}

/** Add something by hand — the paste path. */
export function addManual(text) {
  push({ text: String(text || ''), title: '', url: '', files: [] });
}

export const inboxCount = () => (S.get('inbox').items || []).filter(i => !i.filed).length;

/* ---------------------------------------------------------- */
/*  the view                                                   */
/* ---------------------------------------------------------- */

export function renderInbox() {
  const root = h('div');
  const st = S.get('inbox');
  st.items = st.items || [];
  let showFiled = false;

  const draw = () => {
    clear(root);
    const open = st.items.filter(i => !i.filed);
    const filed = st.items.filter(i => i.filed);
    const shown = showFiled ? filed : open;

    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: 'Inbox' }),
        h('div', { class: 'sub', text: `${open.length} waiting · ${filed.length} filed` })),
      h('div', { class: 'spacer' }),
      h('div', { class: 'page-actions' },
        btn('Paste', pasteIn, { cls: 'btn-primary btn-sm', icon: 'plus' }),
        filed.length ? btn(showFiled ? 'Show waiting' : 'Show filed',
          () => { showFiled = !showFiled; draw(); }, { cls: 'btn-sm btn-ghost' }) : null,
        filed.length ? btn('Clear filed', () => confirmDelete(`${filed.length} filed items`, () => {
          st.items = st.items.filter(i => !i.filed); S.touch('inbox'); draw();
        }), { cls: 'btn-sm btn-ghost' }) : null)));

    if (!shown.length) {
      root.append(empty(
        showFiled ? 'Nothing filed yet' : 'Inbox empty',
        showFiled ? '' : 'Share a link, a screenshot or a bit of text into Sid from any app and it lands here.'));
      root.append(howTo());
      return;
    }

    root.append(h('div', { class: 'list' }, shown.map(item => row(item))));
    if (!showFiled) root.append(howTo());
  };

  /* ---------- one item ---------- */

  function row(item) {
    const box = h('div', { class: 'item' });

    box.append(h('div', { class: 'item-head' },
      h('span', { class: 'item-title', text: item.title || (item.url ? hostOf(item.url) : 'Shared text') }),
      h('span', { class: 'tag mono', text: new Date(item.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }),
      item.files?.length ? h('span', { class: 'tag', text: `${item.files.length} file${item.files.length === 1 ? '' : 's'}` }) : null,
      item.filed ? h('span', { class: 'tag ok', text: 'filed' }) : null));

    if (item.text) box.append(h('div', { class: 'item-body', style: { whiteSpace: 'pre-wrap' }, text: item.text.slice(0, 600) }));
    if (item.url) box.append(h('div', { class: 'item-meta' },
      h('a', { href: item.url, target: '_blank', rel: 'noopener', class: 'mono small', text: item.url.slice(0, 90) })));

    if (item.files?.length) {
      const grid = h('div', { class: 'media-grid', style: { marginTop: '10px' } });
      item.files.forEach(f => grid.append(filePreview(f)));
      box.append(grid);
    }

    box.append(h('div', { class: 'row', style: { marginTop: '12px', gap: '6px', flexWrap: 'wrap' } },
      btn('To a platform', () => fileToPlatform(item), { cls: 'btn-sm btn-primary' }),
      btn('To notes', () => fileToNote(item), { cls: 'btn-sm' }),
      item.url ? btn('Open', () => window.open(item.url, '_blank'), { cls: 'btn-sm btn-ghost' }) : null,
      (item.text || item.url) ? btn('Copy', () => copy(item.text || item.url), { cls: 'btn-sm btn-ghost' }) : null,
      item.filed
        ? btn('Reopen', () => { item.filed = false; S.touch('inbox'); draw(); }, { cls: 'btn-sm btn-ghost' })
        : btn('Mark filed', () => { item.filed = true; S.touch('inbox'); draw(); }, { cls: 'btn-sm btn-ghost' }),
      h('div', { style: { flex: 1 } }),
      h('button', { class: 'icon-btn', html: '&times;', title: 'Delete',
        onClick: () => confirmDelete('this item', () => {
          removeFiles(item);
          st.items.splice(st.items.indexOf(item), 1); S.touch('inbox'); draw();
        }) })));

    return box;
  }

  function filePreview(f) {
    const cell = h('div', { class: 'media-cell' });
    cell.append(h('span', { class: 'kind', text: (f.type || '').split('/')[0] || 'file' }));
    blobFor(f).then(blob => {
      if (!blob) { cell.append(h('div', { class: 'small muted', style: { padding: '10px' }, text: f.name })); return; }
      const url = URL.createObjectURL(blob);
      if (/^video\//.test(f.type)) cell.prepend(h('video', { src: url, muted: true, playsinline: true, preload: 'metadata' }));
      else if (/^image\//.test(f.type)) cell.prepend(h('img', { src: url, alt: f.name, loading: 'lazy' }));
      else cell.prepend(h('div', { class: 'small', style: { padding: '10px' }, text: f.name }));
    });
    return cell;
  }

  /* ---------- filing ---------- */

  function fileToNote(item) {
    const notes = S.get('notes');
    notes.items.unshift({
      id: uid(),
      title: item.title || (item.url ? hostOf(item.url) : 'From the inbox'),
      body: [item.text, item.url].filter(Boolean).join('\n\n'),
      when: todayISO(), tags: ['inbox'],
    });
    S.touch('notes');
    item.filed = true; S.touch('inbox');
    toast('Saved to Notes');
    draw();
  }

  function fileToPlatform(item) {
    const pick = { platform: PLATFORMS[0].key, type: PLATFORMS[0].types[0].key };
    const typeSel = h('select', { class: 'inp' });

    const fillTypes = () => {
      const p = PLATFORMS.find(x => x.key === pick.platform);
      clear(typeSel);
      p.types.forEach(t => typeSel.append(h('option', { value: t.key, selected: t.key === pick.type }, t.label)));
      pick.type = typeSel.value;
    };

    const platSel = h('select', { class: 'inp',
      onChange: (e) => { pick.platform = e.target.value; fillTypes(); } },
      PLATFORMS.map(p => h('option', { value: p.key, selected: p.key === pick.platform }, p.name)));
    typeSel.addEventListener('change', () => { pick.type = typeSel.value; });
    fillTypes();

    const statusEl = h('p', { class: 'small muted', style: { margin: '10px 0 0' } });

    modal({
      title: 'File into a platform',
      body: h('div',
        h('p', { class: 'small muted', style: { marginTop: 0 },
          text: 'Creates a draft with this text, and uploads any shared images or video onto it.' }),
        h('div', { class: 'grid g2' },
          h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Platform' }), platSel),
          h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Type' }), typeSel)),
        statusEl),
      actions: [
        { label: 'Cancel' },
        { label: 'Create draft', cls: 'btn-primary', keepOpen: true, onClick: async (close) => {
          const slice = `p_${pick.platform}`;
          const store = S.get(slice);
          store.content = store.content || {};
          store.content[pick.type] = store.content[pick.type] || [];

          const draft = {
            id: uid(),
            title: item.title || '',
            body: [item.text, item.url].filter(Boolean).join('\n\n'),
            status: 'idea', when: '', media: [],
          };

          if (item.files?.length) {
            let n = 0;
            for (const f of item.files) {
              statusEl.textContent = `uploading ${++n} of ${item.files.length}…`;
              try {
                const blob = await blobFor(f);
                if (blob) draft.media.push(await B.uploadMedia(new File([blob], f.name, { type: f.type }), `${pick.platform}/${pick.type}`));
              } catch (e) { toast(e.message || 'One file failed to upload', 3500); }
            }
          }

          store.content[pick.type].unshift(draft);
          S.touch(slice);
          item.filed = true; S.touch('inbox');
          toast('Draft created');
          close();
          draw();
        } },
      ],
    });
  }

  function pasteIn() {
    const box = h('textarea', { class: 'inp tall', rows: 6,
      placeholder: 'Paste a link, a caption, an idea…' });
    modal({
      title: 'Add to the inbox',
      body: h('div',
        box,
        h('p', { class: 'small muted' },
          'On Android, sharing straight into Sid from another app works once Sid is installed to the home screen. iOS does not offer installed web apps in its share sheet, so pasting here is the way in.')),
      actions: [
        { label: 'Cancel' },
        { label: 'Add', cls: 'btn-primary', onClick: () => {
          const v = box.value.trim();
          if (!v) return false;
          addManual(v); draw();
        } },
      ],
    });
  }

  function howTo() {
    return card(
      cardHead('Getting things in here'),
      h('ul', { class: 'prose' },
        h('li', {}, h('strong', { text: 'Android: ' }),
          'install Sid to the home screen, then it appears in the system share sheet. Share a link, a screenshot, a video or selected text from WhatsApp, Gmail, Chrome, Instagram — anywhere.'),
        h('li', {}, h('strong', { text: 'Desktop Chrome or Edge: ' }),
          'install Sid, then the browser share button offers it. Otherwise use Paste.'),
        h('li', {}, h('strong', { text: 'iPhone: ' }),
          'iOS does not let web apps register as share targets, so there is no way around Copy then Paste here. That is an Apple restriction, not something the app can work around.')),
      h('p', { class: 'small muted', style: { marginBottom: 0 } },
        'Shared files are held in the browser until you file them somewhere. They only reach your cloud storage once you attach them to a post.'));
  }

  draw();
  return root;
}

/* ---------------------------------------------------------- */
/*  helpers                                                    */
/* ---------------------------------------------------------- */

async function blobFor(f) {
  try {
    if (!('caches' in window) || !f.key) return null;
    const cache = await caches.open(SHARE_CACHE);
    const res = await cache.match(f.key);
    return res ? await res.blob() : null;
  } catch { return null; }
}

async function removeFiles(item) {
  try {
    if (!('caches' in window) || !item.files?.length) return;
    const cache = await caches.open(SHARE_CACHE);
    for (const f of item.files) if (f.key) await cache.delete(f.key);
  } catch { /* ignore */ }
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url.slice(0, 40); }
}
