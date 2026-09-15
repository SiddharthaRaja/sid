/* ============================================================
   runsheet.js — the release itself, hour by hour

   The master plan says what to do this month. This says what to
   do at 09:00. Times are local and assume a Friday release, which
   goes live at midnight in each territory — so in India the song
   is up at 00:00 IST on the Friday, not at some other hour.
   ============================================================ */

/* day: -1 = Thursday evening, 0 = release day, 1 = the morning after.
   at: 24h local time. mins: how long it actually takes. */

export const RUN_SEED = [
  /* ---------------- the night before ---------------- */
  { id: 'r01', day: -1, at: '19:00', mins: 20, title: 'Final check that the release is delivered',
    detail: 'Distributor dashboard: status "delivered" or "live", not "processing". If it is not delivered by tonight it will not be live tomorrow, and that is a conversation to have now rather than at 6am.', where: 'DistroKid' },
  { id: 'r02', day: -1, at: '19:30', mins: 15, title: 'Everything scheduled is actually scheduled',
    detail: 'Open the queue and confirm every post dated tomorrow is written, has its media attached, and has no [placeholders] left in it.', where: 'Sid → Today' },
  { id: 'r03', day: -1, at: '20:00', mins: 30, title: 'Personal messages queued, not sent',
    detail: 'Write the individual messages to the people who will actually push it. Do not send them tonight — they land tomorrow morning, individually, never as a broadcast.', where: 'Sid → Contacts' },
  { id: 'r04', day: -1, at: '20:30', mins: 10, title: 'Phone set up',
    detail: 'Everything you post from tomorrow logged in on the phone. Charger packed. Storage free for recording.', where: '' },
  { id: 'r05', day: -1, at: '21:00', mins: 5, title: 'Sleep',
    detail: 'You cannot fix anything between midnight and 7am that will not still be fixable at 7am. The single most common release-day mistake is being exhausted for the part that matters.', where: '' },

  /* ---------------- release day ---------------- */
  { id: 'r10', day: 0, at: '00:05', mins: 10, title: 'Confirm it is live', critical: true,
    detail: 'Spotify, Apple Music, YouTube Music. Search the exact title. If one is missing it usually appears within a few hours — do not panic-message the distributor before 09:00.', where: 'Each app' },
  { id: 'r11', day: 0, at: '00:15', mins: 5, title: 'Check the smart link resolves',
    detail: 'Open it on mobile data, not wifi, and click through to at least two platforms. A broken link at 00:15 costs you the whole day.', where: 'Your smart link' },
  { id: 'r12', day: 0, at: '00:20', mins: 5, title: 'Save it yourself, from your own account',
    detail: 'And listen to the whole thing through once. Completion counts.', where: 'Spotify' },

  { id: 'r20', day: 0, at: '07:30', mins: 20, title: 'The Canvas and the Artist Pick',
    detail: 'Upload the Canvas if it is not already on. Set the Artist Pick to this song with the one line you wrote. Both are mobile-app jobs and both take two minutes.', where: 'Spotify for Artists' },
  { id: 'r21', day: 0, at: '08:00', mins: 30, title: 'Send the personal messages', critical: true,
    detail: 'One at a time, each one different, each one naming the person. Forty individual messages outperform four thousand broadcast impressions and it is not close. This is the highest-value hour of the entire release.', where: 'WhatsApp / DM' },
  { id: 'r22', day: 0, at: '08:45', mins: 10, title: 'Email the list',
    detail: 'The release-day email. Short. One link. One ask.', where: 'Sid → Mailing list' },

  { id: 'r30', day: 0, at: '09:00', mins: 15, title: 'First post — the main one', critical: true,
    detail: 'Instagram feed or Reel, whichever you made. This is the anchor everything else points at.', where: 'Instagram' },
  { id: 'r31', day: 0, at: '09:15', mins: 10, title: 'Story sequence + link sticker',
    detail: 'Three to five frames: it is out, what it is, the link. Link sticker on the last one and on the first.', where: 'Instagram stories' },
  { id: 'r32', day: 0, at: '09:30', mins: 10, title: 'X, Threads, Bluesky, Facebook',
    detail: 'Real links, not "link in bio" — those platforms make links clickable and you are throwing away the clicks otherwise.', where: 'Sid → Today' },
  { id: 'r33', day: 0, at: '10:00', mins: 15, title: 'YouTube: video or lyric video live',
    detail: 'Check the description first line, the pinned comment, and that the thumbnail rendered rather than defaulting to a frame.', where: 'YouTube' },

  { id: 'r40', day: 0, at: '11:00', mins: 20, title: 'Verify it on the platforms that lag',
    detail: 'Shazam, TikTok audio library, Instagram audio, YouTube Music. These fill in through the day; note which are missing and check again this evening rather than every twenty minutes.', where: '' },
  { id: 'r41', day: 0, at: '12:00', mins: 10, title: 'Reply to everything',
    detail: 'Every comment, every story reply, every share. Reply within the hour all day — engagement in the first hours is weighted heavily on every platform, and a reply is a second notification to that person.', where: '' },

  { id: 'r50', day: 0, at: '13:00', mins: 20, title: 'Repost everyone who shared',
    detail: 'To your story, with their handle. This is the cheapest way to get the next person to share, and it makes the first ones feel seen.', where: 'Instagram stories' },
  { id: 'r51', day: 0, at: '15:00', mins: 15, title: 'Switch the ads from pre-save to stream',
    detail: 'The pre-save creative is now wrong and is spending money sending people to a dead page.', where: 'Sid → Paid ads' },
  { id: 'r52', day: 0, at: '17:00', mins: 20, title: 'Second post, different angle',
    detail: 'Not "still out" — a different piece of content. The clip, the lyric, the story behind one line.', where: '' },

  { id: 'r60', day: 0, at: '19:00', mins: 15, title: 'TikTok / Shorts post',
    detail: 'Evening is when short-form moves. Hook in frame one, burned-in text, your own audio.', where: 'TikTok + Shorts' },
  { id: 'r61', day: 0, at: '21:00', mins: 15, title: 'Screenshot every number', critical: true,
    detail: 'Spotify for Artists, Instagram insights, YouTube, the link clicks. Day-one numbers are gone from most dashboards within a week and you will want them for the post-mortem.', where: 'Sid → Statistics' },
  { id: 'r62', day: 0, at: '21:30', mins: 10, title: 'Thank-you story',
    detail: 'Whatever actually happened. Numbers optional — honesty converts better than a screenshot of a big figure.', where: 'Instagram stories' },
  { id: 'r63', day: 0, at: '22:00', mins: 10, title: 'Write down how it felt',
    detail: 'Three lines, in Notes. You will not remember this accurately in a month, and the T+90 post-mortem is worth more with it.', where: 'Sid → Notes' },

  /* ---------------- the morning after ---------------- */
  { id: 'r70', day: 1, at: '09:00', mins: 15, title: 'Log day-one numbers properly',
    detail: 'Streams, saves, listeners, followers gained, link clicks. Saves divided by listeners is the number that predicts whether the algorithm picks it up — not the stream count.', where: 'Sid → Statistics' },
  { id: 'r71', day: 1, at: '09:30', mins: 20, title: 'Follow up with everyone who shared',
    detail: 'A real thank-you, individually. These are the first members of the street team for the next one.', where: '' },
  { id: 'r72', day: 1, at: '10:00', mins: 15, title: 'Check "Discovered on"',
    detail: 'Any playlist already carrying you goes into the Playlists tab today, while it is easy to find.', where: 'Spotify for Artists' },
  { id: 'r73', day: 1, at: '10:30', mins: 10, title: 'Claim the Apple Music and Amazon artist profiles',
    detail: 'Only possible once a release is live. Do it now, before it drops off the list.', where: '' },
  { id: 'r74', day: 1, at: '11:00', mins: 10, title: 'Post once more, then stop',
    detail: 'One post on day two, and then back to the plan. The release is not over; the frantic part is.', where: '' },
];

export const RUN_NOTES = [
  'A Friday release goes live at midnight in each territory, not at a single global moment. In India that is 00:00 IST Friday.',
  'Nothing on this list is worth doing badly at 3am. The 00:05 checks exist so that a genuine problem has eight hours of daylight to be fixed in.',
  'The 08:00 hour of individual messages is, measurably, the highest-value hour of the release. If the day falls apart, protect that one.',
  'Reply to everything for the first twelve hours. Engagement in the first hours is weighted on every platform, and every reply is a second notification.',
  'If something is not live by 09:00, message the distributor once with the UPC and the ISRC, then carry on. Chasing it hourly changes nothing.',
];
