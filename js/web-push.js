/* ===================================================================
   WebPush — browser notification support for medication reminders.
   ===================================================================
   The Android app rings with a native alarm even when it is closed (see
   android/.../UrgentAlertsPlugin.java). A plain website cannot do that
   without real push infrastructure, so this module is the one place that
   decides what the browser can honestly do:

     configured() -> true only when background push is *fully* wired up:
                     a VAPID key, the service worker at
                     /firebase-messaging-sw.js, AND a server that actually
                     sends the messages. This demo has no sender, so it
                     reports false and js/patient.js falls back to normal
                     browser notifications, which fire while the MediCare
                     dashboard is open.
     enable(uid)  -> asks the browser for notification permission and, when
                     background push is configured, registers this device's
                     FCM token so the server can reach the patient.
     disable(uid) -> reverses the above.

   To switch real background reminders on later:
     1. keep FCM_VAPID_KEY in js/firebase-config.js,
     2. keep www/firebase-messaging-sw.js at the site root (it is there),
     3. deploy a sender (Cloud Function or the vercel-api relay) that sends
        to the tokens stored in users/{uid}.fcmTokens,
     4. set WebPush.SENDER_DEPLOYED = true.

   js/patient.js must keep working even if this file never loads, which is why
   it only ever touches window.WebPush behind a guard.
   =================================================================== */
const WebPush = {
  // Flip to true once a real sender is deployed, otherwise the UI would
  // promise background reminders that can never arrive.
  SENDER_DEPLOYED: false,

  vapidKey() {
    return typeof FCM_VAPID_KEY === 'string' ? FCM_VAPID_KEY.trim() : '';
  },

  messagingAvailable() {
    return typeof firebase !== 'undefined'
      && typeof firebase.messaging === 'function'
      && typeof Notification !== 'undefined'
      && typeof navigator !== 'undefined'
      && 'serviceWorker' in navigator;
  },

  configured() {
    return Boolean(this.SENDER_DEPLOYED && this.vapidKey() && this.messagingAvailable());
  },

  permission() {
    return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  },

  // Resolves true when the browser will show MediCare notifications.
  async enable(uid) {
    if (typeof Notification === 'undefined') return false;

    let granted = Notification.permission === 'granted';
    if (!granted) {
      if (Notification.permission === 'denied') return false;
      try {
        granted = (await Notification.requestPermission()) === 'granted';
      } catch (error) {
        granted = false;
      }
    }
    if (!granted) return false;

    // In-page reminders already work at this point; token registration is a
    // bonus for background delivery and must never break the enable flow.
    if (this.configured()) {
      try { await this.registerToken(uid); } catch (error) { /* in-page reminders still work */ }
    }
    return true;
  },

  async registerToken(uid) {
    if (!uid || typeof db === 'undefined') return null;
    const token = await firebase.messaging().getToken({ vapidKey: this.vapidKey() });
    if (!token) return null;
    await db.collection('users').doc(uid).set({
      fcmTokens: firebase.firestore.FieldValue.arrayUnion(token)
    }, { merge: true });
    return token;
  },

  async disable(uid) {
    if (!this.configured()) return true;
    try {
      const token = await firebase.messaging().getToken({ vapidKey: this.vapidKey() });
      await firebase.messaging().deleteToken();
      if (token && uid && typeof db !== 'undefined') {
        await db.collection('users').doc(uid).set({
          fcmTokens: firebase.firestore.FieldValue.arrayRemove(token)
        }, { merge: true });
      }
    } catch (error) {
      /* nothing to clean up */
    }
    return true;
  }
};

window.WebPush = WebPush;
