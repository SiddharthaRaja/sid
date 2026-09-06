/* ============================================================
   pitch.js — the Spotify editorial pitch

   The pitch is the single highest-leverage free thing an
   independent artist can do, and the one with the least
   forgiving deadline. Once the release date passes, the form is
   gone: there is no late submission, no appeal, and no second
   chance for that track.
   ============================================================ */

/* The submission window, in days before release. */
export const PITCH_WINDOW = {
  minimum: 7,          // below this, Spotify's own guidance says you have missed it
  recommended: 28,     // what the editorial teams actually ask for
  ideal: 42,
};

/* Spotify's own pitch form asks for these, roughly in this order.
   Writing them here once means the answers are ready to paste
   rather than invented under time pressure at 2am. */
export const PITCH_FIELDS = [
  { key: 'trackTitle', label: 'Which track', hint: 'One unreleased song at a time. Pitching a second one replaces the first.' },
  { key: 'primaryGenre', label: 'Primary genre', hint: 'Spotify lets you pick up to three genre tags. The first one carries the most weight in routing your pitch to an editor.' },
  { key: 'secondaryGenres', label: 'Secondary genres', hint: 'Two more, at most. Be accurate rather than aspirational — a pitch routed to the wrong editor is a wasted pitch.' },
  { key: 'moods', label: 'Moods', hint: 'Up to two. Think about how a listener would use the track, not how you feel about it.' },
  { key: 'styles', label: 'Styles', hint: 'Up to two. Production and arrangement character.' },
  { key: 'instruments', label: 'Instruments', hint: 'The ones a listener would notice, up to three.' },
  { key: 'language', label: 'Language of the lyrics', hint: '' },
  { key: 'culture', label: 'Song culture', hint: 'Optional, and genuinely useful when your music sits in a regional tradition — this is how a track reaches the regional editorial teams rather than only the global ones.' },
  { key: 'isCover', label: 'Cover?', hint: '', kind: 'select', options: ['No', 'Yes'] },
  { key: 'isInstrumental', label: 'Instrumental?', hint: '', kind: 'select', options: ['No', 'Yes'] },
  { key: 'recordedCity', label: 'Recorded in', hint: 'City and country.' },
  { key: 'homeCity', label: 'Home city', hint: 'Where you are based. Drives local and regional playlist consideration.' },
  { key: 'description', label: 'The pitch itself', hint: 'Around 500 characters. This is the whole thing. See the guidance below before writing it.', multiline: true, limit: 500 },
];

/* The promotion checkboxes. Ticking things you are not doing is
   pointless; the editors are matching your plan against the
   traction they would expect from it. */
export const PROMO_OPTIONS = [
  'Paid social advertising',
  'Organic social campaign',
  'Live shows or tour',
  'Press and blog outreach',
  'Radio campaign',
  'Music video',
  'Playlist pitching beyond Spotify',
  'Sync placement',
  'Merch or physical release',
  'Influencer or creator campaign',
];

export const PITCH_INFO = [
{ title: 'The deadline is real', body: `
The pitch form lives in Spotify for Artists under **Music → Upcoming**, and it appears only once your distributor has delivered the track and before the release date arrives.

**Spotify's own minimum is 7 days.** Their editorial teams ask for more, and every editor who has spoken publicly on this says the same thing: pitches arriving inside a week are triaged last, if at all.

| When you pitch | What realistically happens |
|---|---|
| 4-6 weeks out | Read properly. Time to be routed to the right editor and considered for a themed list |
| 2-3 weeks out | Read. Enough time for genre and regional lists |
| 7-13 days out | Read late, considered only if something else falls through |
| Under 7 days | The form may not even be available; assume it did not land |
| After release | The form is gone. There is no late pitch and no appeal |

## The part people do not know

Pitching does something even when no editor picks the track up. A pitched song is **automatically added to the Release Radar** of everyone who follows you and everyone who has saved or repeatedly played your music. An unpitched song is not guaranteed that.

So the pitch is never wasted. Even if you are certain no editor will care, submitting it is the difference between your existing listeners being told the record exists and them finding out by accident.

## One at a time

You can have exactly one unreleased track pitched at any moment. Pitching a second replaces the first. For a single release this is academic; for an EP it means choosing which track is the one, and choosing it early.
` },
{ title: 'How to write the 500 characters', body: `
The description is read by a human editor who has several hundred of these to get through. Everything below follows from that.

## What actually works

**Lead with what it is, not with who you are.** "A five-minute Carnatic-inflected slow build with a solo violin line over programmed drums" tells an editor where the track goes. "I have been making music since I was twelve and this song is very personal to me" tells them nothing they can act on.

**Name real reference points.** Two or three artists an editor would place immediately. Choose ones you genuinely resemble, not ones you admire — an editor who cues up your track expecting one thing and hears another will not finish it.

**Say what is verifiably happening.** Confirmed shows, a music video with a date, an ad budget, a publication that has committed. Numbers if they are decent. Not "we hope to" and not "this is going to be huge".

**Say what is distinctive in one clause.** The instrument, the language, the city, the technique, the collaborator. The thing that is not true of the next four hundred pitches.

**Mention the regional angle if you have one.** Editorial teams are organised regionally as well as by genre. A track from Hyderabad with Carnatic elements has a route into Indian editorial that a generic indie-pop pitch does not.

## What wastes the space

- Your life story, and how long you have been doing this
- Adjectives about the emotion: haunting, raw, honest, authentic
- Comparisons to artists twenty times your size
- Anything you cannot back up
- Thanking the editor, or asking to be added to a specific playlist by name

## A shape that works

> [What it is: genre, tempo, instrumentation, language — one sentence.]
> [The distinctive thing, one clause.]
> [Reference points: sounds like X meets Y.]
> [What is happening around the release: dates, spend, shows, press — one sentence, concrete.]

Four sentences, roughly 400 characters, no wasted words. Write it, leave it a day, cut a third of it.
` },
{ title: 'What happens after', body: `
## You will probably not hear anything

There is no response, no rejection notice and no feedback. The only signal is what appears in Spotify for Artists on release day.

## What to look at on release day and after

**Release Radar** should show up in your source-of-streams breakdown within the first day or two if the pitch went in. If it does not, either the pitch did not land or you have very few followers — both worth knowing.

**Discover Weekly** appears from around the second Monday after release, and it is algorithmic rather than editorial: it responds to save rate and completion rate, not to your pitch. A strong Discover Weekly presence with no editorial placement means the track is working and the pitch simply did not reach the right desk.

**Editorial playlists** show as a named playlist in the source breakdown. If one appears, the single most useful thing you can do is nothing dramatic: do not change the track, do not re-release it, and keep the promotion running so the retention numbers hold. Editors look at whether a placement performs before extending it.

## The number that decides everything downstream

**Save rate.** The proportion of listeners who save the track. Above roughly 20% is strong and pushes the algorithm to keep serving it; in the low single digits, the algorithm stops regardless of who put you on what list.

This is why the pre-save campaign and the ad conversion event both target saves rather than plays. A play is one number. A save is the signal that keeps the record alive after your budget runs out.
` }];
