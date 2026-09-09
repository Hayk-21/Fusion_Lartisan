package ca.lartisan.menu.data

import kotlin.math.round

/**
 * Pricing rules — must stay identical to server/src/pricing.js (the server re-computes every order anyway,
 * this is only for what the customer sees before confirming).
 *
 *  1. Base price = variant.price if a variant is chosen, else item.price.
 *  2. For every option group: included = variant.included[group.id] ?: group.included.
 *     Picks are counted in selection order; picks beyond `included` cost group.extraPrice each.
 *     Every selected option also adds its own option.price (surcharge).
 *  3. Line total = (base + options) × qty.
 *  4. GST and QST are both computed on the subtotal.
 */
object Pricing {
    fun round2(v: Double): Double = round(v * 100.0) / 100.0

    data class PricedOption(val groupId: String, val optionId: String, val name: String, val price: Double, val extra: Double)
    data class PricedLine(
        val line: CartLine, val item: MenuItem, val variant: Variant?, val name: String, val variantName: String?,
        val options: List<PricedOption>, val unitPrice: Double, val lineTotal: Double,
    )
    data class PricedOrder(val lines: List<PricedLine>, val subtotal: Double, val gst: Double, val qst: Double, val total: Double)

    sealed class Result {
        data class Ok(val line: PricedLine) : Result()
        data class Error(val message: String) : Result()
    }

    fun includedFor(item: MenuItem, variant: Variant?, group: OptionGroup): Int =
        variant?.included?.get(group.id) ?: group.included

    fun priceLine(menu: Menu, line: CartLine, lang: String, s: Strings): Result {
        val item = menu.item(line.itemId) ?: return Result.Error(s.unavailable)
        if (!item.available) return Result.Error(s.unavailable)
        val variant = if (item.variants.isNotEmpty()) {
            item.variants.firstOrNull { it.id == line.variantId } ?: return Result.Error(s.chooseVariant)
        } else null
        var unit = variant?.price ?: item.price
        val chosen = mutableListOf<PricedOption>()
        for (g in item.optionGroups) {
            val picks = line.options.filter { it.groupId == g.id }
            val included = includedFor(item, variant, g)
            val min = if (g.required) maxOf(1, g.min) else g.min
            if (picks.size < min) return Result.Error("${g.name.get(lang)} : ${s.min(min)}")
            val max = g.max
            if (max != null && max > 0 && picks.size > max) return Result.Error("${g.name.get(lang)} : ${s.max(max)}")
            picks.forEachIndexed { idx, p ->
                val o = g.options.firstOrNull { it.id == p.optionId } ?: return Result.Error(s.unavailable)
                if (!o.available) return Result.Error("${o.name.get(lang)} — ${s.unavailable}")
                val extra = if (idx >= included) g.extraPrice else 0.0
                val price = round2(o.price + extra)
                unit += price
                chosen += PricedOption(g.id, o.id, o.name.get(lang), price, extra)
            }
        }
        unit = round2(unit)
        val qty = line.qty.coerceIn(1, 50)
        return Result.Ok(
            PricedLine(line, item, variant, item.name.get(lang), variant?.name?.get(lang), chosen, unit, round2(unit * qty))
        )
    }

    fun priceOrder(menu: Menu, lines: List<CartLine>, lang: String, s: Strings): PricedOrder {
        val priced = lines.mapNotNull { (priceLine(menu, it, lang, s) as? Result.Ok)?.line }
        val subtotal = round2(priced.sumOf { it.lineTotal })
        val gst = round2(subtotal * menu.settings.taxGst / 100.0)
        val qst = round2(subtotal * menu.settings.taxQst / 100.0)
        return PricedOrder(priced, subtotal, gst, qst, round2(subtotal + gst + qst))
    }

    fun money(v: Double, lang: String): String {
        val s = String.format(java.util.Locale.US, "%.2f", round2(v))
        return if (lang == "en") "$$s" else s.replace('.', ',') + " $"
    }
}
