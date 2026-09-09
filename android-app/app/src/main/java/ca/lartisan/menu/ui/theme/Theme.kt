package ca.lartisan.menu.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

// Palette copied from the reference HTML menu (Fusion L'Artisan — Menu Tablette)
val Bg = Color(0xFFFFFAF4)
val CardBg = Color(0xFFFFFFFF)
val Ink = Color(0xFF2D2A28)
val Muted = Color(0xFF6B625C)
val Brand = Color(0xFFA05A4A)
val Brand2 = Color(0xFF7A473A)
val Line = Color(0xFFEADFD9)
val Soft = Color(0xFFFFF6EE)
val Ok = Color(0xFF1F8A5B)
val Warn = Color(0xFFC98A1B)
val Danger = Color(0xFFC0392B)

private val scheme = lightColorScheme(
    primary = Brand,
    onPrimary = Color.White,
    primaryContainer = Soft,
    onPrimaryContainer = Brand2,
    secondary = Brand2,
    onSecondary = Color.White,
    background = Bg,
    onBackground = Ink,
    surface = CardBg,
    onSurface = Ink,
    surfaceVariant = Soft,
    onSurfaceVariant = Muted,
    outline = Line,
    error = Danger,
)

@Composable
fun LArtisanTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = scheme,
        shapes = Shapes(small = RoundedCornerShape(10.dp), medium = RoundedCornerShape(14.dp), large = RoundedCornerShape(20.dp)),
        content = content,
    )
}
