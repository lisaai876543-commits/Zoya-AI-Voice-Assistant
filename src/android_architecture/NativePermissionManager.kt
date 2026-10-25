package com.zoya.companion.permissions

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat

/**
 * ZOYA AI — Native Android 14+ Permission Manager
 *
 * Handles granular permission requests with justification rationales:
 * 1. RECORD_AUDIO (Mandatory for Voice)
 * 2. POST_NOTIFICATIONS (Android 13+ Foreground Service notification)
 * 3. FOREGROUND_SERVICE_MICROPHONE (Android 14+ background mic access)
 * 4. SYSTEM_ALERT_WINDOW (Touch Guard Pocket Mode overlay)
 * 5. ACCESS_FINE_LOCATION & SEND_SMS (Emergency SOS)
 */
class NativePermissionManager(private val activity: ComponentActivity) {

    private lateinit var permissionLauncher: ActivityResultLauncher<Array<String>>
    private var onPermissionsResult: ((allGranted: Boolean) -> Unit)? = null

    init {
        initLauncher()
    }

    private fun initLauncher() {
        permissionLauncher = activity.registerForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions()
        ) { results ->
            val allGranted = results.values.all { it }
            onPermissionsResult?.invoke(allGranted)
        }
    }

    fun getRequiredPermissions(): List<String> {
        val permissions = mutableListOf(
            Manifest.permission.RECORD_AUDIO
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            permissions.add(Manifest.permission.FOREGROUND_SERVICE_MICROPHONE)
        }

        return permissions
    }

    fun hasAllRequiredPermissions(context: Context): Boolean {
        return getRequiredPermissions().all {
            ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
        }
    }

    fun requestPermissions(onResult: (Boolean) -> Unit) {
        this.onPermissionsResult = onResult
        if (hasAllRequiredPermissions(activity)) {
            onResult(true)
            return
        }
        permissionLauncher.launch(getRequiredPermissions().toTypedArray())
    }

    fun canDrawOverlays(context: Context): Boolean {
        return Settings.canDrawOverlays(context)
    }

    fun requestOverlayPermission() {
        if (!Settings.canDrawOverlays(activity)) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${activity.packageName}")
            )
            activity.startActivity(intent)
        }
    }

    fun openAppSettings() {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.fromParts("package", activity.packageName, null)
        }
        activity.startActivity(intent)
    }
}
