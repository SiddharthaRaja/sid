/* ============================================================
   phrasebank.js — the raw material for writing a post

   Nothing here is generated. These are patterns that work,
   written out so that facing a blank caption box is never the
   first problem of the day. Everything is editable in the app;
   this file is only the starting set.
   ============================================================ */

/* ---------- hooks: the first line, which is the whole game ---------- */
/* `pattern` uses [BRACKETS] the same way the copy bank does, so the
   same fillTemplate() substitution works on them. */

export const HOOK_KINDS = [
  ['story',    'Story'],
  ['question', 'Question'],
  ['number',   'Number'],
  ['contrast', 'Contrast'],
  ['confess',  'Confession'],
  ['direct',   'Direct'],
  ['lyric',    'Lyric'],
  ['bts',      'Behind the scenes'],
];

export const HOOKS = [
  /* story */
  { kind: 'story', text: 'I wrote this at 3am and didn\'t tell anyone for [N] months.' },
  { kind: 'story', text: 'This started as a voice note in a [PLACE].' },
  { kind: 'story', text: 'The first version of [SONG] was unrecognisable. Here\'s what changed.' },
  { kind: 'story', text: 'Two years ago I almost deleted this file.' },
  { kind: 'story', text: 'This song exists because of one conversation I nearly didn\'t have.' },
  { kind: 'story', text: 'I made this in the gap between two things falling apart.' },

  /* question */
  { kind: 'question', text: 'Ever had a song stuck in your head that doesn\'t exist yet?' },
  { kind: 'question', text: 'What do you do with a feeling you can\'t name?' },
  { kind: 'question', text: 'Which version do you like better — 1 or 2?' },
  { kind: 'question', text: 'Be honest: does this sound finished to you?' },
  { kind: 'question', text: 'Who else romanticises the [CITY] monsoon a bit too much?' },

  /* number */
  { kind: 'number', text: '3 things nobody tells you about releasing your first single.' },
  { kind: 'number', text: '[N] takes. One of them made it.' },
  { kind: 'number', text: 'It took [N] days to get 8 seconds right.' },
  { kind: 'number', text: '5 sounds in this track you probably missed.' },
  { kind: 'number', text: 'Day [N] of making a song in public.' },

  /* contrast */
  { kind: 'contrast', text: 'Demo vs the final. Sound on.' },
  { kind: 'contrast', text: 'What I wanted it to sound like → what it actually sounds like.' },
  { kind: 'contrast', text: 'Everyone said add drums here. I took them out instead.' },
  { kind: 'contrast', text: 'The version you\'ll hear, and the version that nearly happened.' },

  /* confession */
  { kind: 'confess', text: 'I have no idea if this is any good and I\'m releasing it anyway.' },
  { kind: 'confess', text: 'This is the most honest thing I\'ve written and it terrifies me.' },
  { kind: 'confess', text: 'I\'ve rewritten this caption six times. Here\'s the song.' },
  { kind: 'confess', text: 'Nobody asked for this. Making it anyway.' },

  /* direct */
  { kind: 'direct', text: '[SONG] is out now. Everywhere.' },
  { kind: 'direct', text: 'New song. [DATE]. Save it.' },
  { kind: 'direct', text: 'If you like [COMPS], this one is for you.' },
  { kind: 'direct', text: 'One song. Three years. Out [DATE].' },

  /* lyric */
  { kind: 'lyric', text: '"[LYRIC]" — the line the whole song was built around.' },
  { kind: 'lyric', text: 'This line took the longest: "[LYRIC]"' },
  { kind: 'lyric', text: 'Pick your favourite line. I\'ll tell you which one is mine.' },

  /* behind the scenes */
  { kind: 'bts', text: 'Unreleased. Unmixed. Unhinged.' },
  { kind: 'bts', text: 'The room this was recorded in.' },
  { kind: 'bts', text: 'What a session actually looks like — no montage.' },
  { kind: 'bts', text: 'Watch me ruin a perfectly good take.' },
];

/* ---------- endings ---------- */

export const CTAS = [
  { kind: 'presave',  text: 'Pre-save it — link in bio.' },
  { kind: 'presave',  text: 'Out [DATE]. Pre-save now so it lands in your library the second it drops.' },
  { kind: 'stream',   text: '[SONG] is out now — link in bio.' },
  { kind: 'stream',   text: 'Full song on Spotify, Apple Music and everywhere else.' },
  { kind: 'save',     text: 'Save this. It helps more than a like does.' },
  { kind: 'share',    text: 'If this is someone\'s song, send it to them.' },
  { kind: 'share',    text: 'Repost it to your story and I\'ll send you something unreleased.' },
  { kind: 'engage',   text: 'Tell me in the comments.' },
  { kind: 'engage',   text: 'Which one? 1 or 2.' },
  { kind: 'follow',   text: 'Follow for the rest of it.' },
  { kind: 'playlist', text: 'Add it to a playlist if it fits — that\'s the part that actually matters.' },
];

export const OPENERS = [
  'Okay so —', 'Right.', 'Small update:', 'Been sitting on this.',
  'Two things.', 'Quick one.', 'Genuinely nervous about this one.',
];

export const TRANSITIONS = [
  'Anyway —', 'Which brings me to —', 'The short version:',
  'Here\'s the thing:', 'What I actually mean is —', 'So:',
];

/* ---------- word-level help ---------- */

export const POWER_VERBS = [
  'built', 'broke', 'buried', 'carved', 'chased', 'cracked', 'dragged', 'drowned',
  'gutted', 'hammered', 'held', 'hollowed', 'kept', 'left', 'lost', 'made',
  'pulled', 'ruined', 'salvaged', 'scraped', 'stitched', 'stole', 'wrecked', 'wrote',
];

/* Words that almost always mean the sentence has not been written yet.
   The linter flags them; the synonym list offers a way out. */
export const WEAK = {
  'very':        ['— cut it', 'genuinely', 'painfully'],
  'really':      ['— cut it', 'actually', 'properly'],
  'just':        ['— cut it'],
  'thing':       ['song', 'track', 'record', 'idea', 'part'],
  'stuff':       ['work', 'songs', 'demos', 'material'],
  'amazing':     ['unreal', 'ridiculous', 'the best thing I\'ve made'],
  'excited':     ['nervous', 'terrified', 'can\'t sit still', 'buzzing'],
  'incredible':  ['unreal', 'absurd', 'hard to believe'],
  'beautiful':   ['gorgeous', 'devastating', 'quiet', 'warm'],
  'happy':       ['relieved', 'proud', 'lighter'],
  'sad':         ['hollow', 'flattened', 'heavy', 'blue'],
  'nice':        ['warm', 'gentle', 'easy'],
  'good':        ['worth it', 'right', 'solid'],
  'a lot':       ['more than I expected', 'for months'],
  'literally':   ['— cut it'],
  'basically':   ['— cut it'],
  'honestly':    ['— cut it'],
  'i think':     ['— cut it, say it straight'],
  'i feel like': ['— cut it, say it straight'],
  'guys':        ['you', 'everyone', '— cut it'],
  'so excited to announce': ['— never this. Say the thing.'],
  'without further ado':    ['— never this.'],
  'link in bio':            ['— fine on Instagram and TikTok; on X, Facebook, Threads and YouTube put the real link'],
};

/* Small, honest synonym bank for the words that come up writing about
   music. Not a dictionary — a shortlist you can actually choose from. */
export const SYNONYMS = {
  song: ['track', 'record', 'single', 'thing', 'cut'],
  write: ['wrote', 'made', 'built', 'put together', 'carved out'],
  release: ['out', 'drops', 'lands', 'arrives', 'goes live'],
  listen: ['hear it', 'put it on', 'give it four minutes', 'play it loud'],
  love: ['adore', 'can\'t stop playing', 'keep coming back to'],
  new: ['first', 'unreleased', 'finished', 'just-finished'],
  quiet: ['hushed', 'small', 'close-mic\'d', 'barely there'],
  loud: ['huge', 'blown out', 'maximal', 'wall-of-sound'],
  sad: ['aching', 'hollow', 'blue', 'heavy', 'wistful'],
  happy: ['warm', 'bright', 'giddy', 'sunlit'],
  fast: ['urgent', 'restless', 'driving'],
  slow: ['patient', 'unhurried', 'drifting'],
  fans: ['listeners', 'you lot', 'people who listen', 'anyone who cares'],
  studio: ['room', 'bedroom setup', 'the desk'],
  video: ['visual', 'film', 'clip'],
  producer: ['co-producer', 'the person who made it sound like this'],
};

/* ---------- the shape of a post ---------- */

export const STRUCTURES = [
  { key: 'hbc',    label: 'Hook → body → CTA', note: 'The default. Works on every platform.' },
  { key: 'story',  label: 'Scene → turn → line', note: 'A moment, what changed, the lyric that came out of it.' },
  { key: 'list',   label: 'Number → items → CTA', note: '"3 things…" — easy to read, easy to save.' },
  { key: 'q',      label: 'Question → your answer → theirs', note: 'Engineered for comments.' },
  { key: 'plain',  label: 'One line', note: 'For release day and for stories. Say it and stop.' },
];
