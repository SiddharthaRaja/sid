/* ============================================================
   finance.js — forms, accounts, budget and the tax reference
   Built from the royalty / registration / taxation folder.
   ============================================================ */

export const FORMS_SEED = [
  { id: 'w8ben', name: 'W-8BEN', who: 'Every US payer', when: 'T-60', status: 'todo',
    url: 'https://www.irs.gov/pub/irs-pdf/fw8ben.pdf',
    what: 'Drops US withholding on royalties from 30% to 15% under India–US DTAA Article 12(2). Filed with each PAYER, never with the IRS.',
    how: 'Line 1 full legal name (not stage name) · Line 2 country of citizenship India · Line 3 permanent Indian address · Line 6a PAN as Foreign TIN · Line 9 India · Line 10 Article 12, paragraph 2, rate 15%, type of income Royalties · Part III sign, date, print name. Expires at the end of the THIRD calendar year after signing.',
    where: 'DistroKid · BMI · Songtrust · SoundExchange · YouTube/AdSense · any US sync licensee' },
  { id: 'trc', name: 'Form 10FA → 10FB (Tax Residency Certificate)', who: 'Income Tax Dept, India', when: 'T-60', status: 'todo',
    url: 'https://www.incometax.gov.in/iec/foportal/',
    what: 'Proof you are an Indian tax resident. Some payers and most non-US territories require it.',
    how: 'Apply with Form 10FA to your jurisdictional Assessing Officer via the income tax portal; you receive Form 10FB. Documents: PAN, address proof, passport copy, bank statements, declaration of residency. ~1–2 weeks.',
    where: 'Annual — per financial year' },
  { id: '1042s', name: 'Form 1042-S (request it)', who: 'Each US payer', when: 'T+120', status: 'todo',
    url: 'https://www.irs.gov/forms-pubs/about-form-1042-s',
    what: 'Your proof of US tax already withheld. Without it you cannot claim Foreign Tax Credit.',
    how: 'Request from every US payer each January. File in /07 Reports/1042-S/.',
    where: 'Every January' },
  { id: 'form67', name: 'Form 67 — Foreign Tax Credit', who: 'Income Tax Dept, India', when: 'T+150', status: 'todo',
    url: 'https://www.incometax.gov.in/iec/foportal/help/statutory-forms/popular-form/form-67',
    what: 'How you claim credit for the 15% already withheld in the US.',
    how: 'File BEFORE or ALONG WITH your ITR. Late filing = credit denied = you pay tax twice. Attach 1042-S, TRC and bank statements.',
    where: 'With the annual ITR' },
  { id: 'itr', name: 'ITR-4 (presumptive) or ITR-3', who: 'Income Tax Dept, India', when: 'T+150', status: 'todo',
    url: 'https://www.incometax.gov.in/iec/foportal/',
    what: 'Your annual return. Royalties from your own creative work, earned professionally, are business/professional income — not "income from other sources". That unlocks expense deductions: studio time, gear, mixing, video, ads.',
    how: 'Section 44ADA presumptive: declare 50% of gross as profit, skip detailed books, file ITR-4. Almost always right at your scale. Otherwise ITR-3 and maintain books.',
    where: 'Annual' },
  { id: 'lut', name: 'Letter of Undertaking (LUT)', who: 'GST portal', when: 'T+30', status: 'todo',
    url: 'https://www.gst.gov.in/',
    what: 'Only if you register for GST. Lets you export services (royalty licensing to a foreign payer IS an export of services) at zero-rated GST without paying IGST upfront.',
    how: 'File on the GST portal. Do not skip it if you register.',
    where: 'GST registration is mandatory above ₹20L aggregate turnover (₹10L special-category states). Below that it is optional.' },
  { id: 'advtax', name: 'Advance tax — four instalments', who: 'Income Tax Dept, India', when: 'T+60', status: 'todo',
    url: 'https://www.incometax.gov.in/iec/foportal/help/e-pay-tax',
    what: 'Due 15 Jun · 15 Sep · 15 Dec · 15 Mar.', how: 'Diarise all four.', where: 'Quarterly' },
  { id: '80qqb', name: 'Section 80QQB check', who: 'Your CA', when: 'T+150', status: 'todo', url: '',
    what: 'Deduction for royalty income from authorship of certain works — up to ₹3 lakh.',
    how: 'Ask a CA whether your lyric and composition royalties qualify. Worth one conversation.', where: 'Annual' },
  { id: 'dtuk', name: 'Form DT-Individual (UK)', who: 'HMRC via Indian AO', when: '', status: 'todo',
    url: 'https://www.gov.uk/government/publications/double-taxation-treaty-relief-form-dt-individual',
    what: 'Reduces UK withholding from 20% to 15% under India–UK DTAA Article 13.',
    how: 'Certified by your Indian Assessing Officer, then sent to HMRC. Only worth doing if UK income is material — Songtrust handles most of this at publisher level.', where: 'Once, if needed' },
];

export const ACCOUNTS_SEED = [
  { id: 'skydo', name: 'Skydo', kind: 'Receiving account', url: 'https://www.skydo.com/', status: 'todo',
    note: 'RBI PA-CB authorised. Automatic FIRA on every transaction, flat fee. Best compliance story — route larger publisher and PRO payouts here.' },
  { id: 'wise', name: 'Wise', kind: 'Receiving account', url: 'https://wise.com/', status: 'todo',
    note: 'Widest platform support, low FX margin. FIRC issued on manual request, sometimes for a fee — get it every single time.' },
  { id: 'payoneer', name: 'Payoneer', kind: 'Receiving account', url: 'https://www.payoneer.com/', status: 'todo',
    note: 'Deep music-industry integration — DistroKid pays into it directly. Higher fees. Manual FIRC process.' },
  { id: 'bank', name: 'Indian bank account', kind: 'Bank', url: '', status: 'todo',
    note: 'The destination for everything. Direct SWIFT is always compliant but costs ₹500–1,500 per inward wire — bad for small quarterly royalty payments.' },
  { id: 'distrokid', name: 'DistroKid payout', kind: 'Payer', url: 'https://distrokid.com/', status: 'todo',
    note: 'Pays from $1. Master streaming royalties.' },
  { id: 'bmi', name: 'BMI payout', kind: 'Payer', url: 'https://www.bmi.com/', status: 'todo',
    note: 'Quarterly, USD, has a minimum distribution threshold. Writer share of performance royalties.' },
  { id: 'songtrust', name: 'Songtrust payout', kind: 'Payer', url: 'https://www.songtrust.com/', status: 'todo',
    note: 'Publisher share, ~245 territories.' },
  { id: 'soundexchange', name: 'SoundExchange payout', kind: 'Payer', url: 'https://www.soundexchange.com/', status: 'todo',
    note: 'Quarterly above threshold. Digital performance on the master side — Pandora, SiriusXM, webcasters.' },
  { id: 'adsense', name: 'YouTube / AdSense', kind: 'Payer', url: 'https://www.youtube.com/', status: 'todo',
    note: 'Content ID money and, separately, Partner Program ad revenue. File W-8BEN here too.' },
];

export const BUDGET_SEED = [
  { id: 'b1', item: 'DistroKid Musician Plus', when: 'T-60', usd: 45, inr: 3900, note: 'Base plan cannot set a custom release date — no scheduled date means no pre-save campaign.', done: false },
  { id: 'b2', item: 'Songtrust', when: 'T-60', usd: 100, inr: 8700, note: 'One-time + 15% performance / 20% mechanicals.', done: false },
  { id: 'b3', item: 'BMI writer affiliation', when: 'T-75', usd: 0, inr: 0, note: 'Free.', done: false },
  { id: 'b4', item: 'MLC / SoundExchange', when: 'T-60', usd: 0, inr: 0, note: 'Free.', done: false },
  { id: 'b5', item: 'Smart link (3 months)', when: 'T-45', usd: 30, inr: 2600, note: 'Linkfire or Feature.fm. Needs pre-save + pixel + UTMs.', done: false },
  { id: 'b6', item: 'Meta ads', when: 'T-10', usd: 200, inr: 17400, note: 'The single highest-leverage spend in the plan for a diaspora-first push.', done: false },
  { id: 'b7', item: 'SubmitHub credits', when: 'T-21', usd: 50, inr: 4350, note: '~25–30 credits. Realistic hit rate 5–15%; the feedback alone is worth it.', done: false },
  { id: 'b8', item: 'Domain name', when: 'T-90', usd: 0, inr: 1000, note: '.com first.', done: false },
  { id: 'b9', item: 'India copyright (music + lyrics)', when: 'T-30', usd: 0, inr: 1000, note: '₹500 each.', done: false },
  { id: 'b10', item: 'US copyright (optional)', when: 'T-15', usd: 65, inr: 5650, note: 'Trim this and one month of smart link to land at ~₹37k.', done: false },
];

export const FINANCE_INFO = [
{ title: 'The three problems', body: `
You are an Indian tax resident earning royalty income from US, EU and UK payers. Three separate problems, and they need three separate fixes:

1. **Do not get over-withheld abroad** → W-8BEN, TRC
2. **Receive the money compliantly** → an RBI PA-CB authorised channel, and a FIRA for every payment
3. **Do not get double-taxed at home** → Form 67, filed before or with your ITR

Solving one and not the others still costs you money.
` },
{ title: 'Receiving the money', body: `
## The rule that matters
Cross-border collection for Indian residents must run through an **RBI PA-CB authorised** channel, or through your bank directly. Using an unauthorised channel is a FEMA violation.

| Platform | Status for India | Good for |
|---|---|---|
| **Skydo** | **PA-CB authorised (Indian)** | Automatic FIRA on every transaction, flat fee. Best compliance story |
| **Wise** | Widely used; FIRC on manual request | USD/GBP/EUR receiving, low FX margin. Simplest for a first release |
| **Payoneer** | Manual FIRC process | DistroKid and many DSPs pay directly into it |
| **Winvesta** | Indian, virtual USD/GBP | Compare fees at the time |
| **PayPal** | In-principle PA-CB approval | Fallback only — worst FX rates |
| **Direct SWIFT** | Always compliant | Large lump sums; ₹500–1,500 per inward wire |

**Recommendation:** open **Wise** (for breadth) and **Skydo** (for clean automatic FIRAs). Route DistroKid → Wise/Payoneer, and larger publisher/PRO payouts → Skydo.

## Non-negotiable
- **Purpose code P1303 (Royalties & Copyrights).** A wrong purpose code creates reconciliation problems at ITR time. Confirm the current code with your provider before the first inflow.
- **Collect a FIRA/FIRC for every single inward payment.** Store in \`/07 Reports/FIRA/\`. Retain **6–8 years**.
- Know each payer's **payout threshold** so you are not surprised by silence.
` },
{ title: 'Not paying tax twice', body: `
- **Head of income.** Royalties from your own creative work, earned regularly and professionally → **business/professional income**, not "income from other sources". This is what unlocks expense deductions: studio time, gear, mixing, video, ads.
- **Section 44ADA presumptive taxation** — declare 50% of gross as profit, skip detailed books, file **ITR-4**. Almost always the right choice at your scale.
- **Section 80QQB** — deduction for royalty income from authorship of certain works, up to ₹3 lakh. Ask a CA whether your lyric and composition royalties qualify.
- **GST** — mandatory above ₹20L aggregate turnover (₹10L special-category states). If you register, **file the LUT** so you can export services at zero-rated GST without paying IGST upfront.
- **Form 67 — file it BEFORE or ALONG WITH your ITR.** Late filing means the Foreign Tax Credit is denied and you pay tax twice.
- **Advance tax** — 15 Jun, 15 Sep, 15 Dec, 15 Mar.
- Convert foreign income at the **RBI/TT buying rate on the date of receipt**, not the date earned.

This is general information, not tax advice — the thresholds and the 80QQB question are worth one conversation with a CA.
` },
{ title: 'Documents to keep', body: `
\`\`\`
/05 Business
  W-8BEN-signed.pdf
  TRC-Form10FB-FY2026-27.pdf
  split-sheet-[SONG]-signed.pdf
  metadata-master-sheet.xlsx
  distrokid-invoice.pdf
  songtrust-agreement.pdf
/07 Reports
  /FIRA
  /1042-S
  /royalty-statements
  royalty-tracker.xlsx
\`\`\`

The royalty ledger in this tab is the live version of \`royalty-tracker.xlsx\` — date, source, gross USD, withholding, net USD, INR at TTBR, FIRA reference, purpose code.
` }];
