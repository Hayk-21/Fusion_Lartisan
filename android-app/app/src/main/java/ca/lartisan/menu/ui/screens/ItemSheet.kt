package ca.lartisan.menu.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import ca.lartisan.menu.data.*
import ca.lartisan.menu.ui.AppViewModel
import ca.lartisan.menu.ui.theme.*

/** Item configurator: size/formula, option groups (with sections), quantity, note. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ItemSheet(vm: AppViewModel, item: MenuItem) {
    val s = vm.s
    val lang = vm.lang
    val menu = vm.menu ?: return

    var variantId by remember(item.id) { mutableStateOf(item.variants.firstOrNull()?.id) }
    val picks = remember(item.id) {
        mutableStateListOf<OptionPick>().apply {
            // preselect the first available option of required single-choice groups
            item.optionGroups.filter { it.isSingle && it.required }.forEach { g -> g.options.firstOrNull { it.available }?.let { add(OptionPick(g.id, it.id)) } }
        }
    }
    var qty by remember(item.id) { mutableIntStateOf(1) }
    var note by remember(item.id) { mutableStateOf("") }
    val line = CartLine(item.id, variantId, picks.toList(), qty, note.trim())
    val result = Pricing.priceLine(menu, line, lang, s)
    val variant = item.variants.firstOrNull { it.id == variantId }

    Dialog(onDismissRequest = { vm.editingItem = null }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        val cfg = LocalConfiguration.current
        val wide = cfg.screenWidthDp > cfg.screenHeightDp
        Surface(Modifier.fillMaxWidth(if (wide) 0.82f else 0.96f).fillMaxHeight(0.92f), shape = RoundedCornerShape(22.dp), color = CardBg) {
            Column {
                // header
                Row(Modifier.padding(start = 22.dp, end = 16.dp, top = 18.dp, bottom = 10.dp), verticalAlignment = Alignment.Top) {
                    Column(Modifier.weight(1f)) {
                        Text(item.name.get(lang), color = Brand, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp)
                        val d = item.description.get(lang)
                        if (d.isNotBlank()) Text(d, color = Muted, fontSize = 14.sp, modifier = Modifier.padding(top = 4.dp))
                    }
                    Box(Modifier.size(40.dp).background(Soft, CircleShape).clickable { vm.editingItem = null }, contentAlignment = Alignment.Center) { Text("✕", fontSize = 18.sp, color = Brand2) }
                }
                HorizontalDivider(color = Line)

                // body
                Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 22.dp, vertical = 10.dp)) {
                    if (item.variants.isNotEmpty()) {
                        GroupTitle(s.choose, required = true, right = null)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            item.variants.forEach { v ->
                                OptionCard(
                                    title = "${v.name.get(lang)} · ${Pricing.money(v.price, lang)}",
                                    subtitle = v.description?.get(lang),
                                    selected = v.id == variantId, radio = true, enabled = true,
                                    onClick = { variantId = v.id },
                                    modifier = Modifier.widthIn(min = 200.dp),
                                )
                            }
                        }
                        Spacer(Modifier.height(12.dp))
                    }
                    item.optionGroups.forEach { g ->
                        val gPicks = picks.filter { it.groupId == g.id }
                        val included = Pricing.includedFor(item, variant, g)
                        val right = when {
                            g.isSingle -> null
                            included > 0 -> s.includedOf(minOf(gPicks.size, included), included) + (if (g.extraPrice > 0) " · +${Pricing.money(g.extraPrice, lang)} ${s.extra}" else "")
                            g.max != null && g.max > 0 -> s.max(g.max)
                            else -> null
                        }
                        GroupTitle(g.name.get(lang), required = g.required, right = right)
                        g.hint?.get(lang)?.takeIf { it.isNotBlank() }?.let { h ->
                            Surface(shape = RoundedCornerShape(10.dp), color = Soft, modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)) { Text(h, color = Muted, fontSize = 12.sp, modifier = Modifier.padding(8.dp)) }
                        }
                        val sections = g.options.map { it.section?.get(lang) ?: "" }.distinct()
                        sections.forEach { sec ->
                            if (sec.isNotBlank()) Text(sec.uppercase(), color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp, bottom = 4.dp))
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                g.options.filter { (it.section?.get(lang) ?: "") == sec }.forEach { o ->
                                    val idx = gPicks.indexOfFirst { it.optionId == o.id }
                                    val on = idx >= 0
                                    val extra = if (!g.isSingle && on && idx >= included) g.extraPrice else 0.0
                                    val sub = buildString {
                                        if (o.price > 0) append("+" + Pricing.money(o.price, lang))
                                        if (extra > 0) append((if (isNotEmpty()) " " else "") + "+" + Pricing.money(extra, lang))
                                        if (isEmpty() && !g.isSingle && included > 0) append(s.included)
                                    }
                                    val full = !on && g.max != null && g.max > 0 && gPicks.size >= g.max
                                    OptionCard(
                                        title = o.name.get(lang), subtitle = sub, selected = on, radio = g.isSingle,
                                        enabled = o.available && !full,
                                        onClick = {
                                            if (g.isSingle) {
                                                picks.removeAll { it.groupId == g.id }
                                                if (!on || g.required) picks.add(OptionPick(g.id, o.id))
                                            } else if (on) {
                                                picks.removeAt(picks.indexOfFirst { it.groupId == g.id && it.optionId == o.id })
                                            } else picks.add(OptionPick(g.id, o.id))
                                        },
                                        modifier = Modifier.widthIn(min = 200.dp),
                                    )
                                }
                            }
                        }
                        Spacer(Modifier.height(12.dp))
                    }
                    GroupTitle(s.qty, required = false, right = null)
                    QtyStepper(qty, onChange = { qty = (qty + it).coerceIn(1, 20) }, big = true)
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = note, onValueChange = { if (it.length <= 120) note = it },
                        placeholder = { Text(s.note, color = Muted) }, singleLine = true,
                        shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(10.dp))
                }

                // footer
                HorizontalDivider(color = Line)
                Row(Modifier.background(Soft).padding(horizontal = 22.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    when (result) {
                        is Pricing.Result.Ok -> Text(Pricing.money(result.line.lineTotal, lang), color = Brand, fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, modifier = Modifier.weight(1f))
                        is Pricing.Result.Error -> Text(result.message, color = Danger, fontSize = 14.sp, modifier = Modifier.weight(1f))
                    }
                    BigButton(s.add, enabled = result is Pricing.Result.Ok, onClick = { vm.addToCart(line); vm.editingItem = null }, modifier = Modifier.widthIn(min = 220.dp))
                }
            }
        }
    }
}

@Composable
private fun GroupTitle(title: String, required: Boolean, right: String?) {
    Row(Modifier.fillMaxWidth().padding(bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(title, color = Color(0xFF4A3B34), fontWeight = FontWeight.Bold, fontSize = 15.sp)
        if (required) {
            Spacer(Modifier.width(8.dp))
            Surface(shape = RoundedCornerShape(999.dp), color = Brand) { Text("★", color = Color.White, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)) }
        }
        Spacer(Modifier.weight(1f))
        if (right != null) Text(right, color = Muted, fontSize = 12.sp)
    }
}
