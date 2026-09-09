package ca.lartisan.menu.data

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Where the menu comes from, in order of preference:
 *   1. the last copy downloaded from the server (files/menu.json)  ← kept up to date via WebSocket "menu_updated"
 *   2. the menu bundled in the APK (assets/menu.json)               ← first launch / never connected
 */
class MenuRepository(private val context: Context, private val prefs: Prefs, private val client: ServerClient) {
    private val TAG = "MenuRepository"
    private val cacheFile get() = File(context.filesDir, "menu.json")

    suspend fun loadLocal(): Menu = withContext(Dispatchers.IO) {
        try {
            if (cacheFile.exists()) return@withContext AppJson.decodeFromString(Menu.serializer(), cacheFile.readText())
        } catch (e: Exception) { Log.w(TAG, "cache unreadable, using bundled menu: ${e.message}") }
        loadBundled()
    }

    suspend fun loadBundled(): Menu = withContext(Dispatchers.IO) {
        context.assets.open("menu.json").bufferedReader().use { AppJson.decodeFromString(Menu.serializer(), it.readText()) }
    }

    /** Downloads the menu from the server and caches it. Returns null if the server is unreachable. */
    suspend fun refreshFromServer(): Menu? = withContext(Dispatchers.IO) {
        try {
            val menu = client.fetchMenu()
            cacheFile.writeText(AppJson.encodeToString(Menu.serializer(), menu))
            prefs.cachedMenuVersion = menu.version
            menu
        } catch (e: Exception) {
            Log.w(TAG, "refresh failed: ${e.message}"); null
        }
    }

    suspend fun clearCache() = withContext(Dispatchers.IO) { cacheFile.delete(); prefs.cachedMenuVersion = 0 }
}
