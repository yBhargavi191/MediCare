// ===================================================================
// MediCare — Firebase Configuration
// ===================================================================
// 1. Go to https://console.firebase.google.com -> Create a project
// 2. Add a Web App (</> icon) -> copy the config object it gives you
// 3. Paste the values below
// 4. In Firebase Console enable:
//      - Authentication -> Sign-in method -> Email/Password
//      - Firestore Database -> Create database (start in TEST mode for the hackathon)
// ===================================================================

const firebaseConfig = {
  apiKey: "AIzaSyBwThXLnL4RkJ58kGuoMy8j_RD3tGeB3VM",
  authDomain: "verimed-6b92d.firebaseapp.com",
  projectId: "verimed-6b92d",
  storageBucket: "verimed-6b92d.firebasestorage.app",
  messagingSenderId: "614701180122",
  appId: "1:614701180122:web:16f402b66d2ed60abff1e3",
  measurementId: "G-BJ9QMWZYLQ"
};

// Firebase Console → Project settings → Cloud Messaging → Web Push certificates.
const FCM_VAPID_KEY = 'BFRuiruYBSYvYrsnaRVoWoChpi2wIsdPTR9PH2ZgjsvTfgiEDancP6TWK7ZXEM99SpRLH1I0DpexEK52kqxMB6A';

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Keep the user signed in across app restarts. Capacitor's WebView does not
// reliably restore the default session, so persistence must be set explicitly
// to LOCAL (IndexedDB) before any sign-in happens.
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function () {});

const db = firebase.firestore();
// Cache Firestore data locally (IndexedDB) so dashboards and the alert page
// render instantly from cache and keep working offline.
db.enablePersistence({ synchronizeTabs: true }).catch(function () { /* multi-tab / unsupported */ });

// Demo tuning — real deployment would use minutes, hackathon demo uses seconds
// so judges can see the full REMIND -> VERIFY -> ESCALATE -> PENALTY loop live.
const DEMO_CONFIG = {
  VERIFY_WINDOW_SECONDS: 600,  // 10 minutes — time patient has to verify before it's "missed"
  PENALTY_AMOUNT: 10,           // ₹10 accountability penalty
  STARTING_WALLET_BALANCE: 500
};

// ===================================================================
// Custom pill-recognition AI (Teachable Machine)
// ===================================================================
// Train your own model that recognizes REAL medicine packaging:
//   1. Go to https://teachablemachine.withgoogle.com/train/image
//   2. Create classes and add photos of your actual tablets / tonics
//      from many angles, distances and lighting conditions.
//   3. Click "Train Model".
//   4. Export Model -> Tensorflow.js -> pick ONE of:
//        a) "Upload (shareable link)" -> paste the shareable URL below
//        b) "Download" -> unzip into models/pill-model/ and set url accordingly
//   5. acceptedClasses must match your trained class names EXACTLY.
//
// If this URL is empty or fails to load, the app automatically falls
// back to the generic COCO-SSD detector so a live demo never breaks.
// ===================================================================
const CUSTOM_MODEL = {
  // Self-hosted in js/vendor/tm-model/ for instant, offline pill recognition.
  // (Original shareable model: https://teachablemachine.withgoogle.com/models/15sHnR-vS/)
  url: 'js/vendor/tm-model/',
  // Must match the trained class names EXACTLY (case-sensitive).
  // Trained classes: "Tablets", "syrup", "other objects", "human"
  acceptedClasses: ['Tablets', 'syrup'],
  // 0.60 = forgiving for freshly-trained models. Raise to 0.75+ once
  // detection feels reliable; lower to 0.5 if tablets still miss.
  confidenceThreshold: 0.60
};

// ===================================================================
// Caregiver alerts relay (Vercel serverless, free tier)
// ===================================================================
// The relay verifies the caller's Firebase ID token server-side (see
// vercel-api/api/notify.js), so no shared secret is shipped in this
// bundle. The client attaches its ID token in the Authorization header
// and the relay pins patientId to the token's uid.
// ===================================================================
const CARE_ALERT_API = {
  url: 'https://medicare-alerts.vercel.app/api/notify'
};

// -------------------------------------------------------------------
// Per-patient alert topic (ntfy)
// -------------------------------------------------------------------
// Each patient gets their own ntfy topic so missed-dose alerts reach only
// that patient's care takers (who subscribe to this unique topic), instead
// of a single shared topic everyone sees.
const NTFY_BASE = 'https://ntfy.sh';
function makeAlertTopic(seed) {
  const base = String(seed || 'patient').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 18) || 'patient';
  const rand = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
  return `verimed-${base}-${rand}`;
}

// ===================================================================
// Ingestion verification pipeline (anti-cheat)
// ===================================================================
// A dose is only "verified" after ALL three steps pass on camera:
//   Step 1 SHOW    — the medicine (tablet/tonic) is detected.
//   Step 2 TAKE    — MoveNet pose AI sees a hand move to the mouth.
//   Step 3 CONFIRM — the medicine leaves the camera frame (consumed).
// Just showing the same pill repeatedly can no longer pass.
// Set REQUIRE_HAND_TO_MOUTH to false to restore the old show-only check.
// ===================================================================
const VERIFY_PIPELINE = {
  REQUIRE_HAND_TO_MOUTH: true,
  HAND_TO_MOUTH_FRAMES: 3,   // consecutive pose frames with wrist near mouth
  MEDICINE_GONE_FRAMES: 10,  // consecutive frames with medicine out of view
  WRIST_SCORE_MIN: 0.25,     // minimum AI confidence for a wrist keypoint
  MANUAL_CONFIRM_AFTER_SECONDS: 40 // show manual confirm button if motion AI stays silent
};

// ===================================================================
// Reference-photo medicine matching (one-shot learning)
// ===================================================================
// When a medicine has an enrolled reference photo, the live camera frame is
// compared to it (MobileNet embedding + cosine similarity). The patient can
// only pass Step 1 by holding the CORRECT medicine, not just any tablet.
//   match  >= THRESHOLD        -> correct medicine, proceed
//   UNCERTAIN <= match < THRESHOLD -> "hold closer / better light"
//   match  <  UNCERTAIN        -> "this does not look like <medicine>"
// ===================================================================
const MEDICINE_MATCH = {
  THRESHOLD: 0.72,   // similarity needed to accept the medicine
  UNCERTAIN: 0.55,   // below this the shown item looks like a different medicine
  GONE: 0.45         // during Step 3, similarity this low means the medicine left the frame
};
