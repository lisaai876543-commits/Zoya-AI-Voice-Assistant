package com.zoya.companion.security

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView

/**
 * ZOYA AI — Touch Guard Pocket Mode Overlay
 * Target: Android System Alert Window
 *
 * Prevents accidental screen touches, pocket dialing, or unintended app interactions
 * while ZOYA AI is actively speaking or listening in background / pocket mode.
 * Disarmed by long-press gesture or owner voice command ("Zoya unlock").
 */
class TouchGuardOverlay(private val context: Context) {

    private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private var overlayView: View? = null
    private var isLocked = false

    fun enableTouchGuard(onUnlockRequested: () -> Unit) {
        if (isLocked || !android.provider.Settings.canDrawOverlays(context)) return

        val layoutParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_FULLSCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER
        }

        val frame = FrameLayout(context).apply {
            setBackgroundColor(Color.argb(210, 8, 10, 16)) // Sleek dark glass overlay

            val textView = TextView(context).apply {
                text = "🔒 ZOYA TOUCH GUARD ACTIVE\nLong press 2 seconds or say 'Zoya unlock'"
                setTextColor(Color.WHITE)
                textSize = 14f
                gravity = Gravity.CENTER
                setPadding(32, 32, 32, 32)
            }
            addView(textView, FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER
            ))

            var touchStartTime = 0L
            setOnTouchListener { _, event ->
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        touchStartTime = System.currentTimeMillis()
                        true
                    }
                    MotionEvent.ACTION_UP -> {
                        if (System.currentTimeMillis() - touchStartTime >= 2000L) {
                            disableTouchGuard()
                            onUnlockRequested()
                        }
                        true
                    }
                    else -> true
                }
            }
        }

        try {
            windowManager.addView(frame, layoutParams)
            overlayView = frame
            isLocked = true
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun disableTouchGuard() {
        if (!isLocked) return
        overlayView?.let {
            try {
                windowManager.removeView(it)
            } catch (e: Exception) {}
        }
        overlayView = null
        isLocked = false
    }

    fun isGuardActive(): Boolean = isLocked
}
