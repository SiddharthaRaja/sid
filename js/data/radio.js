/* ============================================================
   radio.js — stations, networks and the routes in
   Tier 1 = open door · Tier 2 = needs evidence · Tier 3 = needs money
   ============================================================ */

export const RADIO_SEED = [
  /* ---------- submission portals & directories (start here) ---------- */
  { name: 'BBC Introducing', region: 'UK', type: 'Portal', tier: 1, url: 'https://www.bbc.co.uk/introducing/',
    how: 'Free upload. Genuinely listens to unsigned artists. Worth it if any UK angle exists at all.' },
  { name: 'Amazing Radio', region: 'UK / Global', type: 'Portal', tier: 1, url: 'https://amazingradio.com/',
    how: 'Free submission via amazingtunes.com. Actually plays new independents.' },
  { name: 'Groover — radio channel', region: 'Europe / Global', type: 'Portal', tier: 1, url: 'https://groover.co/en/lp/get-your-music-on-the-radio/submit-music-to-radio/',
    how: '~€2 per submission, guaranteed feedback. The most reliable paid-for-time route.' },
  { name: 'SubmitHub', region: 'Global', type: 'Portal', tier: 1, url: 'https://www.submithub.com/',
    how: '$1–3 per submission. Has radio and blog curators alongside playlists. Realistic hit rate 5–15%.' },
  { name: 'Indie Radio FM', region: 'Global', type: 'Portal', tier: 1, url: 'https://indieradiofm.com/submit-music/',
    how: 'Direct submission portal for independent radio.' },
  { name: 'Streema', region: 'Global', type: 'Directory', tier: 1, url: 'https://streema.com/',
    how: 'Find and email stations by genre and country. This is how you build the list of 30.' },
  { name: 'Radio Garden', region: 'Global', type: 'Directory', tier: 1, url: 'https://radio.garden/',
    how: 'Browse stations geographically — the best tool for diaspora targeting. Spin the globe over New Jersey, Toronto, Dubai, Leicester.' },
  { name: 'Online Radio Box', region: 'Global', type: 'Directory', tier: 1, url: 'https://onlineradiobox.com/',
    how: 'Directory plus playlist tracking of what each station actually played — use it to check whether a station plays anything like you before pitching.' },
  { name: 'Radio.net', region: 'Global', type: 'Directory', tier: 1, url: 'https://www.radio.net/', how: 'Station directory.' },

  /* ---------- India ---------- */
  { name: 'RadioVeRVe', region: 'India', type: 'Internet', tier: 1, url: 'https://www.radioverve.com/',
    how: 'Indian independent music internet radio. Open to unsigned submissions and genuinely listened to by the Indian indie scene.' },
  { name: 'All India Radio / Prasar Bharati', region: 'India', type: 'National', tier: 2, url: 'https://prasarbharati.gov.in/',
    how: 'Has independent and new-music programming. Contact the relevant station\'s programme executive directly — not a general inbox.' },
  { name: 'Radio Mirchi', region: 'India', type: 'Commercial FM', tier: 3, url: 'https://www.radiomirchi.com/',
    how: 'Effectively closed to unsigned artists without a plugger or label relationship. Pitch a specialty show, never the station.' },
  { name: 'Red FM', region: 'India', type: 'Commercial FM', tier: 3, url: 'https://www.redfm.in/', how: 'As above.' },
  { name: 'Radio City', region: 'India', type: 'Commercial FM', tier: 3, url: 'https://www.radiocity.in/',
    how: 'Radio City Freedom has historically had an independent-music strand — that strand, not the main station, is the target.' },
  { name: 'Fever FM', region: 'India', type: 'Commercial FM', tier: 3, url: 'https://www.fever.fm/', how: 'As above.' },
  { name: 'Campus & community radio (India)', region: 'India', type: 'College', tier: 1, url: 'https://streema.com/radios/country/India',
    how: 'The open door. Indian universities run community stations that report playlists. Email the music director by name. Your own campus circuit first.' },

  /* ---------- diaspora-dense markets ---------- */
  { name: 'US college radio (WFMU, KEXP, KCRW and the long tail)', region: 'US', type: 'College', tier: 1, url: 'https://streema.com/radios/country/United_States',
    how: 'Genuinely open, genuinely receptive, and their playlists get reported. Email the music director directly. The long tail of small college stations is where you actually get played.' },
  { name: 'CBC Radio 3 / Canadian campus radio', region: 'Canada', type: 'College', tier: 1, url: 'https://streema.com/radios/country/Canada',
    how: 'Toronto and Brampton campus stations are directly relevant to your diaspora phase.' },
  { name: 'UK student & community radio', region: 'UK', type: 'College', tier: 1, url: 'https://streema.com/radios/country/United_Kingdom',
    how: 'Leicester, Birmingham and East London community stations reach the South Asian diaspora specifically.' },
  { name: 'UAE community & internet radio', region: 'UAE', type: 'Internet', tier: 1, url: 'https://radio.garden/',
    how: 'Dubai has a dense South Asian listenership. Find stations via Radio Garden, check their playlists on Online Radio Box, then email.' },
  { name: 'Australian community radio (Triple J Unearthed)', region: 'Australia', type: 'Portal', tier: 1, url: 'https://www.triplejunearthed.com/',
    how: 'Free upload, real rotation for unsigned artists. Melbourne and Sydney have significant diaspora audiences.' },

  /* ---------- South Asian diaspora broadcast ---------- */
  { name: 'BBC Asian Network', region: 'UK', type: 'National', tier: 2, url: 'https://www.bbc.co.uk/asiannetwork',
    how: 'The single most relevant broadcaster to your diaspora phase — a national UK station whose whole remit is British Asian music, with new-music strands. Route in is BBC Introducing (free upload) plus a direct, specific note to the relevant show. Do not pitch the station; pitch the show.' },
  { name: 'Sunrise Radio', region: 'UK', type: 'Commercial', tier: 2, url: 'https://www.sunriseradio.com/',
    how: 'Long-running UK South Asian station. Find the current music/programming contact on the site — do not send to a general inbox.' },
  { name: 'Lyca Radio', region: 'UK', type: 'Commercial', tier: 2, url: 'https://lycaradio.com/',
    how: 'London South Asian. Same approach — a named programmer, a specific show.' },
  { name: 'RED FM (Canada)', region: 'Canada', type: 'Commercial', tier: 2, url: 'https://www.redfm.ca/',
    how: 'Vancouver and Calgary South Asian. Directly relevant to the Brampton/Surrey diaspora audience.' },
  { name: 'CMR — Canadian Multicultural Radio', region: 'Canada', type: 'Community', tier: 1, url: 'https://cmr1015.com/',
    how: 'Toronto multicultural community radio. Community stations are the open door in Canada — approach the show, not the station.' },
  { name: 'Radio Zindagi', region: 'US', type: 'Commercial', tier: 2, url: 'https://radiozindagi.com/',
    how: 'US South Asian network. Relevant to the Bay Area and New Jersey diaspora clusters.' },
  { name: 'Hum FM 106.2', region: 'UAE', type: 'Commercial', tier: 2, url: 'https://www.humfmdubai.com/',
    how: 'Dubai South Asian. The Gulf diaspora is dense, English-comfortable and high-CPM.' },
  { name: 'City 1016', region: 'UAE', type: 'Commercial', tier: 2, url: 'https://www.city1016.ae/',
    how: 'Dubai Hindi/English. Check what the station actually plays before pitching.' },
  { name: 'Radio 4 FM', region: 'UAE', type: 'Commercial', tier: 2, url: 'https://radio4fm.com/',
    how: 'Dubai, English and Hindi strands.' },
  { name: 'SBS Radio (Hindi / South Asian)', region: 'Australia', type: 'National', tier: 2, url: 'https://www.sbs.com.au/audio',
    how: 'Australia\'s multicultural public broadcaster. Genuinely plays diaspora independent music; approach the language-service producer.' },

  /* ---------- India, English-language ---------- */
  { name: 'Radio Indigo 91.9', region: 'India', type: 'Commercial FM', tier: 2, url: 'https://radioindigo.com/',
    how: 'One of the very few Indian commercial stations with an English-music format (Bangalore, Goa). A rare tier-2 door that is actually open to an English-language Indian independent release.' },

  /* ---------- global independent internet radio ---------- */
  { name: 'KEXP', region: 'US', type: 'Community', tier: 2, url: 'https://www.kexp.org/music/submit-music/',
    how: 'Seattle, listener-supported, globally influential and it publishes a submission route. A long shot for release #1 but the submission costs you ten minutes.' },
  { name: 'WFMU', region: 'US', type: 'Community', tier: 1, url: 'https://wfmu.org/',
    how: 'Freeform, DJ-led, genuinely unpredictable in a good way. Individual DJs choose everything — find the show that fits and write to that DJ.' },
  { name: 'Radio Free Brooklyn', region: 'US', type: 'Community', tier: 1, url: 'https://www.radiofreebrooklyn.org/',
    how: 'Community internet radio, show-by-show. Open door.' },
  { name: 'n10.as', region: 'Global', type: 'Internet', tier: 1, url: 'https://n10.as/', how: 'Independent internet station; community-programmed.' },
  { name: 'NTS Radio', region: 'UK / Global', type: 'Internet', tier: 2, url: 'https://www.nts.live/',
    how: 'Show-by-show, not station-wide. Find the show that plays your lane and approach the host.' },
  { name: 'Worldwide FM', region: 'Global', type: 'Internet', tier: 2, url: 'https://worldwidefm.net/', how: 'As above — pitch the show, not the station.' },
  { name: 'Jango Radio Airplay', region: 'US', type: 'Paid', tier: 3, url: 'https://airplay.jango.com/',
    how: 'Paid guaranteed plays. Low value — treat it as advertising, not radio.' },
];

export const RADIO_INFO = [
{ title: 'How radio actually works', body: `
## The tiers, and why the order matters
Commercial FM in India is effectively closed to unsigned independent artists without a plugger or a label relationship. **Do not waste six weeks there first.** Start at the bottom of the ladder where the door is open, build airplay evidence, then climb.

**Tier 1 — open doors.** College and university radio, community and internet radio, submission portals. Do these at T-20.
**Tier 2 — requires evidence.** Regional FM specialty shows, late-night new-music slots, All India Radio. Pitch the *show*, not the station. From T+30.
**Tier 3 — requires money.** A radio plugger: ₹40k–1.5L per campaign in India, $1,500–5,000 abroad. Only worth it with a track that already has traction. Release #2 or #3.

## The single most useful habit
Before pitching any station, look it up on **Online Radio Box** and read what it actually played this week. If nothing on that list sounds anything like you, do not send the email — you are not being rejected, you are being mis-filed.
` },
{ title: 'What you need before submitting', body: `
- **A clean / radio edit** — under 3:40, no explicit content, tight intro. Radio hates a 25-second build.
- **A radio-ready master.** The -14 LUFS master is fine; some stations want a slightly hotter, more compressed version.
- **The one-sheet** — a single page a programmer can read in 20 seconds.
- **A direct download link** (Dropbox or Drive, WAV + MP3). *Never make a programmer stream it.*
- **PRO registration confirmed.** BMI must have the work registered **before** airplay, or you never see the performance royalty.
- **ISRC embedded in the file metadata.** This is how airplay monitoring identifies your track. Without it, plays are invisible and unpayable.
` },
{ title: 'The one-sheet', body: `
Single page. This exact shape.

> **[ARTIST] — "[SONG]"**
> Release date: [DATE] · Runtime: [X:XX] · Radio edit: [X:XX] · Clean: yes
> Genre: [genre] · Key: [key] · BPM: [bpm]
> ISRC: [ISRC] · UPC: [UPC]
> Label: [label] · Publisher: [publisher] · PRO: BMI
>
> **FOR FANS OF:** [Artist 1] · [Artist 2] · [Artist 3]
>
> [70-word bio]
>
> **WHY THIS TRACK:** Two sentences. What makes it *programmable* — the hook lands at 0:14, it's under 3:30, the chorus is singable, it fits your [daypart/show].
>
> **CAMPAIGN:** Music video, paid social across India/US/UK/CA/UAE, playlist campaign, [X] monthly listeners.
>
> Streaming: [LINK] · Download WAV/MP3: [direct link] · Press photos: [EPK] · Contact: [name, email, phone]
` },
{ title: 'Tracking airplay', body: `
You cannot claim what you cannot see, and stations rarely tell you they played you.

| Tool | Note |
|---|---|
| [Songstats](https://songstats.com/) | Free tier; excellent playlist and chart tracking |
| [Chartmetric](https://chartmetric.com/) | The most complete free tier in the category |
| [Soundcharts](https://soundcharts.com/) | Radio airplay + playlist + social |
| [PlayTreks](https://playtreks.com/) | Airplay monitoring with an affordable tier |
| [Online Radio Box](https://onlineradiobox.com/) | Free — shows what stations actually played |

Without tracking you will never know a station played you, and you cannot tell BMI to go looking for it.
` }];
