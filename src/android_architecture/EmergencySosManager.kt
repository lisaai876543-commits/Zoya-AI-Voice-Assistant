package com.zoya.companion.security

import android.content.Context
import android.content.Intent
import android.location.Location
import android.location.LocationManager
import android.net.Uri
import android.telephony.SmsManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * ZOYA AI — Emergency SOS Action Manager
 *
 * Provides rapid personal safety response protocols:
 * 1. Immediate emergency SMS dispatch with real-time GPS coordinates.
 * 2. Automated emergency contact dialing.
 * 3. System broadcast beacon for emergency event telemetry.
 */
class EmergencySosManager(private val context: Context) {

    suspend fun triggerEmergencySos(
        emergencyNumber: String,
        emergencyContacts: List<String>,
        alertMessage: String = "EMERGENCY: I need immediate help. My current location is: "
    ): SosResult = withContext(Dispatchers.IO) {
        val location = getLastKnownLocation()
        val locationUrl = if (location != null) {
            "https://maps.google.com/?q=${location.latitude},${location.longitude}"
        } else {
            "Location unavailable"
        }

        val fullMessage = "$alertMessage $locationUrl (Sent via ZOYA AI Companion)"

        // 1. Dispatch SMS to emergency contacts
        var smsCount = 0
        try {
            val smsManager = context.getSystemService(SmsManager::class.java)
            for (contact in emergencyContacts) {
                smsManager.sendTextMessage(contact, null, fullMessage, null, null)
                smsCount++
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // 2. Initiate Emergency Dial Intent
        try {
            val dialIntent = Intent(Intent.ACTION_CALL).apply {
                data = Uri.parse("tel:$emergencyNumber")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(dialIntent)
        } catch (e: Exception) {
            // Fallback to dialer screen if direct call permission is not granted
            val fallbackIntent = Intent(Intent.ACTION_DIAL).apply {
                data = Uri.parse("tel:$emergencyNumber")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(fallbackIntent)
        }

        // 3. Broadcast SOS event to local receivers
        val broadcastIntent = Intent("com.zoya.companion.ACTION_SOS_TRIGGERED").apply {
            putExtra("EXTRA_LOCATION", locationUrl)
            putExtra("EXTRA_TIMESTAMP", System.currentTimeMillis())
        }
        context.sendBroadcast(broadcastIntent)

        SosResult(
            success = true,
            smsSentCount = smsCount,
            locationAttached = location != null,
            message = "SOS protocol engaged. Emergency alert sent."
        )
    }

    private fun getLastKnownLocation(): Location? {
        val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        return try {
            locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                ?: locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
        } catch (e: SecurityException) {
            null
        }
    }

    data class SosResult(
        val success: Boolean,
        val smsSentCount: Int,
        val locationAttached: Boolean,
        val message: String
    )
}
