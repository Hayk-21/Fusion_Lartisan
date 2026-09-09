package ca.lartisan.menu.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ca.lartisan.menu.ui.theme.*

/** Rounded "pill" toggle used for language switch and dine-in/take-out. */
@Composable
fun Pill(text: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier, big: Boolean = false) {
    Surface(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(if (big) 14.dp else 10.dp),
        color = if (selected) Brand else CardBg,
        border = BorderStroke(1.dp, if (selected) Brand else Line),
    ) {
        Text(
            text, color = if (selected) Color.White else Brand2, fontWeight = FontWeight.Bold,
            fontSize = if (big) 17.sp else 14.sp,
            modifier = Modifier.padding(horizontal = if (big) 22.dp else 12.dp, vertical = if (big) 14.dp else 8.dp),
        )
    }
}

/** Primary big button (brand colour). */
@Composable
fun BigButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, secondary: Boolean = false) {
    val bg = if (!enabled) Brand.copy(alpha = 0.4f) else if (secondary) CardBg else Brand
    Surface(
        modifier = modifier.clickable(enabled = enabled, onClick = onClick),
        shape = RoundedCornerShape(14.dp), color = bg,
        border = if (secondary) BorderStroke(1.dp, Line) else null,
    ) {
        Box(Modifier.padding(horizontal = 22.dp, vertical = 15.dp), contentAlignment = Alignment.Center) {
            Text(text, color = if (secondary) Brand2 else Color.White, fontWeight = FontWeight.Bold, fontSize = 17.sp)
        }
    }
}

/** − n + stepper. */
@Composable
fun QtyStepper(qty: Int, onChange: (Int) -> Unit, big: Boolean = false) {
    Row(
        Modifier.border(1.dp, Line, RoundedCornerShape(999.dp)).background(CardBg, RoundedCornerShape(999.dp)),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        StepBtn("−", big) { onChange(-1) }
        Text("$qty", fontWeight = FontWeight.ExtraBold, fontSize = if (big) 20.sp else 16.sp, modifier = Modifier.widthIn(min = if (big) 40.dp else 30.dp), textAlign = TextAlign.Center)
        StepBtn("+", big) { onChange(1) }
    }
}

@Composable
private fun StepBtn(t: String, big: Boolean, onClick: () -> Unit) {
    Box(
        Modifier.clickable(onClick = onClick).padding(horizontal = if (big) 18.dp else 12.dp, vertical = if (big) 8.dp else 4.dp),
        contentAlignment = Alignment.Center,
    ) { Text(t, fontSize = if (big) 24.sp else 18.sp, color = Brand2, fontWeight = FontWeight.Bold) }
}

/** Selectable option card with a checkbox / radio mark, like the HTML mock-up. */
@Composable
fun OptionCard(title: String, subtitle: String?, selected: Boolean, radio: Boolean, enabled: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier.clickable(enabled = enabled, onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        color = if (selected) Soft else CardBg,
        border = BorderStroke(if (selected) 2.dp else 1.dp, if (selected) Brand else Line),
    ) {
        Row(Modifier.padding(horizontal = 12.dp, vertical = 10.dp).alpha(if (enabled) 1f else 0.4f), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(22.dp).border(2.dp, Brand, if (radio) CircleShape else RoundedCornerShape(6.dp))
                    .background(if (selected) Brand else Color.Transparent, if (radio) CircleShape else RoundedCornerShape(6.dp)),
                contentAlignment = Alignment.Center,
            ) { if (selected) Text("✓", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold) }
            Spacer(Modifier.width(10.dp))
            Column {
                Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Ink)
                if (!subtitle.isNullOrBlank()) Text(subtitle, fontSize = 12.sp, color = Muted)
            }
        }
    }
}
