/* ============================================================
   YOUR FIREBASE KEYS GO HERE.  This is the ONLY file you edit.

   Until you fill this in, Sid runs in LOCAL mode: everything works
   and saves to this browser, but it won't sync between devices.
   Paste the config object from
     Firebase console → Project settings → Your apps → Web app
   and Sid switches to Google sign-in + cloud backup automatically.

   These keys are safe to commit to a public repo — Firebase web
   API keys are public identifiers, not secrets. Your data is
   protected by the security rules in firestore.rules.
   ============================================================ */

export const FIREBASE_CONFIG = {
  // apiKey:            "AIza...",
  // authDomain:        "sid-xxxxx.firebaseapp.com",
  // projectId:         "sid-xxxxx",
  // storageBucket:     "sid-xxxxx.firebasestorage.app",
  // messagingSenderId: "000000000000",
  // appId:             "1:000000000000:web:abcdef",
};

/* Optional: lock the app to your own Google account(s).
   Leave empty to allow any Google account that signs in. */
export const ALLOWED_EMAILS = [];

/* Firebase JS SDK version loaded from Google's CDN. */
export const FIREBASE_VERSION = "10.12.2";
