/* ============================================================
   epk.js — the press kit
   Assembled from Settings, the Copy bank and your uploads, and
   exported as one self-contained HTML file you can drop in the
   repo next to index.html and send as a link.
   ============================================================ */

import * as S from '../store.js';
import {
  h, clear, uid, btn, card, cardHead, empty, field, subtabs, toast, copy, modal,
  download, esc, fmtDate, confirmDelete, checkbox, selectField,
} from '../ui.js';
import { COPY_BANK, fillTemplate, splitHint } from '../data/templates.js';
import { mediaBlock, notesPanel } from './shared.js';
import { icon } from '../icons.js';

export function renderEpk(sub) {
  const root = h('div');
  const st = S.get('epk');
  const set = S.get('settings');

  st.photos = st.photos || [];
  st.media = st.photos;                    // mediaBlock writes to .media
  st.quotes = st.quotes || [];
  st.downloads = st.downloads || [];
  st.links = st.links || [];
  st.tagline = st.tagline || '';
  st.videoUrl = st.videoUrl || '';
  st.embedUrl = st.embedUrl || '';
  st.showFacts = st.showFacts !== false;

  let tab = ['build', 'preview', 'export'].includes(sub) ? sub : 'build';

  const bioOf = (id) => {
    const cp = S.get('copy');
    const item = COPY_BANK.flatMap(g => g.items).find(i => i.id === id);
    if (!item) return '';
    return (cp.edits && cp.edits[id] !== undefined)
      ? cp.edits[id]
      : splitHint(fillTemplate(item.body, set)).body;
  };

  const draw = () => {
    clear(root);
    st.media = st.photos;

    root.append(h('div', { class: 'page-head' },
      h('div', {},
        h('h1', { text: 'Press kit' }),
        h('div', { class: 'sub', text: 'One page a journalist or curator can open and get everything from.' })),
      h('div', { class: 'spacer' }),
      h('div', { class: 'page-actions' },
        btn('Download epk.html', exportHtml, { cls: 'btn-primary btn-sm', icon: 'upload' }))));

    root.append(subtabs([['build', 'Build'], ['preview', 'Preview'], ['export', 'How to publish it']],
      tab, k => { tab = k; draw(); }));

    if (tab === 'preview') { root.append(previewPane()); return; }
    if (tab === 'export')  { root.append(exportPane()); return; }
    root.append(buildPane());
  };

  /* ---------- build ---------- */

  function buildPane() {
    const box = h('div');
    const missing = readiness();

    box.append(card(
      cardHead('Ready to send?',
        h('span', { class: `tag ${missing.length ? 'warn' : 'ok'}`,
          text: missing.length ? `${missing.length} missing` : 'complete' })),
      missing.length
        ? h('ul', { class: 'prose', style: { margin: 0 } }, missing.map(m => h('li', { text: m })))
        : h('p', { class: 'small muted', style: { margin: 0 } },
            'Everything a curator or journalist asks for is here. Export it and put the link in your bio, your pitches and your one-sheet.')));

    box.append(card(
      cardHead('Header'),
      field('Tagline under your name', st, 'tagline', { slice: 'epk',
        placeholder: 'indie pop · Hyderabad · debut single out 13 November' }),
      h('p', { class: 'small muted' }, 'Artist name, song, city, genre, links and contact all come from Settings. The bios come from the Copy bank — edit them there and this updates.')));

    box.append(card(
      cardHead('Press photos',
        h('span', { class: 'small muted', text: 'high-res, downloadable, 3–5 of them' })),
      mediaBlock(st, 'epk', 'epk/photos')));

    box.append(card(
      cardHead('Listen & watch'),
      h('div', { class: 'grid g2' },
        field('Streaming embed URL', st, 'embedUrl', { slice: 'epk',
          placeholder: 'https://open.spotify.com/embed/track/…' }),
        field('Video URL', st, 'videoUrl', { slice: 'epk',
          placeholder: 'https://www.youtube.com/embed/…' })),
      h('p', { class: 'small muted' }, 'Spotify: Share → Embed track. YouTube: Share → Embed. Paste the src URL, not the whole iframe.')));

    box.append(rowsCard('Direct downloads', st.downloads,
      ['Label', 'URL'], ['label', 'url'],
      'Master WAV · MP3 320 · Instrumental · Cover art · Press photos (zip). Never make a programmer stream it.'));

    box.append(rowsCard('Press quotes', st.quotes,
      ['Quote', 'Source'], ['text', 'source'],
      'Only real ones. An empty press section is better than an invented one.'));

    box.append(rowsCard('Extra links', st.links,
      ['Label', 'URL'], ['label', 'url'],
      'Anything not already in Settings — Bandcamp, a live video, a previous release.'));

    box.append(card(cardHead('Facts table'),
      checkbox('Show the facts table (release date, runtime, ISRC, UPC, label, publisher, PRO)', st, 'showFacts',
        { slice: 'epk', onChange: draw })));

    return box;
  }

  function rowsCard(title, arr, headers, keys, note) {
    const c = card(cardHead(title,
      btn('Add', () => { arr.push(Object.fromEntries(keys.map(k => [k, '']))); S.touch('epk'); draw(); },
        { cls: 'btn-sm', icon: 'plus' })));
    if (note) c.append(h('p', { class: 'small muted', style: { marginTop: '-6px' }, text: note }));
    if (!arr.length) { c.append(h('div', { class: 'small muted', text: 'Nothing added.' })); return c; }
    arr.forEach((row, i) => c.append(h('div', { class: 'row', style: { marginTop: '7px' } },
      keys.map((k, j) => h('input', {
        class: 'inp', style: { flex: j === 0 ? '1' : '1.4' }, placeholder: headers[j],
        value: row[k] || '',
        onInput: e => { row[k] = e.target.value; S.touch('epk'); },
      })),
      h('button', { class: 'icon-btn', html: '&times;',
        onClick: () => { arr.splice(i, 1); S.touch('epk'); draw(); } }))));
    return c;
  }

  /* Bracketed writing prompts still sitting in the bios. */
  function unwritten() {
    const text = bioOf('short-bio') + '\n' + bioOf('long-bio') + '\n' + (st.tagline || '');
    return (text.match(/\[[^\]]{2,}\]/g) || []).length;
  }

  function readiness() {
    const gaps = [];
    if (!set.artist) gaps.push('Artist name — Settings');
    if (!set.song) gaps.push('Song title — Settings');
    if (!set.releaseDate) gaps.push('Release date — Settings');
    if (!set.email) gaps.push('Contact email — Settings');
    if (!set.link) gaps.push('Smart link — Settings');
    if (!bioOf('short-bio').trim()) gaps.push('Short bio — Copy bank');
    if (!bioOf('long-bio').trim()) gaps.push('Long bio — Copy bank');
    const prompts = unwritten();
    if (prompts) gaps.push(`${prompts} unfinished [bracket] prompt${prompts > 1 ? 's' : ''} still in the bios — a journalist would see these`);
    if (!st.photos.length) gaps.push('At least one press photo');
    if (!st.downloads.length) gaps.push('A direct download link (WAV + MP3)');
    if (!st.embedUrl && !st.videoUrl) gaps.push('Something to listen to — an embed or a video');
    return gaps;
  }

  /* ---------- preview ---------- */

  function previewPane() {
    const box = h('div');
    const html = buildHtml({ preview: true });
    const frame = h('iframe', {
      style: { width: '100%', height: '76vh', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', background: '#0e0f12' },
      srcdoc: html,
    });
    box.append(h('p', { class: 'small muted' }, 'Exactly what gets exported. Scroll inside it.'));
    box.append(frame);
    return box;
  }

  /* ---------- export instructions ---------- */

  function exportPane() {
    return card(
      cardHead('Publishing the press kit'),
      h('div', { class: 'prose' },
        h('ol', {},
          h('li', { html: 'Click <strong>Download epk.html</strong>. It is one self-contained file — no images to upload separately unless you are using Firebase Storage, in which case the photos are already hosted.' }),
          h('li', { html: 'Drop it into the same GitHub repo as Sid, next to <code>index.html</code>.' }),
          h('li', { html: 'It is live at <code>https://&lt;your-username&gt;.github.io/sid/epk.html</code>.' }),
          h('li', { html: 'Put that link in: your Instagram bio, every press and curator email, the radio one-sheet, and your Spotify for Artists profile.' })),
        h('p', {}, 'Re-export any time you change something and replace the file. The URL stays the same.'),
        h('blockquote', {}, 'The EPK is what stops a curator having to ask you for anything. Every question they would email you — what does it sound like, who are you, can I have a WAV, is there a photo — is answered before they ask.')));
  }

  /* ---------- the exported page ---------- */

  function buildHtml() {
    const A = esc(set.artist || 'Artist');
    const song = esc(set.song || '');
    const tagline = esc(st.tagline || [set.genre, set.city].filter(Boolean).join(' · '));
    const shortBio = bioOf('short-bio');
    const longBio = bioOf('long-bio');
    const oneLiner = bioOf('oneliner').split('\n')[0];

    const para = (t) => String(t || '').split(/\n{2,}/).filter(x => x.trim())
      .map(p => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');

    const facts = [
      ['Release date', set.releaseDate ? fmtDate(set.releaseDate, { long: true }) : ''],
      ['Genre', set.genre], ['Based in', set.city],
      ['For fans of', (set.comps || '').split('\n')[0]],
      ['ISRC', set.isrc], ['UPC', set.upc],
      ['Label', set.label], ['Publisher', set.publisher], ['PRO', set.pro],
    ].filter(([, v]) => String(v || '').trim());

    const photos = st.photos.filter(m => m.kind === 'image');

    const links = [
      set.link ? { label: 'Listen everywhere', url: set.link } : null,
      ...st.links.filter(l => l.url),
    ].filter(Boolean);

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${A}${song ? ` — “${song}” — Press Kit` : ' — Press Kit'}</title>
<meta name="description" content="${esc(oneLiner || shortBio.slice(0, 150))}">
<meta property="og:title" content="${A}${song ? ` — “${song}”` : ''}">
<meta property="og:description" content="${esc(oneLiner || shortBio.slice(0, 150))}">
${photos[0] ? `<meta property="og:image" content="${esc(photos[0].url)}">` : ''}
<style>
:root{
  --accent:#e0603a; --bg:#0e0f12; --bg-2:#16181d; --line:#272b33;
  --fg:#e9e7e3; --fg-2:#a5a49f; --fg-3:#6f7178;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif;
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  color-scheme:dark;
}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.65 var(--sans);-webkit-font-smoothing:antialiased}
.wrap{max-width:760px;margin:0 auto;padding:56px 22px 90px}
a{color:var(--accent)}
h1{font-size:clamp(30px,7vw,46px);margin:0;letter-spacing:-.025em;line-height:1.05}
h2{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--fg-3);
   margin:52px 0 14px;font-weight:600}
p{margin:0 0 1em;color:var(--fg-2)}
.tag{color:var(--fg-3);font-size:14px;margin-top:12px}
.song{color:var(--accent);font-size:19px;margin-top:6px;font-weight:500}
.lede{color:var(--fg);font-size:17px;line-height:1.6;margin-top:26px}
hr{border:0;height:1px;background:var(--line);margin:0}
.btns{display:flex;flex-wrap:wrap;gap:9px;margin:26px 0 0}
.btn{display:inline-block;padding:9px 16px;border-radius:9px;border:1px solid var(--line);
  background:var(--bg-2);color:var(--fg);text-decoration:none;font-size:14px;font-weight:500}
.btn:hover{border-color:var(--fg-3)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}
.grid img{width:100%;border-radius:10px;display:block;border:1px solid var(--line)}
table{width:100%;border-collapse:collapse;font-size:14px}
td{padding:9px 0;border-bottom:1px solid var(--line);vertical-align:top}
td:first-child{color:var(--fg-3);width:38%;font-size:13px}
td.mono{font-family:var(--mono);font-size:13px}
blockquote{margin:0 0 18px;padding:14px 18px;background:var(--bg-2);border-left:2px solid var(--accent);
  border-radius:0 9px 9px 0;color:var(--fg)}
blockquote cite{display:block;margin-top:8px;color:var(--fg-3);font-size:13px;font-style:normal}
iframe{width:100%;border:0;border-radius:10px}
.dl{display:flex;flex-direction:column;gap:8px}
.dl a{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 15px;
  background:var(--bg-2);border:1px solid var(--line);border-radius:10px;color:var(--fg);
  text-decoration:none;font-size:14px}
.dl a:hover{border-color:var(--accent)}
.dl span{color:var(--fg-3);font-size:12px}
footer{margin-top:64px;padding-top:22px;border-top:1px solid var(--line);color:var(--fg-3);font-size:13px}
footer a{color:var(--fg-2)}
@media print{
  body{background:#fff;color:#000}
  .wrap{padding:0;max-width:none}
  a,h1{color:#000} h2{color:#555}
  p{color:#222} .btn,iframe{display:none}
  td{border-color:#ddd} blockquote{background:#f4f4f4;color:#000}
}
</style>
</head>
<body>
<div class="wrap">

  <header>
    <h1>${A}</h1>
    ${song ? `<div class="song">“${song}”${set.releaseDate ? ` — out ${esc(fmtDate(set.releaseDate, { long: true }))}` : ''}</div>` : ''}
    ${tagline ? `<div class="tag">${tagline}</div>` : ''}
    ${shortBio ? `<div class="lede">${esc(shortBio.split(/\n{2,}/)[0])}</div>` : ''}
    <div class="btns">
      ${links.map((l, i) => `<a class="btn${i === 0 ? ' primary' : ''}" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('')}
      ${set.email ? `<a class="btn" href="mailto:${esc(set.email)}">Contact</a>` : ''}
    </div>
  </header>

  ${st.embedUrl || st.videoUrl ? `<h2>Listen</h2>
  ${st.embedUrl ? `<iframe src="${esc(st.embedUrl)}" height="152" loading="lazy" allow="encrypted-media"></iframe>` : ''}
  ${st.videoUrl ? `<div style="margin-top:12px"><iframe src="${esc(st.videoUrl)}" height="380" loading="lazy" allowfullscreen></iframe></div>` : ''}` : ''}

  ${longBio ? `<h2>Biography</h2>${para(longBio)}` : ''}

  ${st.quotes.filter(q => q.text).length ? `<h2>Press</h2>
  ${st.quotes.filter(q => q.text).map(q =>
    `<blockquote>“${esc(q.text)}”${q.source ? `<cite>— ${esc(q.source)}</cite>` : ''}</blockquote>`).join('')}` : ''}

  ${photos.length ? `<h2>Press photos</h2>
  <div class="grid">${photos.map(p =>
    `<a href="${esc(p.url)}" target="_blank" rel="noopener"><img src="${esc(p.url)}" alt="${A}" loading="lazy"></a>`).join('')}</div>
  <p style="font-size:13px;color:var(--fg-3);margin-top:10px">Click any photo for the full-resolution file. Free to use with credit.</p>` : ''}

  ${st.downloads.filter(d => d.url).length ? `<h2>Downloads</h2>
  <div class="dl">${st.downloads.filter(d => d.url).map(d =>
    `<a href="${esc(d.url)}" target="_blank" rel="noopener"><span style="color:var(--fg)">${esc(d.label || 'Download')}</span><span>open ↗</span></a>`).join('')}</div>` : ''}

  ${st.showFacts && facts.length ? `<h2>The facts</h2>
  <table>${facts.map(([k, v]) =>
    `<tr><td>${esc(k)}</td><td${/ISRC|UPC/.test(k) ? ' class="mono"' : ''}>${esc(v)}</td></tr>`).join('')}</table>` : ''}

  <footer>
    ${set.email ? `Contact: <a href="mailto:${esc(set.email)}">${esc(set.email)}</a><br>` : ''}
    ${set.handle ? `${esc(set.handle)} everywhere<br>` : ''}
    ${set.link ? `<a href="${esc(set.link)}">${esc(set.link)}</a>` : ''}
  </footer>

</div>
</body>
</html>`;
  }

  function doExport() {
    download('epk.html', buildHtml(), 'text/html');
    toast('Downloaded epk.html — drop it in your repo');
  }

  function exportHtml() {
    const n = unwritten();
    if (!n) return doExport();
    modal({
      title: 'The bios still have writing prompts in them',
      body: h('div',
        h('p', { class: 'small muted' },
          `${n} bracketed prompt${n > 1 ? 's are' : ' is'} still unwritten in your short or long bio — things like [the defining element] or [influence 1]. They will appear verbatim on the page a journalist opens.`),
        h('p', { class: 'small muted' },
          'Finish them in the Copy bank under Bios, then export. Or export anyway if you are only checking the layout.')),
      actions: [
        { label: 'Open the Copy bank', onClick: () => { location.hash = '#/copy/Bios'; } },
        'spacer',
        { label: 'Export anyway', cls: 'btn-danger btn-ghost', onClick: doExport },
      ],
    });
  }

  draw();
  return root;
}
