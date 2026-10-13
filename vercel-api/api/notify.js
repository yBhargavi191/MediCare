// ===================================================================
// MediCare — Caregiver alert relay (Vercel serverless, FREE)
// ===================================================================
// Delivers missed-dose alerts to care takers over whichever channel is
// configured. Everything here is free-tier friendly:
//
//   1. FCM WEB PUSH  — care takers who subscribed on care-taker.html
//   2. WHATSAPP     — Twilio WhatsApp Sandbox (free) OR CallMeBot (free)
//   3. SMS          — Twilio trial number (free credit / trial)
//   4. WEBHOOK      — any free sink: ntfy.sh, Discord, Slack, Telegram, Zapier
//
// Channels are independent: set the env vars you want and the rest are
// silently skipped. No SDK dependencies — plain fetch only.
//
// Environment variables (all optional):
//   FCM_SERVICE_ACCOUNT          base64 service-account JSON (FCM push)
//   FCM_PROJECT_ID               Firebase project id (default verimed-6b92d)
//   FIREBASE_API_KEY             Firebase web API key used to validate ID tokens
//   ALLOW_LEGACY_SECRET          1 = also accept x-care-secret during migration
//   CARE_ALERT_SECRET            legacy shared secret (only with ALLOW_LEGACY_SECRET)
//   TWILIO_ACCOUNT_SID           Twilio account SID
//   TWILIO_AUTH_TOKEN            Twilio auth token
//   TWILIO_WHATSAPP_FROM         e.g. +14155238886  (sandbox number)
//   TWILIO_SMS_FROM              e.g. +1XXXXXXXXXX  (trial SMS number)
//   CALLMEBOT_APIKEY             default CallMeBot key for a demo number
//   CALLMEBOT_PHONE              WhatsApp number that owns the CallMeBot key
//   META_WA_TOKEN                Meta WhatsApp Cloud API access token
//   META_WA_PHONE_ID             Meta WhatsApp sender "Phone number ID"
//   META_WA_TO                   care-taker WhatsApp number (e.g. 919182437647)
//   META_WA_API_VERSION          Graph API version (default "v21.0")
//   ALERT_WEBHOOK_URL            generic POST target (ntfy.sh/<topic>, Discord, ...)
//   NTFY_TOPIC                   shorthand for https://ntfy.sh/<topic>
//   CONTACT_DEFAULT_COUNTRY_CODE default country code (default "91")
// ===================================================================

import crypto from 'crypto';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Care-Secret'
};

const FIREBASE_PROJECT_ID = (process.env.FIREBASE_PROJECT_ID || 'verimed-6b92d').trim();
const FIREBASE_API_KEY = (process.env.FIREBASE_API_KEY || 'AIzaSyBwThXLnL4RkJ58kGuoMy8j_RD3tGeB3VM').trim();
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

const DEFAULT_CC = (process.env.CONTACT_DEFAULT_COUNTRY_CODE || '91').replace(/[^\d]/g, '');

let cachedOAuth = { token: null, expiresAt: 0 };
let certCache = { certs: null, fetchedAt: 0 };

// ---------------------------------------------------------------------
// Firebase ID-token verification (no admin SDK needed).
// The browser never sees a shared secret: it sends its own Firebase ID
// token, we check the signature against Google's public certs, then pin
// patientId to the authenticated user's uid.
// ---------------------------------------------------------------------
function b64urlDecode(input) {
  return Buffer.from(String(input).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

async function getFirebaseCertificates() {
  if (certCache.certs && Date.now() - certCache.fetchedAt < 60 * 60 * 1000) return certCache.certs;
  const res = await fetch(CERTS_URL);
  if (!res.ok) throw new Error(`Firebase cert fetch failed: ${res.status}`);
  const certs = await res.json(); // { <kid>: "-----BEGIN CERTIFICATE-----..." }
  certCache = { certs, fetchedAt: Date.now() };
  return certs;
}

export async function verifyFirebaseIdToken(idToken, certs = null) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) return null;
  const [headerPart, claimsPart, sigPart] = parts;
  let header, claims;
  try {
    header = JSON.parse(b64urlDecode(headerPart).toString('utf8'));
    claims = JSON.parse(b64urlDecode(claimsPart).toString('utf8'));
  } catch (_) { return null; }
  if (!header || header.alg !== 'RS256') return null;

  const certMap = certs || await getFirebaseCertificates();
  const certPem = certMap[header.kid];
  if (!certPem) return null;

  try {
    const key = crypto.createPublicKey(certPem);
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerPart}.${claimsPart}`);
    const signature = Buffer.from(String(sigPart).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    if (!verifier.verify(key, signature)) return null;
  } catch (_) { return null; }

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp < now - 60) return null;
  if (claims.aud !== FIREBASE_API_KEY) return null;
  if (claims.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) return null;
  if (typeof claims.sub !== 'string' || !claims.sub) return null;
  return claims;
}

export default async function handler(request, response) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => response.setHeader(k, v));
  if (request.method === 'OPTIONS') return response.status(204).end();

  if (request.method === 'GET' && !request.url.includes('/notify')) {
    const channels = [];
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_WHATSAPP_FROM) channels.push('WhatsApp (Twilio)');
    if (process.env.CALLMEBOT_APIKEY) channels.push('WhatsApp (CallMeBot)');
    if (process.env.META_WA_TOKEN && process.env.META_WA_PHONE_ID) channels.push('WhatsApp (Meta Cloud API)');
    if (process.env.TWILIO_SMS_FROM) channels.push('SMS (Twilio)');
    if (process.env.ALERT_WEBHOOK_URL || process.env.NTFY_TOPIC) channels.push('Webhook');
    if (process.env.FCM_SERVICE_ACCOUNT) channels.push('Push (FCM)');
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    return response.status(200).send(
      '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>MediCare Alert Relay</title></head>' +
      '<body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#0f766e;color:#fff;text-align:center;">' +
      '<div><div style="font-size:52px;">&#128241;</div><h1 style="margin:8px 0;">MediCare Alert Relay</h1>' +
      '<p style="opacity:.85;">This server delivers caregiver alerts.<br>Status: <strong>&#9989; Running</strong></p>' +
      '<p style="font-size:13px;opacity:.8;">Channels: ' + (channels.length ? channels.join(', ') : 'none configured') + '</p>' +
      '<p style="font-size:13px;opacity:.6;">POST /api/notify &middot; authorized requests only</p></div></body></html>'
    );
  }

  if (request.method !== 'POST' || !request.url.includes('/notify')) {
    return response.status(404).json({ error: 'Not found' });
  }

  // --- Authentication ------------------------------------------------
  // Preferred: a valid Firebase ID token (Authorization: Bearer …).
  // Temporary legacy path (only when ALLOW_LEGACY_SECRET=1 is set): the
  // x-care-secret header. Remove the env var once all clients are updated.
  const authHeader = request.headers['authorization'] || '';
  let actor = null;
  if (authHeader.startsWith('Bearer ')) {
    try {
      actor = await verifyFirebaseIdToken(authHeader.slice(7));
    } catch (error) {
      console.log('ID-token verification error:', String(error).slice(0, 200));
    }
  }
  const legacyOk = process.env.ALLOW_LEGACY_SECRET === '1'
    && process.env.CARE_ALERT_SECRET
    && request.headers['x-care-secret'] === process.env.CARE_ALERT_SECRET;
  if (!actor && !legacyOk) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  const payload = request.body || {};

  // Alerts are the authenticated user's own: pin the patient identity to
  // the verified uid so a caller can never claim to alert for someone else.
  if (actor) payload.patientId = actor.sub;
  const pushTokens = [...new Set((Array.isArray(payload.pushTokens) ? payload.pushTokens : []).filter(Boolean))];
  const contacts = (Array.isArray(payload.contacts) ? payload.contacts : []).filter(c => c && c.phone);

  const title = '\u{1F6A8} MEDICARE ALERT';
  const body = `${payload.patientName || 'Your patient'} missed a medication dose.${payload.message ? '\n' + payload.message : ''}`;
  const smsBody = `${payload.patientName || 'Your patient'} missed a medication dose. ${payload.message || ''}`.trim();

  const result = { push: null, whatsapp: 0, sms: 0, webhook: false, total: pushTokens.length + contacts.length };

  // ---- 1. FCM web push ------------------------------------------------
  if (pushTokens.length) {
    const sent = await sendFcm(pushTokens, title, body, payload.patientId);
    result.push = { sent, total: pushTokens.length };
  }

  // ---- 2. WhatsApp + 3. SMS to phone contacts -------------------------
  const delivery = await Promise.allSettled(contacts.map(contact => notifyContact(contact, body, smsBody)));
  delivery.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.log(`Contact alert failed for ${maskPhone(contacts[i]?.phone)}:`, String(r.reason).slice(0, 200));
      return;
    }
    if (r.value.whatsapp) result.whatsapp++;
    if (r.value.sms) result.sms++;
  });

  // ---- 4a. Global WhatsApp via Twilio (trial testing number) ----------
  // Trial accounts must use a Twilio-provided template via TWILIO_CONTENT_SID.
  const globalTwilioTo = process.env.TWILIO_WHATSAPP_TO;
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM && globalTwilioTo) {
    const to = toE164(globalTwilioTo);
    if (to) {
      const ok = await sendTwilio(`whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`, `whatsapp:${to}`, body, {
        contentSid: process.env.TWILIO_CONTENT_SID,
        contentVariables: {
          1: payload.patientName || 'Your patient',
          2: payload.message || 'missed a medication dose'
        }
      });
      if (ok) result.whatsapp++;
    }
  }

  // ---- 4b. Global WhatsApp via CallMeBot (one care-taker number) -------
  // Lets a single opted-in WhatsApp number receive every missed dose even
  // when no care taker is registered on a patient yet.
  const globalCallMeBot = process.env.CALLMEBOT_APIKEY && process.env.CALLMEBOT_PHONE;
  if (globalCallMeBot) {
    const ok = await sendCallMeBot(process.env.CALLMEBOT_PHONE, process.env.CALLMEBOT_APIKEY, body);
    if (ok) result.whatsapp++;
  }

  // ---- 4c. Global WhatsApp via Meta Cloud API (free tier) -------------
  // Sends free-form text to a single care-taker number. Works within the
  // 24h customer-service window (the care taker must message the sender
  // at least once a day) or when a template has been approved.
  if (process.env.META_WA_TOKEN && process.env.META_WA_PHONE_ID && process.env.META_WA_TO) {
    const ok = await sendMetaWhatsApp(process.env.META_WA_TO, body);
    if (ok) result.whatsapp++;
  }

  // ---- 5. Generic webhook (ntfy.sh / Discord / Slack / Telegram) ------
  // Prefer the per-patient topic sent by the client so alerts reach only
  // that patient's care takers; fall back to the global NTFY_TOPIC.
  const ntfyTopic = String(payload.ntfyTopic || process.env.NTFY_TOPIC || '').trim();
  const webhookUrl = process.env.ALERT_WEBHOOK_URL
    || (ntfyTopic ? `https://ntfy.sh/${encodeURIComponent(ntfyTopic)}` : '');
  if (webhookUrl) result.webhook = await sendWebhook(webhookUrl, title, body, payload);

  const globalMeta = process.env.META_WA_TOKEN && process.env.META_WA_PHONE_ID && process.env.META_WA_TO;
  if (!pushTokens.length && !contacts.length && !webhookUrl && !globalCallMeBot && !process.env.TWILIO_WHATSAPP_TO && !globalMeta) {
    return response.status(200).json({ ...result, note: 'No subscribed care takers yet' });
  }
  return response.status(200).json(result);
}

// ---------------------------------------------------------------------
// Generic webhook: POSTs a JSON payload the way ntfy.sh, Discord, Slack
// and most free services expect.
// ---------------------------------------------------------------------
async function sendWebhook(url, title, body, payload) {
  try {
    let host = '';
    try { host = new URL(url).hostname.toLowerCase(); } catch (_) {}
    const isNtfy = host.endsWith('ntfy.sh') || host.includes('ntfy');

    // ntfy.sh wants a plain-text body; the message title/priority/tags are
    // carried in HTTP headers. (Sending raw JSON makes it render like code.)
    // HTTP headers must be ASCII, so drop any emoji from the title header
    // (the rotating_light tag still renders an emoji in ntfy).
    const headerTitle = title.replace(/[^\x20-\x7E]/g, '').trim() || 'MediCare Alert';
    const req = isNtfy
      ? {
          method: 'POST',
          headers: { Title: headerTitle, Priority: '5', 'X-Priority': '5', Tags: 'rotating_light,warning' },
          body
        }
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            body,
            content: `${title}\n${body}`,
            text: `${title}\n${body}`,
            patientId: payload.patientId || null,
            patientName: payload.patientName || null
          })
        };

    const res = await fetch(url, req);
    if (!res.ok) console.log('Webhook error:', res.status, String(await res.text()).slice(0, 160));
    return res.ok;
  } catch (error) {
    console.log('Webhook request failed:', String(error).slice(0, 200));
    return false;
  }
}

// ---------------------------------------------------------------------
// Phone delivery: try WhatsApp first, then SMS as a fallback.
// ---------------------------------------------------------------------
async function notifyContact(contact, body, smsBody) {
  const to = toE164(contact.phone);
  const out = { whatsapp: false, sms: false };
  if (!to) return out;

  const waFrom = process.env.TWILIO_WHATSAPP_FROM;
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && waFrom) {
    const ok = await sendTwilio(`whatsapp:${waFrom}`, `whatsapp:${to}`, body);
    if (ok) { out.whatsapp = true; return out; }
  } else {
    const perContactKey = contact.whatsappApiKey;
    const key = perContactKey || process.env.CALLMEBOT_APIKEY;
    if (key) {
      // A per-contact key is tied to that contact's own number; the global
      // key is tied to whatever CALLMEBOT_PHONE was opted in.
      const callbackPhone = perContactKey ? to : (process.env.CALLMEBOT_PHONE || to);
      const ok = await sendCallMeBot(callbackPhone, key, body);
      if (ok) { out.whatsapp = true; return out; }
    }
  }

  const smsFrom = process.env.TWILIO_SMS_FROM;
  if (smsFrom && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    out.sms = await sendTwilio(smsFrom, to, smsBody);
  }
  return out;
}

async function sendTwilio(from, to, body, opts = {}) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  try {
    const params = { From: from, To: to };
    if (opts.contentSid) {
      // WhatsApp trial accounts must use a Twilio-provided template.
      params.ContentSid = opts.contentSid;
      params.ContentVariables = JSON.stringify(opts.contentVariables || {});
    } else {
      params.Body = body;
    }
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(params)
    });
    if (!res.ok) console.log('Twilio error:', String(await res.text()).slice(0, 200));
    return res.ok;
  } catch (error) {
    console.log('Twilio request failed:', String(error).slice(0, 200));
    return false;
  }
}

async function sendCallMeBot(phone, apikey, body) {
  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(body)}&apikey=${encodeURIComponent(apikey)}`;
    const res = await fetch(url);
    return res.ok;
  } catch (error) {
    console.log('CallMeBot request failed:', String(error).slice(0, 200));
    return false;
  }
}

async function sendMetaWhatsApp(to, body) {
  const version = process.env.META_WA_API_VERSION || 'v21.0';
  const phoneId = process.env.META_WA_PHONE_ID;
  const token = process.env.META_WA_TOKEN;
  const recipient = String(to || '').replace(/[^\d]/g, '');
  if (!recipient) return false;
  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: { preview_url: false, body }
      })
    });
    if (!res.ok) console.log('Meta WhatsApp error:', String(await res.text()).slice(0, 300));
    return res.ok;
  } catch (error) {
    console.log('Meta WhatsApp request failed:', String(error).slice(0, 200));
    return false;
  }
}

function toE164(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+')) return digits;
  if (digits.length === 10) return `+${DEFAULT_CC}${digits}`;
  return `+${digits}`;
}

function maskPhone(phone) {
  const d = String(phone || '');
  return d.length > 4 ? '****' + d.slice(-4) : '****';
}

// ---------------------------------------------------------------------
// FCM web push (unchanged behaviour)
// ---------------------------------------------------------------------
async function sendFcm(tokens, title, body, patientId) {
  let oauth;
  try {
    oauth = await getAccessToken();
  } catch (error) {
    console.log('FCM auth failed:', String(error).slice(0, 300));
    return 0;
  }
  const results = await Promise.allSettled(tokens.map(token => sendPush(oauth, token, title, body, patientId)));
  results.forEach((r, i) => {
    if (r.status === 'rejected' || !r.value?.ok) {
      console.log(`Push failed for token[${i}]:`, r.status === 'rejected' ? String(r.reason).slice(0, 200) : JSON.stringify(r.value?.body || {}).slice(0, 200));
    }
  });
  return results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
}

async function getAccessToken() {
  if (cachedOAuth.token && Date.now() < cachedOAuth.expiresAt) return cachedOAuth.token;
  const sa = JSON.parse(Buffer.from(process.env.FCM_SERVICE_ACCOUNT, 'base64').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const signature = b64url(signer.sign(sa.private_key));
  const assertion = `${header}.${claims}.${signature}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || json.error || 'token exchange failed');
  cachedOAuth = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return cachedOAuth.token;
}

async function sendPush(oauth, token, title, body, patientId) {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${process.env.FCM_PROJECT_ID || 'verimed-6b92d'}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${oauth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        webpush: {
          fcmOptions: { link: `https://verimed-6b92d.web.app/care-taker.html${patientId ? `?patient=${patientId}` : ''}` }
        }
      }
    })
  });
  const text = await res.text();
  return { ok: res.ok, body: text };
}

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
