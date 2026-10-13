# Care Taker Alerts (FREE — no Twilio needed)

When a dose is missed, subscribed care takers get alerts on their phone.
Three free-tier channels are supported and can be mixed — set the env vars you
want, the rest are skipped automatically. **None of these need Twilio.**

| Channel | Cost | Setup friction | Reaches |
|---|---|---|---|
| **ntfy.sh** (webhook) | Free | Zero — no account, no opt-in code | Care taker's phone (ntfy app) |
| **CallMeBot** (WhatsApp) | Free | One-time opt-in per number | WhatsApp on the phone number |
| **Web Push (FCM)** | Free | Care taker taps subscribe once | Subscribed browser devices |
| Discord / Slack / Telegram | Free | Paste an incoming-webhook URL | That app on any device |

---

## Recommended: ntfy.sh (simplest free phone alert)

1. Care taker installs the **ntfy** app (Play Store / App Store) — or just opens
   `https://ntfy.sh/<your-topic>` in a browser.
2. Pick a hard-to-guess topic name, e.g. `medicare-bhargavi-7x2k`.
3. Subscribe to that topic in the app.
4. Set one Vercel env var:

```
NTFY_TOPIC = medicare-bhargavi-7x2k
```

Done. Every missed dose now sends a real-time notification to that phone —
no account, no cost.

> Prefer Discord/Slack/Zapier? Set `ALERT_WEBHOOK_URL` to their incoming
> webhook URL instead — the relay POSTs JSON to it.

---

## WhatsApp via CallMeBot (uses phone numbers, still free)

1. Each care taker follows the one-time opt-in at
   https://www.callmebot.com/blog/free-api-whatsapp-messages/ — they message the
   CallMeBot number and receive a personal API key.
2. Set one Vercel env var:

```
CALLMEBOT_APIKEY = <their key>
CALLMEBOT_PHONE  = +91XXXXXXXXXX   # the number that owns that key
```

For multiple numbers, store a `whatsappApiKey` field on each contact object in
the patient's `relativeContacts` — the relay uses the per-contact key if present.

---

## How it works

```
Dose missed (patient device)
        ↓
Alert written to Firestore + wallet penalty applied
        ↓
Patient device calls medicare-alerts.vercel.app/api/notify
        ↓
Relay fans out to every configured channel:
   • ntfy.sh / webhook → care taker's phone instantly
   • CallMeBot         → WhatsApp on each care taker number
   • FCM web push      → subscribed browsers
        ↓
📱 Alert on the care taker's phone
```

---

## Care taker subscription (push — 30 seconds)

1. Open **https://verimed-6b92d.web.app/care-taker.html** (any browser).
2. Enter the patient's signup email.
3. Tap **Enable notifications** → allow the browser permission.
4. Done — the device token is saved and a live "today's medicines" panel appears.

---

## Server configuration (Vercel → Project → Settings → Environment Variables)

| Var | Purpose |
|---|---|
| `CARE_ALERT_SECRET` | Must match `CARE_ALERT_API.secret` in `js/firebase-config.js` |
| `NTFY_TOPIC` | ntfy.sh topic — simplest free phone alert |
| `ALERT_WEBHOOK_URL` | Any generic webhook (ntfy.sh URL, Discord, Slack, Zapier) |
| `CALLMEBOT_APIKEY` / `CALLMEBOT_PHONE` | Free WhatsApp via CallMeBot |
| `FCM_SERVICE_ACCOUNT` | base64 service-account JSON (web push) |
| `FCM_PROJECT_ID` | Firebase project id (default `verimed-6b92d`) |
| `CONTACT_DEFAULT_COUNTRY_CODE` | Dial code for 10-digit numbers (default `91`) |
| `TWILIO_*` | Optional, only if you later want Twilio |

## Deploy the relay

```bash
cd vercel-api
vercel login
vercel --prod
```

Then open https://medicare-alerts.vercel.app — the page lists which channels
are active (e.g. "Channels: Webhook, Push (FCM)").

## Demo day tips

- Subscribe your phone to the ntfy topic before the demo and test once.
- Trigger flow: patient login → add a medicine due in a minute → let the verification
  countdown expire without verifying.
