package ca.lartisan.menu.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ca.lartisan.menu.R
import ca.lartisan.menu.data.Pricing
import ca.lartisan.menu.ui.AppViewModel
import ca.lartisan.menu.ui.theme.*

/** "Check your order" screen: the customer sees everything, enters a first name, picks dine-in / take-out, then confirms. */
@Composable
fun ReviewScreen(vm: AppViewModel) {
    val s = vm.s
    val lang = vm.lang
    val menu = vm.menu ?: return
    val priced = vm.pricedOrder() ?: return

    Box(Modifier.fillMaxSize().background(Bg), contentAlignment = Alignment.Center) {
        val cfg = LocalConfiguration.current
        val wide = cfg.screenWidthDp > cfg.screenHeightDp
        Surface(Modifier.fillMaxWidth(if (wide) 0.8f else 0.96f).fillMaxHeight(0.92f), shape = RoundedCornerShape(22.dp), color = CardBg, border = BorderStroke(1.dp, Line), shadowElevation = 6.dp) {
            Column {
                Row(Modifier.padding(22.dp, 18.dp, 22.dp, 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(s.reviewTitle, color = Brand, fontWeight = FontWeight.ExtraBold, fontSize = 24.sp)
                        Text(s.reviewSub, color = Muted, fontSize = 14.sp)
                    }
                    CafeLogo(menu.settings.logoUrl, vm.serverUrl, Modifier.height(48.dp).width(60.dp))
                    Spacer(Modifier.width(12.dp))
                    // ✕ closes the review and goes back to the menu (same as "Modifier")
                    Box(Modifier.size(40.dp).background(Soft, CircleShape).clickable { vm.backToMenu() }, contentAlignment = Alignment.Center) {
                        Text("✕", fontSize = 18.sp, color = Brand2, fontWeight = FontWeight.Bold)
                    }
                }
                HorizontalDivider(color = Line)
                Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 22.dp, vertical = 8.dp)) {
                    priced.lines.forEach { l ->
                        HorizontalDivider(color = Line)
                        Row(Modifier.padding(vertical = 8.dp)) {
                            Column(Modifier.weight(1f)) {
                                Text("${l.line.qty}× ${l.name}" + (l.variantName?.let { " · $it" } ?: ""), fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Ink)
                                val opts = l.options.joinToString(", ") { it.name } + (if (l.line.note.isNotBlank()) " · ✎ ${l.line.note}" else "")
                                if (opts.isNotBlank()) Text(opts, color = Muted, fontSize = 13.sp)
                            }
                            Text(Pricing.money(l.lineTotal, lang), fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Ink)
                        }
                    }
                    Spacer(Modifier.height(10.dp))
                    TotalRow(s.subtotal, Pricing.money(priced.subtotal, lang))
                    TotalRow(s.gst(menu.settings.taxGst), Pricing.money(priced.gst, lang))
                    TotalRow(s.qst(menu.settings.taxQst), Pricing.money(priced.qst, lang))
                    val tipPct = vm.effectiveTip()
                    val tipAmount = if (menu.settings.tipsEnabled) Math.round(priced.subtotal * tipPct) / 100.0 else 0.0
                    if (menu.settings.tipsEnabled) {
                        Spacer(Modifier.height(10.dp))
                        Text(s.tipLabel, color = Muted, fontSize = 13.sp)
                        Row(Modifier.fillMaxWidth().padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            menu.settings.tipOptions.forEach { pct ->
                                val label = if (pct == 0.0) s.noTip else "${pct.toInt()} %"
                                Pill(label, tipPct == pct, { vm.tipPercent = pct; vm.touch() }, Modifier.weight(1f), big = true)
                            }
                        }
                        if (tipAmount > 0) TotalRow(s.tip, Pricing.money(tipAmount, lang))
                    }
                    Row(Modifier.fillMaxWidth().padding(top = 4.dp)) {
                        Text(s.total, fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = Ink, modifier = Modifier.weight(1f))
                        Text(Pricing.money(priced.total + tipAmount, lang), fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = Ink)
                    }
                    if (menu.settings.askCustomerName) {
                        Spacer(Modifier.height(14.dp))
                        Text(s.yourName, color = Muted, fontSize = 13.sp)
                        OutlinedTextField(
                            value = vm.customerName, onValueChange = { if (it.length <= 40) vm.customerName = it; vm.touch() },
                            singleLine = true, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                        )
                    }
                    if (menu.settings.askServiceType) {
                        Spacer(Modifier.height(14.dp))
                        Text(s.service, color = Muted, fontSize = 13.sp)
                        Row(Modifier.fillMaxWidth().padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Pill("🍽️ " + s.dineIn, vm.serviceType == "dine_in", { vm.serviceType = "dine_in" }, Modifier.weight(1f), big = true)
                            Pill("🥡 " + s.takeout, vm.serviceType == "takeout", { vm.serviceType = "takeout" }, Modifier.weight(1f), big = true)
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                }
                HorizontalDivider(color = Line)
                Row(Modifier.background(Soft).padding(horizontal = 22.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    BigButton(s.back, onClick = { vm.backToMenu() }, secondary = true)
                    Spacer(Modifier.weight(1f))
                    BigButton(if (vm.submitting) s.sending else "✓ " + s.confirm, enabled = !vm.submitting, onClick = { vm.submitOrder() }, modifier = Modifier.widthIn(min = 280.dp))
                }
            }
        }
    }
}

/** Big order number + "pay at the counter" message; returns to the menu automatically. */
@Composable
fun SuccessScreen(vm: AppViewModel, number: Int) {
    val s = vm.s
    Box(Modifier.fillMaxSize().background(Bg), contentAlignment = Alignment.Center) {
        Surface(Modifier.fillMaxWidth(if (LocalConfiguration.current.screenWidthDp > LocalConfiguration.current.screenHeightDp) 0.6f else 0.92f), shape = RoundedCornerShape(22.dp), color = CardBg, border = BorderStroke(1.dp, Line), shadowElevation = 6.dp) {
            Column(Modifier.padding(40.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                val logo = vm.menu?.settings?.logoUrl ?: ""
                if (logo.isBlank() || logo == "/shared/logo-mark.png") Image(painterResource(R.drawable.logo_full), null, Modifier.height(120.dp), contentScale = ContentScale.Fit)
                else CafeLogo(logo, vm.serverUrl, Modifier.height(120.dp).fillMaxWidth())
                Spacer(Modifier.height(10.dp))
                Text(s.thanks, color = Brand2, fontWeight = FontWeight.ExtraBold, fontSize = 30.sp)
                Text(s.orderNo, color = Muted, fontSize = 16.sp)
                Text("#$number", color = Brand, fontWeight = FontWeight.Black, fontSize = 110.sp)
                Text(s.payHint, color = Muted, fontSize = 16.sp, textAlign = TextAlign.Center)
                Spacer(Modifier.height(24.dp))
                BigButton(s.newOrder, onClick = { vm.backToMenu() })
            }
        }
    }
}
