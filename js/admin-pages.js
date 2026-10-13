(function () {
  'use strict';

  var adminUser = null;
  var adminProfile = null;
  var patientById = new Map();
  var reportRows = [];
  var reportRangeDays = 30;
  var alerts = [];

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function localDateString(date) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function dateFromString(value) {
    var parts = String(value || '').split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function formatDate(value) {
    if (!value) return 'Date unavailable';
    var date = value.toDate ? value.toDate() : value instanceof Date ? value : dateFromString(value);
    return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: value.toDate ? 'short' : undefined }).format(date);
  }

  function getPatientName(patientId) {
    var patient = patientById.get(patientId);
    return patient ? (patient.name || patient.email || 'Patient') : 'Unknown patient';
  }

  function getCaregiver(patient) {
    var contact = (patient.relativeContacts || []).find(function (item) { return item && item.phone; });
    if (contact) return contact;
    return patient.relativePhone ? { name: 'Caregiver', phone: patient.relativePhone } : null;
  }

  function logout() {
    auth.signOut().then(function () { window.location.href = 'index.html'; });
  }
  window.logout = logout;

  auth.onAuthStateChanged(async function (user) {
    if (!user) { window.location.href = 'index.html'; return; }
    try {
      var snapshot = await db.collection('users').doc(user.uid).get();
      if (!snapshot.exists || snapshot.data().role !== 'admin') { window.location.href = 'index.html'; return; }
      adminUser = user;
      adminProfile = snapshot.data();
      var name = adminProfile.name || adminProfile.email || user.email || 'Admin';
      window.MediCareAppShell?.setProfile({ name: name, email: adminProfile.email || user.email });
      document.querySelectorAll('#adminName').forEach(function (element) { element.textContent = name; });
      var profileName = document.getElementById('adminProfileName');
      var profileEmail = document.getElementById('adminProfileEmail');
      if (profileName) profileName.textContent = name;
      if (profileEmail) profileEmail.textContent = adminProfile.email || user.email || '—';

      var page = document.body.dataset.adminPage;
      if (page === 'reports') await loadReports();
      if (page === 'alerts') await loadAlerts();
    } catch (error) {
      console.error('Unable to initialize admin page:', error);
      var status = document.querySelector('.admin-status-message');
      if (status) status.textContent = 'Could not load admin data. Check your connection and try again.';
    }
  });

  async function loadReports() {
    var status = document.getElementById('reportStatus');
    var days = Number(document.getElementById('reportRange').value) || 30;
    reportRangeDays = days;
    var endDate = new Date();
    var startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days + 1);
    var startString = localDateString(startDate);
    var endString = localDateString(endDate);
    status.textContent = 'Loading report…';

    try {
      var results = await Promise.all([
        db.collection('users').where('role', '==', 'patient').get(),
        db.collection('doses').where('date', '>=', startString).where('date', '<=', endString).get()
      ]);
      var patients = results[0].docs.map(function (doc) { return Object.assign({ id: doc.id }, doc.data()); }).filter(function (patient) { return patient.status !== 'archived'; });
      patientById = new Map(patients.map(function (patient) { return [patient.id, patient]; }));
      window.MediCareAppShell?.setMetrics({ patients: patients.length });
      var doses = results[1].docs.map(function (doc) { return Object.assign({ id: doc.id }, doc.data()); }).filter(function (dose) { return patientById.has(dose.patientId); });

      var rowsByPatient = new Map(patients.map(function (patient) {
        return [patient.id, { id: patient.id, name: patient.name || patient.email || 'Patient', email: patient.email || '', total: 0, taken: 0, missed: 0 }];
      }));
      var rowsByDate = new Map();
      for (var dayOffset = 0; dayOffset < days; dayOffset++) {
        var day = new Date(startDate);
        day.setDate(startDate.getDate() + dayOffset);
        var key = localDateString(day);
        rowsByDate.set(key, { date: key, total: 0, taken: 0, missed: 0 });
      }

      doses.forEach(function (dose) {
        var patientRow = rowsByPatient.get(dose.patientId);
        var dateRow = rowsByDate.get(dose.date);
        if (patientRow) {
          patientRow.total++;
          if (dose.status === 'verified') patientRow.taken++;
          if (dose.status === 'missed') patientRow.missed++;
        }
        if (dateRow) {
          dateRow.total++;
          if (dose.status === 'verified') dateRow.taken++;
          if (dose.status === 'missed') dateRow.missed++;
        }
      });

      reportRows = Array.from(rowsByPatient.values()).sort(function (a, b) { return a.name.localeCompare(b.name); });
      var dateRows = Array.from(rowsByDate.values()).reverse();
      var totalTaken = doses.filter(function (dose) { return dose.status === 'verified'; }).length;
      var totalMissed = doses.filter(function (dose) { return dose.status === 'missed'; }).length;
      document.getElementById('reportPatients').textContent = patients.length;
      document.getElementById('reportDoses').textContent = doses.length;
      document.getElementById('reportTaken').textContent = totalTaken;
      document.getElementById('reportMissed').textContent = totalMissed;
      document.getElementById('reportRangeLabel').textContent = formatDate(startString) + ' – ' + formatDate(endString);

      var patientBody = document.getElementById('patientReportRows');
      patientBody.innerHTML = reportRows.length ? reportRows.map(function (row) {
        var percent = row.total ? Math.round(row.taken / row.total * 100) : 0;
        return '<tr><td>' + escapeHtml(row.name) + '</td><td class="admin-number">' + row.total + '</td><td class="admin-number">' + row.taken + '</td><td class="admin-number">' + row.missed + '</td><td><span class="admin-progress" aria-hidden="true"><span style="width:' + percent + '%"></span></span><span class="admin-number">' + percent + '%</span></td></tr>';
      }).join('') : '<tr><td colspan="5">No active patients found.</td></tr>';

      var dailyBody = document.getElementById('dailyReportRows');
      dailyBody.innerHTML = dateRows.map(function (row) {
        var percent = row.total ? Math.round(row.taken / row.total * 100) : 0;
        return '<tr><td>' + escapeHtml(formatDate(row.date)) + '</td><td class="admin-number">' + row.total + '</td><td class="admin-number">' + row.taken + '</td><td class="admin-number">' + row.missed + '</td><td class="admin-number">' + percent + '%</td></tr>';
      }).join('');
      status.textContent = 'Completion is verified doses divided by all scheduled doses in the selected period.';
    } catch (error) {
      console.error('Unable to load report:', error);
      status.textContent = 'Could not load the report. Check your connection and try again.';
      document.getElementById('patientReportRows').innerHTML = '<tr><td colspan="5">Report data is unavailable.</td></tr>';
      document.getElementById('dailyReportRows').innerHTML = '<tr><td colspan="5">Report data is unavailable.</td></tr>';
    }
  }

  function csvCell(value) {
    var text = String(value == null ? '' : value);
    if (/^[=+@\-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function exportReport() {
    var heading = ['Patient', 'Email', 'Scheduled doses', 'Verified doses', 'Missed doses', 'Completion percent'];
    var rows = reportRows.map(function (row) {
      return [row.name, row.email, row.total, row.taken, row.missed, row.total ? Math.round(row.taken / row.total * 100) : 0];
    });
    var csv = [heading].concat(rows).map(function (row) { return row.map(csvCell).join(','); }).join('\r\n');
    var url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    var link = document.createElement('a');
    link.href = url;
    link.download = 'medicare-dose-report-' + reportRangeDays + 'days.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  var rangeSelect = document.getElementById('reportRange');
  if (rangeSelect) rangeSelect.addEventListener('change', loadReports);
  var exportButton = document.getElementById('exportReportBtn');
  if (exportButton) exportButton.addEventListener('click', exportReport);

  async function loadAlerts() {
    var host = document.getElementById('adminAlertList');
    var status = document.getElementById('alertPageStatus');
    host.innerHTML = '<div class="admin-empty">Loading alerts…</div>';
    try {
      var results = await Promise.all([
        db.collection('alerts').get(),
        db.collection('users').where('role', '==', 'patient').get()
      ]);
      patientById = new Map(results[1].docs.map(function (doc) { return [doc.id, Object.assign({ id: doc.id }, doc.data())]; }));
      alerts = results[0].docs.map(function (doc) { return Object.assign({ id: doc.id }, doc.data()); }).sort(function (a, b) {
        var aTime = a.createdAt && a.createdAt.seconds || 0;
        var bTime = b.createdAt && b.createdAt.seconds || 0;
        return bTime - aTime;
      });
      var filter = document.getElementById('alertPatientFilter');
      Array.from(patientById.values()).sort(function (a, b) {
        return (a.name || a.email || '').localeCompare(b.name || b.email || '');
      }).forEach(function (patient) {
        var option = document.createElement('option');
        option.value = patient.id;
        option.textContent = patient.name || patient.email || 'Patient';
        filter.appendChild(option);
      });
      ['alertStatusFilter', 'alertPatientFilter', 'alertSearch'].forEach(function (id) {
        var control = document.getElementById(id);
        control.addEventListener('input', renderAlerts);
        control.addEventListener('change', renderAlerts);
      });
      renderAlerts();
    } catch (error) {
      console.error('Unable to load alerts:', error);
      status.textContent = 'Could not load alerts. Check your connection and try again.';
      host.innerHTML = '<div class="admin-empty">Alert data is unavailable.</div>';
    }
  }

  function renderAlerts() {
    var host = document.getElementById('adminAlertList');
    if (!host) return;
    var statusFilter = document.getElementById('alertStatusFilter').value;
    var patientFilter = document.getElementById('alertPatientFilter').value;
    var search = document.getElementById('alertSearch').value.trim().toLocaleLowerCase();
    var filtered = alerts.filter(function (alert) {
      var reviewed = alert.status === 'reviewed' || Boolean(alert.reviewedAt);
      if (statusFilter === 'open' && reviewed) return false;
      if (statusFilter === 'reviewed' && !reviewed) return false;
      if (patientFilter !== 'all' && alert.patientId !== patientFilter) return false;
      var haystack = (getPatientName(alert.patientId) + ' ' + (alert.message || '') + ' ' + (alert.medName || '')).toLocaleLowerCase();
      return !search || haystack.includes(search);
    });

    var openCount = alerts.filter(function (alert) { return alert.status !== 'reviewed' && !alert.reviewedAt; }).length;
    window.MediCareAppShell?.setMetrics({ alerts: openCount, patients: patientById.size });
    var summary = document.getElementById('alertsSummary');
    summary.textContent = openCount + ' need review · ' + alerts.length + ' total';
    if (!filtered.length) {
      host.innerHTML = '<div class="admin-empty">No alerts match these filters.</div>';
      return;
    }

    host.innerHTML = filtered.map(function (alert) {
      var reviewed = alert.status === 'reviewed' || Boolean(alert.reviewedAt);
      var patient = patientById.get(alert.patientId) || {};
      var caregiver = getCaregiver(patient);
      var phone = caregiver && String(caregiver.phone || '').replace(/[^+\d]/g, '');
      var callAction = phone ? '<a class="icon-btn" href="tel:' + escapeHtml(phone) + '" aria-label="Call caregiver">Call caregiver</a>' : '';
      var reviewAction = reviewed ? '<span class="badge verified">Reviewed</span>' : '<button class="icon-btn" type="button" data-review-alert="' + escapeHtml(alert.id) + '">Mark reviewed</button>';
      return '<article class="admin-alert-item' + (reviewed ? ' is-reviewed' : '') + '"><div class="admin-alert-copy"><strong>' + escapeHtml(getPatientName(alert.patientId)) + '</strong><p>' + escapeHtml(alert.message || ('Missed dose: ' + (alert.medName || 'Medication'))) + '</p><small>' + escapeHtml(formatDate(alert.createdAt)) + (caregiver ? ' · ' + escapeHtml(caregiver.name || 'Caregiver') : '') + '</small></div><div class="admin-alert-actions">' + callAction + reviewAction + '</div></article>';
    }).join('');

    host.querySelectorAll('[data-review-alert]').forEach(function (button) {
      button.addEventListener('click', function () { markAlertReviewed(button.dataset.reviewAlert); });
    });
  }

  async function markAlertReviewed(alertId) {
    var status = document.getElementById('alertPageStatus');
    status.textContent = 'Saving review…';
    try {
      await db.collection('alerts').doc(alertId).update({
        status: 'reviewed',
        reviewedBy: adminUser.uid,
        reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      var alert = alerts.find(function (item) { return item.id === alertId; });
      if (alert) { alert.status = 'reviewed'; alert.reviewedBy = adminUser.uid; alert.reviewedAt = { seconds: Math.floor(Date.now() / 1000) }; }
      status.textContent = 'Alert marked as reviewed.';
      renderAlerts();
    } catch (error) {
      console.error('Unable to update alert:', error);
      status.textContent = 'Could not update this alert. Check Firestore permissions and try again.';
    }
  }
})();