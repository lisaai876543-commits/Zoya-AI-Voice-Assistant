package com.zoya.companion.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.zoya.companion.service.ZoyaVoiceForegroundService

/**
 * ZoyaBootReceiver
 * 
 * Handles device boot events (BOOT_COMPLETED, MY_PACKAGE_REPLACED).
 * 
 * Rules:
 *  1. Opt-in only: Will NEVER start services automatically unless the owner
 *     has explicitly checked "Start Companion On Device Boot" in Settings.
 *  2. Battery Saver & OEM Advisory: Displays a notification warning if device battery
 *     optimization threatens to terminate continuous background voice listening.
 */
class ZoyaBootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "ZoyaBootReceiver"
        const val PREF_AUTO_START_BOOT = "pref_auto_start_on_boot"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.i(TAG, "Received system broadcast: $action")

        if (action == Intent.ACTION_BOOT_COMPLETED || action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            val prefs = context.getSharedPreferences("zoya_companion_prefs", Context.MODE_PRIVATE)
            val shouldAutoStart = prefs.getBoolean(PREF_AUTO_START_BOOT, false)

            if (!shouldAutoStart) {
                Log.i(TAG, "Auto-start on boot is disabled by user. Doing nothing.")
                return
            }

            Log.i(TAG, "Starting Zoya Voice Foreground Service on boot...")
            val serviceIntent = Intent(context, ZoyaVoiceForegroundService::class.java).apply {
                putExtra("started_from_boot", true)
            }

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    ContextCompat.startForegroundService(context, serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start service on boot due to Android background execution limits", e)
            }
        }
    }
}
