package ca.lartisan.menu.data

import android.content.Context
import android.content.SharedPreferences
import java.util.UUID

/** Small persistent settings (server address, device identity, language, tablet PIN). */
class Prefs(context: Context) {
    private val sp: SharedPreferences = context.getSharedPreferences("lartisan", Context.MODE_PRIVATE)

    var serverUrl: String
        get() = sp.getString("server_url", "") ?: ""
        set(v) = sp.edit().putString("server_url", normalizeUrl(v)).apply()

    var deviceName: String
        get() = sp.getString("device_name", "Tablette 1") ?: "Tablette 1"
        set(v) = sp.edit().putString("device_name", v.trim().ifBlank { "Tablette" }).apply()

    val deviceId: String
        get() {
            var id = sp.getString("device_id", null)
            if (id == null) { id = "tab-" + UUID.randomUUID().toString().take(8); sp.edit().putString("device_id", id).apply() }
            return id
        }

    var lang: String?
        get() = sp.getString("lang", null)
        set(v) = sp.edit().putString("lang", v).apply()

    /** PIN protecting the tablet settings screen (long-press the logo). Default 2121, same as the admin panel. */
    var tabletPin: String
        get() = sp.getString("tablet_pin", "2121") ?: "2121"
        set(v) = sp.edit().putString("tablet_pin", v).apply()

    var cachedMenuVersion: Int
        get() = sp.getInt("menu_version", 0)
        set(v) = sp.edit().putInt("menu_version", v).apply()

    companion object {
        fun normalizeUrl(raw: String): String {
            var u = raw.trim().removeSuffix("/")
            if (u.isEmpty()) return ""
            // A bare host name (e.g. "lartisan.up.railway.app") is a hosted server → https. A bare IP → local http server.
            val bareIp = Regex("^\\d{1,3}(\\.\\d{1,3}){3}(:\\d+)?$").matches(u) || u.startsWith("localhost")
            if (!u.startsWith("http://") && !u.startsWith("https://")) u = (if (bareIp) "http://" else "https://") + u
            // Port 3000 is only implied for local http servers reached by IP (the Railway URL has no port).
            val hostPart = u.substringAfter("://").substringBefore("/")
            val hasPort = Regex(":\\d+$").containsMatchIn(hostPart)
            val isLocal = u.startsWith("http://") && (Regex("^\\d{1,3}(\\.\\d{1,3}){3}$").matches(hostPart) || hostPart == "localhost" || hostPart.endsWith(".local"))
            if (!hasPort && isLocal) u += ":3000"
            return u.removeSuffix("/")
        }
    }
}
