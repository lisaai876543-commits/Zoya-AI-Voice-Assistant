# ZOYA AI — NATIVE ANDROID COMPANION ARCHITECTURE BLUEPRINT

This blueprint defines the architecture for the native Android companion app for **Zoya AI (Supreme Brain)**.

The Web PWA serves as the cross-platform UI, voice companion, and prototyping ground. The native Android companion provides the physical sensory system, hardware-backed keys, accessibility automation, and continuous background audio capture.

---

## 1. Architectural Component Map

| Component | Class | Primary Android APIs | Responsibility |
|---|---|---|---|
| **Voice Foreground** | `ZoyaVoiceForegroundService.kt` | `AudioRecord`, `FOREGROUND_SERVICE_MICROPHONE`, `WakeLock` | 16kHz PCM audio streaming to Gemini Live WebSocket in background. |
| **Permission Guard** | `NativePermissionManager.kt` | `ActivityResultContracts`, `ContextCompat` | Runtime permissions with explicit user justification dialogs. |
| **UI Automation** | `ZoyaAccessibilityService.kt` | `AccessibilityService`, `GestureDescription` | Click, type, scroll, and inspect screen nodes with strict package allowlist. |
| **Touch Guard** | `TouchGuardOverlay.kt` | `SYSTEM_ALERT_WINDOW`, `WindowManager` | Pocket mode overlay preventing accidental pocket taps while listening. |
| **Biometric Voice** | `OwnerVoiceVerification.kt` | MFCC/Acoustic Feature Extractor, Cosine Similarity | Verifies Usman's unique voice print before high-risk actions. |
| **Safety Dispatch** | `EmergencySosManager.kt` | `SmsManager`, `FusedLocationProviderClient`, `ACTION_CALL` | Sends emergency SMS with GPS coordinates on voice SOS trigger. |
| **Hardware Vault** | `SecureSecretVault.kt` | `AndroidKeyStore`, `EncryptedSharedPreferences`, AES-256-GCM | Encrypts API keys and auth tokens using hardware security module. |
| **Notification Triage**| `ZoyaNotificationListenerService.kt` | `NotificationListenerService` | Captures messages from WhatsApp/SMS and redacts OTPs/passwords. |
| **Boot Lifecycle** | `ZoyaBootReceiver.kt` | `BroadcastReceiver`, `BOOT_COMPLETED` | Opt-in restart on boot with battery killer warnings. |
| **Companion Bridge** | `ZoyaCompanionBridge.kt` | `ServerSocket(127.0.0.1:8765)`, JSON protocol | Bidirectional encrypted local socket connecting Web PWA to Android. |

---

## 2. Security & Privacy Constitution

1. **Default OFF Policy:**
   - Accessibility Automation and Notification Listening are disabled by default. The user must manually navigate to OS settings and toggle them on.
2. **Strict Package Allowlist:**
   - `ZoyaAccessibilityService` refuses to execute clicks or read screen nodes outside of pre-approved packages:
     - `com.whatsapp`
     - `com.google.android.youtube`
     - `com.google.android.dialer`
     - `com.android.settings`
     - `com.google.android.apps.messaging`
     - `com.spotify.music`
   - Banking, financial, crypto, and credential managers are strictly blocked.
3. **Sensitive Field Masking:**
   - Any screen node marked `isPassword == true` or containing OTP/banking keywords is automatically redacted.
4. **High-Visibility Indicator:**
   - Whenever Zoya initiates an automated touch or scroll, a glowing border appears on screen with a floating badge: `[ZOYA ACTING: Action Description]`.
5. **Hardware Panic Stop:**
   - Pressing volume keys or tapping the red screen halt button instantly interrupts all gestures and drops active accessibility tokens.
6. **No Silent Auto-Sending:**
   - Outgoing messages on WhatsApp or SMS must be prepared as drafts and confirmed before sending.

---

## 3. Web PWA <-> Native Android Communication Protocol

The Web PWA and Native Android Companion communicate via a secure local socket server running on `127.0.0.1:8765`:

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│     Zoya Web PWA (React)        │           │   Native Android Companion      │
│  - Luxury UI & Visualizer       │           │  - Foreground Audio Record      │
│  - Content Creation Studio      │           │  - Accessibility UI Automation  │
│  - Multi-Key Vault              │           │  - Hardware Keystore            │
└────────────────┬────────────────┘           └────────────────▲────────────────┘
                 │                                             │
                 │ 1. Localhost Authenticated Socket           │
                 │    ws://127.0.0.1:8765                      │
                 │    Bearer Token (Keystore Signed)           │
                 ▼                                             │
      ┌────────────────────────────────────────────────────────┴───┐
      │              ZoyaCompanionBridge.kt                        │
      │  - Binds strictly to 127.0.0.1 loopback                   │
      │  - Validates authentication token                          │
      │  - Dispatches CLICK, INSPECT_SCREEN, EMERGENCY_SOS         │
      │  - Streams PCM Mic audio and incoming notifications back   │
      └────────────────────────────────────────────────────────────┘
```

### JSON Socket Message Formats

#### 1. Click Request (PWA to Native):
```json
{
  "type": "CLICK",
  "authToken": "zoya_keystore_bearer_token",
  "x": 540.0,
  "y": 1280.0
}
```

#### 2. Screen Nodes Result (Native to PWA):
```json
{
  "type": "SCREEN_NODES_RESULT",
  "count": 14,
  "nodes": [
    { "text": "Send message", "viewId": "com.whatsapp:id/send", "clickable": true }
  ]
}
```

#### 3. Panic Stop (PWA or Hardware Button to Native):
```json
{
  "type": "PANIC_STOP",
  "reason": "User emergency halt"
}
```
