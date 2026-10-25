package com.zoya.companion.ui

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zoya.companion.accessibility.ZoyaAccessibilityService
import com.zoya.companion.permissions.NativePermissionManager
import com.zoya.companion.service.ZoyaVoiceForegroundService

class MainActivity : ComponentActivity() {

    private lateinit var permissionManager: NativePermissionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        permissionManager = NativePermissionManager(this)

        setContent {
            ZoyaCompanionAppTheme {
                MainCompanionScreen(
                    onToggleVoiceService = { start ->
                        val intent = Intent(this, ZoyaVoiceForegroundService::class.java)
                        if (start) startForegroundService(intent) else stopService(intent)
                    },
                    onRequestPermissions = {
                        permissionManager.requestMissingPermissions()
                    },
                    onOpenAccessibilitySettings = {
                        startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                    },
                    onOpenOverlaySettings = {
                        val intent = Intent(
                            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:$packageName")
                        )
                        startActivity(intent)
                    },
                    onPanicStop = {
                        ZoyaAccessibilityService.instance?.panicStop("User tapped Main Screen Panic Button")
                    }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainCompanionScreen(
    onToggleVoiceService: (Boolean) -> Unit,
    onRequestPermissions: () -> Unit,
    onOpenAccessibilitySettings: () -> Unit,
    onOpenOverlaySettings: () -> Unit,
    onPanicStop: () -> Unit
) {
    var voiceActive by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("ZOYA AI", fontWeight = FontWeight.Bold, color = Color.White)
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFFEC4899).copy(alpha = 0.2f)
                        ) {
                            Text(
                                "Native Companion",
                                color = Color(0xFFF472B6),
                                fontSize = 11.sp,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF0F1117))
            )
        },
        containerColor = Color(0xFF0A0C10)
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Panic Button Card
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF7F1D1D).copy(alpha = 0.4f)),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Emergency Panic Stop", color = Color(0xFFFCA5A5), fontWeight = FontWeight.Bold)
                            Text("Instantly stops all screen actions and audio capture", color = Color.White.copy(alpha = 0.7f), fontSize = 12.sp)
                        }
                        Button(
                            onClick = onPanicStop,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                        ) {
                            Text("HALT")
                        }
                    }
                }
            }

            // Continuous Voice Service Card
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF161922)),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Column {
                                Text("Continuous Voice Service", color = Color.White, fontWeight = FontWeight.SemiBold)
                                Text("Foreground microphone & Gemini Live WebSocket", color = Color.White.copy(alpha = 0.5f), fontSize = 12.sp)
                            }
                            Switch(
                                checked = voiceActive,
                                onCheckedChange = {
                                    voiceActive = it
                                    onToggleVoiceService(it)
                                },
                                colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFFEC4899))
                            )
                        }
                    }
                }
            }

            // Permissions Checklist
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF161922)),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Required Android Privileges", color = Color.White, fontWeight = FontWeight.SemiBold)
                        
                        PermissionStatusRow("Microphone (Record Audio)", isGranted = true, onClick = onRequestPermissions)
                        PermissionStatusRow("Foreground Notification", isGranted = true, onClick = onRequestPermissions)
                        PermissionStatusRow("Accessibility Service (UI Control)", isGranted = ZoyaAccessibilityService.instance != null, onClick = onOpenAccessibilitySettings)
                        PermissionStatusRow("System Overlay (Touch Guard)", isGranted = Settings.canDrawOverlays(androidx.compose.ui.platform.LocalContext.current), onClick = onOpenOverlaySettings)
                    }
                }
            }

            // Local Bridge Status
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF161922)),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Box(modifier = Modifier.size(8.dp).background(Color(0xFF34D399), shape = RoundedCornerShape(4.dp)))
                            Text("Companion Bridge: 127.0.0.1:8765", color = Color(0xFF34D399), fontWeight = FontWeight.Medium, fontSize = 13.sp)
                        }
                        Text("Connects local Web PWA client to native Android OS capabilities securely.", color = Color.White.copy(alpha = 0.5f), fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun PermissionStatusRow(label: String, isGranted: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp)
        if (isGranted) {
            Text("GRANTED", color = Color(0xFF34D399), fontSize = 11.sp, fontWeight = FontWeight.Bold)
        } else {
            TextButton(onClick = onClick) {
                Text("ENABLE", color = Color(0xFFF59E0B), fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun ZoyaCompanionAppTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Color(0xFFEC4899),
            background = Color(0xFF0A0C10),
            surface = Color(0xFF161922)
        ),
        content = content
    )
}
