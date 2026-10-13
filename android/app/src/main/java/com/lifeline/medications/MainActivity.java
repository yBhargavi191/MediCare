package com.lifeline.medications;

import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /** Set by {@link AlarmActivity} when the patient taps "Open & Verify". */
    public static String pendingDoseId = null;

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(UrgentAlertsPlugin.class);
        registerPlugin(SpeechRecognitionPlugin.class);
        registerPlugin(TextToSpeechPlugin.class);
        super.onCreate(savedInstanceState);
        applyIntent(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        applyIntent(intent);
    }

    private void applyIntent(Intent intent) {
        if (intent == null) return;
        String dose = intent.getStringExtra(AlarmActivity.EXTRA_DOSE);
        if (dose == null || dose.isEmpty()) return;
        pendingDoseId = dose;

        // Warm start: the web view is already loaded, so navigate immediately.
        if (getBridge() != null && getBridge().getWebView() != null) {
            final String url = "verify.html?doseId=" + Uri.encode(dose);
            getBridge().getWebView().post(new Runnable() {
                @Override
                public void run() {
                    try {
                        getBridge().getWebView().evaluateJavascript("window.location.href='" + url + "'", null);
                    } catch (Exception ignored) {
                    }
                }
            });
        }
    }
}
