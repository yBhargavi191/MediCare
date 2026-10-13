const params = new URLSearchParams(window.location.search);
const doseId = params.get('doseId');
const medId = params.get('medId');
const medName = params.get('medName') || 'your medicine';

let currentUser = null;
// Verify window: 10 min by default. An optional ?window=90 query can shorten it
// so the expiry/penalty stage is reachable quickly in a demo build.
// The URL value can only SHORTEN the window, never extend it.
const requestedWindow = parseInt(params.get('window'), 10);
let secondsLeft = requestedWindow > 0
  ? Math.min(requestedWindow, DEMO_CONFIG.VERIFY_WINDOW_SECONDS)
  : DEMO_CONFIG.VERIFY_WINDOW_SECONDS;
let countdownTimer = null;
let detectionLoop = null;
let model = null;
let usingCustomModel = false; // true once the Teachable Machine pill model is active
let poseDetector = null;      // MoveNet pose model for hand-to-mouth detection
let resolved = false; // becomes true once verified or missed, stops all further action
let stream = null;
let facingMode = 'environment'; // 'environment' = back camera, 'user' = front camera
let activeDose = null;
let medicineRefs = [];    // enrolled MobileNet embeddings (all sides) of the prescribed medicine
let matchScore = 0;       // latest similarity between the camera frame and the reference
let lastMatchAt = 0;      // throttles the (heavier) embedding inference
let matcherActive = false; // true when the reference-photo matcher is in use

// Fallback detector (generic COCO-SSD). Used when no custom model is
// configured, or when the custom model fails to load so a live demo never dies.
const ACCEPTED_CLASSES = ['bottle'];
const CONFIDENCE_THRESHOLD = 0.55;

// Ingestion pipeline settings, overridable from firebase-config.js.
const PIPELINE = Object.assign({
  REQUIRE_HAND_TO_MOUTH: true, // false = legacy single-step "show the medicine" check
  HAND_TO_MOUTH_FRAMES: 3,     // consecutive pose frames with a wrist near the mouth
  MEDICINE_GONE_FRAMES: 10,    // consecutive frames with no medicine visible = consumed
  WRIST_SCORE_MIN: 0.25,       // minimum pose confidence for a wrist keypoint
  MANUAL_CONFIRM_AFTER_SECONDS: 40 // manual escape hatch if motion AI stays silent
}, typeof VERIFY_PIPELINE === 'object' && VERIFY_PIPELINE ? VERIFY_PIPELINE : {});

// Anti-cheat state machine: show -> take -> confirm.
// Showing the same pill to the camera can no longer pass verification on its
// own: the patient must move a hand to the mouth (pose AI) and then the
// medicine must leave the frame (swallowed / put down).
const pipeline = {
  phase: 'idle',            // idle | show | take | confirm
  poseReady: false,
  gestureHistory: [],       // recent booleans: was a wrist near the mouth?
  lastGesture: null,        // most recent analyzeHandToMouth() result for on-screen debug
  goneFrames: 0,
  medLabel: null,
  medScore: null,
  lastPoseAt: 0,
  takeStartedAt: null
};

document.getElementById('medNameDisplay').textContent = '💊 ' + medName;

auth.onAuthStateChanged(async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  currentUser = user;
  if (!doseId) { showInvalidDose('No medication reminder was selected.'); return; }
  try {
    const doseSnap = await db.collection('doses').doc(doseId).get();
    if (!doseSnap.exists) { showInvalidDose('This medication reminder is no longer available.'); return; }
    const dose = doseSnap.data();
    if (dose.patientId !== user.uid || dose.status !== 'pending') {
      showInvalidDose('This medication reminder is no longer available.');
      return;
    }
    activeDose = { id: doseSnap.id, ...dose };
    document.getElementById('medNameDisplay').textContent = `Medication: ${activeDose.medName || medName}`;
    await loadMedicineReference();
  } catch (error) {
    console.error('Unable to validate dose:', error);
    showInvalidDose('We could not load this medication reminder. Please return to your dashboard.');
    return;
  }
  startCountdown();
  startAlarmSound();
  guardBackNavigation();
});

// While the alert is active the patient must verify — block the back button and
// keep the "Back to dashboard" link hidden so the alarm cannot be skipped.
function guardBackNavigation() {
  try {
    history.pushState({ verifyLock: true }, '', location.href);
    window.addEventListener('popstate', () => {
      // Once the window is over (verified / expired / unavailable) the guard
      // releases: pressing back leaves for the dashboard instead of trapping the
      // patient on the duplicated history entry.
      if (resolved) { backToDashboard(); return; }
      history.pushState({ verifyLock: true }, '', location.href);
      const status = document.getElementById('verifyStatus');
      if (status && status.style.display !== 'none') {
        status.textContent = 'Please verify your medication to continue.';
      }
    });
  } catch (e) {
    /* ignore */
  }
}

function showInvalidDose(message) {
  resolved = true;
  document.getElementById('headline').textContent = 'REMINDER UNAVAILABLE';
  document.getElementById('countdown').style.display = 'none';
  hideVerificationUi();
  const status = document.getElementById('verifyStatus');
  status.style.display = 'block';
  status.textContent = message;
  status.className = 'verify-status wait';
  showBackToDashboard();
}

// Reveal the "Back to dashboard" button once the alert is resolved
// (verified / expired / unavailable) so the patient is never stranded on the
// alert page with no way out.
function showBackToDashboard() {\n  const link = document.getElementById('backToDashboardLink');\n  if (link) {\n    link.style.display = 'inline-flex';\n  }\n}\n});}}

// Clears the verification UI (camera, steps, action buttons) so the resolved
// screen — and its "Back to dashboard" button — is fully visible without
// scrolling. Without this the camera can push the button off-screen.
function hideVerificationUi() {
  ['cameraWrap', 'verifySteps', 'startCameraBtn', 'manualConfirmBtn', 'retryCameraBtn', 'flipCameraBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

// ---------- Alarm sound (generated in-browser, no audio file needed) ----------
let audioCtx = null;
let alarmInterval = null;
let alarmStopped = false; // latched once verified/expired so the ring cannot restart

function beepOnce() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.35);
}

function startAlarmSound() {
  if (alarmStopped) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    playAlarmLoop();
  } catch (e) {
    // AudioContext blocked until a user gesture — arm it on first tap/click anywhere
  }
  // Fallback: browsers that block autoplay on page-load will allow it on the first
  // user interaction (tap the screen, or the Verify button itself).
  const armOnGesture = () => {
    document.removeEventListener('click', armOnGesture);
    document.removeEventListener('touchstart', armOnGesture);
    if (alarmStopped || resolved) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      playAlarmLoop();
    } catch (e) { /* ignore */ }
  };
  document.addEventListener('click', armOnGesture);
  document.addEventListener('touchstart', armOnGesture);
}

function playAlarmLoop() {
  if (alarmStopped || resolved || alarmInterval) return;
  beepOnce();
  alarmInterval = setInterval(() => { if (!resolved && !alarmStopped) beepOnce(); }, 700);
}

// Stops the in-browser beep and the native Android ring, and latches so the
// gesture fallback can never restart the alarm after verify/expiry.
function stopAlarmSound() {
  alarmStopped = true;
  if (alarmInterval) { clearInterval(alarmInterval); alarmInterval = null; }
  if (audioCtx) { try { audioCtx.suspend(); } catch (e) { /* ignore */ } }
  // Also silence the native Android alarm if one is still ringing.
  if (window.MediCareNotifications?.stopAlarm) MediCareNotifications.stopAlarm();
}

function startCountdown() {
  updateCountdownDisplay();
  countdownTimer = setInterval(() => {
    secondsLeft--;
    updateCountdownDisplay();
    if (secondsLeft <= 0) {
      clearInterval(countdownTimer);
      if (!resolved) handleMissed();
    }
  }, 1000);
}

function updateCountdownDisplay() {
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  document.getElementById('countdown').textContent = `${m}:${String(s).padStart(2, '0')}`;
}

// ---------- AI models ----------
async function loadMedicineReference() {
  medicineRefs = [];
  if (!activeDose || !activeDose.medId) return;
  try {
    const medSnap = await db.collection('medicines').doc(activeDose.medId).get();
    if (!medSnap.exists) return;
    const med = medSnap.data();
    if (Array.isArray(med.refEmbeddings) && med.refEmbeddings.length) {
      medicineRefs = med.refEmbeddings.filter(e => Array.isArray(e) && e.length);
    } else if (Array.isArray(med.refEmbedding) && med.refEmbedding.length) {
      medicineRefs = [med.refEmbedding];
    }
  } catch (error) {
    console.warn('Could not load the medicine reference photo:', error);
  }
}

async function loadRecognitionModel(statusEl) {
  if (model) return;
  if (CUSTOM_MODEL.url) {
    try {
      statusEl.textContent = 'Loading pill-recognition AI...';
      const base = CUSTOM_MODEL.url.endsWith('/') ? CUSTOM_MODEL.url : CUSTOM_MODEL.url + '/';
      model = await tmImage.load(base + 'model.json', base + 'metadata.json');
      usingCustomModel = true;
      return;
    } catch (err) {
      console.warn('Custom pill model unavailable, falling back to COCO-SSD:', err);
    }
  }
  if (window.MediCareML?.loadCocoSsd) {
    try { await MediCareML.loadCocoSsd(); } catch (e) { /* fall through */ }
  }
  model = await cocoSsd.load();
}

async function loadPoseDetector(statusEl) {
  if (!PIPELINE.REQUIRE_HAND_TO_MOUTH || typeof poseDetection === 'undefined') return null;
  try {
    statusEl.textContent = 'Loading motion AI...';
    await tf.setBackend('webgl').catch(() => {});
    await tf.ready();
    return await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
    );
  } catch (err) {
    console.warn('Pose model unavailable — verification falls back to show-only mode.', err);
    return null;
  }
}

async function startVerification() {
  if (!activeDose) return;
  // Once the patient starts verifying, silence the alarm (browser beep + native
  // ring) so it does not play over the camera steps.
  stopAlarmSound();
  matcherActive = false;
  document.getElementById('startCameraBtn').style.display = 'none';
  document.getElementById('cameraWrap').style.display = 'block';
  const statusEl = document.getElementById('verifyStatus');
  statusEl.style.display = 'block';
  statusEl.textContent = 'Loading AI model...';
  statusEl.className = 'verify-status wait';

  // Load the heavy TensorFlow.js libraries on demand (self-hosted + cached),
  // so the alert page itself opens instantly and works offline.
  try {
    if (window.MediCareML) await MediCareML.loadVerifyLibs();
  } catch (err) {
    console.warn('AI libraries failed to load, falling back:', err);
  }

  try {
  const video = document.getElementById('video');
  await startStream();

    if (medicineRefs.length && typeof loadMedicineMatcher === 'function') {
      try {
        statusEl.textContent = 'Loading medicine-matching AI...';
        await loadMedicineMatcher();
        matcherActive = true;
      } catch (err) {
        console.warn('Medicine matcher unavailable — using generic detection.', err);
      }
    }
    try {
      await loadRecognitionModel(statusEl);
    } catch (err) {
      // The recognition model is optional: if its assets cannot be fetched
      // (offline, blocked, missing) the dose must still be confirmable —
      // never dead-end a patient with a confusing "Camera unavailable".
      console.warn('Recognition AI unavailable — continuing in manual mode:', err);
      model = null;
      usingCustomModel = false;
      startManualMode(statusEl);
      return;
    }
    poseDetector = await loadPoseDetector(statusEl);
    pipeline.poseReady = Boolean(poseDetector);

    const notice = document.getElementById('modelNotice');
    if (notice) notice.style.display = (!usingCustomModel && !matcherActive) ? 'block' : 'none';
    const steps = document.getElementById('verifySteps');
    if (steps) steps.style.display = pipeline.poseReady ? 'flex' : 'none';

    setPhase('show');
    runDetectionLoop(video);
  } catch (err) {
    statusEl.textContent = cameraErrorMessage(err);
    statusEl.className = 'verify-status fail';
    showCameraFallback();
  }
}

async function startStream() {
  const video = document.getElementById('video');
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode } } });
  video.srcObject = stream;
  await new Promise(resolve => { video.onloadedmetadata = resolve; });
}

// ---------- Camera failure recovery ----------
// A missing, blocked or busy camera must never dead-end the alert: say what
// went wrong, offer a retry, and expose the manual confirmation that the
// pipeline already supports (it is logged as "manual-confirm").
function cameraErrorMessage(err) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return 'Camera unavailable: this page has to be opened over https:// (or on localhost). Open the site from its web address, then tap Retry camera.';
  }
  const name = (err && err.name) || '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera is blocked for this site. Click the camera icon in the address bar, choose Allow, then tap Retry camera.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found on this device. You can still confirm this dose with the button below.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return 'The camera is busy in another app or tab. Close it, then tap Retry camera.';
  }
  return 'Camera unavailable: ' + ((err && err.message) || 'unknown reason') + ' — tap Retry camera, or confirm manually below.';
}

function showCameraFallback() {
  const wrap = document.getElementById('cameraWrap');
  if (wrap) wrap.style.display = 'none';

  const status = document.getElementById('verifyStatus');
  let retry = document.getElementById('retryCameraBtn');
  if (!retry && status && status.parentNode) {
    retry = document.createElement('button');
    retry.id = 'retryCameraBtn';
    retry.type = 'button';
    retry.className = 'btn-white';
    retry.textContent = 'Retry camera';
    retry.addEventListener('click', retryCamera);
    status.parentNode.insertBefore(retry, status.nextSibling);
  }
  if (retry) retry.style.display = 'inline-block';

  const manualBtn = document.getElementById('manualConfirmBtn');
  if (manualBtn) manualBtn.style.display = 'inline-block';
}

async function retryCamera() {
  const retry = document.getElementById('retryCameraBtn');
  if (retry) retry.style.display = 'none';
  const manualBtn = document.getElementById('manualConfirmBtn');
  if (manualBtn) manualBtn.style.display = 'none';
  await startVerification();
}

// Used when the recognition model itself cannot load: the camera and the dose
// are fine, so say so plainly and let the patient confirm the dose.
function startManualMode(statusEl) {
  if (statusEl) {
    statusEl.textContent = 'Recognition AI could not load on this device — no problem: tap "I took it — confirm ✓" to record this dose.';
    statusEl.className = 'verify-status wait';
  }
  const manualBtn = document.getElementById('manualConfirmBtn');
  if (manualBtn) manualBtn.style.display = 'inline-block';
  const steps = document.getElementById('verifySteps');
  if (steps) steps.style.display = 'none';
  const notice = document.getElementById('modelNotice');
  if (notice) notice.style.display = 'block';
}

// Flip between the back and front camera while verifying.
function switchCamera() {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  const wrap = document.getElementById('cameraWrap');
  if (wrap && wrap.style.display !== 'none' && stream) {
    startStream().catch(err => console.warn('Unable to switch camera:', err));
  }
}

// ---------- Phase / step indicator ----------
const PHASE_STATUS_TEXT = {
  show: () => 'Step 1 of 3 — Hold your tablet strip or tonic bottle up to the camera.',
  take: () => `✅ ${pipeline.medLabel} detected. Step 2 of 3 — Take your medicine now (hand to mouth).`,
  confirm: () => 'Hand-to-mouth seen ✓. Step 3 of 3 — Move the medicine away from the camera.',
};

function setPhase(phase) {
  pipeline.phase = phase;
  if (phase === 'take') {
    pipeline.takeStartedAt = Date.now();
    pipeline.gestureHistory = [];
  }
  const statusEl = document.getElementById('verifyStatus');
  if (PHASE_STATUS_TEXT[phase]) {
    statusEl.textContent = PHASE_STATUS_TEXT[phase]();
    statusEl.className = 'verify-status wait';
  }
  const manualBtn = document.getElementById('manualConfirmBtn');
  if (manualBtn && phase !== 'take') manualBtn.style.display = 'none';
  const map = { show: 'stepShow', take: 'stepTake', confirm: 'stepDone' };
  const order = ['stepShow', 'stepTake', 'stepDone'];
  const activeIndex = order.indexOf(map[phase]);
  order.forEach((id, index) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('vstep-pending', 'vstep-active', 'vstep-done');
    el.classList.add(index < activeIndex ? 'vstep-done' : index === activeIndex ? 'vstep-active' : 'vstep-pending');
  });
}

// ---------- Detection loop ----------
async function detectMedicine(video) {
  if (usingCustomModel) {
    const predictions = await model.predict(video);
    const best = predictions.reduce((a, b) => (b.probability > a.probability ? b : a), { className: '', probability: 0 });
    const visible = CUSTOM_MODEL.acceptedClasses.includes(best.className)
      && best.probability >= CUSTOM_MODEL.confidenceThreshold;
    return { visible, label: best.className, score: best.probability, predictions };
  }
  const predictions = await model.detect(video);
  let match = null;
  predictions.forEach(p => {
    if (ACCEPTED_CLASSES.includes(p.class) && p.score >= CONFIDENCE_THRESHOLD && (!match || p.score > match.score)) match = p;
  });
  return { visible: Boolean(match), label: match?.class, score: match?.score ?? 0, predictions };
}

function drawShowOverlay(ctx, width, height, result) {
  ctx.clearRect(0, 0, width, height);
  if (usingCustomModel) {
    drawClassifierBars(ctx, width, height, result.predictions, result.visible);
  } else {
    result.predictions.forEach(p => {
      const isCandidate = ACCEPTED_CLASSES.includes(p.class) && p.score >= CONFIDENCE_THRESHOLD;
      ctx.strokeStyle = isCandidate ? '#22c55e' : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 3;
      ctx.strokeRect(...p.bbox);
      ctx.fillStyle = isCandidate ? '#22c55e' : 'rgba(255,255,255,0.6)';
      ctx.font = '14px sans-serif';
      ctx.fillText(`${p.class} ${(p.score * 100).toFixed(0)}%`, p.bbox[0], p.bbox[1] > 14 ? p.bbox[1] - 4 : 14);
    });
  }
}

function drawClassifierBars(ctx, width, height, predictions, matched) {
  const sorted = [...predictions].sort((a, b) => b.probability - a.probability).slice(0, 3);
  const barW = Math.min(280, width * 0.7);
  const barH = 26;
  const x = (width - barW) / 2;
  let y = height - (sorted.length * (barH + 10)) - 20;

  ctx.lineWidth = 6;
  ctx.strokeStyle = matched ? '#22c55e' : 'rgba(255,255,255,0.55)';
  ctx.strokeRect(3, 3, width - 6, height - 6);

  sorted.forEach(p => {
    const isAccepted = CUSTOM_MODEL.acceptedClasses.includes(p.className);
    const pct = Math.round(p.probability * 100);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = isAccepted ? '#22c55e' : 'rgba(255,255,255,0.35)';
    ctx.fillRect(x, y, barW * p.probability, barH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${p.className} ${pct}%`, x + 8, y + barH / 2);
    y += barH + 10;
  });
  ctx.textBaseline = 'alphabetic';
}

function drawPhaseFrame(ctx, width, height, ok) {
  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = 6;
  ctx.strokeStyle = ok ? '#22c55e' : 'rgba(255,255,255,0.45)';
  ctx.strokeRect(3, 3, width - 6, height - 6);
}

// Best similarity across every enrolled side (front/back) of the medicine.
function bestMatchScore(embedding) {
  let best = 0;
  for (const ref of medicineRefs) {
    const score = cosineSimilarity(embedding, ref);
    if (score > best) best = score;
  }
  return best;
}

// Reference-photo matching: compare the live frame to the enrolled medicine
// photo. Returns nothing; advances the phase or updates the on-screen hint.
async function runMedicineMatch(video, ctx, canvas) {
  if (performance.now() - lastMatchAt > 320) {
    lastMatchAt = performance.now();
    try {
      const embedding = await imageToEmbedding(video);
      matchScore = bestMatchScore(embedding);
    } catch (err) {
      console.warn('Medicine match frame skipped:', err);
    }
  }
  drawMatchOverlay(ctx, canvas.width, canvas.height, matchScore);
  const statusEl = document.getElementById('verifyStatus');
  const pct = Math.round(matchScore * 100);
  if (matchScore >= MEDICINE_MATCH.THRESHOLD) {
    pipeline.medLabel = medName;
    pipeline.medScore = matchScore;
    if (pipeline.poseReady) setPhase('take');
    else handleVerified({ class: medName, score: matchScore, method: 'medicine-match' });
    return;
  }
  if (matchScore >= MEDICINE_MATCH.UNCERTAIN) {
    statusEl.textContent = `Step 1 of 3 — Hold the ${medName} pack steady and close. Matching… ${pct}%`;
  } else {
    statusEl.textContent = `Step 1 of 3 — This doesn't look like ${medName} yet. Show the correct tablet strip or box. ${pct}%`;
  }
}

function drawMatchOverlay(ctx, width, height, score) {
  ctx.clearRect(0, 0, width, height);
  const matched = score >= MEDICINE_MATCH.THRESHOLD;
  const near = !matched && score >= MEDICINE_MATCH.UNCERTAIN;
  const color = matched ? '#22c55e' : near ? '#facc15' : 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 6;
  ctx.strokeStyle = color;
  ctx.strokeRect(3, 3, width - 6, height - 6);
  const barW = Math.min(300, width * 0.72);
  const barH = 14;
  const x = (width - barW) / 2;
  const y = height - 34;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x, y, barW, barH);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, barW * Math.max(0, Math.min(1, score)), barH);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`Match ${Math.round(score * 100)}%`, x, y - 4);
}

function runDetectionLoop(video) {
  const canvas = document.getElementById('overlay');
  const ctx = canvas.getContext('2d');

  async function tick() {
    if (resolved) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    try {
      if (pipeline.phase === 'show') {
        if (matcherActive) {
          await runMedicineMatch(video, ctx, canvas);
          if (resolved || pipeline.phase !== 'show') return;
        } else {
          const result = await detectMedicine(video);
          drawShowOverlay(ctx, canvas.width, canvas.height, result);
          const statusEl = document.getElementById('verifyStatus');
          if (result.visible) {
            pipeline.medLabel = result.label;
            pipeline.medScore = result.score;
            if (pipeline.poseReady) setPhase('take');
            else { handleVerified({ class: result.label, score: result.score, method: 'medicine-detected' }); return; }
          } else {
            // Live feedback: show what the AI currently sees so a failed
            // detection is easy to understand and debug on stage.
            const pct = Math.round(result.score * 100);
            statusEl.textContent = `Step 1 of 3 — Show your medicine. (AI seeing: "${result.label}" ${pct}%)`;
          }
        }
      } else if (pipeline.phase === 'take') {
        drawPhaseFrame(ctx, canvas.width, canvas.height, false);
        if (performance.now() - pipeline.lastPoseAt > 120) {
          pipeline.lastPoseAt = performance.now();
          const poses = await poseDetector.estimatePoses(video);
          const info = analyzeHandToMouth(poses && poses[0]);
          pipeline.lastGesture = info;
          pipeline.gestureHistory.push(info.hit);
          if (pipeline.gestureHistory.length > 12) pipeline.gestureHistory.shift();
          const hits = pipeline.gestureHistory.filter(Boolean).length;
          const statusEl = document.getElementById('verifyStatus');
          statusEl.textContent = `Step 2 of 3 — Take your medicine (hand to mouth). [gesture ${hits}/${PIPELINE.HAND_TO_MOUTH_FRAMES} · wrist ${info.wristScore.toFixed(2)}]`;
          if (hits >= PIPELINE.HAND_TO_MOUTH_FRAMES) setPhase('confirm');
        }
        // Escape hatch: if motion AI never fires, let the patient confirm
        // manually instead of auto-failing. Logged as "manual-confirm".
        const elapsed = (Date.now() - (pipeline.takeStartedAt || Date.now())) / 1000;
        const manualBtn = document.getElementById('manualConfirmBtn');
        if (manualBtn && elapsed > PIPELINE.MANUAL_CONFIRM_AFTER_SECONDS && manualBtn.style.display === 'none') {
          manualBtn.style.display = 'inline-block';
        }
      } else if (pipeline.phase === 'confirm') {
        let gone;
        if (matcherActive) {
          if (performance.now() - lastMatchAt > 320) {
            lastMatchAt = performance.now();
            try {
              const embedding = await imageToEmbedding(video);
              matchScore = bestMatchScore(embedding);
            } catch (err) { /* keep the previous score */ }
          }
          gone = matchScore < MEDICINE_MATCH.GONE;
          drawMatchOverlay(ctx, canvas.width, canvas.height, matchScore);
        } else {
          const result = await detectMedicine(video);
          gone = !result.visible;
          drawPhaseFrame(ctx, canvas.width, canvas.height, gone);
        }
        pipeline.goneFrames = gone ? pipeline.goneFrames + 1 : 0;
        if (pipeline.goneFrames >= PIPELINE.MEDICINE_GONE_FRAMES) {
          handleVerified({ class: pipeline.medLabel, score: pipeline.medScore, method: 'ingestion-sequence' });
          return;
        }
      }
    } catch (err) {
      console.warn('Detection frame skipped:', err);
    }

    detectionLoop = requestAnimationFrame(tick);
  }
  tick();
}

// A wrist counts as "hand to mouth" when it is close to the nose relative to
// the size of the face (estimated from the eye distance). Returns debug info
// (best wrist confidence + distance ratio) for the on-screen readout.
function analyzeHandToMouth(pose) {
  const info = { hit: false, wristScore: 0, ratio: 99 };
  if (!pose || !Array.isArray(pose.keypoints)) return info;
  const kp = {};
  pose.keypoints.forEach(k => { kp[k.name] = k; });
  const nose = kp.nose;
  if (!nose || nose.score < 0.25) return info;
  const le = kp.left_eye, re = kp.right_eye;
  const eyeDist = (le && re && le.score > 0.25 && re.score > 0.25)
    ? Math.hypot(le.x - re.x, le.y - re.y)
    : null;
  // Generous radius: a fast taking motion blurs keypoints, so we accept the
  // hand anywhere around the lower half of the head.
  const radius = eyeDist ? eyeDist * 3.0 : 130;
  ['left_wrist', 'right_wrist'].forEach(name => {
    const w = kp[name];
    if (!w || w.score < PIPELINE.WRIST_SCORE_MIN) return;
    const ratio = Math.hypot(w.x - nose.x, w.y - nose.y) / radius;
    if (ratio < info.ratio) { info.ratio = ratio; info.wristScore = w.score; }
  });
  info.hit = info.ratio <= 1;
  return info;
}

function manualConfirm() {
  document.getElementById('manualConfirmBtn').style.display = 'none';
  handleVerified({
    // In manual mode the detector may never have run, so there is no label yet.
    class: pipeline.medLabel || null,
    score: pipeline.medScore,
    method: 'manual-confirm'
  });
}

async function handleVerified(prediction) {
  resolved = true;
  clearInterval(countdownTimer);
  if (detectionLoop) cancelAnimationFrame(detectionLoop);
  stopCamera();
  stopAlarmSound();
  if (activeDose && window.MediCareNotifications?.cancelDose) MediCareNotifications.cancelDose(activeDose.id);
  hideVerificationUi();

  const statusEl = document.getElementById('verifyStatus');
  const pct = Number.isFinite(prediction.score) ? ` — ${Math.round(prediction.score * 100)}% match` : '';
  const via = prediction.method === 'ingestion-sequence'
    ? ' · ingestion confirmed by motion AI'
    : prediction.method === 'manual-confirm'
      ? ' · confirmed manually'
      : '';
  statusEl.textContent = prediction.class
    ? `Medication Verified (detected "${prediction.class}"${pct})${via}`
    : `Medication Verified${via}`;
  statusEl.className = 'verify-status ok';

  document.getElementById('alertScreen').classList.add('calm');
  document.getElementById('pulseIcon').textContent = '💰';
  document.getElementById('headline').textContent = 'DOSE TAKEN ON TIME!';
  ['stepShow', 'stepTake', 'stepDone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('vstep-pending', 'vstep-active'); el.classList.add('vstep-done'); }
  });

  // Reward moment: confetti blast + "you saved ₹X" banner. The amount is the
  // penalty the patient just avoided by verifying in time.
  const banner = document.getElementById('rewardBanner');
  if (banner) {
    document.getElementById('rewardAmount').textContent = `₹${DEMO_CONFIG.PENALTY_AMOUNT}`;
    banner.style.display = 'inline-block';
  }
  celebrate();
  showBackToDashboard();

  try {
    await db.collection('doses').doc(activeDose.id).update({
      status: 'verified',
      verifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
      detectedAs: prediction.class,
      verifiedVia: prediction.method || 'medicine-detected'
    });
  } catch (error) {
    console.error('Unable to record verification:', error);
    statusEl.textContent = 'Verification detected, but we could not save it. Please contact your administrator.';
    statusEl.className = 'verify-status fail';
    showBackToDashboard();
    return;
  }

  recordDoseStreak();
  showBackToDashboard();
}

function recordDoseStreak() {
  if (!currentUser) return;
  try {
    const key = 'medicare.doseStreak.' + currentUser.uid;
    const previous = JSON.parse(localStorage.getItem(key) || 'null');
    const today = activeDose.date || localTodayString();
    if (previous && previous.lastCompletedDate === today) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const continues = previous && previous.lastCompletedDate === localTodayString(yesterday);
    localStorage.setItem(key, JSON.stringify({
      count: continues ? (Number(previous.count) || 0) + 1 : 1,
      lastCompletedDate: today
    }));
  } catch (error) {}
}

function localTodayString(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// Confetti celebration: one big center burst plus side cannons for ~1.2s.
function celebrate() {
  if (typeof confetti !== 'function') {
    // Load the (small) confetti lib on demand the first time it is needed.
    if (window.MediCareML?.loadConfetti) {
      MediCareML.loadConfetti().then(celebrate).catch(() => {});
    }
    return;
  }
  try {
    confetti({ particleCount: 130, spread: 80, startVelocity: 45, origin: { y: 0.6 }, zIndex: 100 });
    const end = Date.now() + 1200;
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, zIndex: 100 });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, zIndex: 100 });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  } catch (e) { /* confetti is cosmetic — never block verification */ }
}

async function handleMissed() {
  if (resolved) return;
  if (!activeDose) return;
  resolved = true;
  if (detectionLoop) cancelAnimationFrame(detectionLoop);
  stopCamera();
  stopAlarmSound();
  if (activeDose && window.MediCareNotifications?.cancelDose) MediCareNotifications.cancelDose(activeDose.id);

  document.getElementById('pulseIcon').textContent = '⚠️';
  document.getElementById('headline').textContent = 'DOSE MISSED';
  document.getElementById('countdown').textContent = '0:00';
  hideVerificationUi();
  const statusEl = document.getElementById('verifyStatus');
  statusEl.style.display = 'block';
  statusEl.textContent = 'Verification window expired. Caregiver notified, ₹10 penalty applied.';
  statusEl.className = 'verify-status fail';
  showBackToDashboard();

  try {
    await db.collection('doses').doc(activeDose.id).update({
      status: 'missed',
      missedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('alerts').add({
      patientId: currentUser.uid,
      doseId: activeDose.id, medId: activeDose.medId, medName: activeDose.medName,
      message: `Missed dose of ${medName} — verification window expired.`,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    notifyCareTakers(`Missed dose of ${medName} — verification window expired.`);

    const userRef = db.collection('users').doc(currentUser.uid);
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(userRef);
      const current = doc.data().walletBalance ?? DEMO_CONFIG.STARTING_WALLET_BALANCE;
      tx.update(userRef, { walletBalance: current - DEMO_CONFIG.PENALTY_AMOUNT });
    });
  } catch (error) {
    console.error('Could not fully record the missed dose:', error);
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
}

// Fire-and-forget caregiver alerts via the free relay on Vercel.
// Channels (FCM push / WhatsApp / ntfy webhook) are decided server-side,
// so we always call it — a global channel such as an ntfy topic must fire
// even when this patient has no subscribed contacts yet.
async function notifyCareTakers(message) {
  try {
    if (!CARE_ALERT_API?.url || !CARE_ALERT_API.secret || CARE_ALERT_API.secret.startsWith('CHANGE_ME')) return;
    const snap = await db.collection('users').doc(currentUser.uid).get();
    const data = snap.data() || {};
    const pushTokens = data.caregiverWebPushTokens || [];
    const contacts = data.relativeContacts || [];
    let alertTopic = data.alertTopic;
    if (!alertTopic && typeof makeAlertTopic === 'function') {
      alertTopic = makeAlertTopic(data.name);
      await db.collection('users').doc(currentUser.uid).update({ alertTopic }).catch(() => {});
    }
    const response = await fetch(CARE_ALERT_API.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Care-Secret': CARE_ALERT_API.secret },
      body: JSON.stringify({ patientId: currentUser.uid, patientName: data.name || 'Your patient', message, contacts, pushTokens, ntfyTopic: alertTopic })
    });
    const result = await response.json().catch(() => ({}));
    console.info('Caregiver alert result:', response.status, result);
  } catch (error) {
    console.warn('Caregiver alert could not be sent:', error);
  }
}

function backToDashboard() {\n  stopCamera();\n  stopAlarmSound();\n  clearInterval(countdownTimer);\n  window.location.replace(new URL('patient-dashboard.html', window.location.href).href);\n}

window.addEventListener('beforeunload', () => { stopCamera(); stopAlarmSound(); });
