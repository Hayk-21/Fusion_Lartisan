package ca.lartisan.menu

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.graphics.Bitmap
import android.os.Bundle
import android.text.InputType
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.app.Activity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import ca.lartisan.menu.data.Prefs

/**
 * L'Artisan tablet app, version 2: a full-screen WebView showing the café's web menu (/tablette on the server).
 * The design, the welcome screen, the menu and the ordering flow all live on the server, so tablets update
 * instantly when the admin changes anything. The app only adds: kiosk mode (screen on, no system bars),
 * an offline/retry page and a settings dialog (server address, tablet name) protected by the tablet PIN.
 * Settings: long-press the logo in the web menu (the page calls LArtisanApp.openSettings()), or long-press Back.
 */
class MainActivity : Activity() {
    private lateinit var prefs: Prefs
    private lateinit var web: WebView
    private lateinit var errorView: View
    private var dialogOpen = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = (application as App).prefs
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        val root = FrameLayout(this)
        web = WebView(this)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(false)
            builtInZoomControls = false
            userAgentString = "$userAgentString LArtisanApp/${App.VERSION}"
        }
        web.setBackgroundColor(0xFFFBF7F0.toInt())
        web.addJavascriptInterface(Bridge(), "LArtisanApp")
        web.webChromeClient = WebChromeClient()   // enables prompt()/alert() dialogs from the page
        web.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) { errorView.visibility = View.GONE }
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) showError(error.description?.toString() ?: "")
            }
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                // stay inside the café server; anything else (maps, instagram…) is ignored on a tablet
                val host = request.url.host ?: return true
                return !prefs.serverUrl.contains(host)
            }
        }
        root.addView(web, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        errorView = buildErrorView(); errorView.visibility = View.GONE
        root.addView(errorView, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        setContentView(root)
        load()
    }

    private fun menuUrl(): String {
        val name = java.net.URLEncoder.encode(prefs.deviceName, "UTF-8")
        return "${prefs.serverUrl}/tablette?device=$name&app=${App.VERSION}"
    }
    private fun load() { errorView.visibility = View.GONE; web.loadUrl(menuUrl()) }

    // ------------------------------------------------------------ error / retry page
    private fun buildErrorView(): View {
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = android.view.Gravity.CENTER; setBackgroundColor(0xFFFBF7F0.toInt()); setPadding(60, 60, 60, 60) }
        val title = TextView(this).apply { text = "Serveur injoignable · Server unreachable"; textSize = 22f; setTextColor(0xFF4A3623.toInt()); gravity = android.view.Gravity.CENTER }
        val msg = TextView(this).apply { textSize = 15f; setTextColor(0xFF7A6D60.toInt()); gravity = android.view.Gravity.CENTER; setPadding(0, 20, 0, 40) }
        val retry = Button(this).apply { text = "Réessayer · Retry"; setOnClickListener { load() } }
        val settings = Button(this).apply { text = "Paramètres · Settings"; setOnClickListener { askPinThenSettings() } }
        box.addView(title); box.addView(msg); box.addView(retry); box.addView(settings)
        box.tag = msg
        return box
    }
    private fun showError(detail: String) {
        ((errorView.tag) as TextView).text = "${prefs.serverUrl}\n$detail\n\nVérifiez le Wi-Fi ou l'adresse du serveur.\nCheck the Wi-Fi or the server address."
        errorView.visibility = View.VISIBLE
        errorView.postDelayed({ if (errorView.visibility == View.VISIBLE) load() }, 15000)   // auto-retry
    }

    // ------------------------------------------------------------ settings (PIN → server URL + tablet name)
    inner class Bridge {
        @JavascriptInterface fun openSettings() { runOnUiThread { askPinThenSettings() } }
        @JavascriptInterface fun deviceName(): String = prefs.deviceName
        @JavascriptInterface fun deviceId(): String = prefs.deviceId
        @JavascriptInterface fun version(): String = App.VERSION
    }
    private fun askPinThenSettings() {
        if (dialogOpen) return
        dialogOpen = true
        val input = EditText(this).apply { inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD; hint = "PIN" }
        AlertDialog.Builder(this).setTitle("Paramètres de la tablette").setMessage("Entrez le code PIN · Enter the PIN").setView(input)
            .setPositiveButton("OK") { _, _ -> dialogOpen = false; if (input.text.toString() == prefs.tabletPin) showSettings() }
            .setNegativeButton("Annuler") { _, _ -> dialogOpen = false }
            .setOnCancelListener { dialogOpen = false }
            .show()
    }
    private fun showSettings() {
        dialogOpen = true
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(50, 20, 50, 0) }
        val url = EditText(this).apply { setText(prefs.serverUrl); hint = "Adresse du serveur · Server address"; inputType = InputType.TYPE_TEXT_VARIATION_URI }
        val name = EditText(this).apply { setText(prefs.deviceName); hint = "Nom de la tablette · Tablet name" }
        val pin = EditText(this).apply { hint = "Nouveau PIN (facultatif) · New PIN (optional)"; inputType = InputType.TYPE_CLASS_NUMBER }
        box.addView(TextView(this).apply { text = "Serveur · Server" }); box.addView(url)
        box.addView(TextView(this).apply { text = "Tablette · Tablet" }); box.addView(name)
        box.addView(TextView(this).apply { text = "PIN" }); box.addView(pin)
        AlertDialog.Builder(this).setTitle("Paramètres · Settings · v${App.VERSION}").setView(box)
            .setPositiveButton("Enregistrer") { _, _ ->
                dialogOpen = false
                prefs.serverUrl = url.text.toString(); prefs.deviceName = name.text.toString()
                pin.text.toString().trim().let { if (it.length in 4..8) prefs.tabletPin = it }
                load()
            }
            .setNegativeButton("Annuler") { _, _ -> dialogOpen = false }
            .setNeutralButton("Quitter l'app") { _, _ -> dialogOpen = false; finishAffinity() }
            .setOnCancelListener { dialogOpen = false }
            .show()
    }

    // long-press Back → settings; short Back does nothing (kiosk)
    override fun onKeyLongPress(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) { askPinThenSettings(); return true }
        return super.onKeyLongPress(keyCode, event)
    }
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) { event?.startTracking(); return true }
        return super.onKeyDown(keyCode, event)
    }
    override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) return true
        return super.onKeyUp(keyCode, event)
    }

    // ------------------------------------------------------------ kiosk: no system bars
    override fun onResume() { super.onResume(); hideSystemBars() }
    override fun onWindowFocusChanged(hasFocus: Boolean) { super.onWindowFocusChanged(hasFocus); if (hasFocus) hideSystemBars() }
    private fun hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val c = WindowInsetsControllerCompat(window, window.decorView)
        c.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        c.hide(WindowInsetsCompat.Type.systemBars())
    }
}
