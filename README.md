# MediCare — Smart Health Reminders That Can't Be Ignored

Hackathon build. Pure HTML/CSS/JS (no build tools needed) + Firebase (Auth + Firestore) + TensorFlow.js (custom pill-recognition model + MoveNet pose AI for real ingestion verification).

## 1. Firebase setup (5 min)

1. Go to https://console.firebase.google.com → **Add project**.
2. Inside the project → click the **`</>` (Web) icon** → register an app → copy the `firebaseConfig` object it gives you.
3. Paste those values into `js/firebase-config.js` (replace the placeholders).
4. In the left sidebar:
   - **Authentication → Sign-in method → Email/Password → Enable**
   - **Firestore Database → Create database → Start in Test mode** (fine for a hackathon demo; tighten rules if you deploy for real)

That's it — no backend server needed to run locally.

## 2. Run it

Just open `index.html` with a local server (camera access requires `http://localhost` or `https`, it won't work off `file://`):

```bash
cd lifeline
python3 -m http.server 8080
# then open http://localhost:8080
```

Or drag the folder into **Firebase Hosting** / **Netlify** / **Vercel** for a live link to share with judges.

## 3. Demo script (what to show judges)

1. **Sign up as Patient** → add 1–2 medicines with a time a minute or two from now (the alarm fires automatically at that time).
2. Wait for the **red critical alert screen** to appear automatically.
3. Tap **Verify medication** → allow camera → follow the 3-step anti-cheat pipeline:
   - **Step 1 · Show medicine** — the custom Teachable Machine model detects your tablet strip / tonic bottle (live confidence bars on screen).
   - **Step 2 · Take it** — MoveNet pose AI confirms a hand-to-mouth taking motion.
   - **Step 3 · Confirmed** — the medicine must leave the frame (consumed). Showing the same pill repeatedly does NOT pass.
4. On success: red → green transition, confetti blast and a **"You saved ₹10!"** reward banner.
5. Trigger a second reminder and **let the countdown expire without verifying** → escalation path: dose marked "Missed", caregiver alert logged, **₹10 deducted** from the wallet in real time. Even if the patient closes everything, the **server-side enforcement function** marks it missed within minutes.
6. Go back to the dashboard → adherence %, verified/missed counts, and wallet balance all update live.
7. **Log in as Admin** → aggregate dashboard (total patients, completed/missed today, total penalties) and tap any patient to drill into their medicines, dose history, alerts, and care takers.
8. When a dose is missed, every **subscribed care taker gets an instant push notification on their phone** (tap it to open the live dose status). Setup: `CAREGIVER_SETUP.md`.

## 4. What's real vs. what's simulated (be upfront with judges)

- **Real:** Firebase Auth, Firestore data model, live dashboards, wallet/penalty transaction logic, escalation timers (client AND server-side), the custom Teachable Machine pill classifier running live inference, MoveNet hand-to-mouth motion detection, and free FCM push notifications delivered to care takers through a serverless relay.
- **Simulated/scoped for the hackathon:** the ₹10 penalty is a virtual wallet field (no real payment integration). Server-scheduled background reminders need the Firebase Blaze plan (`functions/` is ready to deploy when billing is enabled); without it, reminders fire from the patient's open dashboard or the Android app.
- The Android wrapper (Capacitor) schedules **local notifications that fire while the app is closed**, including an urgent channel that rings like an alarm even in silent / Do Not Disturb mode.

## 5. File map

```
lifeline/
├── index.html              Login / Signup (role: patient or admin)
├── care-taker.html         Care taker alert subscription + live dose status
├── patient-dashboard.html  Adherence %, today's meds, wallet, alerts, care takers
├── verify.html             Critical alert + countdown + 3-step AI verification
├── admin-dashboard.html    Aggregate stats + per-patient drill-down
├── patient-details.html    Per-patient management (medicines, care takers, history)
├── css/style.css
├── js/
│   ├── firebase-config.js  Firebase keys + AI model config + pipeline tuning
│   ├── auth.js
│   ├── patient.js
│   ├── verify.js           Pill detection + MoveNet ingestion pipeline + confetti
│   ├── care-taker.js       Care taker subscription logic
│   ├── notifications.js    Shared web/Android notification helpers
│   ├── push-notifications.js  FCM web push client
│   ├── admin.js
│   └── patient-details.js
├── vercel-api/api/notify.js  Free serverless relay — FCM push to care takers
├── functions/index.js      Scheduled reminders + server-side missed-dose
│                           enforcement (ready for Firebase Blaze upgrade)
├── models/pill-model/      Drop your exported Teachable Machine model here
├── TRAINING_GUIDE.md       How to train the pill-recognition AI
└── CAREGIVER_SETUP.md      Push-notification alerts setup
```

## 6. Fast tweaks for demo day

- `js/firebase-config.js` → `DEMO_CONFIG.VERIFY_WINDOW_SECONDS` — shorten/lengthen the escalation countdown.
- `js/firebase-config.js` → `CUSTOM_MODEL.confidenceThreshold` — raise if wrong objects verify, lower if real medicine misses.
- `js/firebase-config.js` → `VERIFY_PIPELINE` — tune the anti-cheat sensitivity or disable the motion check.
- `js/firebase-config.js` → `DEMO_CONFIG.STARTING_WALLET_BALANCE` — starting virtual balance for new patients.
