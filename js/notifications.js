/* Notification helpers shared by the website and the Android Capacitor app. */
const MediCareNotifications = {
  scheduledDoseIds: new Set(),
  get native() {
    return window.Capacitor?.isNativePlatform?.() && window.Capacitor?.Plugins?.LocalNotifications;
  },

  get urgentAlerts() {
    return window.Capacitor?.isNativePlatform?.() && window.Capacitor?.Plugins?.UrgentAlerts;
  },

  async enableUrgentAndroidAlerts() {
    if (!this.urgentAlerts) return { supported: false };
    await this.urgentAlerts.openDndSettings();
    return { supported: true };
  },

  async fullScreenIntentStatus() {
    if (!this.urgentAlerts) return { granted: true };
    try {
      return await this.urgentAlerts.fullScreenIntentStatus();
    } catch (error) {
      return { granted: true };
    }
  },

  async openFullScreenIntentSettings() {
    if (!this.urgentAlerts) return;
    try {
      await this.urgentAlerts.openFullScreenIntentSettings();
    } catch (error) {
      /* ignore */
    }
  },

  async exactAlarmStatus() {
    if (!this.urgentAlerts) return { granted: true };
    try {
      return await this.urgentAlerts.exactAlarmStatus();
    } catch (error) {
      return { granted: true };
    }
  },

  async openExactAlarmSettings() {
    if (!this.urgentAlerts) return;
    try {
      await this.urgentAlerts.openExactAlarmSettings();
    } catch (error) {
      /* ignore */
    }
  },

  async configureUrgentChannel() {
    if (!this.urgentAlerts) return { accessGranted: false, channelId: null, fullScreenGranted: true };
    return this.urgentAlerts.configureUrgentChannel();
  },

  async consumePendingVerify() {
    if (!this.urgentAlerts) return null;
    try {
      const result = await this.urgentAlerts.consumePendingVerify();
      return result?.doseId || null;
    } catch (error) {
      return null;
    }
  },

  async stopAlarm() {
    if (!this.urgentAlerts) return;
    try {
      await this.urgentAlerts.stopAlarm();
    } catch (error) {
      /* ignore */
    }
  },

  async ringNow(medName) {
    if (!this.urgentAlerts) return { started: false };
    try {
      return await this.urgentAlerts.ringNow({ medName: medName || 'Test medicine' });
    } catch (error) {
      return { started: false, error: String(error) };
    }
  },

  async alarmDiagnostics() {
    if (!this.urgentAlerts) return { supported: false };
    try {
      return await this.urgentAlerts.alarmDiagnostics();
    } catch (error) {
      return { supported: false, error: String(error) };
    }
  },

  async scheduleTestAlarm(seconds) {
    if (!this.urgentAlerts) return { scheduled: false };
    try {
      await this.urgentAlerts.scheduleAlarm({
        id: 777001,
        at: Date.now() + Math.max(5, seconds || 20) * 1000,
        medName: 'Test medicine',
        doseId: 'test-scheduled-alarm'
      });
      return { scheduled: true };
    } catch (error) {
      return { scheduled: false, error: String(error) };
    }
  },

  async requestIgnoreBatteryOptimizations() {
    if (!this.urgentAlerts) return { alreadyExempt: false };
    try {
      return await this.urgentAlerts.requestIgnoreBatteryOptimizations();
    } catch (error) {
      return { alreadyExempt: false, error: String(error) };
    }
  },

  async requestPermission() {
    if (this.native) {
      const permission = await this.native.requestPermissions();
      return permission.display === 'granted';
    }
    if (!('Notification' in window)) return false;
    return Notification.requestPermission().then(result => result === 'granted');
  },

  async scheduleDose(dose) {
    if (dose.status !== 'pending') return false;
    const [hour, minute] = String(dose.scheduledTime).split(':').map(Number);
    const at = new Date();
    at.setHours(hour, minute, 0, 0);
    if (at <= new Date()) return false;
    const id = this.notificationId(dose.id);

    // Preferred path on Android: a native alarm that shows a full-screen alert
    // and rings (bypassing silent/DND) even when the app is closed.
    if (this.urgentAlerts) {
      try {
        await this.urgentAlerts.scheduleAlarm({ id, at: at.getTime(), medName: dose.medName, doseId: dose.id });
        this.scheduledDoseIds.add(dose.id);
        return true;
      } catch (error) {
        console.warn('Native alarm unavailable for this dose; using a local notification.', error);
      }
    }

    if (!this.native) return false;
    await this.native.schedule({
      notifications: [{
        id,
        title: 'Medication time',
        body: `Time to take ${dose.medName}. Open MediCare to verify.`,
        schedule: { at, allowWhileIdle: true },
        sound: 'default',
        channelId: 'medication_urgent_v2',
        extra: { doseId: dose.id }
      }]
    });
    this.scheduledDoseIds.add(dose.id);
    return true;
  },

  async resetScheduledDoses(doses) {
    if (this.urgentAlerts) {
      try {
        await this.urgentAlerts.cancelAllAlarms();
      } catch (error) {
        /* ignore */
      }
      this.scheduledDoseIds.clear();
      await Promise.allSettled(doses.map(dose => this.scheduleDose(dose)));
      return;
    }
    if (!this.native) return;
    // `getPending` covers alarms made before a page reload too, so stale
    // custom-time alarms do not survive until the patient restarts the app.
    const pending = await this.native.getPending();
    const oldNotifications = pending.notifications || [];
    if (oldNotifications.length) {
      await this.native.cancel({ notifications: oldNotifications.map(notification => ({ id: notification.id })) });
    }
    this.scheduledDoseIds.clear();
    await Promise.allSettled(doses.map(dose => this.scheduleDose(dose)));
  },

  async showDueDose(dose) {
    if (dose.status !== 'pending') return;
    const id = this.notificationId(dose.id);
    if (this.urgentAlerts) {
      try {
        await this.urgentAlerts.cancelAlarm({ id });
      } catch (error) {
        /* ignore */
      }
      try {
        await this.urgentAlerts.scheduleAlarm({ id, at: Date.now() + 1000, medName: dose.medName, doseId: dose.id });
        return;
      } catch (error) {
        /* fall through to a local notification */
      }
    }
    if (!this.native) return;
    await this.native.cancel({ notifications: [{ id }] });
    // A native local notification needs a future instant; one second makes due
    // reminders fire even if the dashboard opens during the scheduled minute.
    await this.native.schedule({ notifications: [{
      id, title: 'Medication time', body: `Time to take ${dose.medName}. Open MediCare to verify.`,
      schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true }, sound: 'default',
      channelId: 'medication_urgent_v2', extra: { doseId: dose.id }
    }] });
  },

  async cancelDose(doseId) {
    const id = this.notificationId(doseId);
    if (this.urgentAlerts) {
      try {
        await this.urgentAlerts.cancelAlarm({ id });
      } catch (error) {
        /* ignore */
      }
      this.scheduledDoseIds.delete(doseId);
      return;
    }
    if (!this.native) return;
    await this.native.cancel({ notifications: [{ id }] });
    this.scheduledDoseIds.delete(doseId);
  },

  notificationId(doseId) {
    let value = 0;
    for (let index = 0; index < doseId.length; index++) value = ((value << 5) - value + doseId.charCodeAt(index)) | 0;
    return Math.abs(value) || 1;
  }
};
