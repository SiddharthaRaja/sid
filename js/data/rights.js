/* ============================================================
   rights.js — registrations, country-by-country copyright,
   and the reference sections
   ============================================================ */

export const REGISTRATIONS_SEED = [
  { id: 'split',  name: 'Split sheet signed by every contributor', body: 'Composition', when: 'T-90', cost: 'Free', who: 'You', done: false,
    note: 'One page, signed and dated: title, every contributor\'s legal name, PAN/SSN, PRO, role, and % of the composition. Must total 100%. No split sheet = no release.' },
  { id: 'bmi',    name: 'BMI — writer affiliation', body: 'Composition (performance)', when: 'T-75', cost: 'Free', who: 'BMI', done: false,
    note: 'Free for writers, accepts non-US residents, and accepts you pre-release. You may only belong to ONE PRO worldwide.', url: 'https://www.bmi.com/join/' },
  { id: 'songtrust', name: 'Songtrust — publishing administration', body: 'Composition (publisher share)', when: 'T-60', cost: '$100 + 15%/20%', who: 'Songtrust', done: false,
    note: 'Collects the publisher side in ~245 territories including IPRS by reciprocal agreement. Without it you leave 30–50% of publishing on the table.', url: 'https://www.songtrust.com/' },
  { id: 'soundex', name: 'SoundExchange — featured artist', body: 'Master (digital performance)', when: 'T-60', cost: 'Free', who: 'SoundExchange', done: false,
    note: 'Register as BOTH featured artist AND sound recording copyright owner — two separate registrations, and you are both.', url: 'https://www.soundexchange.com/' },
  { id: 'soundex2', name: 'SoundExchange — rights owner', body: 'Master (digital performance)', when: 'T-60', cost: 'Free', who: 'SoundExchange', done: false,
    note: 'The second of the two. Upload W-8BEN immediately or 30% is withheld.', url: 'https://www.soundexchange.com/' },
  { id: 'mlc',    name: 'The MLC — US mechanicals', body: 'Composition (mechanical)', when: 'T-45', cost: 'Free', who: 'The MLC', done: false,
    note: 'If Songtrust is your publisher, Songtrust registers with MLC on your behalf — confirm, and do not double-register.', url: 'https://www.themlc.com/' },
  { id: 'work',   name: 'Register the work with BMI (title, writers, splits, ISRC)', body: 'Composition', when: 'T-30', cost: 'Free', who: 'BMI', done: false,
    note: 'Only possible once the ISRC and confirmed release date exist.' },
  { id: 'inmus',  name: 'India copyright — musical work (Form XIV)', body: 'Composition', when: 'T-30', cost: '₹500', who: 'Copyright Office India', done: false,
    note: '30-day objection window, then examination. ~4–8 months total. Does not block release.', url: 'https://copyright.gov.in/' },
  { id: 'inlit',  name: 'India copyright — literary work (lyrics)', body: 'Lyrics', when: 'T-30', cost: '₹500', who: 'Copyright Office India', done: false,
    note: 'Filed separately from the music.', url: 'https://copyright.gov.in/' },
  { id: 'inrec',  name: 'India copyright — sound recording', body: 'Master', when: 'T-20', cost: '₹2,000', who: 'Copyright Office India', done: false,
    note: 'File after the master is final.', url: 'https://copyright.gov.in/' },
  { id: 'uscr',   name: 'US copyright registration (eCO)', body: 'Both', when: 'T-15', cost: '$45 / $65', who: 'US Copyright Office', done: false,
    note: 'Single Application $45 if one work, one author, sole claimant. Standard $65 if there is a co-writer or you are registering composition and recording together. Register within 3 months of publication to preserve statutory damages.', url: 'https://eco.copyright.gov/' },
  { id: 'isra',   name: 'ISRA — Indian Singers\' Rights Association', body: 'Performer rights', when: 'T+30', cost: 'Free / nominal', who: 'ISRA', done: false,
    note: 'Performers\' rights for singers in India. Worth joining as a vocalist — separate from PRO membership.', url: 'https://www.isra.org.in/' },
  { id: 'verify', name: 'Verify the work in BMI repertory, MLC public database and Songtrust', body: 'Composition', when: 'T+7', cost: 'Free', who: 'You', done: false,
    note: 'If it is not there within 30 days, chase it.' },
];

export const COUNTRY_COPYRIGHT = [
  { country: 'India', registry: 'Copyright Office (Form XIV)', need: 'Optional — protection is automatic',
    cost: '₹500 music · ₹500 lyrics · ₹2,000 recording', why: 'Cheap and genuinely useful for domestic enforcement. Do it.', url: 'https://copyright.gov.in/' },
  { country: 'United States', registry: 'US Copyright Office (eCO)', need: 'Optional — but unlocks statutory damages',
    cost: '$45 single · $65 standard', why: 'The only registry that materially changes your legal position. Worth it if you expect any US exploitation, sync or infringement risk.', url: 'https://www.copyright.gov/registration/' },
  { country: 'United Kingdom', registry: 'No official registry', need: 'None',
    cost: '—', why: 'Automatic under the Berne Convention. Private "copyright registration" services here sell you nothing a dated file does not.', url: 'https://www.gov.uk/copyright' },
  { country: 'European Union', registry: 'No official registry', need: 'None', cost: '—',
    why: 'Automatic. Your Indian and US registrations are recognised across all Berne signatories.', url: '' },
  { country: 'Canada', registry: 'CIPO', need: 'Optional', cost: '~CAD 50',
    why: 'A certificate of registration is useful evidence but rarely worth it for a first single.', url: 'https://ised-isde.canada.ca/site/canadian-intellectual-property-office/en/copyrights' },
  { country: 'China', registry: 'CPCC / NCAC', need: 'Optional', cost: 'Varies',
    why: 'Only relevant if you pursue sync or licensing in China directly. Tencent delivery does not require it.', url: '' },
  { country: 'Everywhere else', registry: 'Berne Convention', need: 'None', cost: '—',
    why: '181 countries. Copyright exists the moment the work is fixed in tangible form. Registration buys evidence and enforcement power, never the right itself.', url: '' },
];

export const RIGHTS_INFO = [
{ title: 'What you actually own', body: `
## Two copyrights, and you own both

**① The COMPOSITION** — the song itself: melody, lyrics, chords. You are the *songwriter* and, absent a publishing deal, also the *publisher*.

**② The SOUND RECORDING / MASTER** — the specific recorded performance. You are the *artist* and the *label*.

Because you own both, you can grant a **one-stop licence** — which makes you *more* attractive to music supervisors than a label artist.

## Five money streams flow from these

| # | Stream | From | Collected by | Side |
|---|---|---|---|---|
| 1 | Master streaming royalties | Spotify, Apple, YouTube Music | **DistroKid** → you | Master |
| 2 | Performance royalties | Streaming's public-performance share, radio, TV, venues | **BMI** (writer) + **Songtrust** (publisher) | Composition |
| 3 | Mechanical royalties | Interactive streams + downloads (US) | **The MLC** (via Songtrust) | Composition |
| 4 | Global mechanicals + performance | ~245 foreign territories | **Songtrust** | Composition |
| 5 | Digital performance (non-interactive) | SiriusXM, Pandora radio, webcasters | **SoundExchange** | Master |

Miss any one of these and you simply never see that money. There is no retroactive sweep beyond a few years.
` },
{ title: 'BMI vs IPRS — the one big decision', body: `
## You can only belong to ONE performing rights organisation in the world for the same works
This trips up almost every Indian independent artist.

| | **BMI (US)** | **IPRS (India)** |
|---|---|---|
| Writer joining fee | **Free** | ₹1,200 one-time |
| Accepts you now? | Yes — needs only a work performed or "likely to be performed soon" | **No** — requires at least one already-published work |
| Best for | Global and Western streaming, US radio | Indian radio, Indian TV, Indian live venues, Bollywood/regional sync |
| Payout | Quarterly, USD, needs W-8BEN | Quarterly, INR, domestic |

## The recommendation for an India → diaspora → West strategy

> **Join BMI as a writer now** (free, and it accepts you pre-release). Add **Songtrust ($100)** as your publishing administrator. Songtrust registers your works with IPRS *and* ~244 other societies via reciprocal agreements — so you still collect Indian performance royalties without an IPRS membership of your own. Global coverage on day one, at zero PRO cost.

Revisit IPRS at release #3, or if you start getting real Indian FM/TV airplay or sync placements. Switching later is possible but costs you a work-registration migration.

**Do NOT** register with BMI and IPRS both.
**Do NOT** enable DistroKid Publishing *and* Songtrust — they will fight over the same registrations and freeze your payouts.
` },
{ title: 'ISRC, UPC and metadata', body: `
## ISRC
The **International Standard Recording Code** — 12 characters, e.g. \`IN-A01-26-00001\`. Permanently attached to one specific recording. It is how every platform, radio monitoring system and royalty society on earth knows a play belongs to *your* recording.

- **You do not need to buy one.** DistroKid assigns a free ISRC to every track automatically.
- The **UPC/EAN** is the barcode for the *release* (the single as a product). Also free from the distributor.
- ⚠️ **One ISRC per recording, forever.** The radio edit, the instrumental and the acoustic version each get their **own** ISRC. Re-uploading the same recording with a new ISRC splits your stream counts and can look like fraud.
- India's ISRC registrant runs through IFPI's national agency — but at your stage, use the distributor's. Free is correct.

## Metadata discipline — the boring thing that costs the most money
Enter these *identically* everywhere, forever:
- Artist name — exact capitalisation, **no "feat." in the artist field** (use the feature field)
- Song title — no ALL CAPS, no "(Official Audio)", no emoji
- Version tags in parentheses only: \`(Radio Edit)\`, \`(Instrumental)\`, \`(Acoustic)\`
- Genre + subgenre — the same choice on distributor, Spotify pitch, Apple, Amazon
- Label name — even if it is just your artist name. Consistency signals professionalism to editorial teams.
` },
{ title: 'Licences you need from others', body: `
- **Sample clearance** — if any sample, interpolation or replayed melody from an existing song is in the track, you need clearance from *both* the master owner and the publisher. Uncleared samples get releases taken down and revenue redirected. If you cannot clear it, replace it.
- **Producer / beat licence** — if the instrumental is not 100% yours, get the written agreement. An "exclusive licence" from a beat marketplace is **not** the same as owning the composition. Read what % of publishing the producer retains and put it on the split sheet.
- **Session musician / feature releases** — a one-page signed work-for-hire or split agreement for anyone who played, sang or wrote.
- **Music video** — signed releases from every person on camera, and location permission for every location. **Get these on shoot day.** Chasing them later is misery.
- **Fonts and stock assets** used in cover art or video — check the commercial licence.
` },
{ title: 'Sync licensing', body: `
Once the release is out and registered you can license the song to film, TV, ads and games. Because you own both copyrights you grant a **one-stop licence**.

At T+30, upload to:
- [Songtradr](https://www.songtradr.com/) — largest independent sync marketplace
- [Musicbed](https://www.musicbed.com/) — application-based, high bar
- [Artlist](https://artlist.io/)
- [Marmoset](https://www.marmosetmusic.com/)
- [SoundBetter](https://soundbetter.com/) if you want session work

**Keep an instrumental and a clean version ready at all times.** Sync requests die when you cannot deliver stems within 24 hours. Export and archive: full mix, instrumental, a cappella, stems.
` }];
