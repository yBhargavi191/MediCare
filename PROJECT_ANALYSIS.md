# MediCare — Complete Project Analysis

> Analyzed on: 2026-10-13
> Location: `C:\Users\ybhar_9sumasa\OneDrive\Desktop\project`
> Firebase project: `verimed-6b92d`
> Live web app: https://verimed-6b92d.web.app
> Push relay: https://medicare-alerts.vercel.app

---

## 1. What this project is

**MediCare** ("Smart Health Reminders That Can't Be Ignored") is a medication-adherence
platform. It goes beyond an ordinary reminder app: every dose must be **proven as taken**
through an on-camera AI anti-cheat flow, missing a dose triggers a **wallet penalty**, and a
**care taker is alerted automatically**.

There are two user roles:

- **Patient** — sees today's medicines, gets reminders, verifies doses with AI, has a virtual
  wallet that is penalised on misses, manages care takers, plus a wellness/AI-assistant hub.
- **Admin** — sees all patients, aggregate adherence/completion/missed statistics, can add or
  remove medicines for a patient, and can view per-patient dose history and alerts.

It is a hackathon-grade build: no bundler, no framework — plain HTML/CSS/JS + Firebase
(Auth + Firestore + FCM) + TensorFlow.js, wrapped for Android with Capacitor.

---

## 2. Technology stack

| Layer | Technology |
|---|---|
| Frontend | Pure HTML / CSS / vanilla JavaScript (no build step) |
| Auth | Firebase Authentication (Email/Password) |
| Database | Cloud Firestore (real-time `onSnapshot`, offline persistence) |
| AI / ML | TensorFlow.js, Teachable Machine image model, MoveNet pose detection, COCO-SSD, MobileNet embeddings |
| Push (patients) | Firebase Cloud Messaging (FCM) HTTP v1 |
| Push (care takers) | Vercel serverless relay → FCM / ntfy.sh / WhatsApp / SMS / webhook |
| Serverless | Vercel Functions (`vercel-api/api/notify.js`, `chat.js`) |
| Scheduled backend | Firebase Cloud Functions v2 (`functions/index.js`) |
| Mobile | Capacitor 7 → Android (native local notifications + urgent alarm + DND bypass) |
| Hosting | Firebase Hosting (public dir `www`) |
| PWA | Service worker (`firebase-messaging-sw.js`), `manifest.json`, installable |

Dependencies (`package.json`): `@capacitor/android`, `@capacitor/core`,
`@capacitor/local-notifications`; dev: `@capacitor/cli`, `typescript`.

---

## 3. Folder structure

```
project/
├── index.html                     Login / Signup (patient or admin)
├── care-taker.html                Care-taker subscription + live dose status
├── patient-dashboard.html         Patient home (adherence, meds, wallet, streak)
├── verify.html                    Critical alert + countdown + 3-step AI verification
├── patient-details.html           Per-patient management (admin)
├── admin-dashboard.html           Aggregate stats + patient drill-down
├── admin-alerts.html / admin-reports.html / admin-settings.html
├── medication-reminders.html
├── health-records.html
├── appointments.html
├── nearby-hospitals.html
├── fitness-checking.html / fitness-details.html / fitness-plan.html / fitness-reminders.html
├── diet-plan.html
├── caremate.html                  AI health companion (chat) + wellness hub
├── emergency-contacts.html
├── profile.html / settings.html / app-download.html
├── SYNOPSIS.html / SYNOPSIS.md
├── README.md / CAREGIVER_SETUP.md / TRAINING_GUIDE.md
├── firebase.json                  Hosting + functions + firestore config
├── firestore.rules                Hardened security rules
├── .firebaserc                    default project = verimed-6b92d
├── capacitor.config.json          Android wrapper config
├── dev-server.mjs                 Local static server + /api/chat relay
├── firebase-messaging-sw.js       (root copy) FCM background + PWA cache
├── css/                           style.css, dashboard.css, app-shell.css, admin-pages.css, fitness-pages.css
├── js/                            Application source JS (see §11)
├── icons/                         PWA icons + logo
├── models/pill-model/             (README only) — actual model is in www/js/vendor/tm-model
├── functions/index.js             Scheduled reminder + missed-dose enforcement
├── vercel-api/api/                notify.js (caregiver relay), chat.js (rule-based assistant)
├── android/                       Capacitor Android project + custom UrgentAlerts plugin
├── scripts/                       PowerShell build/polish scripts + build-web.ps1
├── www/                           BUILD OUTPUT actually deployed to Firebase Hosting
├── _recover/                      Backup copies used to undo a past corruption
└── node_modules/                  Dependencies
```

**Important:** the root folder is the *source*; `www/` is the *built/deployed* copy.
`scripts/build-web.ps1` copies `css/`, `js/`, all `*.html`, `firebase-messaging-sw.js`,
`manifest.json`, `icons/`, `screenshots/`, and `.well-known/` into `www/`.
`firebase.json` serves `www`.

---

## 4. Firestore data model

| Collection | Key fields | Written by |
|---|---|---|
| `users/{uid}` | `name`, `phone`, `email`, `role` (`patient`/`admin`), `walletBalance`, `status` (`archived`), `relativeContacts[]`, `relativePhone`, `webPushTokens[]`, `caregiverWebPushTokens[]`, `alertTopic`, `reminderTimeZone`, `createdAt` | signup, profile, push setup |
| `medicines/{id}` | `patientId`, `name`, `dosage`, `times[]`, `time` (legacy), `frequency` (`daily`/`weekly`), `days[]`, `refEmbedding`/`refEmbeddings[]` (MobileNet vectors), `refPhoto`, `createdAt` | patient/admin |
| `doses/{medId_YYYY-MM-DD_HHMM}` | `patientId`, `medId`, `medName`, `dosage`, `date`, `scheduledTime`, `status` (`pending`/`verified`/`missed`), `verifiedAt`, `detectedAs`, `verifiedVia`, `missedAt`, `missedBy` (`server`) | patient app + cloud function |
| `alerts/{id}` | `patientId`, `doseId`, `medId`, `medName`, `message`, `createdAt`, `status`/`reviewedAt` | patient app + cloud function |
| `healthRecords/{id}` | patient health records | patient/admin |

Dose document IDs are deterministic (`${medicineId}_${date}_${time without colon}`), which makes
reminder/penalty writes idempotent.

---

## 5. Core flow (REMIND → VERIFY → ENFORCE → ESCALATE)

```
1. Patient signs in → dashboard lists today's medicines.
2. Dose time arrives (browser timer, native alarm, or scheduled cloud function)
   → the red alert screen (verify.html) opens with a countdown.
3. Verification = 3-step AI proof on camera:
     Step 1 SHOW    → custom Teachable Machine model (or reference-photo match) detects the medicine
     Step 2 TAKE    → MoveNet confirms a hand-to-mouth motion (3 consecutive frames)
     Step 3 CONFIRM → the medicine leaves the frame (10 consecutive frames) = swallowed
4. Pass → dose marked "verified", confetti + "You saved ₹10", streak updated.
5. Window expires (10 min, or 90 s in demo) without proof:
     → dose marked "missed"
     → ₹10 deducted from the virtual wallet (Firestore transaction)
     → alert written to Firestore
     → caregiver relay → FCM / ntfy / WhatsApp / SMS push
6. Care taker taps notification → live dose status page (care-taker.html).
```

Enforcement is **dual**: client-side (`verify.js handleMissed`) and server-side
(`functions/index.js expireMissedDoses`, every 5 minutes) so closing the app does not escape
the penalty.

---

## 6. AI / verification pipeline (verify.js)

Three complementary detectors, each with a graceful fallback so a live demo never dies:

1. **Custom pill classifier** — Teachable Machine model self-hosted at
   `www/js/vendor/tm-model/` (classes: `Tablets`, `syrup`, `other objects`, `human`).
   Accepted classes: `Tablets`, `syrup`; threshold `0.60`. Falls back to **COCO-SSD**
   (`bottle`, threshold `0.55`) if it fails to load.
2. **Reference-photo matcher** (`medicine-match.js`, one-shot learning) — admin enrols a
   photo per medicine; the image becomes a MobileNet embedding stored on the medicine doc.
   Live frames are embedded and compared by **cosine similarity**
   (`THRESHOLD 0.72`, `UNCERTAIN 0.55`, `GONE 0.45`). This proves the *correct* medicine is held.
3. **MoveNet pose AI** — uses `SINGLEPOSE_LIGHTNING`. `analyzeHandToMouth()` checks each wrist's
   distance to the nose relative to eye-distance (radius = `eyeDist × 3.0`). 3 hits advance the
   phase; if it never fires, a manual confirm button appears after
   `MANUAL_CONFIRM_AFTER_SECONDS` (40 s).

The verification window can only be *shortened* via `?window=90` (used by "Test Reminder Now"),
never extended beyond `DEMO_CONFIG.VERIFY_WINDOW_SECONDS`.

Result metadata saved on the dose: `verifiedVia` = `medicine-match` | `medicine-detected` |
`ingestion-sequence` | `manual-confirm`.

**Alarm behaviour:** `verify.js` synthesises a square-wave alarm with the Web Audio API
(no audio file), retries after the first user gesture (autoplay policy), blocks the Back button
(`guardBackNavigation`), and hides the "Back to dashboard" link until resolved.

ML libraries are lazy-loaded on demand through `ml-loader.js` and cached cache-first by the
service worker, so pages paint instantly and the alert page works offline.

---

## 7. Notifications

### Patients
- **Web/native reminders** chosen by `patient.js`:
  - Android native alarm via the custom `UrgentAlerts` Capacitor plugin (scheduled in
    `notifications.js`), which can show a **full-screen alert** and ring on the **alarm stream,
    bypassing silent / Do Not Disturb**. Permissions used: `USE_FULL_SCREEN_INTENT`,
    `SCHEDULE_EXACT_ALARM`, `ACCESS_NOTIFICATION_POLICY`, `POST_NOTIFICATIONS`, etc.
  - Otherwise FCM web push (`push-notifications.js`) when `FCM_VAPID_KEY` is set.
  - Otherwise in-page polling (`checkDueDoses`, every 3 s, ±`DOSE_GRACE_MINUTES`=2 min) + a
    `setTimeout` per dose (`scheduleBrowserReminders`).
- Server-scheduled reminders exist in `functions/index.js` (`sendMedicationReminders`,
  every 1 minute) but require the paid Firebase Blaze plan.

### Care takers
- Subscription page `care-taker.html`: enter patient email → save device FCM token into
  `users.caregiverWebPushTokens` (anonymous merge, no login needed) → live dose panel.
- On a missed dose the patient device calls the **Vercel relay** `/api/notify`, which can fan
  out to FCM push, ntfy.sh, Discord/Slack/Telegram webhooks, CallMeBot/Twilio/Meta WhatsApp, and SMS.
- The relay authenticates the caller with a **Firebase ID token** (RS256 verified against
  Google's public certs, `aud`/`iss`/`exp` checks) and pins `patientId` to the token's `uid`.

---

## 8. Security rules (`firestore.rules`)

Hardened vs the original open demo rules. Summary:

- `users`: **readable by anyone** (deliberate — anonymous care-taker lookup by email);
  self-create blocked from `role == 'admin'`; owners can edit their doc but not their role;
  anonymous care takers may only *merge* `caregiverWebPushTokens` + `updatedAt`.
- `medicines`: read/update/delete only by owner or admin.
- `doses`: owner/admin read, **plus anonymous read** for the live care-taker view.
- `alerts` / `healthRecords`: patients own theirs; only admins may update/delete.
- First-admin bootstrap is documented (create the first admin via console / temporary rule).

Note the trade-off: `users` and `doses` are world-readable, so anyone who knows a document id
can read patient state. The proper fix (login care takers, read via `caregiverUids`) is noted
as deferred.

---

## 9. Android (Capacitor)

- `capacitor.config.json`: appId `com.lifeline.medications`, appName `MediCare`, `webDir: www`.
- Custom Java sources under `android/app/src/main/java/com/lifeline/medications/`:
  `MainActivity.java`, `UrgentAlertsPlugin.java`, `AlarmActivity.java`, `AlarmReceiver.java`,
  `AlarmService.java` — the alarm stack behind the DND-bypassing urgent channel.
- Manifest declares camera, notification, exact-alarm, full-screen-intent, wake-lock, vibration,
  and battery-optimisation-exemption permissions, plus a foreground `mediaPlayback` service.

---

## 10. AI health assistant (`caremate.html` + `vercel-api/api/chat.js`)

`chat.js` is a **rule-based** responder (no external API, no cost). An emergency regex catches
red-flag phrases and replies with "call 112 / 108". Ordered rules then answer about missed
doses, medicines, fitness, diet, hydration, sleep, stress, fever, cough, headache, blood
pressure, diabetes, appointments, pain, and small talk, each optionally deep-linking to the
relevant in-app page. `dev-server.mjs` serves the site + `/api/chat` on one local port.

---

## 11. Source-file inventory (application JS, excluding `node_modules`/vendor)

| File | ~Lines | Purpose |
|---|---|---|
| `js/verify.js` | 693 | Countdown, alarm, 3-step AI verification, miss handling, caregiver call |
| `js/patient.js` | 623 | Dashboard, med add, reminders, streaks, wallet display, archived state |
| `js/admin.js` | 427 | Aggregate stats, patient list/detail, add/remove medicines, statistics |
| `js/i18n.js` | 408 | Multi-language strings |
| `js/patient-details.js` | 382 | Admin per-patient management |
| `js/app-shell.js` | 375 | Sidebar/topbar shell, global search, notification bell, theme |
| `js/fitness-assistant.js` | 279 | Wellness plan generation |
| `js/admin-pages.js` | 243 | Alerts/reports/settings pages |
| `js/notifications.js` | 215 | Web + native notification abstraction (UrgentAlerts plugin) |
| `js/auth.js` | 117 | Login/signup/reset, role routing |
| `js/care-taker.js` | 87 | Care-taker FCM subscription + live dose view |
| `js/firebase-config.js` | 120 | Firebase keys, DEMO_CONFIG, CUSTOM_MODEL, VERIFY_PIPELINE, MEDICINE_MATCH |
| `js/medicine-match.js` | 63 | MobileNet embedding + cosine similarity matcher |
| `js/ml-loader.js` | 57 | Lazy TF.js vendor loader |
| `js/loading.js` | 38 | Splash spinner |
| `js/theme.js` | 34 | Light/dark theme |
| `js/push-notifications.js` | 30 | FCM subscribe + token save |
| `js/fitness-page-nav.js` | 43 | Fitness sub-nav |
| `js/pwa.js` | 6 | Service-worker registration |

Vendored libs in `www/js/vendor/`: `firebase-*-compat.js`, `tf.min.js`,
`teachablemachine-image.min.js`, `mobilenet.min.js`, `pose-detection.min.js`,
`coco-ssd.min.js`, `confetti.browser.min.js`, and `tm-model/` (model.json, metadata.json,
model.weights.bin ≈ 2.1 MB).

---

## 12. Build & deploy

```bash
# local run (camera needs http://localhost, not file://)
node dev-server.mjs            # or: python -m http.server 8080
npm run build:web              # copy sources -> www/
npm run firebase:deploy        # build + firebase deploy
npm run android:sync           # npx cap sync android
npm run android:open           # open Android Studio
# relay
cd vercel-api && vercel --prod
```

Firebase Hosting config: HTML/CSS/JS/JSON are `no-cache`; images are cached 7 days.
Firebase functions source = `functions/`; Firestore rules = `firestore.rules`.

---

## 13. What is real vs simulated

- **Real:** Firebase Auth + Firestore data model, live dashboards, wallet/penalty transaction
  logic, escalation timers (client *and* server), custom Teachable Machine pill inference,
  MoveNet hand-to-mouth detection, MobileNet reference-photo matching, FCM push to care takers
  via the relay, Capacitor native DND-bypassing alarms.
- **Simulated / scoped:** the ₹10 penalty is a *virtual* wallet field (no payment gateway).
  Server-side scheduled reminders/enforcement need the paid **Firebase Blaze** plan; the code
  is ready but inert on the free tier. WhatsApp/SMS via Twilio are optional/trial.

---

## 14. Findings, risks & bugs

### High priority
1. **Caregiver alert from the patient device is effectively disabled.**
   `www/js/verify.js` → `notifyCareTakers()` returns early unless `CARE_ALERT_API.secret` exists
   and is not `CHANGE_ME`:
   ```js
   if (!CARE_ALERT_API?.url || !CARE_ALERT_API.secret || CARE_ALERT_API.secret.startsWith('CHANGE_ME')) return;
   ```
   But `js/firebase-config.js` now defines only `CARE_ALERT_API.url` (the shared secret was
   removed — the relay authenticates with a Firebase ID token). It also still sends an
   `X-Care-Secret` header instead of `Authorization: Bearer <idToken>`.
   **Effect:** the client never calls the relay, so no caregiver push/ntfy/WhatsApp is sent for
   a client-detected miss. Fix: remove the `secret` guard and send the user's ID token:
   ```js
   const token = await currentUser.getIdToken();
   fetch(CARE_ALERT_API.url, { headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, ... });
   ```

2. **Server-side missed doses never alert care takers.**
   `functions/index.js expireMissedDoses` writes the `alerts` doc and deducts the wallet, but
   never calls the Vercel relay and never sends FCM to `caregiverWebPushTokens`. Combined with
   finding #1, the whole "escalate to care taker" story currently depends on a broken client path.

3. **Admin self-signup conflicts with the rules.** `auth.js` allows choosing the Admin role at
   signup and writes `role: 'admin'`, but `firestore.rules` denies `create` when
   `role == 'admin'`. The UI path will therefore be rejected by the rules. The existing admin was
   created under the old open rules; document the console bootstrap clearly (as the rules comment does).

### Medium
4. **`users` and `doses` are world-readable.** Anyone who knows/guesses a document id can read
   patient PII and dose status anonymously. Acceptable for a demo, not for production.

5. **Firebase web config + VAPID key are committed** in `js/firebase-config.js` and inlined in
   `firebase-messaging-sw.js`. The API key is not a secret by itself (Firebase expects it public),
   but tighten **API key restrictions** and App Check, and restrict the relay CORS (currently `*`).

6. **Duplicate source of truth for doses.** Client (`verify.js`/`patient.js`), cloud function
   (`functions/index.js`), and relay all mutate dose status/wallet. Race conditions are mostly
   guarded by transactions and deterministic ids, but keep the two penalty constants in sync
   (`DEMO_CONFIG.PENALTY_AMOUNT` / `VERIFY_WINDOW_SECONDS` vs `functions/index.js` constants —
   currently both 10 and 10 min; a comment warns about drift).

7. **`verify.js` reads `CARE_ALERT_API.secret`** — a leftover from the old shared-secret design;
   see #1. Also `notifyCareTakers` sends `contacts` with phone numbers in the request body —
   fine, but verify the relay ignores client-supplied `patientId` (it does: `payload.patientId = actor.sub`).

8. **Reference model location mismatch.** `TRAINING_GUIDE.md` / `README.md` tell you to drop the
   model in `models/pill-model/`, but the wired-in path is the self-hosted
   `www/js/vendor/tm-model/`. `models/pill-model/` contains only a `README.txt`. Minor doc drift.

### Low / hygiene
9. **Duplicated deployed copy.** Root and `www/` both exist; editing the wrong one is a real
   footgun. Always edit root, then `npm run build:web`. (Verify a `js/` and `css/` at root match `www/`.)
10. **`typeScript ^7.0.2`** in devDependencies is unusual (TypeScript 7 isn't a normal release
    line); confirm it installs as intended, or drop it — nothing in the build uses `tsc`.
11. **`admin.js` `openPatientDetail` renders `m.time`** while newer medicines store `times[]`,
    so the admin modal may show `undefined` for multi-time medicines.
12. **No automated tests / linting / CI.** Only PowerShell polish scripts.
13. **`_recover/`** is a leftover recovery backup from a past file corruption (there is even a
    `/__recover` POST endpoint in `dev-server.mjs`). Safe to remove once no longer needed.
14. **`ntfy.sh` topics are predictable-ish** (`verimed-<name>-<random>`); acceptable but not
    secret-grade. Alerts content is PII (medicine names).

---

## 15. Recommendations (priority order)

1. Fix the caregiver alert path (#1) and add the same alert to the server-side enforcement (#2)
   — this is the headline feature.
2. Reconcile admin signup with the rules (#3).
3. Add Firebase App Check + restrict the web API key + tighten relay CORS (#5).
4. Add a small CI (lint + a smoke test that loads each page and checks for console errors).
5. Consolidate constants so client and cloud function cannot drift (#6).
6. Delete `_recover/` and the `/__recover` dev endpoint once done (#13).
7. If scope allows: log care takers in and read patient state via `caregiverUids` to close the
   anonymous-read gap (#4).

---

## 16. One-line summary

MediCare is a well-architected, genuinely working hackathon-grade medication-adherence app:
Firebase-backed, AI-verified ingestion, wallet penalties, and (by design) care-taker escalation —
with the escalation path currently broken by a config/rules mismatch and a missing server-side
push, which are the first things to fix.
