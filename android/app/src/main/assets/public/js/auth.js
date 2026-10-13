let selectedRole = 'patient';
let isSignup = false;

function setRole(role) {
  selectedRole = role;
  document.getElementById('roleP').classList.toggle('active', role === 'patient');
  document.getElementById('roleA').classList.toggle('active', role === 'admin');
  document.getElementById('roleP').setAttribute('aria-selected', role === 'patient');
  document.getElementById('roleA').setAttribute('aria-selected', role === 'admin');
}

function togglePasswordVisibility() {
  const password = document.getElementById('password');
  const button = document.getElementById('passwordToggle');
  const visible = password.type === 'password';
  password.type = visible ? 'text' : 'password';
  button.setAttribute('aria-pressed', String(visible));
  button.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
}

function toggleMode() {
  isSignup = !isSignup;
  document.querySelector('.login-card').classList.toggle('is-signup', isSignup);
  document.getElementById('signupFields').style.display = isSignup ? 'flex' : 'none';
  document.getElementById('submitBtn').textContent = isSignup ? 'Create Account' : 'Login';
  document.querySelector('.alt-caption').textContent = isSignup ? 'Already have an account?' : 'New here?';
  document.getElementById('toggleModeBtn').textContent = isSignup
    ? 'Log in to your account'
    : 'Create an account →';
}

function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
}

// Turns Firebase auth errors into short, friendly, non-leaky messages.
function friendlyAuthError(err) {
  const code = (err && err.code) || '';
  if (code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' ||
      code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
    return 'Invalid email or password.';
  }
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait a minute and try again.';
  if (code === 'auth/network-request-failed') return 'Network error. Check your connection and try again.';
  return (err && err.message ? err.message : 'Something went wrong.').replace('Firebase: ', '');
}

function openResetPassword() {
  const modal = document.getElementById('resetPasswordModal');
  const error = document.getElementById('resetError');
  const button = document.getElementById('resetSubmitBtn');
  modal.style.display = 'flex';
  document.getElementById('resetEmail').value = document.getElementById('email').value.trim();
  error.textContent = '';
  error.style.color = '';
  button.style.display = '';
  button.textContent = 'Send reset link';
  setTimeout(() => document.getElementById('resetEmail').focus(), 0);
}

function closeResetPassword() {
  document.getElementById('resetPasswordModal').style.display = 'none';
}

async function sendPasswordReset() {
  const email = document.getElementById('resetEmail').value.trim();
  const error = document.getElementById('resetError');
  const button = document.getElementById('resetSubmitBtn');
  error.textContent = '';
  if (!/^\S+@\S+\.\S+$/.test(email)) { error.textContent = 'Enter a valid email address.'; return; }
  button.disabled = true;
  button.textContent = 'Sending...';
  try {
    await auth.sendPasswordResetEmail(email);
    error.style.color = 'var(--success)';
    error.textContent = 'Reset link sent. Check your email inbox.';
    button.style.display = 'none';
  } catch (err) {
    error.style.color = '';
    error.textContent = err.message.replace('Firebase: ', '');
  } finally {
    button.disabled = false;
    if (button.style.display !== 'none') button.textContent = 'Send reset link';
  }
}

async function handleSubmit() {
  showError('');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) return showError('Email and password required.');
  if (!/^\S+@\S+\.\S+$/.test(email)) return showError('Enter a valid email address.');
  if (isSignup && password.length < 8) return showError('Use at least 8 characters for your password.');

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = isSignup ? 'Creating...' : 'Logging in...';

  try {
    if (isSignup) {
      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      if (!name || !phone) throw new Error('Please fill all fields.');

      // Bootstrap rule: the first administrator can be created here. After that,
      // administrators should be managed through a secure server-side workflow.
      if (selectedRole === 'admin') {
        const admins = await db.collection('users').where('role', '==', 'admin').limit(1).get();
        if (!admins.empty) throw new Error('An administrator account already exists. Please use the Admin login.');
      }

      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await db.collection('users').doc(cred.user.uid).set({
        name, phone, email,
        role: selectedRole,
        walletBalance: DEMO_CONFIG.STARTING_WALLET_BALANCE,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        ...(selectedRole === 'patient' ? { alertTopic: makeAlertTopic(name) } : {})
      });
      routeToRole(selectedRole);
    } else {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      const doc = await db.collection('users').doc(cred.user.uid).get();
      if (!doc.exists) throw new Error('Account data not found.');
      const actualRole = doc.data().role || 'patient';
      // The account's real role must match the tab the user chose, otherwise a
      // patient could log in through the Admin tab (and vice versa). We show a
      // generic "invalid" message and never reveal the account's real role.
      if (actualRole !== selectedRole) {
        await auth.signOut();
        try { localStorage.removeItem('medicare_role'); } catch (e) {}
        throw new Error('Invalid email or password.');
      }
      routeToRole(actualRole);
    }
  } catch (err) {
    showError(friendlyAuthError(err));
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isSignup ? 'Create Account' : 'Login';
  }
}

function routeToRole(role) {
  try { localStorage.setItem('medicare_role', role); } catch (e) {}
  window.location.href = role === 'admin' ? 'admin-dashboard.html' : 'patient-dashboard.html';
}

// Auto-redirect if already logged in
function onLoginPage() {
  const path = window.location.pathname;
  return path.endsWith('index.html') || path === '/' || path === '';
}

async function redirectSignedInUser(user) {
  try {
    const doc = await db.collection('users').doc(user.uid).get();
    if (doc.exists) { routeToRole(doc.data().role); return; }
  } catch (error) {
    // offline or rules issue — fall through to the cached role
  }
  const cached = localStorage.getItem('medicare_role');
  if (cached) routeToRole(cached);
}

auth.onAuthStateChanged((user) => {
  if (!user || !onLoginPage()) return;
  redirectSignedInUser(user);
});

// The saved session can already be restored by the time this script runs, in
// which case onAuthStateChanged may not fire for the login page again.
if (auth.currentUser && onLoginPage()) redirectSignedInUser(auth.currentUser);
