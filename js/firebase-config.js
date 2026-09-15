export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCpVv_aylCNs_gZo1kzGOiN66nNrYiTpQg",
  authDomain: "sidd-212d1.firebaseapp.com",
  projectId: "sidd-212d1",
  storageBucket: "sidd-212d1.firebasestorage.app",
  messagingSenderId: "661991704405",
  appId: "1:661991704405:web:caa3fb68a21926d5c9d1dc",
  measurementId: "G-L78ZGVCE1Q"
};

export const ALLOWED_EMAILS = ["siddhartharaja36@gmail.com"];

export const FIREBASE_VERSION = "10.12.2";

/* For uploading to your own Google Drive instead of Firebase Storage.
   Google Cloud console → APIs & Services → Credentials → the OAuth
   2.0 Client ID named "Web client (auto created by Google Service)".
   Add https://siddhartharaja.github.io to its Authorized JavaScript
   origins, then paste the client ID here. Leave it empty to keep
   uploads local to this browser. */
export const GOOGLE_CLIENT_ID = "";

/* Push notifications. The matching private key goes in a GitHub
   secret called VAPID_PRIVATE_KEY — never here. Generated for this
   app; regenerate with `npx web-push generate-vapid-keys` if you
   ever want to, and change both halves together. */
export const VAPID_PUBLIC_KEY = "BPTEeWRLOxN4Vw-6rhgfw-tJLXq3VW6y-e2WM3rvis4gG2P9e_D3OuInGjQ_eOU2d9456lXvJRJLsUOMuPSK2Gg";
export const VAPID_SUBJECT = "mailto:siddhartharaja36@gmail.com";
