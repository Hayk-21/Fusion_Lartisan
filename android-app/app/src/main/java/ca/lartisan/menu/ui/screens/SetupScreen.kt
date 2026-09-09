package ca.lartisan.menu.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import ca.lartisan.menu.R
import ca.lartisan.menu.data.Prefs
import ca.lartisan.menu.data.ServerClient
import ca.lartisan.menu.ui.AppViewModel
import ca.lartisan.menu.ui.theme.*
import kotlinx.coroutines.launch

/**
 * First-run screen (and the body of the settings dialog): server address, tablet name, auto-discovery, test.
 */
@Composable
fun SetupScreen(vm: AppViewModel, firstRun: Boolean, onDone: (() -> Unit)? = null) {
    val s = vm.s
    val scope = rememberCoroutineScope()
    var url by remember { mutableStateOf(vm.serverUrl) }
    var name by remember { mutableStateOf(vm.deviceName) }
    var status by remember { mutableStateOf<String?>(null) }
    var statusOk by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }

    Box(Modifier.fillMaxSize().background(Bg).imePadding().padding(12.dp), contentAlignment = Alignment.Center) {
        Surface(Modifier.fillMaxWidth().widthIn(max = 560.dp), shape = RoundedCornerShape(22.dp), color = CardBg, border = BorderStroke(1.dp, Line), shadowElevation = 6.dp) {
            Column(Modifier.padding(30.dp).verticalScroll(rememberScrollState()), horizontalAlignment = Alignment.CenterHorizontally) {
                if (firstRun) { Image(painterResource(R.drawable.logo_full), null, Modifier.height(130.dp), contentScale = ContentScale.Fit); Spacer(Modifier.height(8.dp)) }
                Text(s.setupTitle, color = Brand, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp)
                Text(s.setupHint, color = Muted, fontSize = 13.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(vertical = 8.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Pill("FR", vm.lang == "fr", { vm.setLanguage("fr") }); Pill("EN", vm.lang == "en", { vm.setLanguage("en") })
                }
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = url, onValueChange = { url = it; status = null }, label = { Text(s.serverUrl) },
                    placeholder = { Text("lartisan.up.railway.app  ou  192.168.1.20:3000") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                    shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = name, onValueChange = { name = it }, label = { Text(s.deviceName) }, singleLine = true,
                    shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(12.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    BigButton(if (busy) s.discovering else "📡 " + s.discover, enabled = !busy, secondary = true, modifier = Modifier.weight(1f), onClick = {
                        busy = true; status = null
                        scope.launch {
                            val found = ServerClient.discover()
                            if (found != null) { url = found; statusOk = true; status = "${s.connected} · $found" } else { statusOk = false; status = s.discoverFail }
                            busy = false
                        }
                    })
                    BigButton(s.testConnection, enabled = !busy && url.isNotBlank(), secondary = true, modifier = Modifier.weight(1f), onClick = {
                        busy = true; status = null
                        scope.launch {
                            val ok = vm.testConnection(Prefs.normalizeUrl(url))
                            statusOk = ok; status = if (ok) s.connected else s.connectFail; busy = false
                        }
                    })
                }
                status?.let { Text(it, color = if (statusOk) Ok else Danger, fontSize = 14.sp, modifier = Modifier.padding(top = 10.dp), textAlign = TextAlign.Center) }
                Spacer(Modifier.height(16.dp))
                BigButton(s.save, enabled = url.isNotBlank() && !busy, modifier = Modifier.fillMaxWidth(), onClick = {
                    vm.saveSetup(Prefs.normalizeUrl(url), name); onDone?.invoke()
                })
            }
        }
    }
}

/** Long-press on the logo → PIN → tablet settings. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AdminDialog(vm: AppViewModel, onExit: () -> Unit) {
    val s = vm.s
    var unlocked by remember { mutableStateOf(false) }
    var pin by remember { mutableStateOf("") }
    var error by remember { mutableStateOf(false) }
    var newPin by remember { mutableStateOf("") }

    Dialog(onDismissRequest = { vm.showAdmin = false }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        if (!unlocked) {
            Surface(Modifier.width(360.dp), shape = RoundedCornerShape(22.dp), color = CardBg) {
                Column(Modifier.padding(26.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(s.adminTitle, color = Brand, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = pin, onValueChange = { pin = it.filter { c -> c.isDigit() }.take(8); error = false },
                        label = { Text(s.enterPin) }, singleLine = true, isError = error,
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                        shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth(),
                    )
                    if (error) Text(s.wrongPin, color = Danger, fontSize = 13.sp, modifier = Modifier.padding(top = 6.dp))
                    Spacer(Modifier.height(14.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        BigButton(s.cancel, secondary = true, onClick = { vm.showAdmin = false })
                        BigButton(s.ok, onClick = { if (pin == vm.tabletPin) unlocked = true else error = true })
                    }
                }
            }
        } else {
            Surface(Modifier.fillMaxWidth(0.95f).fillMaxHeight(0.95f), shape = RoundedCornerShape(22.dp), color = Bg) {
                Column(Modifier.padding(16.dp).imePadding()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(s.adminTitle, color = Brand, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, modifier = Modifier.weight(1f))
                        Text("${s.menuVersion}: ${vm.menu?.version ?: 0}  ·  ${if (vm.connected) "● " + s.connected else "○ " + s.connectFail}", color = if (vm.connected) Ok else Danger, fontSize = 13.sp)
                        Spacer(Modifier.width(12.dp))
                        BigButton("✕", secondary = true, onClick = { vm.showAdmin = false })
                    }
                    Box(Modifier.weight(1f)) { SetupScreen(vm, firstRun = false, onDone = { vm.showAdmin = false }) }
                    FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        BigButton("⟳ " + s.reloadMenu, secondary = true, onClick = { vm.connect() })
                        BigButton(s.useBundled, secondary = true, onClick = { vm.reloadBundledMenu() })
                        OutlinedTextField(value = newPin, onValueChange = { newPin = it.filter { c -> c.isDigit() }.take(8) }, label = { Text(s.changePin) }, singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword), shape = RoundedCornerShape(12.dp), modifier = Modifier.width(220.dp))
                        BigButton(s.save, enabled = newPin.length >= 4, secondary = true, onClick = { vm.setTabletPin(newPin); newPin = "" })
                        BigButton(s.exitKiosk, secondary = true, onClick = onExit)
                    }
                }
            }
        }
    }
}
