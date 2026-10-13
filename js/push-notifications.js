/* Firebase Cloud Messaging support for the HTTPS web app. */
const WebPush = {
  supported() {
    return 'serviceWorker' in navigator && 'Notification' in window && typeof firebase.messaging === 'function';
  },
  configured() {
    return FCM_VAPID_KEY && !FCM_VAPID_KEY.startsWith('PASTE_');
  },
  async enable(userId) {
    if (!this.supported()) throw new Error('This browser does not support web push notifications.');
    if (!this.configured()) throw new Error('Web push is not configured yet. Add the Firebase VAPID key first.');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Notification permission was not granted.');
    const registration = await navigator.serviceWorker.register('firebase-messaging-sw.js');
    const messaging = firebase.messaging();
    const token = await messaging.getToken({ vapidKey: FCM_VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) throw new Error('Could not create a device notification token.');
    await db.collection('users').doc(userId).set({
      webPushTokens: firebase.firestore.FieldValue.arrayUnion(token),
      reminderTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    messaging.onMessage(payload => {
      const title = payload.notification?.title || 'Medication time';
      const body = payload.notification?.body || 'Open MediCare to verify your medicine.';
      if (Notification.permission === 'granted') new Notification(title, { body });
    });
    return token;
  }
};
