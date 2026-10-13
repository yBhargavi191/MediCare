package com.lifeline.medications;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "UrgentAlerts")
public class UrgentAlertsPlugin extends Plugin {
    // v2: the original channel was created without an alarm sound and Android
    // channels are immutable, so a new id is required for the change to apply.
    private static final String CHANNEL_ID = "medication_urgent_v2";
    private static final String PREFS = "medicare_alarm_ids";

    private SharedPreferences alarmIds() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static int pendingFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return flags;
    }

    @PluginMethod
    public void openDndSettings(PluginCall call) {
        getActivity().startActivity(new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS));
        call.resolve();
    }

    @PluginMethod
    public void configureUrgentChannel(PluginCall call) {
        NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        boolean accessGranted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) accessGranted = manager.isNotificationPolicyAccessGranted();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Medication alerts", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Medication reminders. The alarm channel rings even in silent mode.");
            channel.enableVibration(true);
            AudioAttributes alarmAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
            Uri alarmSound = Settings.System.DEFAULT_ALARM_ALERT_URI;
            if (alarmSound != null) channel.setSound(alarmSound, alarmAttributes);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && accessGranted) channel.setBypassDnd(true);
            manager.createNotificationChannel(channel);
        }
        // Also make sure the full-screen alarm channel exists up front. Android
        // channels are immutable, so once Do Not Disturb access is granted we
        // recreate it to apply the bypass-DND flag.
        if (accessGranted && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.deleteNotificationChannel(AlarmReceiver.CHANNEL_ID);
        }
        AlarmReceiver.ensureChannel(getContext());

        boolean fullScreenGranted = true;
        if (Build.VERSION.SDK_INT >= 34) fullScreenGranted = manager.canUseFullScreenIntent();

        JSObject result = new JSObject();
        result.put("accessGranted", accessGranted);
        result.put("channelId", CHANNEL_ID);
        result.put("fullScreenGranted", fullScreenGranted);
        call.resolve(result);
    }

    @PluginMethod
    public void fullScreenIntentStatus(PluginCall call) {
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= 34) {
            NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            granted = manager.canUseFullScreenIntent();
        }
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void openFullScreenIntentSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 34) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void exactAlarmStatus(PluginCall call) {
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            granted = am.canScheduleExactAlarms();
        }
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void scheduleAlarm(PluginCall call) {
        Integer id = call.getInt("id");
        Double at = call.getDouble("at");
        if (id == null || at == null) {
            call.reject("id and at are required");
            return;
        }
        String medName = call.getString("medName", "your medicine");
        String doseId = call.getString("doseId", "");

        AlarmReceiver.ensureChannel(getContext());

        Intent intent = new Intent(getContext(), AlarmReceiver.class);
        intent.putExtra(AlarmActivity.EXTRA_MED, medName);
        intent.putExtra(AlarmActivity.EXTRA_DOSE, doseId);
        PendingIntent operation = PendingIntent.getBroadcast(getContext(), id, intent, pendingFlags());

        AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        long triggerAt = at.longValue();
        boolean exact = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) exact = am.canScheduleExactAlarms();
        try {
            if (exact) {
                PendingIntent showIntent = PendingIntent.getActivity(getContext(), id, new Intent(getContext(), MainActivity.class), pendingFlags());
                am.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerAt, showIntent), operation);
            } else {
                // Without the exact-alarm permission this may fire a few minutes
                // late, but it still fires and never throws.
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, operation);
            }
        } catch (SecurityException error) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, operation);
        }
        alarmIds().edit().putBoolean(String.valueOf(id), true).apply();
        call.resolve();
    }

    @PluginMethod
    public void cancelAlarm(PluginCall call) {
        Integer id = call.getInt("id");
        if (id == null) {
            call.reject("id is required");
            return;
        }
        cancelAlarmById(id);
        call.resolve();
    }

    private void cancelAlarmById(int id) {
        Intent intent = new Intent(getContext(), AlarmReceiver.class);
        int flags = PendingIntent.FLAG_NO_CREATE;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent existing = PendingIntent.getBroadcast(getContext(), id, intent, flags);
        if (existing != null) {
            AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            am.cancel(existing);
            existing.cancel();
        }
        NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        nm.cancel(id);
        alarmIds().edit().remove(String.valueOf(id)).apply();
    }

    @PluginMethod
    public void cancelAllAlarms(PluginCall call) {
        for (String key : alarmIds().getAll().keySet()) {
            try {
                cancelAlarmById(Integer.parseInt(key));
            } catch (NumberFormatException ignored) {
            }
        }
        alarmIds().edit().clear().apply();
        call.resolve();
    }

    @PluginMethod
    public void stopAlarm(PluginCall call) {
        AlarmService.stop(getContext());
        AlarmActivity.stopAlarm();
        call.resolve();
    }

    @PluginMethod
    public void ringNow(PluginCall call) {
        String med = call.getString("medName", "Test medicine");
        Context ctx = getContext();
        AlarmReceiver.ensureChannel(ctx);
        Intent svc = new Intent(ctx, AlarmService.class);
        svc.setAction(AlarmService.ACTION_START);
        svc.putExtra(AlarmActivity.EXTRA_MED, med);
        svc.putExtra(AlarmActivity.EXTRA_DOSE, "test-dose-" + System.currentTimeMillis());
        int notifId = (int) (System.currentTimeMillis() & 0x7fffffff);
        svc.putExtra(AlarmActivity.EXTRA_NOTIF, notifId);
        boolean started;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(svc);
            else ctx.startService(svc);
            started = true;
        } catch (Exception error) {
            started = false;
        }
        JSObject result = new JSObject();
        result.put("started", started);
        result.put("serviceRunning", AlarmService.isRunning());
        call.resolve(result);
    }

    @PluginMethod
    public void alarmDiagnostics(PluginCall call) {
        Context ctx = getContext();
        JSObject result = new JSObject();
        result.put("serviceRunning", AlarmService.isRunning());
        result.put("sdk", Build.VERSION.SDK_INT);
        boolean dnd = true;
        boolean fullScreen = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            dnd = nm.isNotificationPolicyAccessGranted();
            result.put("notificationsEnabled", nm.areNotificationsEnabled());
            if (Build.VERSION.SDK_INT >= 34) fullScreen = nm.canUseFullScreenIntent();
        }
        result.put("dndAccess", dnd);
        result.put("fullScreenGranted", fullScreen);
        boolean exact = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            exact = am.canScheduleExactAlarms();
        }
        result.put("exactAlarmGranted", exact);
        result.put("scheduledCount", alarmIds().getAll().size());
        Uri alarmUri = Settings.System.DEFAULT_ALARM_ALERT_URI;
        result.put("alarmUri", alarmUri != null ? alarmUri.toString() : "null");
        call.resolve(result);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        Context ctx = getContext();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                android.os.PowerManager pm = (android.os.PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
                if (pm != null && pm.isIgnoringBatteryOptimizations(ctx.getPackageName())) {
                    JSObject result = new JSObject();
                    result.put("alreadyExempt", true);
                    call.resolve(result);
                    return;
                }
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + ctx.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(intent);
            }
        } catch (Exception error) {
            try {
                Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(intent);
            } catch (Exception ignored) {
            }
        }
        JSObject result = new JSObject();
        result.put("alreadyExempt", false);
        call.resolve(result);
    }

    @PluginMethod
    public void consumePendingVerify(PluginCall call) {
        JSObject result = new JSObject();
        String doseId = MainActivity.pendingDoseId;
        MainActivity.pendingDoseId = null;
        if (doseId != null && !doseId.isEmpty()) result.put("doseId", doseId);
        call.resolve(result);
    }
}
