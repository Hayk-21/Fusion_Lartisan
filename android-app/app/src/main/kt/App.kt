package ca.lartisan.menu

import android.app.Application
import ca.lartisan.menu.data.Prefs

class App : Application() {
    lateinit var prefs: Prefs
    override fun onCreate() { super.onCreate(); prefs = Prefs(this) }
    companion object { const val VERSION = "2.0.0" }
}
