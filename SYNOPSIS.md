# MediCare — Smart Health Reminders That Can't Be Ignored
## Project Synopsis

> A hackathon build that combines **AI-powered pill recognition**, **anti-cheat
> ingestion verification**, **wallet-based penalty enforcement**, and **free
> push notifications to care takers** so that no medication dose is skipped —
> and even if it is, someone trusted is told about it instantly.

---

## 1. Problem Statement

Non-adherence to medication is one of the biggest and most preventable health
problems. Patients forget doses, skip them silently, and care takers (family,
nurses) have no reliable way to know it happened. Existing reminder apps only
say "it's time" — they **cannot tell whether the medicine was actually taken**,
and they don't escalate the miss to someone who can act.

**The real gap:** we don't just need a reminder. We need **proof that the dose
was ingested**, an **incentive to comply**, and **automatic escalation when a
dose fails** — all in one system.

---

## 2. Our Solution

MediCare is a medication adherence platform that turns "scheduled reminders"
into **verified, accountable, escalating events**:

1. **Remind** — the patient gets an alert when it's time for a dose.
2. **Verify** — before the alert can be cleared, the patient must pass a
   three-step AI anti-cheat proof that they actually took it.
3. **Enforce** — missing the verification window deducts a wallet penalty.
4. **Escalate** — on a missed dose, every subscribed care taker instantly
   receives a push notification with the patient's live dose status.

---

## 3. Key Features

### 3.1 AI Pill Recognition (Anti-Cheat Step 1)
A custom **Teachable Machine** model, loaded via TensorFlow.js, runs entirely
in the browser and recognises the patient's specific medicines
(`Tablets` / `syrup`). Live confidence bars are shown on screen — the system
checks that the correct medicine is actually being presented.

### 3.2 Real Ingestion Verification (Anti-Cheat Steps 2 & 3)
**MoveNet pose AI** tracks the body and confirms a **hand-to-mouth** motion
while the medicine is held (3 consecutive frames required). Then the system
checks that the medicine is **gone from frame** — so the app can distinguish a
real swallow from the patient merely showing the strip. This blocks "fake
takes" like just waving the bottle.

### 3.3 Escalating Countdown + Manual Fallback
Verification must happen within a **configurable window** (90 seconds in demo,
10 minutes on live reminders). A visible countdown pushes compliance. After a
UI customisable delay, the patient can manually confirm — giving a human
fallback while still enforcing the anti-cheat process first.

### 3.4 Wallet Penalties (Incentive)
`DEMO_CONFIG` defines a virtual wallet (`STARTING_WALLET_BALANCE = 500`).
When the verification window expires without proof, the system writes a
`₹10` penalty transaction (`PENALTY_AMOUNT`) — turning a missed dose into an
accountable, traceable event rather than a silent skip.

### 3.5 Care Taker Push Alerts (FREE, escalation)
When a dose is missed, the patient's device calls a **free serverless relay**
(Vercel) that signs a JWT with a Firebase service account and sends an **FCM
web push** to every subscribed care taker's device. The notification fires even
when the care taker's browser is closed, and tapping it opens a **live dose
status page** (`care-taker.html`).

### 3.6 Role-Based Control
- **Patient** — today's medicines, AM/PM schedule, adherence %, wallet, alert
  history, verification flow, manage care takers.
- **Admin** — aggregate dashboard (total patients, completed/missed today,
  total penalties), and per-patient drill-down into medicines, dose history,
  alerts and care takers.

### 3.7 Android Alarm Even in Silent Mode
The native Android wrapper (Capacitor) schedules local notifications that fire
while the app is closed, using an **urgent channel that overrides Do Not
Disturb** and rings with the device's **alarm stream** — so a critical dose
alert cannot be missed.

---

## 4. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Pure HTML / CSS / JavaScript (no build step) |
| **AI / ML** | TensorFlow.js, Teachable Machine model, MoveNet pose estimation |
| **Backend / Data** | Firebase Authentication, Firestore (real-time) |
| **Push notifications** | Firebase Cloud Messaging (FCM) HTTP v1 |
| **Serverless relay** | Vercel Functions (JWT-signed API calls) |
| **Mobile** | Capacitor → Android (native notifications + alarm bypass) |
| **Hosting** | Firebase Hosting (web app) |

---

## 5. How It Works (Flow)

```
1. Patient signs in → dashboard lists today's medicines (AM / PM schedule).
2. Dose time arrives → alert triggers, verify page opens.
3. Verify page runs 3-step AI proof:
     Step 1  Show  → custom model recognises the correct medicine
     Step 2  Take  → MoveNet confirms hand-to-mouth motion
     Step 3  Gone  → medicine disappears from frame (swallowed)
4. Proof accepted → dose marked "verified", wallet unaffected, ✅ on history.
5. Window expires without proof →
     → ₹10 wallet penalty deducted (transaction recorded)
     → alert saved to Firestore
     → relay (Vercel) → FCM → instant push to ALL care takers' phones
6. Care taker taps notification → live dose status page opens.
```

---

## 6. Demo Walkthrough (Judge-Ready)

1. **Login as Bhargavi (patient)** → today's medicines with AM/PM times visible.
2. **Tap "Test Reminder Now"** → a 90-second verification window starts.
3. **Show the medicine** → confidence bars confirm `Tablets` recognised.
4. **Take it** → hand-to-mouth motion detected; confirm medicine gone.
5. Adherence %, verified count and wallet all update live.
6. **Deliberately miss a dose** → wait for countdown → ₹10 penalty appears.
7. **Care taker's phone pops a push notification** (even if browser closed)
   → tap = live dose status page with the missed dose marked.

---

## 7. What's Real vs Simulated (Be Upfront)

- **Real:** Firebase Auth + Firestore data, live dashboards, wallet transaction
  logic, the custom pill classifier running live inference, MoveNet motion
  detection, and real FCM push notifications delivered to care takers through
  a free serverless relay.
- **Simulated / scoped:** the ₹10 penalty is a virtual wallet value (no real
  payment gateway). Server-scheduled background reminders require the paid
  Firebase Blaze plan; the implementation is ready and simply deploys when
  billing is enabled. Web push is used (WhatsApp Business API is a documented
  optional upgrade).

---

## 8. Scalability & Roadmap

- **Channel-agnostic notifications** — the relay is designed so WhatsApp /
  SMS / email can be added alongside FCM with a one-line configuration change
  (no architectural rewrite).
- **Multi-medicine & multi-patient** — the data model already supports
  per-patient profiles, multiple medicines, and multiple care takers.
- **Real payments** — swap the virtual wallet with a UPI / payment gateway to
  make penalties a real financial incentive.
- **Cloud scheduling** — enable Firebase Blaze (a no-cost billing upgrade
  requires a card, hence deferred) to run server-side expiry and reminders even
  when no device is open.

---

## 9. Links

| Asset | URL |
|---|---|
| Web app (live) | https://verimed-6b92d.web.app |
| Care taker subscription | https://verimed-6b92d.web.app/care-taker.html |
| Push relay server | https://medicare-alerts.vercel.app |

---

*MediCare — built as a hackathon project. All core flows work on the free
tier: AI verification, penalties, and real push alerts to care takers.*
