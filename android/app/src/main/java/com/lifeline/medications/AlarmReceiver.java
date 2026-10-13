package com.lifeline.medications;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.NotificationCompat;

/**
 * Fired by the exact alarm at the scheduled time. It starts {@link AlarmService},
 * which shows a full-screen notification and rings the alarm until verified.
 */
public class AlarmReceiver extends BroadcastReceiver {
    // v2: channels are immutable. An earlier channel may have been created
    // without an alarm sound, so a new id guarantees the alarm sound applies.
    public static final String CHANNEL_ID = "medication_alarm_v2";

    @Override
    public void onReceive(Context context, Intent intent) {
        String med = intent.getStringExtra(AlarmActivity.EXTRA_MED);
        if (med == null || med.trim().isEmpty()) med = "your medicine";
        String dose = intent.getStringExtra(AlarmActivity.EXTRA_DOSE);
        int notifId = (dose != null && !dose.isEmpty())
                ? dose.hashCode() & 0x7fffffff
                : (int) (System.currentTimeMillis() & 0x7fffffff);

        AlarmReceiver.ensureChannel(context);

        Intent service = new Intent(context, AlarmService.class);
        service.setAction(AlarmService.ACTION_START);
        service.putExtra(AlarmActivity.EXTRA_MED, med);
        service.putExtra(AlarmActivity.EXTRA_DOSE, dose);
        service.putExtra(AlarmActivity.EXTRA_NOTIF, notifId);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(service);
            } else {
                context.startService(service);
            }
        } catch (Exception error) {
            // Background foreground-service start can be restricted on some ROMs.
            // Fall back to a full-screen notification so the alert still appears.
            postFallbackNotification(context, med, dose, notifId);
        }
    }

    private void postFallbackNotification(Context context, String med, String dose, int notifId) {
        Intent full = new Intent(context, AlarmActivity.class);
        full.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        full.putExtra(AlarmActivity.EXTRA_MED, med);
        full.putExtra(AlarmActivity.EXTRA_DOSE, dose);
        full.putExtra(AlarmActivity.EXTRA_NOTIF, notifId);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pendingIntent = PendingIntent.getActivity(context, notifId, full, flags);

        Notification notification = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("Medication time")
                .setContentText("Time to take " + med + ". Tap to verify.")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setFullScreenIntent(pendingIntent, true)
                .setContentIntent(pendingIntent)
                .build();

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(notifId, notification);
    }

    static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Medication alarm", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Alarm-style medication reminders that ring until verified");
        channel.enableVibration(true);
        boolean access = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) access = nm.isNotificationPolicyAccessGranted();
        if (access) channel.setBypassDnd(true);

        AudioAttributes audio = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
        Uri sound = Settings.System.DEFAULT_ALARM_ALERT_URI;
        if (sound == null) sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (sound != null) channel.setSound(sound, audio);

        nm.createNotificationChannel(channel);
    }
}
