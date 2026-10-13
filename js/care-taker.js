/* Care taker alert subscription — no login required.
   Finds the patient by email, saves this device's FCM token on the
   patient's user doc (caregiverWebPushTokens), then shows the
   patient's live dose status for today. */
const params = new URLSearchParams(location.search);
let linkedPatientId = params.get('patient') || localStorage.getItem('medicareCareTakerPatient') || '';
let unsubscribeDoses = null;

function init() {
  if (linkedPatientId) loadPatientStatus(linkedPatientId);
}

function supported() {
  return 'serviceWorker' in navigator && 'Notification' in window && typeof firebase.messaging === 'function';
}

async function enableAlerts() {
  const error = document.getElementById('ctError');
  const status = document.getElementById('ctStatus');
  const email = document.getElementById('patientEmail').value.trim().toLowerCase();
  error.textContent = '';
  status.textContent = '';
  if (!email) { error.textContent = 'Enter the patient email first.'; return; }
  if (!supported()) { error.textContent = 'This browser does not support push notifications. Try Chrome.'; return; }
  if (!FCM_VAPID_KEY || FCM_VAPID_KEY.startsWith('PASTE_')) { error.textContent = 'Server setup incomplete — ask the admin to add the VAPID key.'; return; }

  const btn = document.getElementById('enableBtn');
  btn.disabled = true; btn.textContent = 'Setting up…';
  try {
    const snap = await db.collection('users').where('email', '==', email).where('role', '==', 'patient').limit(1).get();
    if (snap.empty) throw new Error('No patient found with that email. Check the spelling.');
    const doc = snap.docs[0];
    linkedPatientId = doc.id;
    localStorage.setItem('medicareCareTakerPatient', doc.id);

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Notification permission was blocked. Allow it in browser settings and retry.');

    const registration = await navigator.serviceWorker.register('firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;
    const messaging = firebase.messaging();
    const token = await messaging.getToken({ vapidKey: FCM_VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) throw new Error('Could not create a device token. Try again.');

    await db.collection('users').doc(doc.id).set({
      caregiverWebPushTokens: firebase.firestore.FieldValue.arrayUnion(token),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    messaging.onMessage(payload => {
      const t = payload.notification?.title || 'MediCare Alert';
      const b = payload.notification?.body || '';
      if (Notification.permission === 'granted') new Notification(t, { body: b });
    });

    status.textContent = `✅ Done! You will now get alerts for ${doc.data().name || email}.`;
    btn.textContent = 'Alerts enabled ✓';
    loadPatientStatus(doc.id);
  } catch (err) {
    console.error(err);
    error.textContent = err.message || 'Setup failed. Please try again.';
    btn.disabled = false; btn.textContent = 'Enable notifications';
  }
}

function loadPatientStatus(patientId) {
  db.collection('users').doc(patientId).get().then(doc => {
    if (!doc.exists) return;
    document.getElementById('liveCard').style.display = 'block';
    document.getElementById('livePatientName').textContent = doc.data().name || 'Patient';
    if (unsubscribeDoses) unsubscribeDoses();
    const today = new Date().toISOString().slice(0, 10);
    unsubscribeDoses = db.collection('doses')
      .where('patientId', '==', patientId)
      .where('date', '==', today)
      .onSnapshot(snapshot => {
        const doses = snapshot.docs.map(d => d.data()).sort((a, b) => String(a.scheduledTime).localeCompare(String(b.scheduledTime)));
        renderDoses(doses);
      }, err => console.error(err));
  });
}

function renderDoses(doses) {
  const list = document.getElementById('doseList');
  if (!doses.length) { list.innerHTML = '<div class="empty-state">No medicines scheduled for today.</div>'; return; }
  list.innerHTML = doses.map(dose => {
    const badgeClass = dose.status === 'verified' ? 'verified' : dose.status === 'missed' ? 'missed' : 'upcoming';
    const badgeText = dose.status === 'verified' ? '✅ Taken' : dose.status === 'missed' ? '⚠️ Missed' : '⏰ Upcoming';
    return `<div class="med-item"><div><div class="med-name">${dose.medName}</div><div class="med-time">${format12h(dose.scheduledTime)}${dose.dosage ? ' · ' + dose.dosage : ''}</div></div><span class="badge ${badgeClass}">${badgeText}</span></div>`;
  }).join('');
}

function format12h(t) {
  const [h, m] = String(t).split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

init();
