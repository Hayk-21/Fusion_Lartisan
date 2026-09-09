package ca.lartisan.menu

import android.app.Application
import ca.lartisan.menu.data.MenuRepository
import ca.lartisan.menu.data.Prefs
import ca.lartisan.menu.data.ServerClient

class App : Application() {
    lateinit var prefs: Prefs
    lateinit var client: ServerClient
    lateinit var repo: MenuRepository

    override fun onCreate() {
        super.onCreate()
        prefs = Prefs(this)
        client = ServerClient(prefs)
        repo = MenuRepository(this, prefs, client)
    }

    companion object { const val VERSION = "1.2.0" }
}
