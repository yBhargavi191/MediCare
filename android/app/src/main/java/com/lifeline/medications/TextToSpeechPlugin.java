package com.lifeline.medications;

import android.speech.tts.TextToSpeech;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;

/**
 * Native voice output for the AI Assistant (chatbot).
 *
 * The Android WebView's speechSynthesis is unreliable and usually exposes no
 * voice list, so replies were read out in English even when the answer was in
 * Telugu, Hindi, Tamil, etc. This plugin drives the platform TextToSpeech
 * engine directly, which speaks every language the device has installed.
 *
 * JS usage (see caremate.html):
 *   const plugin = window.Capacitor.Plugins.MediCareTts;
 *   await plugin.speak({ text: 'నమస్తే', lang: 'te-IN', fallback: 'Hello' });
 *   await plugin.stop();
 */
@CapacitorPlugin(name = "MediCareTts")
public class TextToSpeechPlugin extends Plugin {

    private TextToSpeech tts;
    private boolean ready = false;
    private String pendingText = null;
    private String pendingLang = null;
    private String pendingFallback = null;

    @Override
    public void load() {
        tts = new TextToSpeech(getContext(), new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int status) {
                ready = (status == TextToSpeech.SUCCESS);
                if (ready && pendingText != null) {
                    String text = pendingText;
                    String lang = pendingLang;
                    String fallback = pendingFallback;
                    pendingText = pendingLang = pendingFallback = null;
                    speakNow(text, lang, fallback);
                }
            }
        });
    }

    /** Whether the engine finished initialising (true once voices are ready). */
    @PluginMethod
    public void available(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", ready);
        call.resolve(ret);
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        String lang = call.getString("lang", "en-US");
        String fallback = call.getString("fallback", "");
        if (text == null || text.trim().isEmpty()) {
            call.resolve();
            return;
        }
        if (!ready || tts == null) {
            // The engine may still be starting up; remember the request and it
            // will be spoken the moment onInit succeeds.
            pendingText = text;
            pendingLang = lang;
            pendingFallback = fallback;
            call.resolve();
            return;
        }
        speakNow(text, lang, fallback);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (tts != null) {
            try { tts.stop(); } catch (Exception ignored) { }
        }
        call.resolve();
    }

    private void speakNow(String text, String lang, String fallback) {
        if (tts == null) return;
        String spoken = text;
        Locale locale = toLocale(lang);
        int result = tts.setLanguage(locale);
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            // No voice for this language: read the English wording instead of
            // staying silent (matches the web behaviour).
            if (fallback != null && !fallback.trim().isEmpty()) {
                spoken = fallback;
            }
            tts.setLanguage(Locale.US);
        }
        tts.setSpeechRate(0.98f);
        tts.setPitch(1.0f);
        tts.speak(spoken, TextToSpeech.QUEUE_FLUSH, null, "medicare-tts");
    }

    /** Turns a BCP-47 tag such as "te-IN" into a Locale. */
    private Locale toLocale(String tag) {
        if (tag == null || tag.trim().isEmpty()) return Locale.US;
        Locale locale = Locale.forLanguageTag(tag.replace('_', '-'));
        return (locale == null || locale.getLanguage().isEmpty()) ? Locale.US : locale;
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) {
            try {
                tts.stop();
                tts.shutdown();
            } catch (Exception ignored) { }
            tts = null;
        }
        super.handleOnDestroy();
    }
}
