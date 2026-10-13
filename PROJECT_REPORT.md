# MediCare — Full Project Report

> **Project:** MediCare — "Smart Health Reminders That Can't Be Ignored"
> **Type:** Hackathon-grade medication-adherence platform (PWA + Android)
> **Report date:** 2026-10-13
> **Location:** `C:\Users\ybhar_9sumasa\OneDrive\Desktop\project`
> **Firebase project:** `verimed-6b92d`
> **Live web app:** https://verimed-6b92d.web.app
> **Push relay:** https://medicare-alerts.vercel.app

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Problem statement](#2-problem-statement)
3. [Solution overview](#3-solution-overview)
4. [Core flow (REMIND → VERIFY → ENFORCE → ESCALATE)](#4-core-flow)
5. [Feature catalogue](#5-feature-catalogue)
6. [System architecture](#6-system-architecture)
7. [Technology stack](#7-technology-stack)
8. [Data model (Firestore)](#8-data-model-firestore)
9. [Pages & modules inventory](#9-pages--modules-inventory)
10. [AI verification pipeline](#10-ai-verification-pipeline)
11. [Notifications subsystem](#11-notifications-subsystem)
12. [Connected Monitoring module](#12-connected-monitoring-module)
13. [Security model](#13-security-model)
14. [Internationalisation (i18n)](#14-internationalisation-i18n)
15. [Android app (Capacitor)](#15-android-app-capacitor)
16. [Build, run & deploy](#16-build-run--deploy)
17. [What is real vs simulated](#17-what-is-real-vs-simulated)
18. [Known issues, risks & bugs](#18-known-issues-risks--bugs)
19. [Recommendations & roadmap](#19-recommendations--roadmap)
20. [Appendix A — file inventory](#appendix-a--file-inventory)
21. [Appendix B — glossary](#appendix-b--glossary)
22. [Appendix C — links](#appendix-c--links)

---

## 1. Executive summary

**MediCare** is a medication-adherence platform that goes beyond a normal reminder app.
Every dose must be **proven as taken** using an on-camera, three-step AI anti-cheat flow;
a missed dose triggers a **virtual-wallet penalty** and an **automatic escalation to a care
taker**. It runs as a plain HTML/CSS/JavaScript web app (no bundler, no framework) backed by
Firebase (Auth + Firestore), with a serverless Vercel relay for caregiver notifications and a
Capacitor Android wrapper that can override Do-Not-Disturb for critical alarms.

There are two roles:

- **Patient** — today's medicines, reminders, AI dose verification, wellness/fitness hub, an AI
  health companion, a virtual wallet that is penalised on misses, and care-taker management.
- **Admin** — a workspace showing all patients, aggregate adherence/completion/missed
  statistics, per-patient medicine management, dose history and an alert centre.

**Overall assessment:** a genuinely working, well-architected hackathon product with real
Firebase data, working ML inference in the browser, and a real push-notification path. The
headline "escalate to care taker" story is currently weakened by two concrete bugs (a client
config guard that disables the alert call, and a server-side path that never notifies care
takers) — these are the first things to fix. Details in
[§18](#18-known-issues-risks--bugs).

**Recent changes captured in this report**

- `monitor.html` ("Connected Monitoring") was added and integrated into the app-shell
  navigation (it is now a patient burger-menu tab).
- The burger/drawer menu was **removed from the login page** (`index.html`) so the drawer only
  appears inside the authenticated app.

---

## 2. Problem statement

Non-adherence to medication is one of the largest and most preventable health problems.
Patients forget doses, skip them silently, and care takers (family, nurses) have no reliable way
to find out it happened. Existing reminder apps only say *"it's time"* — they:

- **cannot tell whether the medicine was actually taken**, and
- do not **escalate the miss** to someone who can act.

**The real gap:** we do not just need a reminder. We need **proof of ingestion**, an
**incentive to comply**, and **automatic escalation when a dose fails** — in one system.

---

## 3. Solution overview

| Pillar | What it does |
|---|---|
| **Remind** | Alert the patient when a dose is due (browser, native Android alarm, or scheduled cloud function). |
| **Verify** | Force a three-step AI anti-cheat proof (show → take → gone) before the alert can be cleared. |
| **Enforce** | Missing the verification window deducts a virtual-wallet penalty (₹10) and records an alert. |
| **Escalate** | On a miss, subscribed care takers get a push (FCM / ntfy / WhatsApp / SMS) and can open a live dose-status page. |

---

## 4. Core flow

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

Enforcement is **dual**: client-side (`verify.js` `handleMissed`) and server-side
(`functions/index.js` `expireMissedDoses`, every 5 minutes), so closing the app does not escape
the penalty.

---

## 5. Feature catalogue

### Patient
- **Dashboard** — today's medicine timeline (AM/PM), adherence %, streak, wallet balance,
  upcoming dose count, archived-state handling.
- **Medication reminders** — add/edit medicines with `times[]`, frequency, and reference photo;
  triggers the red alert screen.
- **AI ingestion verification** — three-step anti-cheat proof (see §10).
- **Virtual wallet & penalties** — `STARTING_WALLET_BALANCE = 500`; `₹10` deducted on a
  verified miss, written as a Firestore transaction.
- **Health records** — personal medical records.
- **Appointments** — scheduled visits.
- **Nearby hospitals** — location-based hospital list.
- **Fitness & wellness** — fitness hub, details, plan, reminders, diet plan.
- **AI health companion** (`caremate.html`) — rule-based chat + wellness hub.
- **Connected monitoring** (`monitor.html`) — Bluetooth/manual vitals with a safety-rules engine
  and AI explanation (see §12).
- **Emergency contacts** — trusted contacts, relative alerts.
- **Profile / settings** — personal details, theme, language.

### Care taker
- **Subscription page** (`care-taker.html`) — enter patient email → save device FCM token under
  `users.caregiverWebPushTokens` (anonymous merge, no login) → live dose panel.

### Admin
- **Dashboard** — total patients, completed/missed today, total penalties; patient drill-down.
- **Patient details** — per-patient medicines, dose history, alerts, care takers.
- **Alert center** — raised caregiver alerts with review state.
- **Reports** — statistics/trends.
- **Settings** — admin account configuration.

---

## 6. System architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT (browser / Android)                  │
│                                                                     │
│  index.html (login)      patient-dashboard.html    admin-*.html     │
│        │                        │                       │           │
│        └──────────┬─────────────┴───────────┬───────────┘           │
│                   │                         │                       │
│   js/app-shell.js (sidebar, topbar, search, notifications, theme)   │
│                   │                                                 │
│   auth.js  patient.js  admin.js  verify.js  monitor.html  caremate  │
│                   │                                                 │
│   TensorFlow.js  ── Teachable Machine pill model                    │
│                  ── MoveNet pose (hand-to-mouth)                    │
│                  ── MobileNet reference-photo matcher (cosine)      │
│                  ── COCO-SSD fallback                               │
└───────────┬─────────────────────────────┬───────────────────────────┘
            │                             │
   Firebase SDK (compat)          fetch → Vercel relay /api/notify
            │                             │
            ▼                             ▼
 ┌────────────────────┐        ┌──────────────────────────────┐
 │ Firebase            │        │ Vercel serverless relay      │
 │  • Auth (email/pw)  │        │  • validates Firebase ID     │
 │  • Firestore        │        │    token (RS256)             │
 │  • Cloud Messaging  │◄───────│  • fans out to FCM / ntfy /  │
 │  • Hosting (www/)   │        │    Discord / Slack / Telegram│
 │  • Functions        │        │    / CallMeBot / Twilio / SMS│
 └────────────────────┘        └──────────────────────────────┘
            ▲
            │ scheduled (needs Blaze plan)
 ┌────────────────────────────┐
 │ functions/index.js          │
 │  • sendMedicationReminders  │
 │  • expireMissedDoses        │
 └────────────────────────────┘
```

---

## 7. Technology stack

| Layer | Technologies |
|---|---|
| Frontend | Pure HTML / CSS / JavaScript (no build step, no framework) |
| AI / ML | TensorFlow.js, Teachable Machine model, MoveNet pose estimation, MobileNet, COCO-SSD |
| Auth & data | Firebase Authentication (email/password), Cloud Firestore |
| Push | Firebase Cloud Messaging (FCM HTTP v1) + serverless relay |
| Serverless relay | Vercel Functions (`notify.js`, `chat.js`) |
| Cloud functions | Firebase Functions v2 (`functions/index.js`, scheduler + Firestore trigger) |
| Mobile | Capacitor → Android (custom urgent-alarm plugin) |
| Hosting | Firebase Hosting (`www/`), cache-control per asset type |
| PWA | Service worker (`firebase-messaging-sw.js`), manifest, icons |
| i18n | In-house translation layer (`js/i18n.js`), 20+ Indian languages |

---

## 8. Data model (Firestore)

| Collection | Key fields | Written by |
|---|---|---|
| `users/{uid}` | `name`, `email`, `role` (`patient`/`admin`), `walletBalance`, `status` (`archived`), `relativeContacts[]`, `relativePhone`, `webPushTokens[]`, `caregiverWebPushTokens[]`, `alertTopic`, `reminderTimeZone`, `createdAt` | signup, profile, push setup |
| `medicines/{id}` | `patientId`, `name`, `dosage`, `times[]`, `time` (legacy), `frequency` (`daily`/`weekly`), `days[]`, `refEmbedding`/`refEmbeddings[]` (MobileNet vectors), `refPhoto`, `createdAt` | patient/admin |
| `doses/{medId_YYYY-MM-DD_HHMM}` | `patientId`, `medId`, `medName`, `dosage`, `date`, `scheduledTime`, `status` (`pending`/`verified`/`missed`), `verifiedAt`, `detectedAs`, `verifiedVia`, `missedAt`, `missedBy` (`server`) | patient app + cloud function |
| `alerts/{id}` | `patientId`, `doseId`, `medId`, `medName`, `message`, `createdAt`, `status`/`reviewedAt` | patient app + cloud function |
| `healthRecords/{id}` | patient health records | patient/admin |

Dose document IDs are deterministic (`${medicineId}_${date}_${time without colon}`), which makes
reminder/penalty writes idempotent.

---

## 9. Pages & modules inventory

### HTML pages (root)

| Page | ~Lines | Role |
|---|---|---|
| `index.html` | 55 | Login / signup (burger menu removed) |
| `patient-dashboard.html` | 216 | Patient home |
| `medication-reminders.html` | 69 | Medicine management |
| `verify.html` | 26 | Full-screen AI verification / alarm |
| `health-records.html` | 85 | Medical records |
| `appointments.html` | 83 | Appointments |
| `nearby-hospitals.html` | 240 | Hospitals nearby |
| `fitness-checking.html` | 50 | Wellness hub |
| `fitness-details.html` | 55 | Fitness details |
| `fitness-plan.html` | 55 | Fitness plan |
| `fitness-reminders.html` | 55 | Fitness reminders |
| `diet-plan.html` | 55 | Diet plan |
| `caremate.html` | 840 | AI health companion + wellness |
| `monitor.html` | 898 | **Connected Monitoring** (new) |
| `emergency-contacts.html` | 44 | Emergency contacts |
| `profile.html` | 84 | Patient profile |
| `settings.html` | 68 | Settings |
| `care-taker.html` | 40 | Care-taker subscription + live view |
| `admin-dashboard.html` | 28 | Admin home |
| `admin-alerts.html` | 45 | Admin alert center |
| `admin-reports.html` | 54 | Admin reports |
| `admin-settings.html` | 54 | Admin settings |
| `patient-details.html` | 295 | Admin per-patient view |
| `SYNOPSIS.html` | 179 | Project synopsis |

### Application JavaScript (`js/`)

| File | Lines | Purpose |
|---|---|---|
| `verify.js` | 693 | Countdown, alarm, 3-step AI verification, miss handling, caregiver call |
| `patient.js` | 623 | Dashboard, med add, reminders, streaks, wallet, archived state |
| `i18n.js` | 474 | Multi-language strings (20+ languages) |
| `admin.js` | 427 | Aggregate stats, patient list/detail, add/remove medicines |
| `app-shell.js` | 376 | Sidebar/topbar shell, global search, notification bell, theme |
| `patient-details.js` | 382 | Admin per-patient management |
| `fitness-assistant.js` | 279 | Wellness plan generation |
| `admin-pages.js` | 243 | Alerts / reports / settings pages |
| `notifications.js` | 215 | Web + native notification abstraction |
| `auth.js` | 117 | Sign-in / sign-up / role routing |
| `firebase-config.js` | 120 | Firebase config, `DEMO_CONFIG`, constants |
| `care-taker.js` | 87 | Care-taker subscription + live dose view |
| `medicine-match.js` | 63 | MobileNet reference-photo matcher |
| `ml-loader.js` | 57 | Lazy-load ML libraries |
| `loading.js` | 38 | Loading overlay |
| `theme.js` | 34 | Light/dark theme |
| `push-notifications.js` | 30 | FCM token registration |
| `fitness-page-nav.js` | 43 | Fitness hub navigation |
| `pwa.js` | 6 | Service-worker registration |

### CSS (`css/`)
`style.css`, `dashboard.css`, `app-shell.css`, `admin-pages.css`, `fitness-pages.css`.

### Serverless / backend
- `functions/index.js` — scheduled reminders + server-side missed-dose enforcement.
- `vercel-api/api/notify.js` — caregiver alert relay (FCM/WhatsApp/SMS/webhook).
- `vercel-api/api/chat.js` — rule-based AI chat responder.
- `dev-server.mjs` — local static server + `/api/chat` relay.

---

## 10. AI verification pipeline

Three complementary detectors run on camera, each with a graceful fallback so a live demo never
dies:

1. **Custom pill classifier** — Teachable Machine model self-hosted at
   `www/js/vendor/tm-model/` (classes `Tablets`, `syrup`, `other objects`, `human`).
   Accepted classes `Tablets` / `syrup`, threshold `0.60`. Falls back to **COCO-SSD**
   (`bottle`, threshold `0.55`) if it fails to load.
2. **Reference-photo matcher** (`medicine-match.js`, one-shot learning) — a photo enrolled per
   medicine becomes a MobileNet embedding stored on the medicine doc; live frames are embedded
   and compared by **cosine similarity** (`THRESHOLD 0.72`, `UNCERTAIN 0.55`, `GONE 0.45`).
   This proves the *correct* medicine is held.
3. **MoveNet pose AI** (`SINGLEPOSE_LIGHTNING`) — `analyzeHandToMouth()` checks each wrist's
   distance to the nose relative to eye-distance (radius = `eyeDist × 3.0`); 3 hits advance the
   phase. If it never fires, a manual confirm button appears after
   `MANUAL_CONFIRM_AFTER_SECONDS` (40 s).

The verification window can only be *shortened* via `?window=90` (used by "Test Reminder Now"),
never extended beyond `DEMO_CONFIG.VERIFY_WINDOW_SECONDS`.

Result metadata saved on the dose: `verifiedVia` = `medicine-match` | `medicine-detected` |
`ingestion-sequence` | `manual-confirm`.

**Alarm behaviour:** `verify.js` synthesises a square-wave alarm with the Web Audio API (no
audio file), retries after the first user gesture (autoplay policy), blocks the Back button
(`guardBackNavigation`), and hides "Back to dashboard" until resolved.

ML libraries are lazy-loaded via `ml-loader.js` and cached cache-first by the service worker, so
pages paint instantly and the alert page works offline.

---

## 11. Notifications subsystem

### Patients
Chosen by `patient.js`, in priority order:
1. **Android native alarm** via the custom `UrgentAlerts` Capacitor plugin (scheduled in
   `notifications.js`) — full-screen alert, rings on the **alarm stream, bypassing silent /
   Do-Not-Disturb**. Permissions: `USE_FULL_SCREEN_INTENT`, `SCHEDULE_EXACT_ALARM`,
   `ACCESS_NOTIFICATION_POLICY`, `POST_NOTIFICATIONS`, etc.
2. **FCM web push** (`push-notifications.js`) when `FCM_VAPID_KEY` is set.
3. **In-page polling** (`checkDueDoses`, every 3 s, ±`DOSE_GRACE_MINUTES` = 2 min) plus a
   per-dose `setTimeout` (`scheduleBrowserReminders`).
- Server-scheduled reminders exist in `functions/index.js` (`sendMedicationReminders`, every
  minute) but require the paid **Firebase Blaze** plan.

### Care takers
- `care-taker.html` stores an anonymous FCM token merge into `users.caregiverWebPushTokens` and
  shows a live dose panel.
- On a missed dose, the patient device calls the **Vercel relay** `/api/notify`, which can fan
  out to FCM push, ntfy.sh, Discord/Slack/Telegram webhooks, CallMeBot/Twilio/Meta WhatsApp, and
  SMS.
- The relay authenticates the caller with a **Firebase ID token** (RS256 verified against
  Google's public certs, `aud`/`iss`/`exp` checks) and pins `patientId` to the token's `uid`.

---

## 12. Connected Monitoring module

`monitor.html` is a self-contained patient page (now integrated into the app shell as the
**"Connected Monitoring"** sidebar tab, icon 🩺) for recording vitals from consumer Bluetooth
devices or manually.

### Purpose
Let a patient record **blood pressure, blood glucose, heart rate, and blood oxygen (SpO₂)** from
standard Bluetooth (GATT) health devices or by manual entry, then receive a deterministic
**safety assessment** and an **AI explanation** of the readings.

### Layout (two columns)
- **Left:** Devices (Bluetooth pairing list + status), Add-a-reading form (measurement type,
  glucose context, systolic/diastolic or value/unit, timestamp), Recorded-readings table
  (measurement, value, recorded, source, assessment).
- **Right:** Your profile (loaded from a configured website source), Safety assessment,
  AI explanation (button → educational output), Pacemaker (stub — requires an authorized
  manufacturer/clinic feed).

### Key behaviours
- **Safety rules engine is the only thing that sets an alert level** (red/amber/green) from
  `THRESHOLDS`; the AI never sets severity. Thresholds are clearly marked as **placeholders
  requiring clinician sign-off**.
- Thresholds: BP (`redHighSys 180` / `redHighDia 120`, `redLowSys 90` / `redLowDia 60`,
  amber `140`/`90`), glucose (`redLow 54` / `redHigh 250`, amber `70`/`180`), HR (`redLow 40` /
  `redHigh 130`, amber `50`/`100`), plus SpO₂.
- **Pacemaker section** is intentionally a stub: a pacemaker cannot be paired from a web page
  over standard Bluetooth; it needs an authorized feed (Medtronic CareLink, Abbott Merlin.net,
  Boston Scientific Latitude, Biotronik Home Monitoring, or a clinic device check). The "What
  integration is needed?" button explains this.
- A persistent **"Not a medical device and not continuously monitored"** banner makes clear the
  module never diagnoses, never changes medication/device settings, and never says it is safe to
  delay urgent care.
- **Readings are stored in the browser only** (`localStorage`), not in Firestore — so the care
  team/admin cannot see them.
- Self-hosted log: `toast("Pacemaker data needs an authorized manufacturer/clinic feed. See
  CONNECTED-MONITORING.md.")`.

### What was changed during integration
- Converted the standalone page to use the app shell: `main.fitness-page` + `.page-head` row
  containing the `SAMPLE MODE` pill; removed the legacy standalone header.
- Added the `css/app-shell.css` link, app-shell CSS tokens + dark-mode token overrides, and the
  bottom script chain (`firebase-*-compat`, `firebase-config.js`, `theme.js`, `app-shell.js`,
  `i18n.js`).
- Added `{ label: 'Connected Monitoring', href: 'monitor.html', icon: '🩺' }` to `patientLinks`
  in `js/app-shell.js`.
- Added the Telugu label `'Connected Monitoring': 'కనెక్టెడ్ మానిటరింగ్'` to `js/i18n.js`.
- Verified in-browser: sidebar + toggle present, body classes `app-shell-body patient-shell-body`,
  nav includes the new tab, no horizontal overflow, mode pill works, Telugu switch translates the
  tab and title, console clean.

> **Open questions:** (a) whether `monitor.html` should have a login guard, and (b) whether its
> page content (headings/labels) should be fully translated into Telugu. Both were raised and are
> pending a decision.

---

## 13. Security model

`firestore.rules` is a hardened set (replacing the original open demo rules):

- `users`: **readable by anyone** (deliberate — anonymous care-taker lookup by email);
  self-create blocked from `role == 'admin'`; owners can edit their doc but not their role;
  anonymous care takers may only *merge* `caregiverWebPushTokens` + `updatedAt`.
- `medicines`: read/update/delete only by owner or admin.
- `doses`: owner/admin read, **plus anonymous read** for the live care-taker view.
- `alerts` / `healthRecords`: patients own theirs; only admins may update/delete.
- First-admin bootstrap is documented (create the first admin via console / temporary rule).

**Trade-off:** `users` and `doses` are world-readable, so anyone who knows a document id can read
patient state anonymously. Acceptable for a demo, not for production (see §18).

---

## 14. Internationalisation (i18n)

`js/i18n.js` provides an in-house translation layer with `languageOptions` covering 20+ Indian
languages and English: Assamese, Bengali, Bodo, Dogri, Gujarati, Hindi, Kannada, Kashmiri,
Konkani, Maithili, Malayalam, Meitei, Marathi, Nepali, Odia, Punjabi, Sanskrit, Santali, Sindhi,
Tamil, **Telugu**, and Urdu.

A `commonRows` table supplies the shared navigation and form strings per language, applied to
elements across pages (nav labels, buttons, titles). The sidebar "Connected Monitoring" tab and
related strings were added so the monitor page participates in language switching.

---

## 15. Android app (Capacitor)

- `capacitor.config.json`: appId `com.lifeline.medications`, appName `MediCare`, `webDir: www`.
- Custom Java sources under `android/app/src/main/java/com/lifeline/medications/`:
  `MainActivity.java`, `UrgentAlertsPlugin.java`, `AlarmActivity.java`, `AlarmReceiver.java`,
  `AlarmService.java` — the alarm stack behind the DND-bypassing urgent channel.
- Manifest declares camera, notification, exact-alarm, full-screen-intent, wake-lock, vibration,
  and battery-optimisation-exemption permissions, plus a foreground `mediaPlayback` service.
- `@capacitor/local-notifications` is used alongside the custom plugin.

---

## 16. Build, run & deploy

```bash
# local run (camera needs http://localhost, not file://)
node dev-server.mjs            # or: python -m http.server 8080

# web build + deploy
npm run build:web              # copy root sources -> www/
npm run firebase:deploy        # build:web + firebase deploy

# android
npm run android:sync           # npx cap sync android
npm run android:open           # open Android Studio

# relay (separate)
cd vercel-api && vercel --prod
```

- **Source of truth is the repo root.** `www/` is generated by `scripts/build-web.ps1`.
  Always edit root, then run `npm run build:web`.
- Firebase Hosting: HTML/CSS/JS/JSON are `no-cache`; images cached 7 days.
- Firebase Functions source = `functions/`; Firestore rules = `firestore.rules`.

---

## 17. What is real vs simulated

**Real**
- Firebase Auth + Firestore data model and live dashboards.
- Wallet/penalty transaction logic.
- Escalation timers, client **and** server.
- Custom Teachable Machine pill inference in-browser.
- MoveNet hand-to-mouth detection and MobileNet reference-photo matching.
- FCM push to care takers via the relay.
- Capacitor native DND-bypassing alarms.

**Simulated / scoped**
- The ₹10 penalty is a *virtual* wallet field (no payment gateway).
- Server-side scheduled reminders/enforcement need the paid **Firebase Blaze** plan; the code is
  ready but inert on the free tier.
- WhatsApp/SMS via Twilio are optional/trial.
- Connected Monitoring readings are browser-only (`localStorage`) and its thresholds are
  placeholders needing clinician sign-off.

---

## 18. Known issues, risks & bugs

### High priority
1. **Caregiver alert from the patient device is effectively disabled.**
   `js/verify.js` → `notifyCareTakers()` returns early unless `CARE_ALERT_API.secret` exists and
   is not `CHANGE_ME`:
   ```js
   if (!CARE_ALERT_API?.url || !CARE_ALERT_API.secret || CARE_ALERT_API.secret.startsWith('CHANGE_ME')) return;
   ```
   But `js/firebase-config.js` now defines only `CARE_ALERT_API.url` (the shared secret was
   removed — the relay authenticates with a Firebase ID token). It also still sends an
   `X-Care-Secret` header instead of `Authorization: Bearer <idToken>`.
   **Effect:** the client never calls the relay, so no caregiver push/ntfy/WhatsApp is sent for a
   client-detected miss. Fix: remove the `secret` guard and send the user's ID token:
   ```js
   const token = await currentUser.getIdToken();
   fetch(CARE_ALERT_API.url, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
     body: JSON.stringify({ ... })
   });
   ```
2. **Server-side missed doses never alert care takers.**
   `functions/index.js` `expireMissedDoses` writes the `alerts` doc and deducts the wallet but
   never calls the Vercel relay and never sends FCM to `caregiverWebPushTokens`. Combined with
   #1, the whole "escalate to care taker" story currently depends on a broken client path.
3. **Admin self-signup conflicts with the rules.** `auth.js` allows choosing the Admin role at
   signup and writes `role: 'admin'`, but `firestore.rules` denies `create` when
   `role == 'admin'`. The UI path will be rejected by the rules. The existing admin was created
   under the old open rules; document the console bootstrap clearly.

### Medium
4. **`users` and `doses` are world-readable.** Anyone who knows/guesses a document id can read
   patient PII and dose status anonymously.
5. **Firebase web config + VAPID key are committed** in `js/firebase-config.js` and inlined in
   `firebase-messaging-sw.js`. The API key is not a secret by itself (Firebase expects it
   public), but tighten **API key restrictions** and App Check, and restrict relay CORS
   (currently `*`).
6. **Duplicate source of truth for doses.** Client (`verify.js`/`patient.js`), the cloud function,
   and the relay all mutate dose status/wallet. Most writes are guarded by transactions and
   deterministic ids, but keep the penalty constants in sync (`DEMO_CONFIG.PENALTY_AMOUNT` /
   `VERIFY_WINDOW_SECONDS` vs `functions/index.js` — currently 10 and 10 min).
7. **`verify.js` reads `CARE_ALERT_API.secret`** — a leftover from the old shared-secret design
   (see #1).
8. **Reference model location mismatch.** `TRAINING_GUIDE.md` / `README.md` say to drop the model
   in `models/pill-model/`, but the wired-in path is the self-hosted `www/js/vendor/tm-model/`.
   `models/pill-model/` contains only a `README.txt`. Minor doc drift.

### Low / hygiene
9. **Duplicated deployed copy.** Root and `www/` both exist; editing the wrong one is a footgun.
10. **`typeScript ^7.0.2`** in devDependencies is unusual; confirm it installs as intended or
    drop it — nothing in the build uses `tsc`.
11. **`admin.js` `openPatientDetail` renders `m.time`** while newer medicines store `times[]`,
   so the admin modal may show `undefined` for multi-time medicines.
12. **No automated tests / linting / CI.** Only PowerShell polish scripts.
13. **`ntfy.sh` topics are predictable-ish** (`verimed-<name>-<random>`); acceptable but not
    secret-grade. Alert content is PII (medicine names).

### Connected Monitoring specific
14. **Readings are local-only** — stored in `localStorage`, never sent to Firestore, so the care
    team/admin cannot see them.
15. **Thresholds/wording are placeholders** and must be replaced and signed off by a qualified
    clinician before any real use.
16. **No login guard** on `monitor.html` by default (it is reachable directly). Decide whether to
    add one.

---

## 19. Recommendations & roadmap

**Priority order**
1. Fix the caregiver alert path (#1) and add the same alert to server-side enforcement (#2) —
   this is the headline feature.
2. Reconcile admin signup with the rules (#3).
3. Add Firebase App Check + restrict the web API key + tighten relay CORS (#5).
4. Add a small CI (lint + a smoke test that loads each page and checks for console errors).
5. Consolidate constants so client and cloud function cannot drift (#6).
6. Delete `_recover/` and the `/__recover` dev endpoint once done.
7. If scope allows: log care takers in and read patient state via `caregiverUids` to close the
   anonymous-read gap (#4).

**Connected Monitoring roadmap**
- Persist readings to Firestore (opt-in) so clinicians/care team can review trends.
- Get threshold wording and severity levels reviewed and signed off by a clinician.
- Replace the pacemaker stub with a consented, authorized manufacturer/clinic feed integration.
- Add a login guard if the page should require an authenticated patient session.
- Full i18n coverage for the page content (if not already decided).

**Product roadmap**
- Channel-agnostic notifications (WhatsApp / SMS / email alongside FCM) — architected already.
- Real payments to replace the virtual wallet.
- Enable Firebase Blaze for always-on server-side reminders/enforcement.

---

## Appendix A — file inventory

**Root documentation:** `README.md`, `SYNOPSIS.md`, `SYNOPSIS.html`, `TRAINING_GUIDE.md`,
`CAREGIVER_SETUP.md`, `PROJECT_ANALYSIS.md`, `PROJECT_REPORT.md` (this document).

**Config / infra:** `firebase.json`, `firestore.rules`, `.firebaserc`, `capacitor.config.json`,
`package.json`, `dev-server.mjs`, `firebase-messaging-sw.js`, `manifest.json`.

**Vendored libraries** (`www/js/vendor/`): `firebase-*-compat`, `tf.min.js`,
`teachablemachine-image.min.js`, `mobilenet.min.js`, `pose-detection.min.js`, `coco-ssd.min.js`,
`confetti.browser.min.js`, and `tm-model/` (model.json, metadata.json, model.weights.bin ≈ 2.1 MB).

**Directories:** `css/`, `js/`, `functions/`, `vercel-api/`, `android/`, `scripts/`, `models/`,
`icons/`, `screenshots/`, `www/` (generated), `.well-known/`, `.firebase-config/`, `.firebase/`.

---

## Appendix B — glossary

| Term | Meaning |
|---|---|
| **Dose** | One scheduled instance of a medicine at a date/time |
| **Verification window** | Time allowed to prove ingestion (10 min live; 90 s demo) |
| **Penalty** | `₹10` virtual-wallet deduction on a missed dose |
| **Escalation** | Notifying subscribed care takers about a miss |
| **Care taker** | Family/nurse subscribed to a patient's alerts |
| **App shell** | Shared sidebar + topbar layout (`app-shell.js` / `app-shell.css`) |
| **Relay** | Vercel serverless function that fans alerts out to channels |
| **Blaze plan** | Firebase paid tier needed for scheduled cloud functions |

---

## Appendix C — links

| Asset | URL |
|---|---|
| Web app (live) | https://verimed-6b92d.web.app |
| Care-taker subscription | https://verimed-6b92d.web.app/care-taker.html |
| Connected Monitoring | https://verimed-6b92d.web.app/monitor.html |
| Push relay server | https://medicare-alerts.vercel.app |

---

## One-line summary

MediCare is a well-architected, genuinely working hackathon-grade medication-adherence app —
Firebase-backed, AI-verified ingestion, wallet penalties, an Android DND-bypassing alarm, and a
new Connected Monitoring module — with the caregiver escalation path currently broken by a
config/rules mismatch and a missing server-side push, which are the first things to fix.

---

*Prepared as the full project report for MediCare. Supersedes/expands `PROJECT_ANALYSIS.md` with
the Connected Monitoring module and latest state.*
