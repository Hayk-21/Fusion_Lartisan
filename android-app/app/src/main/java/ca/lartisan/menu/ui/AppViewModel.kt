package ca.lartisan.menu.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import ca.lartisan.menu.App
import ca.lartisan.menu.data.*
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.WebSocket

/** Which full-screen state the customer sees. */
sealed class Screen {
    data object Setup : Screen()
    data object Menu : Screen()
    data object Review : Screen()
    data class Success(val number: Int) : Screen()
}

class AppViewModel(private val app: App) : ViewModel() {
    private val prefs = app.prefs
    private val client = app.client
    private val repo = app.repo

    var menu by mutableStateOf<Menu?>(null); private set
    var lang by mutableStateOf(prefs.lang ?: "fr"); private set
    val s: Strings get() = Strings(lang)
    var screen by mutableStateOf<Screen>(if (prefs.serverUrl.isBlank()) Screen.Setup else Screen.Menu)
    var selectedCategory by mutableStateOf<String?>(null)
    val cart = mutableStateListOf<CartLine>()
    var editingItem by mutableStateOf<MenuItem?>(null)     // item sheet open
    var connected by mutableStateOf(false); private set
    var toast by mutableStateOf<String?>(null)
    var submitting by mutableStateOf(false); private set
    var customerName by mutableStateOf("")
    var serviceType by mutableStateOf("dine_in")
    var showAdmin by mutableStateOf(false)

    private var socket: WebSocket? = null
    private var reconnectJob: Job? = null
    private var idleJob: Job? = null
    private var socketGen = 0

    init {
        viewModelScope.launch {
            menu = repo.loadLocal()
            if (prefs.lang == null) lang = menu?.settings?.defaultLang ?: "fr"
            ensureCategory()
            if (prefs.serverUrl.isNotBlank()) connect()
        }
    }

    // ---------------------------------------------------------------- language
    fun setLanguage(l: String) { lang = l; prefs.lang = l }

    // ---------------------------------------------------------------- menu & connection
    private fun ensureCategory() {
        val cats = menu?.visibleCategories() ?: return
        if (selectedCategory == null || cats.none { it.id == selectedCategory }) selectedCategory = cats.firstOrNull()?.id
    }

    fun connect() {
        reconnectJob?.cancel()
        socket?.cancel()
        viewModelScope.launch {
            refreshMenu(silent = true)
            openSocket()
        }
    }

    private fun openSocket() {
        socket?.cancel()
        // Cancelling a live socket fires its onFailure -> onClosed; ignore callbacks from superseded sockets
        // so that connect()/openSocket() do not schedule an endless 4-second reconnect loop.
        val gen = ++socketGen
        socket = client.openSocket(menu?.version ?: 0, App.VERSION, object : ServerClient.Events {
            override fun onOpen() { if (gen == socketGen) connected = true }
            override fun onClosed() {
                if (gen != socketGen) return
                connected = false
                reconnectJob?.cancel()
                reconnectJob = viewModelScope.launch { delay(4000); if (prefs.serverUrl.isNotBlank()) openSocket() }
            }
            override fun onMenuUpdated(version: Int) { viewModelScope.launch { refreshMenu(silent = false) } }
            override fun onSettingsUpdated() { viewModelScope.launch { refreshMenu(silent = true) } }
            override fun onWelcome(menuVersion: Int) { if (menuVersion != (menu?.version ?: 0)) viewModelScope.launch { refreshMenu(silent = false) } }
        })
    }

    suspend fun refreshMenu(silent: Boolean): Boolean {
        val m = repo.refreshFromServer() ?: return false
        menu = m
        ensureCategory()
        // drop cart lines that no longer price correctly (item removed / option gone)
        val bad = cart.filter { Pricing.priceLine(m, it, lang, s) !is Pricing.Result.Ok }
        cart.removeAll(bad)
        if (!silent) toast = s.menuUpdated
        client.hello(m.version, App.VERSION)
        return true
    }

    fun reloadBundledMenu() { viewModelScope.launch { repo.clearCache(); menu = repo.loadBundled(); ensureCategory() } }

    suspend fun testConnection(url: String): Boolean {
        val old = prefs.serverUrl
        prefs.serverUrl = url
        val ok = client.ping()
        if (!ok) prefs.serverUrl = old
        return ok
    }

    fun saveSetup(url: String, deviceName: String) {
        prefs.serverUrl = url
        prefs.deviceName = deviceName
        if (screen is Screen.Setup) screen = Screen.Menu
        connect()
    }

    val serverUrl get() = prefs.serverUrl
    val deviceName get() = prefs.deviceName
    val tabletPin get() = prefs.tabletPin
    fun setTabletPin(p: String) { prefs.tabletPin = p }

    // ---------------------------------------------------------------- cart
    fun addToCart(line: CartLine) {
        val idx = cart.indexOfFirst { it.configKey == line.configKey }
        if (idx >= 0) cart[idx] = cart[idx].copy(qty = cart[idx].qty + line.qty) else cart += line
        touch()
    }
    fun changeQty(index: Int, delta: Int) {
        if (index !in cart.indices) return
        val q = cart[index].qty + delta
        if (q <= 0) cart.removeAt(index) else cart[index] = cart[index].copy(qty = q)
        touch()
    }
    fun clearCart() { cart.clear(); customerName = ""; serviceType = "dine_in" }
    fun pricedOrder(): Pricing.PricedOrder? = menu?.let { Pricing.priceOrder(it, cart, lang, s) }

    /** Any interaction resets the idle timer; an abandoned cart is cleared after 5 minutes. */
    fun touch() {
        idleJob?.cancel()
        if (cart.isEmpty()) return
        idleJob = viewModelScope.launch {
            delay(5 * 60 * 1000L)
            clearCart(); editingItem = null
            if (screen is Screen.Review) screen = Screen.Menu
        }
    }

    // ---------------------------------------------------------------- order
    fun submitOrder() {
        val m = menu ?: return
        if (cart.isEmpty() || submitting) return
        submitting = true
        viewModelScope.launch {
            try {
                val res = client.submitOrder(
                    OrderRequest(prefs.deviceId, prefs.deviceName, customerName.trim(), serviceType, lang, cart.toList())
                )
                clearCart()
                submitting = false   // release before the thank-you countdown so a new order can be confirmed right away
                screen = Screen.Success(res.number)
                delay((m.settings.thankYouSeconds.coerceIn(3, 120)) * 1000L)
                if (screen is Screen.Success) screen = Screen.Menu
            } catch (e: ServerClient.ServerError) {
                toast = e.message
                if (e.code == 409) refreshMenu(silent = true)   // menu changed under us
            } catch (e: Exception) {
                toast = s.offline
            } finally { submitting = false }
        }
    }

    fun backToMenu() { screen = Screen.Menu }

    override fun onCleared() { socket?.cancel(); super.onCleared() }

    class Factory(private val app: App) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = AppViewModel(app) as T
    }
}
