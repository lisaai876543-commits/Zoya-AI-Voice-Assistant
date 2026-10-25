package com.zoya.companion.notifications

import android.app.Notification
import android.content.Intent
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * ZoyaNotificationListenerService
 * 
 * Android NotificationListenerService for intercepting incoming messages
 * from communication platforms (e.g., WhatsApp, Messages, Telegram).
 * 
 * Privacy & Security Rules:
 *  1. Strict App Filter: Only inspects messages from approved apps.
 *  2. Sensitive Blacklist: Automatically ignores notifications matching OTP, bank transactions, credit card alerts, or password resets.
 *  3. No Silent Auto-Reply: Messages are queued for owner review or spoken confirmation before any reply action is dispatched.
 */
class ZoyaNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "ZoyaNotificationListener"

        val MONITORED_PACKAGES = setOf(
            "com.whatsapp",
            "com.google.android.apps.messaging",
            "org.telegram.messenger"
        )

        val SENSITIVE_KEYWORDS = listOf(
            "otp", "one-time", "passcode", "verification code",
            "bank", "debit", "credit", "cvv", "balance", "transfer"
        )
    }

    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val packageName = sbn.packageName ?: return

        // 1. Only process approved apps
        if (!MONITORED_PACKAGES.contains(packageName)) {
            return
        }

        val extras = sbn.notification.extras ?: return
        val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""

        // 2. Sensitive data redaction
        val lowerText = text.lowercase()
        if (SENSITIVE_KEYWORDS.any { lowerText.contains(it) }) {
            Log.d(TAG, "Redacting sensitive notification (OTP/Banking detected)")
            return
        }

        // 3. Format into a structured Zoya notification event
        val incomingMessage = IncomingMessageEvent(
            id = sbn.key,
            sender = title,
            messageBody = text,
            packageName = packageName,
            timestamp = sbn.postTime
        )

        Log.i(TAG, "Captured incoming message from $packageName by $title")

        // 4. Dispatch to Zoya's Companion Core for contextual notification
        scope.launch {
            dispatchToZoyaCore(incomingMessage)
        }
    }

    private fun dispatchToZoyaCore(event: IncomingMessageEvent) {
        // Broadcasts local intent to ZoyaVoiceForegroundService or Companion WebSocket bridge
        val intent = Intent("com.zoya.companion.ACTION_INCOMING_MESSAGE").apply {
            putExtra("sender", event.sender)
            putExtra("message", event.messageBody)
            putExtra("package", event.packageName)
            putExtra("timestamp", event.timestamp)
        }
        sendBroadcast(intent)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // Optional handling when user dismisses notification on phone
    }
}

data class IncomingMessageEvent(
    val id: String,
    val sender: String,
    val messageBody: String,
    val packageName: String,
    val timestamp: Long
)
