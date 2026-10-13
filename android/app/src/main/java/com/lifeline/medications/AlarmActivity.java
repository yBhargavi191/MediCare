package com.lifeline.medications;

import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Full-screen medication alarm. Launched by {@link AlarmReceiver} through a
 * full-screen-intent notification so it also appears when the app is closed or
 * the phone is locked. It rings the ALARM stream (audible even in silent or
 * Do Not Disturb mode) until the patient taps "Open & Verify" or "Dismiss".
 */
public class AlarmActivity extends Activity {
    public static final String EXTRA_MED = "medName";
    public static final String EXTRA_DOSE = "doseId";
    public static final String EXTRA_NOTIF = "notifId";

    private static AlarmActivity instance;
    private Ringtone ringtone;
    private Handler ringHandler;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);

        String intentMed = getIntent().getStringExtra(EXTRA_MED);
        final String medName = (intentMed == null || intentMed.trim().isEmpty()) ? "your medicine" : intentMed;

        float density = getResources().getDisplayMetrics().density;
        int pad = (int) (26 * density);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.parseColor("#B71C1C"));
        root.setPadding(pad, pad, pad, pad);

        TextView heading = new TextView(this);
        heading.setText("MEDICATION TIME");
        heading.setTextColor(Color.parseColor("#FFCDD2"));
        heading.setTextSize(16);
        heading.setGravity(Gravity.CENTER);

        TextView medView = new TextView(this);
        medView.setText(medName);
        medView.setTextColor(Color.WHITE);
        medView.setTextSize(34);
        medView.setTypeface(Typeface.DEFAULT_BOLD);
        medView.setGravity(Gravity.CENTER);
        medView.setPadding(0, pad / 2, 0, pad / 2);

        TextView hint = new TextView(this);
        hint.setText("Take it now, then verify with a photo to stop the alarm.");
        hint.setTextColor(Color.parseColor("#FFEBEE"));
        hint.setTextSize(15);
        hint.setGravity(Gravity.CENTER);
        hint.setPadding(0, 0, 0, pad);

        Button verify = new Button(this);
        verify.setText("OPEN & VERIFY");
        verify.setTextSize(20);
        verify.setAllCaps(false);
        verify.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                openVerify();
            }
        });

        Button dismiss = new Button(this);
        dismiss.setText("Dismiss alarm");
        dismiss.setTextSize(15);
        dismiss.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                stopAlarm();
            }
        });

        LinearLayout.LayoutParams full = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        root.addView(heading);
        root.addView(medView);
        root.addView(hint);
        root.addView(verify, full);
        root.addView(dismiss, full);
        setContentView(root);

        // The foreground service rings by default; only ring here if it is not running.
        if (!AlarmService.isRunning()) startRinging();
    }

    private void startRinging() {
        stopRinging();
        try {
            // Force the ALARM stream to max so the ring is audible even when the
            // ringer is on silent/vibrate. Alarm-stream audio is exempt from DND.
            AudioManager audio = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audio != null) {
                int max = audio.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                if (audio.getStreamVolume(AudioManager.STREAM_ALARM) < max) {
                    audio.setStreamVolume(AudioManager.STREAM_ALARM, max, 0);
                }
            }

            Uri uri = Settings.System.DEFAULT_ALARM_ALERT_URI;
            if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);

            Ringtone tone = RingtoneManager.getRingtone(getApplicationContext(), uri);
            if (tone == null) return;
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

            // Pre-P devices cannot loop a Ringtone directly, so replay it.
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
                ringHandler = new Handler(Looper.getMainLooper());
                ringHandler.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        if (ringtone != null && !ringtone.isPlaying()) {
                            ringtone.play();
                        }
                        if (ringHandler != null) ringHandler.postDelayed(this, 1000);
                    }
                }, 1000);
            }
        } catch (Exception ignored) {
            // The notification channel sound still fires if the ringtone fails.
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
    }

    private void cancelNotification() {
        int notifId = getIntent().getIntExtra(EXTRA_NOTIF, 0);
        if (notifId != 0) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(notifId);
        }
    }

    private void openVerify() {
        String dose = getIntent().getStringExtra(EXTRA_DOSE);
        MainActivity.pendingDoseId = dose;
        cancelNotification();
        stopRinging();
        AlarmService.stop(getApplicationContext());

        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.putExtra(EXTRA_DOSE, dose);
        startActivity(intent);
        finish();
        instance = null;
    }

    /** Stops the ringtone and dismisses the alarm screen. Safe to call from any component. */
    public static void stopAlarm() {
        if (instance != null) {
            try {
                AlarmService.stop(instance.getApplicationContext());
                instance.stopRinging();
                instance.cancelNotification();
                instance.finish();
            } catch (Exception ignored) {
            }
            instance = null;
        }
    }

    /** Stops only the ringtone, leaving the screen for the patient to interact with. */
    public static void stopAlarmSoundOnly() {
        if (instance != null) instance.stopRinging();
    }

    @Override
    protected void onDestroy() {
        stopRinging();
        if (instance == this) instance = null;
        super.onDestroy();
    }
}
