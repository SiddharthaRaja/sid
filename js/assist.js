/* ============================================================
   assist.js — optional AI help, off unless you turn it on

   Sid has no server, so there is no free way to generate text.
   If you paste your own API key it is used directly from the
   browser and stored in localStorage on this device only —
   never in Firestore, never synced, never in a backup export.
   Everything else in the app works without it.
   ============================================================ */

const KEY = 'sid.assistKey';
const MODEL = 'sid.assistModel';
const DEFAULT_MODEL = 'claude-sonnet-4-5';

export const hasKey = () => !!localStorage.getItem(KEY);
export const getModel = () => localStorage.getItem(MODEL) || DEFAULT_MODEL;
export const setModel = (m) => localStorage.setItem(MODEL, m || DEFAULT_MODEL);

export function setKey(k) {
  if (k) localStorage.setItem(KEY, k.trim());
  else localStorage.removeItem(KEY);
}
export const keyHint = () => {
  const k = localStorage.getItem(KEY) || '';
  return k ? `${k.slice(0, 7)}…${k.slice(-4)}` : '';
};

/** One call. Returns the text, or throws something readable. */
export async function ask(prompt, { system = '', maxTokens = 900 } = {}) {
  const key = localStorage.getItem(KEY);
  if (!key) throw new Error('No API key set. Settings → Appearance → Writing assistant.');

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: getModel(),
        max_tokens: maxTokens,
        system: system || undefined,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch {
    throw new Error('Could not reach the API — check your connection.');
  }

  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error?.message || ''; } catch {}
    if (res.status === 401) throw new Error('That API key was rejected.');
    if (res.status === 429) throw new Error('Rate limited — wait a moment and try again.');
    if (res.status === 400 && /credit|balance/i.test(detail)) throw new Error('The account behind that key has no credit.');
    throw new Error(detail || `The API returned ${res.status}.`);
  }

  const data = await res.json();
  return (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
}

/* ---------- the prompts, in one place so they can be tuned ---------- */

const voice = (set) => [
  set.artist ? `The artist is ${set.artist}.` : '',
  set.song ? `The song is "${set.song}".` : '',
  set.genre ? `Genre: ${set.genre}.` : '',
  set.city ? `Based in ${set.city}.` : '',
  set.comps ? `For fans of: ${set.comps}.` : '',
].filter(Boolean).join(' ');

const SYSTEM = (set) =>
  `You help an independent musician write social copy for their own release. ${voice(set)}
Write the way a person actually talks. No marketing voice, no "thrilled to announce", no emoji unless asked, no hashtags unless asked.
Never invent facts about the song, the recording or the artist's life — if a detail is needed, leave a [bracket] for them to fill.
Answer with the requested text only: no preamble, no explanation, no numbering unless asked for a list.`;

export const variations = (text, n, platform, set) =>
  ask(`Rewrite this ${platform} caption ${n} different ways. Keep the meaning and any facts; vary the angle, the opening and the length. Return them separated by a line containing only ---.\n\n${text}`,
    { system: SYSTEM(set), maxTokens: 1200 });

export const tighten = (text, set) =>
  ask(`Cut this caption down without losing anything that matters. Remove filler, keep the voice. Return the caption only.\n\n${text}`,
    { system: SYSTEM(set) });

export const hooks = (about, set) =>
  ask(`Give 8 possible first lines for a post about: ${about}. One per line, no numbering. Each under 90 characters. Vary the approach — story, question, number, confession, contrast.`,
    { system: SYSTEM(set) });

export const tagIdeas = (text, platform, set) =>
  ask(`Suggest hashtags for this ${platform} post. Give 8, one per line, no #, ordered from most niche to most broad, and after each put " — niche", " — mid" or " — big" for its rough size. Relevant to the actual content and genre, not generic music tags.\n\n${text}`,
    { system: SYSTEM(set), maxTokens: 400 });

export const ytDescription = (about, set) =>
  ask(`Write a YouTube description for: ${about}. First two lines carry the hook and the link placeholder [LINK]. Then credits as [bracket] placeholders, then a lyrics section header, then 4 hashtags. Keep it under 1200 characters.`,
    { system: SYSTEM(set), maxTokens: 900 });

export const keywords = (set) =>
  ask(`List 20 search phrases a listener might actually type that should lead to this artist. One per line, no numbering, lowercase, no hashtags. Mix genre, mood, occasion, city/scene and "artists like X" phrasings.`,
    { system: SYSTEM(set), maxTokens: 500 });
