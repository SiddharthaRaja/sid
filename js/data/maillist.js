/* ============================================================
   maillist.js — the only audience you actually own

   Every platform in this app is rented. The list is not: it works
   when an algorithm changes, when an account is locked, and when
   a platform dies. Free-tier limits checked September 2026 and
   they move constantly — confirm before signing up.
   ============================================================ */

export const PROVIDERS = [
  { key: 'kit',        name: 'Kit (formerly ConvertKit)', free: '10,000 subscribers',
    note: 'The most generous free tier by a distance, and built for creators rather than shops. Sending is limited on free but the cap is the thing that matters at your size.',
    good: 'The default choice unless you have a reason not to.' },
  { key: 'buttondown', name: 'Buttondown', free: '~100 subscribers',
    note: 'Plain text, no bloat, writes like an email from a person. Paid quickly, but cheap.',
    good: 'If you want the newsletter to feel like a letter, not a campaign.' },
  { key: 'beehiiv',    name: 'beehiiv', free: '2,500 subscribers',
    note: 'Built around growth — a recommendation network and referral program baked in.',
    good: 'If you plan to treat the newsletter as its own audience, not just a release announcement.' },
  { key: 'emailoctopus', name: 'EmailOctopus', free: '2,500 contacts',
    note: 'Cheap and unfussy, sends over Amazon SES on paid plans.',
    good: 'A middle option with no lock-in.' },
  { key: 'mailerlite', name: 'MailerLite', free: '500 contacts',
    note: 'Good landing pages and forms, small free cap.',
    good: 'If you want the signup page and the emails in one place.' },
  { key: 'mailchimp',  name: 'Mailchimp', free: '500 contacts',
    note: 'The famous one, now the most restrictive and the most expensive as you grow.',
    good: 'Hard to justify in 2026 unless you are already on it.' },
];

/* Where signups actually come from, in rough order of how well
   they convert for a musician. */
export const SOURCE_SEED = [
  { id: 'presave',  name: 'Pre-save gate',        note: 'The single best source — people already reaching for the song. Ask for the email as part of the pre-save.', on: true, count: 0 },
  { id: 'bio',      name: 'Link in bio',          note: 'Second item in the smart link, under the song. Never above it.', on: true, count: 0 },
  { id: 'site',     name: 'Website footer',       note: 'And at the end of the scroll, where someone who read the whole thing lands.', on: true, count: 0 },
  { id: 'unreleased', name: 'Unreleased track gate', note: 'The highest-converting offer you have: a demo or an alternate version for an email address.', on: false, count: 0 },
  { id: 'live',     name: 'QR code at shows',     note: 'Printed on the set list, on a card at the merch table, on the poster. Live is where the most committed people already are.', on: false, count: 0 },
  { id: 'merch',    name: 'Merch insert',         note: 'A card in every parcel. They already paid you money — they will give you an email.', on: false, count: 0 },
  { id: 'dm',       name: 'Asked directly',       note: 'The first fifty come from people you can name. Message them.', on: false, count: 0 },
];

/* The five emails worth writing, in order. */
export const SEND_TEMPLATES = [
  { key: 'welcome', name: 'Welcome', when: 'automatic, on signup',
    body: `Hey — thanks for this.

You're on the short list now. That means you hear things before they're out, and you get the versions nobody else gets.

Here's [SONG], if you haven't: [LINK]

I'll email when there's something real. Not otherwise.

— [ARTIST]` },
  { key: 'announce', name: 'The announcement', when: 'T-21',
    body: `[SONG] is out on [DATE].

[One sentence about what it is. Not a press release — the thing you'd say to a friend.]

Pre-save it here and it lands in your library the second it drops: [LINK]

That one click is genuinely the most useful thing anyone can do for a song on release day.

— [ARTIST]` },
  { key: 'releaseday', name: 'Release day', when: 'T, 09:00',
    body: `It's out.

[LINK]

If it does something for you: save it, or send it to one person who'd get it. That's the whole ask.

Thank you for being here early.

— [ARTIST]` },
  { key: 'story', name: 'The story behind it', when: 'T+10',
    body: `A few people asked where [SONG] came from.

[The actual story. Specific, three paragraphs maximum. A photo of the room, a screenshot of the demo, the voice note.]

This is the sort of thing that only goes out here.

— [ARTIST]` },
  { key: 'ask', name: 'The one real ask', when: 'T+30, sparingly',
    body: `Short one.

[The specific thing: add it to a playlist, come to the show on [DATE], the merch is up.]

That's it. Back to normal next time.

— [ARTIST]` },
];

export const LIST_RULES = [
  'Ask for the email in exchange for something — an unreleased track, an early listen. "Sign up for updates" converts at almost nothing.',
  'Email less than you think. Five a year that people open beats monthly ones they do not.',
  'One ask per email. Two asks is zero asks.',
  'Plain text outperforms a designed template for an artist. It reads as a person writing, which is the entire advantage you have over a label.',
  'Never buy a list, never import people who did not ask. One spam complaint per thousand is the threshold where providers start throttling you.',
  'Export the list to CSV every month and keep it in your Drive. The provider is rented too.',
  'Indian senders: you still fall under the recipient\'s law, so keep an unsubscribe link in every send — it is required for anyone on your list in the EU or US, and it is how you avoid the spam folder anyway.',
];
