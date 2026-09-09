package ca.lartisan.menu.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ca.lartisan.menu.ui.screens.*
import ca.lartisan.menu.ui.theme.Bg

/** Root composable: routes between the setup, menu, review and success screens and shows toasts. */
@Composable
fun MenuApp(vm: AppViewModel, onExit: () -> Unit) {
    val snackbar = remember { SnackbarHostState() }
    LaunchedEffect(vm.toast) {
        val msg = vm.toast ?: return@LaunchedEffect
        snackbar.showSnackbar(msg)
        vm.toast = null
    }
    Box(Modifier.fillMaxSize().background(Bg)) {
        when (val sc = vm.screen) {
            is Screen.Setup -> SetupScreen(vm, firstRun = true)
            is Screen.Menu -> MenuScreen(vm)
            is Screen.Review -> ReviewScreen(vm)
            is Screen.Success -> SuccessScreen(vm, sc.number)
        }
        vm.editingItem?.let { item -> ItemSheet(vm, item) }
        if (vm.showAdmin) AdminDialog(vm, onExit = onExit)
        SnackbarHost(hostState = snackbar, modifier = Modifier.align(Alignment.BottomCenter).padding(16.dp)) { data ->
            Snackbar(snackbarData = data)
        }
    }
}
