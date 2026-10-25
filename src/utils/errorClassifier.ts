export type VoiceErrorKind =
  | "invalid_key"
  | "quota_exceeded"
  | "network_lost"
  | "mic_permission_denied"
  | "model_unavailable"
  | "audio_device_busy"
  | "unknown";

export interface ClassifiedVoiceError {
  kind: VoiceErrorKind;
  titleEn: string;
  titleHi: string;
  messageEn: string;
  messageHi: string;
  recoveryEn: string;
  recoveryHi: string;
  canRetry: boolean;
  actionTab?: "settings" | "diagnostics";
}

export function classifyVoiceError(error: any): ClassifiedVoiceError {
  const errMsg = (error?.message || error?.name || String(error || "")).toLowerCase();
  const errCode = error?.code;

  // 1. Microphone Permission Denied
  if (
    error?.name === "NotAllowedError" ||
    error?.name === "PermissionDeniedError" ||
    error?.name === "SecurityError" ||
    errMsg.includes("permission denied") ||
    errMsg.includes("not allowed") ||
    errMsg.includes("permission")
  ) {
    return {
      kind: "mic_permission_denied",
      titleEn: "Microphone Access Denied",
      titleHi: "माइक्रोफ़ोन अनुमति नहीं मिली",
      messageEn: "Browser blocked access to your microphone.",
      messageHi: "ब्राउज़र ने माइक्रोफ़ोन का उपयोग रोक दिया है।",
      recoveryEn: "Tap the lock icon in your browser address bar, set Microphone to 'Allow', and reload.",
      recoveryHi: "एड्रेस बार में लॉक आइकन पर टैप करें, माइक्रोफ़ोन को 'Allow' करें और रीलोड करें।",
      canRetry: true,
      actionTab: "diagnostics",
    };
  }

  // 2. Audio Device Busy
  if (
    error?.name === "NotReadableError" ||
    errMsg.includes("device is busy") ||
    errMsg.includes("could not start audio source") ||
    errMsg.includes("hardware error") ||
    errMsg.includes("already in use")
  ) {
    return {
      kind: "audio_device_busy",
      titleEn: "Microphone Busy in Another App",
      titleHi: "माइक्रोफ़ोन किसी अन्य ऐप में व्यस्त है",
      messageEn: "Another app (phone call, screen recorder, or meeting) is locking the microphone.",
      messageHi: "कोई अन्य ऐप (फ़ोन कॉल, रिकॉर्डर या मीटिंग) आपके माइक का उपयोग कर रहा है।",
      recoveryEn: "Close other calling or recording apps, then tap 'Talk to Zoya' again.",
      recoveryHi: "बैकग्राउंड में चल रहे कॉल या रिकॉर्डिंग ऐप बंद करके पुनः प्रयास करें।",
      canRetry: true,
      actionTab: "diagnostics",
    };
  }

  // 3. Quota / Rate Limit (HTTP 429)
  if (
    errCode === 429 ||
    errMsg.includes("429") ||
    errMsg.includes("quota") ||
    errMsg.includes("resource_exhausted") ||
    errMsg.includes("rate limit")
  ) {
    return {
      kind: "quota_exceeded",
      titleEn: "Free-Tier Limit Reached (HTTP 429)",
      titleHi: "फ्री-टियर कोटा सीमा समाप्त",
      messageEn: "Your active API key reached its current rate limit or daily free quota.",
      messageHi: "सक्रिय एपीआई की की वर्तमान दर सीमा या फ्री कोटा समाप्त हो गया है।",
      recoveryEn: "Zoey is auto-rotating to your backup key. You can also add another free key in Settings.",
      recoveryHi: "ज़ोया स्वचालित रूप से बैकअप की पर स्विच कर रही है। आप सेटिंग्स में अतिरिक्त फ्री की जोड़ सकते हैं।",
      canRetry: true,
      actionTab: "settings",
    };
  }

  // 4. Invalid API Key / Authentication
  if (
    errCode === 1007 ||
    errCode === 1008 ||
    errCode === 400 ||
    errCode === 401 ||
    errCode === 403 ||
    errMsg.includes("api_key_invalid") ||
    errMsg.includes("api key is required") ||
    errMsg.includes("invalid argument") ||
    errMsg.includes("unauthenticated")
  ) {
    return {
      kind: "invalid_key",
      titleEn: "Invalid API Key",
      titleHi: "अमान्य एपीआई की",
      messageEn: "The registered API key is invalid, missing, or rejected by Gemini.",
      messageHi: "एपीआई की अमान्य है, गायब है या अस्वीकार कर दी गई है।",
      recoveryEn: "Open Settings > Multi-Key Vault and enter a valid Google Gemini API key.",
      recoveryHi: "सेटिंग्स > मल्टी-की वॉल्ट खोलें और एक मान्य जेमिनी एपीआई की दर्ज करें।",
      canRetry: false,
      actionTab: "settings",
    };
  }

  // 5. Network Lost
  if (
    errMsg.includes("network") ||
    errMsg.includes("failed to fetch") ||
    errMsg.includes("offline") ||
    errMsg.includes("connection closed") ||
    errMsg.includes("websocket") ||
    errMsg.includes("closed abnormally")
  ) {
    return {
      kind: "network_lost",
      titleEn: "Connection Interrupted",
      titleHi: "इंटरनेट कनेक्शन बाधित हुआ",
      messageEn: "Real-time voice stream dropped due to unstable internet connection.",
      messageHi: "अस्थिर इंटरनेट कनेक्शन के कारण वॉयस स्ट्रीम डिस्कनेक्ट हो गई।",
      recoveryEn: "Check your Wi-Fi or mobile data. Zoey will auto-reconnect once connection stabilizes.",
      recoveryHi: "वाई-फ़ाई या मोबाइल डेटा जांचें। कनेक्शन मिलते ही ज़ोया अपने आप रीकनेक्ट हो जाएगी।",
      canRetry: true,
      actionTab: "diagnostics",
    };
  }

  // 6. Model Not Available
  if (
    errMsg.includes("model not available") ||
    errMsg.includes("overloaded") ||
    errMsg.includes("service unavailable") ||
    errMsg.includes("503") ||
    errMsg.includes("500")
  ) {
    return {
      kind: "model_unavailable",
      titleEn: "AI Live Service Busy",
      titleHi: "एआई लाइव सर्वर व्यस्त है",
      messageEn: "The Gemini Live server is experiencing high traffic.",
      messageHi: "जेमिनी लाइव सर्वर पर वर्तमान में भारी ट्रैफिक है।",
      recoveryEn: "Zoey is falling back to standard voice mode. Please try speaking again in a moment.",
      recoveryHi: "ज़ोया बैकअप मॉडल पर स्विच कर रही है। कृपया थोड़ी देर बाद पुनः बोलें।",
      canRetry: true,
      actionTab: "diagnostics",
    };
  }

  // 7. Unknown / Fallback
  return {
    kind: "unknown",
    titleEn: "Voice Engine Notice",
    titleHi: "वॉयस इंजन सूचना",
    messageEn: errMsg ? `Issue: ${errMsg.slice(0, 90)}` : "An unexpected voice error occurred.",
    messageHi: "वॉयस इंजन में एक अप्रत्याशित समस्या आई।",
    recoveryEn: "Tap 'Talk to Zoya' to restart the session, or check Diagnostics.",
    recoveryHi: "'Talk to Zoya' पर फिर से टैप करें या डायग्नोस्टिक्स जांचें।",
    canRetry: true,
    actionTab: "diagnostics",
  };
}
