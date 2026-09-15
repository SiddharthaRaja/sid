/* ============================================================
   notify.mjs — the sender

   Runs once a day in GitHub Actions. Reads the notification plan
   the app wrote into Firestore, sends whatever is due today, and
   stops. It deliberately knows nothing about releases, T-offsets
   or platforms — all of that lives in the app, so there is only
   ever one copy of the logic to be wrong.

   Needs three environment variables:
     FIREBASE_SERVICE_ACCOUNT  the JSON key, as a single line
     VAPID_PRIVATE_KEY         the private half of the pair
     VAPID_PUBLIC_KEY          the public half (also in the app)
   ============================================================ */

import webpush from 'web-push';
import admin from 'firebase-admin';

const {
  FIREBASE_SERVICE_ACCOUNT,
  VAPID_PRIVATE_KEY,
  VAPID_PUBLIC_KEY,
  VAPID_SUBJECT = 'mailto:siddhartharaja36@gmail.com',
  DRY_RUN,
} = process.env;

const fail = (m) => { console.error('✗ ' + m); process.exit(1); };

let db = null;

function connect() {
  if (!FIREBASE_SERVICE_ACCOUNT) fail('FIREBASE_SERVICE_ACCOUNT is not set.');
  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) fail('The VAPID keys are not set.');

  let creds;
  try { creds = JSON.parse(FIREBASE_SERVICE_ACCOUNT); }
  catch { fail('FIREBASE_SERVICE_ACCOUNT is not valid JSON.'); }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  admin.initializeApp({ credential: admin.credential.cert(creds) });
  db = admin.firestore();
}

/* ---------------------------------------------------------- */
/*  the only logic in this file, kept pure so it can be tested  */
/* ---------------------------------------------------------- */

/** Today where the user is, not where GitHub's runner is. */
export function localToday(offsetMinutes, nowMs = Date.now()) {
  return new Date(nowMs + (offsetMinutes || 0) * 60_000).toISOString().slice(0, 10);
}

/**
 * What to send this user right now: everything planned for their
 * today, at most one per kind. A morning digest and a release-day
 * alert are different things; three morning digests are a reason
 * to turn notifications off.
 */
export function pickDue(P, nowMs = Date.now()) {
  if (!P || !P.sub || !P.sub.endpoint) return [];
  const today = localToday(P.tzOffset ?? 330, nowMs);
  const seen = new Set();
  return (P.schedule || [])
    .filter(x => x && x.date === today)
    .filter(x => { const k = x.kind || 'sid'; if (seen.has(k)) return false; seen.add(k); return true; });
}

async function run() {
  connect();

  /* every user document under users/ — in practice one, but the
     loop costs nothing and means a second account just works */
  const users = await db.collection('users').listDocuments();
  if (!users.length) { console.log('No users yet.'); return; }

  let sent = 0, skipped = 0;

  for (const u of users) {
    const snap = await db.doc(`users/${u.id}/data/push`).get();
    if (!snap.exists) { skipped++; continue; }
    const P = snap.data()?.v || {};
    if (!P.sub || !P.sub.endpoint) { skipped++; continue; }

    const today = localToday(P.tzOffset ?? 330);
    const due = pickDue(P);

    if (!due.length) { console.log(`${u.id}: nothing due on ${today}`); continue; }

    for (const item of due) {
      const payload = JSON.stringify({
        title: item.title || 'Sid',
        body: item.body || '',
        url: item.url || './index.html#/today',
        kind: item.kind || 'sid',
        tag: `${item.kind}-${item.date}`,
      });

      if (DRY_RUN) { console.log('DRY RUN →', payload); sent++; continue; }

      try {
        await webpush.sendNotification(P.sub, payload, { TTL: 12 * 3600 });
        sent++;
        console.log(`${u.id}: sent ${item.kind}`);
      } catch (e) {
        const code = e.statusCode;
        if (code === 404 || code === 410) {
          /* the browser threw the subscription away — clear it so the
             app knows to ask again rather than retrying forever */
          console.log(`${u.id}: subscription is dead (${code}), clearing it`);
          await db.doc(`users/${u.id}/data/push`)
            .set({ v: { ...P, sub: null, deadAt: new Date().toISOString() }, at: Date.now() }, { merge: true });
        } else {
          console.error(`${u.id}: push failed (${code || '?'}) ${e.body || e.message || ''}`);
        }
      }
    }

    /* a quiet warning when the plan is running out */
    const last = (P.schedule || []).at(-1);
    if (last && last.date < new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10)) {
      console.log(`${u.id}: ⚠ the plan only reaches ${last.date} — open the app to extend it.`);
    }
  }

  console.log(`Done. ${sent} sent, ${skipped} without a subscription.`);
}

/* Imported by the test, executed by the workflow. */
if (process.argv[1] && process.argv[1].endsWith('notify.mjs')) {
  run().catch((e) => { console.error(e); process.exit(1); });
}
