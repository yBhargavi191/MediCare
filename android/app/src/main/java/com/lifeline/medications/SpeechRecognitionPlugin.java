package com.lifeline.medications;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;

/**
 * Native voice input for the AI Assistant (chatbot).
 *
 * The Android WebView does not implement the Web Speech API's
 * SpeechRecognition, so the in-page mic button can only work in a desktop
 * browser. This plugin exposes the platform SpeechRecognizer (which drives the
 * same on-device Google speech service used by the keyboard) so the mic works
 * inside the installed app too — in any language the device supports.
 *
 * JS usage (see caremate.html):
 *   const plugin = window.Capacitor.Plugins.MediCareSpeech;
 *   const { available } = await plugin.available();
 *   const { text } = await plugin.start({ lang: 'te-IN' });
 */
@CapacitorPlugin(
    name = "MediCareSpeech",
    permissions = { @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }) }
)
public class SpeechRecognitionPlugin extends Plugin {

    private SpeechRecognizer recognizer;
    private PluginCall pendingCall;

    @PluginMethod
    public void available(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", SpeechRecognizer.isRecognitionAvailable(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "permissionCallback");
            return;
        }
        listen(call);
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            listen(call);
        } else {
            call.reject("Microphone permission was denied");
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopListening();
        resolvePending("");
        call.resolve();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        stopListening();
        resolvePending("");
        call.resolve();
    }

    private void listen(final PluginCall call) {
        final String lang = call.getString("lang", "en-US");
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("No foreground activity");
            return;
        }
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
                    call.reject("Speech recognition is not available on this device");
                    return;
                }
                stopListening();
                pendingCall = call;
                recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
                recognizer.setRecognitionListener(new RecognitionListener() {
                    @Override public void onReadyForSpeech(Bundle params) { }
                    @Override public void onBeginningOfSpeech() { }
                    @Override public void onRmsChanged(float rmsdB) { }
                    @Override public void onBufferReceived(byte[] buffer) { }
                    @Override public void onEndOfSpeech() { }
                    @Override public void onPartialResults(Bundle partialResults) { }
                    @Override public void onEvent(int eventType, Bundle params) { }

                    @Override
                    public void onError(int error) {
                        JSObject ret = new JSObject();
                        ret.put("text", "");
                        ret.put("error", errorCode(error));
                        resolvePending(ret);
                        stopListening();
                    }

                    @Override
                    public void onResults(Bundle results) {
                        ArrayList<String> matches = results != null
                            ? results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                            : null;
                        String text = (matches != null && !matches.isEmpty() && matches.get(0) != null)
                            ? matches.get(0)
                            : "";
                        JSObject ret = new JSObject();
                        ret.put("text", text);
                        JSArray arr = new JSArray();
                        if (matches != null) {
                            for (String m : matches) if (m != null) arr.put(m);
                        }
                        ret.put("matches", arr);
                        resolvePending(ret);
                        stopListening();
                    }
                });

                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
                try {
                    recognizer.startListening(intent);
                } catch (Exception error) {
                    PluginCall pending = pendingCall;
                    pendingCall = null;
                    stopListening();
                    if (pending != null) pending.reject("Could not start listening: " + error.getMessage());
                }
            }
        });
    }

    /** Resolves the waiting JS call exactly once. */
    private void resolvePending(String text) {
        JSObject ret = new JSObject();
        ret.put("text", text);
        resolvePending(ret);
    }

    private void resolvePending(JSObject ret) {
        PluginCall call = pendingCall;
        pendingCall = null;
        if (call != null) {
            call.resolve(ret);
        }
    }

    private void stopListening() {
        if (recognizer != null) {
            try { recognizer.cancel(); } catch (Exception ignored) { }
            try { recognizer.destroy(); } catch (Exception ignored) { }
            recognizer = null;
        }
    }

    private String errorCode(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO: return "audio";
            case SpeechRecognizer.ERROR_CLIENT: return "client";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: return "permissions";
            case SpeechRecognizer.ERROR_NETWORK: return "network";
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: return "network-timeout";
            case SpeechRecognizer.ERROR_NO_MATCH: return "no-match";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY: return "busy";
            case SpeechRecognizer.ERROR_SERVER: return "server";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: return "speech-timeout";
            default: return "unknown";
        }
    }

    @Override
    protected void handleOnDestroy() {
        resolvePending("");
        stopListening();
        super.handleOnDestroy();
    }
}
