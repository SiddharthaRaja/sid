/* ============================================================
   ads.js — paid advertising (Category J)
   The plan's ad schedule, the creative spec, and the rules that
   decide whether the money did anything.
   ============================================================ */

export const AD_PLATFORMS = ['Meta', 'Google / YouTube', 'TikTok', 'Snapchat', 'Spotify Ad Studio', 'Other'];

export const OBJECTIVES = [
  'Conversions — pre-save',
  'Conversions — stream',
  'Traffic',
  'Video views',
  'Engagement',
  'Awareness',
];

export const CAMPAIGNS_SEED = [
  { id: 'c1', name: 'Pre-save push — India', platform: 'Meta', objective: 'Conversions — pre-save',
    when: 'T-10', until: 'T-1', dailyUsd: 10, status: 'planned',
    audience: 'India · 18–34 · interests: the three comparison artists, indie music, live music · Instagram + Facebook feeds and Reels',
    funded: true,
    notes: 'Optimise for the pre-save conversion event, never for clicks. Meta pixel must already be firing on the smart link before this starts. $100 of the $200 budget.' },

  { id: 'c2', name: 'Release week — conversions', platform: 'Meta', objective: 'Conversions — stream',
    when: 'T', until: 'T+6', dailyUsd: 18, status: 'planned',
    audience: 'India first, then broadened to the diaspora once city data appears in Spotify for Artists',
    funded: true,
    notes: 'Switch the campaign objective from pre-save to stream on release morning. Same creative, new event. Roughly the remaining $100 of the budget — the two funded campaigns together are the whole ₹17,400 ad line.' },

  { id: 'c3', name: 'India phase', platform: 'Meta', objective: 'Conversions — stream',
    when: 'T+7', until: 'T+28', dailyUsd: 10, status: 'planned',
    audience: 'India · the cities that actually showed up in week one, not the ones you guessed',
    funded: false,
    notes: 'NOT COVERED by the ₹17,400 budget — that money is spent by T+6. Either extend the budget or run this at a lower daily rate. From T+7 the targeting stops being a guess: rebuild the audience from real Spotify city data.' },

  { id: 'c4', name: 'Diaspora phase', platform: 'Meta', objective: 'Conversions — stream',
    when: 'T+29', until: 'T+56', dailyUsd: 12, status: 'planned',
    audience: 'Diaspora-dense cities: New Jersey, Toronto, Brampton, Dubai, Leicester, Melbourne · 18–34 · South Asian interest layers',
    funded: false,
    notes: 'NOT COVERED by the original budget. This is the phase the whole strategy is built around, so it is the first thing worth funding if release-week numbers justify it. Retarget everyone who engaged in the first month.' },

  { id: 'c5', name: 'Western crossover', platform: 'Meta', objective: 'Conversions — stream',
    when: 'T+57', until: 'T+84', dailyUsd: 10, status: 'planned',
    audience: 'Your top 5 non-Indian cities only — no country-wide targeting at this budget',
    funded: false,
    notes: 'NOT COVERED by the original budget. Narrow beats broad at $10/day — five cities, not five countries.' },

  { id: 'c6', name: 'Music video — in-feed discovery', platform: 'Google / YouTube', objective: 'Video views',
    when: 'T', until: 'T+30', dailyUsd: 5, status: 'planned',
    audience: 'In-feed discovery ads against the comparison artists\' channels and similar-music viewers',
    funded: false,
    notes: 'NOT COVERED by the original budget. Cheap view volume, and YouTube views feed the algorithm for the channel as a whole. The first thing to cut if money is tight.' },
];

export const CREATIVE_SPEC = [
  'Three variants minimum — the winner is almost never the one you expected',
  '15–20 seconds, 9:16 vertical, cut from the music video',
  'The hook audible in the first 2 seconds',
  'Burned-in captions',
  'No text in the first frame — let the picture do the stopping',
  'A clear single call to action at the end: "out now" / "pre-save"',
  'One variant that is just the artist talking to camera — these often win',
];

export const ADS_INFO = [
{ title: 'The one rule', body: `
## Optimise for conversions, never for clicks
A click costs you money and tells you nothing. Meta will happily find you thousands of people who click and never listen — that is the cheapest thing for it to optimise, so that is what it will do unless you stop it.

Set the campaign objective to **Conversions**, and set the conversion event to the pre-save (before release) or the stream (after). This requires the **Meta Pixel installed on your smart link**, which is why the smart-link subscription at T-45 and the pixel at T-45 come before the ads at T-10 in the plan.

Without the pixel, do not run ads at all. You will be buying numbers that do not mean anything.
` },
{ title: 'The schedule and the money', body: `
| When | Campaign | Objective | Daily | Market |
|---|---|---|---|---|
| T-10 → T-1 | Pre-save push | Pre-save conversion | $10 | India |
| T → T+6 | Release week | Stream conversion | $15–20 | India, broadening |
| T+7 → T+28 | India phase | Stream conversion | $10 | Real cities from week one |
| T+29 → T+56 | Diaspora phase | Stream conversion | $12 | Diaspora-dense cities |
| T+57 → T+84 | Western crossover | Stream conversion | $10 | Top 5 non-Indian cities |
| T → T+30 | Music video | Video views | $5 | Discovery, YouTube |

## The budget does not cover all of it — and that is the point

Your budget line for ads is **$200 (₹17,400)**. At the daily rates above, the pre-save push and release week alone spend all of it by T+6. Everything from T+7 onward — India phase, diaspora, crossover, the YouTube campaign — is **unfunded** at the original number.

That is not a mistake in the plan; it is the decision the plan defers to you. Two honest ways to resolve it:

1. **Spend the $200 where it compounds** — pre-save and release week only, then go organic. The release-week spike is what editorial and algorithmic playlisting react to, so front-loading is defensible.
2. **Extend the budget once you have evidence.** Run the funded two, look at cost per new listener at T+7, and only then decide whether the diaspora phase is worth another $150–300. If cost per listener is under about $0.15, it probably is.

What you should not do is spread $200 thinly across all six campaigns. At $2–3/day nothing has enough signal to optimise and you learn nothing.

Sid shows you the gap on the Campaigns tab rather than hiding it — planned spend against the ad line from Finance, updated as you change the dailies.

**Narrow beats broad at this budget.** Five cities, not five countries. At $10/day a country-wide audience gets you nothing more than a thin, meaningless spread.
` },
{ title: 'Reading the numbers', body: `
Three numbers matter, in this order:

**1. Cost per conversion.** What one pre-save or one stream actually cost. Under $0.50 is working; over $2 and something is wrong with the creative or the audience, not the budget.

**2. Cost per new monthly listener.** Divide the campaign spend by the increase in monthly listeners over the same window. This is the only number that tells you whether the money bought you an audience or just impressions. Sid computes it for you when you have stats logged either side of a campaign.

**3. Which creative won.** Run three, kill the two that lose after 48 hours, put everything behind the winner. Do not average across variants — that hides the winner.

## Do not
- Do not chase CTR. A high CTR with no conversions means the creative is misleading.
- Do not run ads before the pixel works.
- Do not boost posts from the app. Use Ads Manager; boosted posts cannot optimise for conversions.
- Do not run ads at all if the track is not live and the smart link is not tested on a phone.
` }];

/* ============================================================
   Ad accounts — one row per platform you actually spend on.
   Seeded with the platforms worth considering for this release,
   the real minimum daily spend below which the platform cannot
   optimise, and what each one is actually good at. Delete the
   ones you will not use.
   ============================================================ */

export const AD_ACCOUNTS_SEED = [
  { id: 'acc-meta', platform: 'Meta', name: 'Meta Ads Manager', currency: 'USD',
    url: 'https://adsmanager.facebook.com', minDaily: 5, active: true,
    strength: 'The only platform where a $10/day conversion campaign reliably works for music. Instagram Reels placements are where the cheap attention is.',
    watch: 'Needs the Meta pixel on your smart link before it can optimise for anything worth optimising for. Boosted posts from the app cannot do conversions - use Ads Manager.' },

  { id: 'acc-google', platform: 'Google / YouTube', name: 'Google Ads', currency: 'USD',
    url: 'https://ads.google.com', minDaily: 5, active: true,
    strength: 'In-feed discovery ads against similar artists. Cheap view volume, and views feed the channel algorithm rather than evaporating.',
    watch: 'Video views are not listeners. Treat this as a top-of-funnel channel and judge it on subscriber and watch-time movement, not on cost per view.' },

  { id: 'acc-tiktok', platform: 'TikTok', name: 'TikTok Ads Manager', currency: 'USD',
    url: 'https://ads.tiktok.com', minDaily: 20, active: false,
    strength: 'Unmatched reach per dollar when the creative is native. Sound-on, vertical, and it has to look like a post rather than an ad.',
    watch: 'Minimum daily spend is materially higher than Meta and the auction punishes anything that looks produced. Not the first place to put $200.' },

  { id: 'acc-spotify', platform: 'Spotify Ad Studio', name: 'Spotify Ad Studio', currency: 'USD',
    url: 'https://adstudio.spotify.com', minDaily: 8, active: false,
    strength: 'Audio ads that play to free-tier listeners inside the app they would stream you in. The click lands on your artist page, not a browser.',
    watch: 'Availability is patchy outside a handful of markets and there is usually a campaign minimum of around $250 total, which is more than the whole ad budget here.' },

  { id: 'acc-x', platform: 'X', name: 'X Ads', currency: 'USD',
    url: 'https://ads.x.com', minDaily: 5, active: false,
    strength: 'Cheap impressions, useful for press and industry visibility rather than listeners.',
    watch: 'Conversion tracking is weak and music discovery on the platform is thin. Do not expect streams from it.' },

  { id: 'acc-reddit', platform: 'Reddit', name: 'Reddit Ads', currency: 'USD',
    url: 'https://ads.reddit.com', minDaily: 5, active: false,
    strength: 'Subreddit-level targeting is the most precise interest targeting available anywhere, and CPMs are low.',
    watch: 'The audience is hostile to anything that reads as marketing. Works only where the ad is honest about being an artist posting their own record.' },
];

/* The daily-log columns. Kept short deliberately: anything you
   will not actually type in every day is a column that ends up
   half empty and lies to the charts. */
export const LOG_FIELDS = [
  { key: 'spend', label: 'Spend', money: true },
  { key: 'impressions', label: 'Impressions' },
  { key: 'clicks', label: 'Clicks' },
  { key: 'conversions', label: 'Conversions' },
];

export const ADS_PLATFORM_INFO = `
| Platform | Minimum realistic daily | Best at | The catch |
|---|---|---|---|
| Meta | $5-10 | Conversions - pre-saves and streams | Useless without a pixel on the smart link |
| Google / YouTube | $5 | Video views, channel growth | Views are not listeners |
| TikTok | $20 | Reach, if the creative is native | High minimum, hostile to polished ads |
| Spotify Ad Studio | $8 | Reaching free-tier listeners in-app | Roughly $250 campaign minimum, limited markets |
| X | $5 | Industry and press visibility | Weak conversion tracking |
| Reddit | $5 | Precise interest targeting | Audience dislikes overt marketing |
`;
