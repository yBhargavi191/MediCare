package com.lifeline.medications;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.media.ToneGenerator;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.widget.Toast;

import androidx.core.app.NotificationCompat;

/**
 * Rings the medication alarm as a foreground service so it sounds even when the
 * full-screen activity cannot be shown, until the patient verifies or dismisses.
 * Audio is routed to the ALARM stream (audible in silent and Do Not Disturb).
 */
public class AlarmService extends Service {
    public static final String ACTION_START = "com.lifeline.medications.action.ALARM_START";
    public static final String ACTION_STOP = "com.lifeline.medications.action.ALARM_STOP";

    private static boolean running = false;
    private PowerManager.WakeLock wakeLock;
    private MediaPlayer player;
    private Vibrator vibrator;
    private Ringtone ringtone;
    private ToneGenerator toneGenerator;
    private Handler ringHandler;

    public static boolean isRunning() {
        return running;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String med = intent != null ? intent.getStringExtra(AlarmActivity.EXTRA_MED) : null;
        if (med == null || med.trim().isEmpty()) med = "your medicine";
        String dose = intent != null ? intent.getStringExtra(AlarmActivity.EXTRA_DOSE) : null;
        int notifId = intent != null && intent.hasExtra(AlarmActivity.EXTRA_NOTIF)
                ? intent.getIntExtra(AlarmActivity.EXTRA_NOTIF, 1001) : 1001;

        Notification notification = buildNotification(med, dose, notifId);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(notifId, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(notifId, notification);
            }
        } catch (Exception error) {
            Toast.makeText(this, "MediCare: alert shown (background service blocked)", Toast.LENGTH_LONG).show();
        }

        running = true;

        // Keep the CPU awake while the alarm rings so audio starts immediately
        // and never stutters if the phone was in Doze / deep sleep.
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "MediCare:Alarm");
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire(10 * 60 * 1000L);
            }
        } catch (Exception ignored) {
        }

        startRinging();
        Toast.makeText(this, "MediCare alarm ringing", Toast.LENGTH_SHORT).show();

        // Best effort: bring the full-screen alert window to the front so the
        // app opens by itself, in addition to the full-screen notification.
        try {
            Intent act = new Intent(this, AlarmActivity.class);
            act.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            act.putExtra(AlarmActivity.EXTRA_MED, med);
            act.putExtra(AlarmActivity.EXTRA_DOSE, dose);
            act.putExtra(AlarmActivity.EXTRA_NOTIF, notifId);
            startActivity(act);
        } catch (Exception ignored) {
        }
        return START_STICKY;
    }

    private Notification buildNotification(String med, String dose, int notifId) {
        AlarmReceiver.ensureChannel(this);

        Intent full = new Intent(this, AlarmActivity.class);
        full.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        full.putExtra(AlarmActivity.EXTRA_MED, med);
        full.putExtra(AlarmActivity.EXTRA_DOSE, dose);
        full.putExtra(AlarmActivity.EXTRA_NOTIF, notifId);

        PendingIntent pi = PendingIntent.getActivity(this, notifId, full, pendingFlags());

        return new NotificationCompat.Builder(this, AlarmReceiver.CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("Medication time")
                .setContentText("Time to take " + med + ". Tap to verify.")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setFullScreenIntent(pi, true)
                .setContentIntent(pi)
                .build();
    }

    private static int pendingFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return flags;
    }

    void startRinging() {
        stopRinging();
        forceAlarmVolume();
        startVibration();

        // Try, in order: alarm-arc, default alarm, ringtone, notification tone.
        Uri uri = Settings.System.DEFAULT_ALARM_ALERT_URI;
        if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        boolean played = playViaMediaPlayer(uri);
        if (!played) played = playViaRingtone(uri);
        if (!played) startToneFallback();
    }

    /** Push the ALARM stream to max volume and unmute so silent mode cannot mute it. */
    private void forceAlarmVolume() {
        try {
            AudioManager audio = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audio == null) return;
            int max = audio.getStreamMaxVolume(AudioManager.STREAM_ALARM);
            audio.setStreamVolume(AudioManager.STREAM_ALARM, max, 0);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                audio.adjustStreamVolume(AudioManager.STREAM_ALARM, AudioManager.ADJUST_UNMUTE, 0);
            }
        } catch (Exception ignored) {
        }
    }

    /** Primary player: far more reliable than Ringtone on ColorOS / Funtouch. */
    private boolean playViaMediaPlayer(Uri uri) {
        if (uri == null) return false;
        try {
            MediaPlayer mp = new MediaPlayer();
            mp.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
            mp.setDataSource(getApplicationContext(), uri);
            mp.setLooping(true);
            mp.setOnErrorListener((m, what, extra) -> {
                try { m.release(); } catch (Exception ignored) {}
                if (player == m) player = null;
                startToneFallback();
                return true;
            });
            mp.prepare();
            mp.start();
            player = mp;
            return true;
        } catch (Exception error) {
            return false;
        }
    }

    private boolean playViaRingtone(Uri uri) {
        if (uri == null) return false;
        try {
            Ringtone tone = RingtoneManager.getRingtone(getApplicationContext(), uri);
            if (tone == null) return false;
            tone.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                tone.setLooping(true);
            } else {
                tone.setStreamType(AudioManager.STREAM_ALARM);
            }
            tone.play();
            ringtone = tone;
            return true;
        } catch (Exception error) {
            return false;
        }
    }

    private void startVibration() {
        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator == null || !vibrator.hasVibrator()) return;
            long[] pattern = {0, 800, 500, 800, 500};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            } else {
                vibrator.vibrate(pattern, 0);
            }
        } catch (Exception ignored) {
        }
    }

    /** Guaranteed-sound fallback that always plays on the ALARM stream. */
    private void startToneFallback() {
        try {
            toneGenerator = new ToneGenerator(AudioManager.STREAM_ALARM, ToneGenerator.MAX_VOLUME);
            ringHandler = new Handler(Looper.getMainLooper());
            ringHandler.post(new Runnable() {
                @Override
                public void run() {
                    try {
                        if (toneGenerator != null) toneGenerator.startTone(ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD, 1500);
                    } catch (Exception ignored) {
                    }
                    if (ringHandler != null) ringHandler.postDelayed(this, 1600);
                }
            });
        } catch (Exception ignored) {
        }
    }

    private void stopRinging() {
        if (ringHandler != null) {
            ringHandler.removeCallbacksAndMessages(null);
            ringHandler = null;
        }
        if (ringtone != null) {
            try {
                ringtone.stop();
            } catch (Exception ignored) {
            }
            ringtone = null;
        }
        if (player != null) {
            try { player.stop(); } catch (Exception ignored) {
            }
            try { player.release(); } catch (Exception ignored) {
            }
            player = null;
        }
        if (vibrator != null) {
            try { vibrator.cancel(); } catch (Exception ignored) {
            }
            vibrator = null;
        }
        if (toneGenerator != null) {
            try {
                toneGenerator.stopTone();
                toneGenerator.release();
            } catch (Exception ignored) {
            }
            toneGenerator = null;
        }
    }

    @Override
    public void onDestroy() {
        running = false;
        stopRinging();
        if (wakeLock != null) {
            try {
                if (wakeLock.isHeld()) wakeLock.release();
            } catch (Exception ignored) {
            }
            wakeLock = null;
        }
        super.onDestroy();
    }

    public static void stop(Context context) {
        Intent intent = new Intent(context, AlarmService.class);
        intent.setAction(ACTION_STOP);
        try {
            context.startService(intent);
        } catch (Exception ignored) {
        }
    }
}
