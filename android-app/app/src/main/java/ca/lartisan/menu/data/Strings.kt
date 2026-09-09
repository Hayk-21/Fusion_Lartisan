package ca.lartisan.menu.data

/** UI strings for the customer-facing app. The menu content itself comes bilingual from the server. */
class Strings(val lang: String) {
    private val en = lang == "en"
    fun pick(fr: String, enTxt: String) = if (en) enTxt else fr

    val tagline get() = "Crêperie & Café"
    val hint get() = pick("Choisissez une section, ajoutez vos articles puis validez votre commande.", "Pick a section, add your items, then review your order.")
    val yourOrder get() = pick("Votre commande", "Your order")
    val clear get() = pick("Vider", "Clear")
    val review get() = pick("Vérifier la commande", "Review order")
    val emptyCart get() = pick("Votre commande est vide.\nTouchez un article pour commencer.", "Your order is empty.\nTap an item to start.")
    val from get() = pick("à partir de", "from")
    val add get() = pick("Ajouter", "Add")
    val included get() = pick("inclus", "included")
    fun includedOf(c: Int, n: Int) = pick("$c/$n inclus", "$c/$n included")
    val extra get() = pick("suppl.", "extra")
    val required get() = pick("Requis", "Required")
    val choose get() = pick("Choisir", "Choose")
    val qty get() = pick("Quantité", "Quantity")
    val note get() = pick("Note pour la cuisine (allergies, sans oignon…)", "Note for the kitchen (allergies, no onion…)")
    val subtotal get() = pick("Sous-total", "Subtotal")
    fun gst(rate: Double) = pick("TPS (${fmtRate(rate)} %)", "GST (${fmtRate(rate)}%)")
    fun qst(rate: Double) = pick("TVQ (${fmtRate(rate)} %)", "QST (${fmtRate(rate)}%)")
    val total get() = pick("Total", "Total")
    val reviewTitle get() = pick("Vérifiez votre commande", "Review your order")
    val reviewSub get() = pick("Tout est bon ? Confirmez et présentez-vous au comptoir pour payer.", "All good? Confirm and come to the counter to pay.")
    val back get() = pick("Modifier", "Edit")
    val confirm get() = pick("Confirmer la commande", "Confirm order")
    val yourName get() = pick("Votre prénom (facultatif)", "Your first name (optional)")
    val service get() = pick("Où mangez-vous ?", "Where are you eating?")
    val dineIn get() = pick("Sur place", "Dine in")
    val takeout get() = pick("À emporter", "Take out")
    val sending get() = pick("Envoi…", "Sending…")
    val thanks get() = pick("Merci !", "Thank you!")
    val orderNo get() = pick("Votre numéro de commande", "Your order number")
    val payHint get() = pick("Présentez-vous au comptoir pour régler votre commande. On vous appelle dès qu'elle est prête.", "Please come to the counter to pay. We'll call you as soon as it's ready.")
    val newOrder get() = pick("Nouvelle commande", "New order")
    val offline get() = pick("Impossible de joindre le comptoir. Veuillez commander directement au comptoir.", "Cannot reach the counter. Please order directly at the counter.")
    val unavailable get() = pick("Cet article n'est plus disponible", "This item is no longer available")
    val chooseVariant get() = pick("Veuillez choisir une option", "Please choose an option")
    fun min(n: Int) = pick("choisissez au moins $n", "choose at least $n")
    fun max(n: Int) = pick("maximum $n", "maximum $n")
    val menuUpdated get() = pick("Le menu a été mis à jour", "The menu was updated")
    val cancel get() = pick("Annuler", "Cancel")
    val ok get() = "OK"
    val remove get() = pick("Retirer", "Remove")

    // setup / admin
    val setupTitle get() = pick("Connexion au comptoir", "Connect to the counter")
    val setupHint get() = pick("Entrez l'adresse du serveur affichée dans le panneau d'administration (onglet Tablettes) — l'adresse en ligne (ex. lartisan.up.railway.app) ou l'adresse locale. La détection automatique ne fonctionne que sur le même Wi-Fi qu'un serveur local.",
        "Enter the server address shown in the admin panel (Tablets tab) — the online address (e.g. lartisan.up.railway.app) or the local one. Auto-discovery only works on the same Wi-Fi as a local server.")
    val serverUrl get() = pick("Adresse du serveur", "Server address")
    val deviceName get() = pick("Nom de cette tablette", "Name of this tablet")
    val discover get() = pick("Détecter automatiquement", "Auto-discover")
    val discovering get() = pick("Recherche du serveur…", "Looking for the server…")
    val discoverFail get() = pick("Aucun serveur trouvé. Vérifiez que le serveur est lancé et que le Wi-Fi est le même.", "No server found. Check that the server is running and the Wi-Fi is the same.")
    val testConnection get() = pick("Tester la connexion", "Test connection")
    val connected get() = pick("Connecté", "Connected")
    val connectFail get() = pick("Connexion impossible", "Connection failed")
    val save get() = pick("Enregistrer", "Save")
    val adminTitle get() = pick("Réglages de la tablette", "Tablet settings")
    val enterPin get() = pick("Code PIN", "PIN code")
    val wrongPin get() = pick("Code PIN incorrect", "Wrong PIN")
    val reloadMenu get() = pick("Recharger le menu", "Reload menu")
    val menuVersion get() = pick("Version du menu", "Menu version")
    val changePin get() = pick("Changer le PIN de la tablette", "Change tablet PIN")
    val exitKiosk get() = pick("Quitter l'application", "Exit the app")
    val useBundled get() = pick("Utiliser le menu intégré (hors ligne)", "Use the built-in menu (offline)")

    private fun fmtRate(r: Double): String {
        val s = if (r == r.toLong().toDouble()) r.toLong().toString() else r.toString()
        return if (en) s else s.replace('.', ',')
    }
}
