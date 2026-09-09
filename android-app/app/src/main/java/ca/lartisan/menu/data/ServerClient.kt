package ca.lartisan.menu.data

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.io.IOException
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.SocketTimeoutException
import java.util.concurrent.TimeUnit

/** REST + WebSocket + UDP discovery client for the café server. */
class ServerClient(private val prefs: Prefs) {
    private val TAG = "ServerClient"
    private val http = OkHttpClient.Builder()
        .connectTimeout(4, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .writeTimeout(8, TimeUnit.SECONDS)
        .pingInterval(20, TimeUnit.SECONDS)
        .build()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    class ServerError(message: String, val code: Int) : IOException(message)

    private fun base() = prefs.serverUrl.ifBlank { throw IOException("No server configured") }

    suspend fun fetchMenu(): Menu = withContext(Dispatchers.IO) {
        val req = Request.Builder().url(base() + "/api/menu").build()
        http.newCall(req).execute().use { res ->
            if (!res.isSuccessful) throw ServerError("HTTP ${res.code}", res.code)
            AppJson.decodeFromString(Menu.serializer(), res.body!!.string())
        }
    }

    suspend fun ping(): Boolean = withContext(Dispatchers.IO) {
        try {
            val req = Request.Builder().url(base() + "/api/health").build()
            http.newCall(req).execute().use { it.isSuccessful }
        } catch (e: Exception) { false }
    }

    suspend fun hello(menuVersion: Int, appVersion: String) = withContext(Dispatchers.IO) {
        try {
            val body = AppJson.encodeToString(HelloRequest(prefs.deviceId, prefs.deviceName, appVersion, menuVersion)).toRequestBody(jsonType)
            http.newCall(Request.Builder().url(base() + "/api/devices/hello").post(body).build()).execute().close()
        } catch (e: Exception) { Log.w(TAG, "hello failed: ${e.message}") }
    }

    /** Sends the order. Throws ServerError with the server's message on 4xx (e.g. item became unavailable). */
    suspend fun submitOrder(order: OrderRequest): OrderResponse = withContext(Dispatchers.IO) {
        val body = AppJson.encodeToString(order).toRequestBody(jsonType)
        val req = Request.Builder().url(base() + "/api/orders").post(body).build()
        http.newCall(req).execute().use { res ->
            val text = res.body?.string() ?: ""
            if (!res.isSuccessful) {
                val msg = try { AppJson.decodeFromString(ErrorResponse.serializer(), text).error } catch (e: Exception) { "HTTP ${res.code}" }
                throw ServerError(msg.ifBlank { "HTTP ${res.code}" }, res.code)
            }
            AppJson.decodeFromString(OrderResponse.serializer(), text)
        }
    }

    // ---------------------------------------------------------------- websocket (live menu updates)
    interface Events {
        fun onOpen()
        fun onClosed()
        fun onMenuUpdated(version: Int)
        fun onWelcome(menuVersion: Int)
        fun onSettingsUpdated()
    }

    fun openSocket(menuVersion: Int, appVersion: String, events: Events): WebSocket? {
        val url = try { base() } catch (e: Exception) { return null }
        val wsUrl = url.replaceFirst("http", "ws") + "/ws"
        val req = Request.Builder().url(wsUrl).build()
        return http.newWebSocket(req, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: okhttp3.Response) {
                webSocket.send("""{"type":"hello","role":"tablet","device_id":"${prefs.deviceId}","device_name":${AppJson.encodeToString(prefs.deviceName)},"app_version":"$appVersion","menu_version":$menuVersion}""")
                events.onOpen()
            }
            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val obj = AppJson.parseToJsonElement(text).let { it as? kotlinx.serialization.json.JsonObject } ?: return
                    when ((obj["type"] as? kotlinx.serialization.json.JsonPrimitive)?.content) {
                        "menu_updated" -> events.onMenuUpdated((obj["version"] as? kotlinx.serialization.json.JsonPrimitive)?.content?.toIntOrNull() ?: 0)
                        "settings_updated" -> events.onSettingsUpdated()
                        "welcome" -> events.onWelcome((obj["menu_version"] as? kotlinx.serialization.json.JsonPrimitive)?.content?.toIntOrNull() ?: 0)
                    }
                } catch (e: Exception) { Log.w(TAG, "bad ws message: ${e.message}") }
            }
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) = events.onClosed()
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: okhttp3.Response?) = events.onClosed()
        })
    }

    companion object {
        const val DISCOVERY_PORT = 47474

        /** Broadcasts LARTISAN_DISCOVER and returns the first server URL that answers (or null). */
        suspend fun discover(timeoutMs: Int = 2500): String? = withContext(Dispatchers.IO) {
            var socket: DatagramSocket? = null
            try {
                socket = DatagramSocket().apply { broadcast = true; soTimeout = timeoutMs }
                val payload = "LARTISAN_DISCOVER".toByteArray()
                val targets = listOf("255.255.255.255") + subnetBroadcasts()
                for (t in targets) {
                    try { socket.send(DatagramPacket(payload, payload.size, InetAddress.getByName(t), DISCOVERY_PORT)) } catch (e: Exception) { /* ignore */ }
                }
                val buf = ByteArray(2048)
                val deadline = System.currentTimeMillis() + timeoutMs
                while (System.currentTimeMillis() < deadline) {
                    val pkt = DatagramPacket(buf, buf.size)
                    try { socket.receive(pkt) } catch (e: SocketTimeoutException) { break }
                    val text = String(pkt.data, 0, pkt.length)
                    val reply = try { AppJson.decodeFromString(DiscoveryReply.serializer(), text) } catch (e: Exception) { null } ?: continue
                    if (reply.service != "lartisan-cafe") continue
                    // Prefer the address the reply came from (it is definitely reachable), fall back to the advertised list.
                    val host = pkt.address.hostAddress ?: reply.addresses.firstOrNull() ?: continue
                    return@withContext "http://$host:${reply.port}"
                }
                null
            } catch (e: Exception) {
                Log.w("Discovery", "failed: ${e.message}"); null
            } finally { socket?.close() }
        }

        private fun subnetBroadcasts(): List<String> {
            val out = mutableListOf<String>()
            try {
                val ifaces = java.net.NetworkInterface.getNetworkInterfaces() ?: return out
                for (ni in ifaces) {
                    if (!ni.isUp || ni.isLoopback) continue
                    for (ia in ni.interfaceAddresses) { ia.broadcast?.hostAddress?.let { out += it } }
                }
            } catch (e: Exception) { /* ignore */ }
            return out
        }
    }
}
