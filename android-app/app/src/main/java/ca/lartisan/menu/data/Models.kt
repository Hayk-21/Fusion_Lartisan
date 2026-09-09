package ca.lartisan.menu.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/** Shared JSON instance: tolerant to unknown keys so older apps keep working when the server adds fields. */
val AppJson = Json {
    ignoreUnknownKeys = true
    isLenient = true
    coerceInputValues = true
    encodeDefaults = true
}

/** Bilingual text as stored in the menu document. */
@Serializable
data class LocalizedText(val fr: String = "", val en: String = "") {
    fun get(lang: String): String = if (lang == "en" && en.isNotBlank()) en else fr.ifBlank { en }
}

@Serializable
data class Category(
    val id: String,
    val name: LocalizedText = LocalizedText(),
    val description: LocalizedText = LocalizedText(),
    val icon: String = "",
    val sort: Int = 0,
    val visible: Boolean = true,
    @SerialName("daily_special") val dailySpecial: Boolean = false,
)

@Serializable
data class Option(
    val id: String,
    val name: LocalizedText = LocalizedText(),
    val price: Double = 0.0,
    val available: Boolean = true,
    val section: LocalizedText? = null,
)

@Serializable
data class OptionGroup(
    val id: String,
    val name: LocalizedText = LocalizedText(),
    val hint: LocalizedText? = null,
    val type: String = "multi",          // "single" | "multi"
    val required: Boolean = false,
    val min: Int = 0,
    val max: Int? = null,
    val included: Int = 0,
    @SerialName("extra_price") val extraPrice: Double = 0.0,
    val options: List<Option> = emptyList(),
) {
    val isSingle get() = type == "single"
}

@Serializable
data class Variant(
    val id: String,
    val name: LocalizedText = LocalizedText(),
    val price: Double = 0.0,
    val description: LocalizedText? = null,
    val included: Map<String, Int>? = null,
)

@Serializable
data class MenuItem(
    val id: String,
    @SerialName("category_id") val categoryId: String,
    val name: LocalizedText = LocalizedText(),
    val description: LocalizedText = LocalizedText(),
    val price: Double = 0.0,
    val available: Boolean = true,
    val sort: Int = 0,
    val badge: LocalizedText? = null,
    val image: String? = null,
    val variants: List<Variant> = emptyList(),
    @SerialName("option_groups") val optionGroups: List<OptionGroup> = emptyList(),
) {
    val minPrice: Double get() = if (variants.isNotEmpty()) variants.minOf { it.price } else price
    val isConfigurable: Boolean get() = variants.isNotEmpty() || optionGroups.any { it.included > 0 || it.options.any { o -> o.price > 0 } }
}

@Serializable
data class MenuSettings(
    @SerialName("cafe_name") val cafeName: String = "L'Artisan",
    @SerialName("tax_gst") val taxGst: Double = 5.0,
    @SerialName("tax_qst") val taxQst: Double = 9.975,
    val currency: String = "CAD",
    @SerialName("default_lang") val defaultLang: String = "fr",
    @SerialName("ask_customer_name") val askCustomerName: Boolean = true,
    @SerialName("ask_service_type") val askServiceType: Boolean = true,
    @SerialName("thank_you_seconds") val thankYouSeconds: Int = 12,
    @SerialName("logo_url") val logoUrl: String = "",
)

@Serializable
data class Menu(
    val version: Int = 0,
    val currency: String = "CAD",
    val categories: List<Category> = emptyList(),
    val items: List<MenuItem> = emptyList(),
    val settings: MenuSettings = MenuSettings(),
) {
    fun item(id: String) = items.firstOrNull { it.id == id }
    fun visibleCategories() = categories
        .filter { c -> c.visible && items.any { it.categoryId == c.id && it.available } }
        .sortedBy { it.sort }
    fun itemsIn(categoryId: String) = items.filter { it.categoryId == categoryId }.sortedBy { it.sort }
}

// ---------------------------------------------------------------- cart / order payloads (what the server expects)

@Serializable
data class OptionPick(@SerialName("group_id") val groupId: String, @SerialName("option_id") val optionId: String)

@Serializable
data class CartLine(
    @SerialName("item_id") val itemId: String,
    @SerialName("variant_id") val variantId: String? = null,
    val options: List<OptionPick> = emptyList(),
    val qty: Int = 1,
    val note: String = "",
) {
    /** Two lines with the same configuration merge in the cart. */
    val configKey: String get() = "$itemId|$variantId|${options.joinToString(",") { it.groupId + ":" + it.optionId }}|$note"
}

@Serializable
data class OrderRequest(
    @SerialName("device_id") val deviceId: String,
    @SerialName("device_name") val deviceName: String,
    @SerialName("customer_name") val customerName: String = "",
    @SerialName("service_type") val serviceType: String = "dine_in",
    val lang: String = "fr",
    val lines: List<CartLine>,
)

@Serializable
data class OrderResponse(val id: Int = 0, val number: Int = 0, val status: String = "new", val total: Double = 0.0)

@Serializable
data class ErrorResponse(val error: String = "")

@Serializable
data class HelloRequest(
    @SerialName("device_id") val deviceId: String,
    @SerialName("device_name") val deviceName: String,
    @SerialName("app_version") val appVersion: String,
    @SerialName("menu_version") val menuVersion: Int,
)

@Serializable
data class DiscoveryReply(val service: String = "", val name: String = "", val port: Int = 3000, val addresses: List<String> = emptyList())
