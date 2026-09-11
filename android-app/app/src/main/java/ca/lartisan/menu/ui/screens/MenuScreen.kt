package ca.lartisan.menu.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ca.lartisan.menu.R
import ca.lartisan.menu.data.MenuItem
import ca.lartisan.menu.data.Pricing
import ca.lartisan.menu.ui.AppViewModel
import ca.lartisan.menu.ui.Screen
import ca.lartisan.menu.ui.theme.*
import coil.compose.AsyncImage

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun MenuScreen(vm: AppViewModel) {
    val s = vm.s
    val menu = vm.menu ?: return
    val lang = vm.lang
    val cats = menu.visibleCategories()
    val current = cats.firstOrNull { it.id == vm.selectedCategory } ?: cats.firstOrNull()
    val cfg = LocalConfiguration.current
    val portrait = cfg.screenWidthDp < cfg.screenHeightDp
    var showCart by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxSize().background(Bg)) {
        // ------------------------------------------------ header
        Row(
            Modifier.fillMaxWidth().background(Bg).padding(horizontal = 18.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.combinedClickable(onClick = {}, onLongClick = { vm.showAdmin = true }),
            ) {
                CafeLogo(menu.settings.logoUrl, vm.serverUrl, Modifier.height(44.dp).width(54.dp))
                Spacer(Modifier.width(8.dp))
                Column {
                    Text(menu.settings.cafeName, color = Brand, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
                    Text(s.tagline, color = Muted, fontSize = 12.sp)
                }
            }
            Spacer(Modifier.width(16.dp))
            if (!portrait) {
                Surface(Modifier.weight(1f), shape = RoundedCornerShape(999.dp), color = Soft, border = BorderStroke(1.dp, Line)) {
                    Text("💡 " + s.hint, color = Muted, fontSize = 13.sp, textAlign = TextAlign.Center, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp))
                }
            } else Spacer(Modifier.weight(1f))
            Spacer(Modifier.width(12.dp))
            Box(Modifier.size(10.dp).background(if (vm.connected) Ok else Danger, CircleShape))
            Spacer(Modifier.width(10.dp))
            Pill("FR", lang == "fr", { vm.setLanguage("fr") })
            Spacer(Modifier.width(6.dp))
            Pill("EN", lang == "en", { vm.setLanguage("en") })
        }
        HorizontalDivider(color = Line)

        // ------------------------------------------------ category tabs
        LazyRow(Modifier.fillMaxWidth().padding(vertical = 10.dp), contentPadding = PaddingValues(horizontal = 18.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(cats, key = { it.id }) { c ->
                val sel = c.id == current?.id
                Surface(
                    Modifier.clickable { vm.selectedCategory = c.id; vm.touch() },
                    shape = RoundedCornerShape(12.dp),
                    color = if (sel) (if (c.dailySpecial) Warn else Brand) else (if (c.dailySpecial) Color(0xFFFFF3E0) else CardBg),
                    border = BorderStroke(1.dp, if (sel) (if (c.dailySpecial) Warn else Brand) else (if (c.dailySpecial) Color(0xFFE0B07A) else Line)),
                ) {
                    Text("${c.icon} ${c.name.get(lang)}", color = if (sel) Color.White else Brand2, fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.padding(horizontal = 18.dp, vertical = 15.dp))
                }
            }
        }

        // ------------------------------------------------ body: grid + cart (side panel in landscape, bottom bar in portrait)
        Row(Modifier.weight(1f).fillMaxWidth().padding(start = 18.dp, end = 18.dp, bottom = if (portrait) 0.dp else 14.dp)) {
            Column(Modifier.weight(1f).fillMaxHeight()) {
                if (current != null) {
                    Text("${current.icon} ${current.name.get(lang)}", color = Brand2, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp)
                    val d = current.description.get(lang)
                    if (d.isNotBlank()) Text(d, color = Muted, fontSize = 14.sp, modifier = Modifier.padding(top = 2.dp, bottom = 10.dp))
                    LazyVerticalGrid(
                        columns = GridCells.Adaptive(minSize = 220.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(bottom = 20.dp),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        items(menu.itemsIn(current.id), key = { it.id }) { item -> ItemCard(item, lang, s, vm.serverUrl) { if (item.available) { vm.editingItem = item; vm.touch() } } }
                    }
                }
            }
            if (!portrait) {
                Spacer(Modifier.width(14.dp))
                CartPanel(vm, Modifier.width(340.dp).fillMaxHeight())
            }
        }
        if (portrait) CartBar(vm, onOpen = { showCart = true })
    }
    if (portrait && showCart) {
        Dialog(onDismissRequest = { showCart = false }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
            CartPanel(vm, Modifier.fillMaxWidth(0.94f).fillMaxHeight(0.88f), onClose = { showCart = false })
        }
    }
}

/** Portrait: compact bar at the bottom with the total and the review button. */
@Composable
private fun CartBar(vm: AppViewModel, onOpen: () -> Unit) {
    val s = vm.s
    val priced = vm.pricedOrder()
    val count = vm.cart.sumOf { it.qty }
    Surface(Modifier.fillMaxWidth().clickable(enabled = count > 0, onClick = onOpen), color = CardBg, shadowElevation = 8.dp, border = BorderStroke(1.dp, Line)) {
        Row(Modifier.padding(horizontal = 18.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(s.yourOrder + if (count > 0) "  ·  $count" else "", color = Brand2, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                Text(if (priced != null && priced.lines.isNotEmpty()) Pricing.money(priced.total, vm.lang) else "—", color = Ink, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
            }
            if (count > 0) { BigButton("☰", onClick = onOpen, secondary = true); Spacer(Modifier.width(8.dp)) }
            BigButton(s.review, enabled = count > 0, onClick = { vm.screen = Screen.Review; vm.touch() })
        }
    }
}

@Composable
private fun ItemCard(item: MenuItem, lang: String, s: ca.lartisan.menu.data.Strings, serverUrl: String, onClick: () -> Unit) {
    Surface(
        Modifier.fillMaxWidth().clickable(enabled = item.available, onClick = onClick),
        shape = RoundedCornerShape(16.dp), color = CardBg, border = BorderStroke(1.dp, Line), shadowElevation = 2.dp,
    ) {
        Column(Modifier.padding(14.dp).heightIn(min = 110.dp)) {
            item.badge?.get(lang)?.takeIf { it.isNotBlank() }?.let { b ->
                Surface(shape = RoundedCornerShape(999.dp), color = Warn) { Text(b, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)) }
                Spacer(Modifier.height(6.dp))
            }
            item.image?.let { img ->
                AsyncImage(model = imageModel(img, serverUrl), contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxWidth().height(110.dp).background(Soft, RoundedCornerShape(12.dp)))
                Spacer(Modifier.height(8.dp))
            }
            Text(item.name.get(lang), color = Brand2, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
            val d = item.description.get(lang)
            if (d.isNotBlank()) Text(d, color = Muted, fontSize = 13.sp, maxLines = 3, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp))
            Spacer(Modifier.weight(1f)); Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.Bottom) {
                if (item.isConfigurable) Text(s.from + " ", color = Muted, fontSize = 12.sp)
                Text(Pricing.money(item.minPrice, lang), color = Brand, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
            }
        }
    }
}

@Composable
fun CartPanel(vm: AppViewModel, modifier: Modifier = Modifier, onClose: (() -> Unit)? = null) {
    val s = vm.s
    val lang = vm.lang
    val menu = vm.menu ?: return
    val priced = vm.pricedOrder()
    Surface(modifier, shape = RoundedCornerShape(16.dp), color = CardBg, border = BorderStroke(1.dp, Line), shadowElevation = 2.dp) {
        Column(Modifier.padding(14.dp).fillMaxHeight()) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(s.yourOrder, color = Brand2, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, modifier = Modifier.weight(1f))
                if (vm.cart.isNotEmpty()) Text(s.clear, color = Muted, fontWeight = FontWeight.SemiBold, modifier = Modifier.clickable { vm.clearCart() }.padding(6.dp))
                if (onClose != null) Text("✕", color = Brand2, fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.clickable(onClick = onClose).padding(6.dp))
            }
            Spacer(Modifier.height(8.dp))
            if (priced == null || priced.lines.isEmpty()) {
                Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Text(s.emptyCart, color = Muted, fontSize = 14.sp, textAlign = TextAlign.Center)
                }
            } else {
                LazyColumn(Modifier.weight(1f)) {
                    itemsIndexed(priced.lines) { i, l ->
                        HorizontalDivider(color = Line)
                        Row(Modifier.padding(vertical = 8.dp), verticalAlignment = Alignment.Top) {
                            Column(Modifier.weight(1f)) {
                                Text(l.name + (l.variantName?.let { " — $it" } ?: ""), fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Ink)
                                if (l.options.isNotEmpty()) Text(l.options.joinToString(", ") { it.name }, color = Muted, fontSize = 12.sp)
                                if (l.line.note.isNotBlank()) Text("✎ " + l.line.note, color = Danger, fontSize = 12.sp, fontStyle = FontStyle.Italic)
                                Spacer(Modifier.height(6.dp))
                                QtyStepper(l.line.qty, onChange = { d -> vm.changeQty(i, d) })
                            }
                            Text(Pricing.money(l.lineTotal, lang), fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = Ink)
                        }
                    }
                }
                HorizontalDivider(color = Line)
                Spacer(Modifier.height(6.dp))
                TotalRow(s.subtotal, Pricing.money(priced.subtotal, lang))
                TotalRow(s.gst(menu.settings.taxGst), Pricing.money(priced.gst, lang))
                TotalRow(s.qst(menu.settings.taxQst), Pricing.money(priced.qst, lang))
                Row(Modifier.fillMaxWidth().padding(top = 4.dp)) {
                    Text(s.total, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = Ink, modifier = Modifier.weight(1f))
                    Text(Pricing.money(priced.total, lang), fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = Ink)
                }
            }
            Spacer(Modifier.height(10.dp))
            BigButton(s.review, enabled = vm.cart.isNotEmpty(), onClick = { onClose?.invoke(); vm.screen = Screen.Review; vm.touch() }, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
fun TotalRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 1.dp)) {
        Text(label, color = Muted, fontSize = 14.sp, modifier = Modifier.weight(1f))
        Text(value, color = Muted, fontSize = 14.sp)
    }
}


/** Default dish pictures ship inside the APK (assets/shared/dishes); anything else is loaded from the server. */
fun imageModel(image: String, serverUrl: String): String = when {
    image.startsWith("http") -> image
    image.startsWith("/shared/dishes/") -> "file:///android_asset" + image
    else -> serverUrl + image
}

/** The café logo: the admin's custom logo (from the server) when one is set, otherwise the bundled L'Artisan mark. */
@Composable
fun CafeLogo(logoUrl: String, serverUrl: String, modifier: Modifier = Modifier) {
    val fallback = painterResource(R.drawable.logo_mark)
    if (logoUrl.isBlank() || logoUrl == "/shared/logo-mark.png" || serverUrl.isBlank()) {
        Image(fallback, contentDescription = null, modifier = modifier, contentScale = ContentScale.Fit)
    } else {
        AsyncImage(
            model = imageModel(logoUrl, serverUrl), contentDescription = null, modifier = modifier, contentScale = ContentScale.Fit,
            placeholder = fallback, error = fallback,
        )
    }
}
