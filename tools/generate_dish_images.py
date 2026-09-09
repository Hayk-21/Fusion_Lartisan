#!/usr/bin/env python3
"""
Generates placeholder "example" pictures for every dish (server/public/shared/dishes/<item-id>.png)
and copies them into the Android app assets. The admin replaces them with real photos in the menu editor.

Each picture: warm gradient in the category colour + a large food emoji (Noto Color Emoji).
"""
import json, os, shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), "..")
SEED = os.path.join(ROOT, "server", "data", "menu.seed.json")
OUT = os.path.join(ROOT, "server", "public", "shared", "dishes")
APP_OUT = os.path.join(ROOT, "android-app", "app", "src", "main", "assets", "shared", "dishes")
FONT = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"

CAT_COLORS = {  # (top, bottom) gradient per category
    "du-jour": ((255, 236, 200), (240, 190, 120)),
    "galettes": ((246, 226, 200), (196, 140, 96)),
    "signatures-salees": ((236, 226, 206), (170, 120, 90)),
    "trilogie-salee": ((250, 224, 216), (196, 96, 96)),
    "formules-salees": ((240, 232, 214), (176, 132, 100)),
    "crepes": ((255, 230, 232), (222, 132, 150)),
    "signatures-sucrees": ((255, 226, 236), (190, 110, 140)),
    "formules-sucrees": ((255, 236, 220), (220, 150, 110)),
    "glaces": ((226, 240, 255), (150, 180, 220)),
    "boissons-chaudes": ((240, 226, 214), (150, 100, 80)),
    "boissons-froides": ((222, 246, 236), (100, 180, 150)),
}
DEFAULT_EMOJI = {
    "du-jour": "⭐", "galettes": "🥙", "signatures-salees": "🥙", "trilogie-salee": "❤️", "formules-salees": "🍽️",
    "crepes": "🥞", "signatures-sucrees": "🍓", "formules-sucrees": "🥞", "glaces": "🍨",
    "boissons-chaudes": "☕", "boissons-froides": "🥤",
}
ITEM_EMOJI = {
    "dj-oeuf-jardin": "🍳", "dj-gourmande-chef": "🍓", "dj-latte": "☕", "dj-iced-latte": "🧊", "dj-matcha": "🍵", "dj-cafe-filtre": "☕",
    "galette-composer": "🥙",
    "sig-foret-verte": "🌿", "sig-eveil-levant": "🥚", "sig-chevre-gourmand": "🧀", "sig-nordique": "🐟", "sig-cidre-vague": "🍤", "sig-tandoori": "🍗", "sig-smoked-meat": "🥩",
    "tri-amour-maman": "🍅", "tri-signature-pa": "🍗", "tri-festin-soeurs": "🍳",
    "form-lunch-pro": "🍽️", "form-etudiant": "🎓", "form-artisan-salee": "🍽️",
    "crepe-composer": "🥞",
    "ssig-acidule-boreal": "🍋", "ssig-erable-royal": "🍁", "ssig-elegance": "🍐", "ssig-emeraude-pistache": "🌰", "ssig-matcha-anko": "🍵", "ssig-estivale": "🍓",
    "stri-amour-maman": "🍎", "stri-signature-pa": "🍌", "stri-festin-soeurs": "🫐",
    "form-artisan-sucree": "🍫", "form-midi": "🍌", "form-express": "⏱️",
    "glace-composer": "🍨", "gsig-artisan-royal": "👑", "gsig-bueno-crush": "🍫", "gsig-oreo-cloud": "🍪", "gsig-mango-sunset": "🥭", "gsig-strawberry-bliss": "🍓", "gsig-banana-gold": "🍌", "gsig-pistachio-luxe": "🌰",
    "hot-espresso": "☕", "hot-americano": "☕", "hot-macchiato": "☕", "hot-flat-white": "☕", "hot-cortado": "☕", "hot-cafe-bonbon": "🍮", "hot-affogato": "🍨",
    "hot-cafe-filtre": "☕", "hot-cappuccino": "☕", "hot-latte": "🥛", "hot-latte-aromatise": "🌰", "hot-moccaccino": "🍫", "hot-latte-macchiato": "🥛", "hot-chocolat-chaud": "🍫",
    "hot-spanish-latte": "🥛", "hot-caramel-macchiato": "🍮", "hot-matcha-latte": "🍵", "hot-chai-latte": "🫖", "hot-golden-chai": "🍁", "hot-dirty-chai": "🫖", "hot-london-fog": "🫖", "hot-matcha-pistache": "🍵",
    "hot-latte-pistache": "🌰", "hot-moka-noir": "🍫", "hot-the-infusion": "🍵",
    "cold-the-vert-glace": "🧊", "cold-citronnade": "🍋", "cold-sunny-red": "🍊", "cold-pink-yuzu": "🐉", "cold-oranges-pressees": "🍊",
    "cold-virgin-mojito": "🌿", "cold-maracuja": "🍑", "cold-cosmo-bloom": "🌸", "cold-tropical-punch": "🍍",
    "cold-miss-red": "🍓", "cold-mango-island": "🥭", "cold-tropical-dream": "🥥", "cold-dragon-kiss": "🐉", "cold-eska": "💧",
}

W, H = 640, 400

def gradient(top, bottom):
    img = Image.new("RGB", (W, H), top)
    px = img.load()
    for y in range(H):
        t = y / (H - 1)
        c = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        for x in range(W):
            px[x, y] = c
    return img

def make(item_id, category, emoji):
    top, bottom = CAT_COLORS.get(category, ((240, 230, 220), (180, 140, 110)))
    img = gradient(top, bottom).convert("RGBA")
    # soft circle behind the emoji
    circ = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(circ)
    r = 150
    d.ellipse((W // 2 - r, H // 2 - r, W // 2 + r, H // 2 + r), fill=(255, 255, 255, 90))
    circ = circ.filter(ImageFilter.GaussianBlur(18))
    img = Image.alpha_composite(img, circ)
    # emoji (Noto Color Emoji is a bitmap font: must be rendered at 109 px then scaled)
    font = ImageFont.truetype(FONT, 109)
    e = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(e).text((10, 5), emoji, font=font, embedded_color=True)
    e = e.resize((300, 300), Image.LANCZOS)
    img.alpha_composite(e, (W // 2 - 150, H // 2 - 150))
    # subtle "example" corner label
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((W - 140, H - 38, W - 12, H - 12), radius=10, fill=(255, 255, 255, 140))
    d.text((W - 128, H - 33), "photo exemple", fill=(90, 70, 60, 255))
    return img.convert("RGB")

def main():
    menu = json.load(open(SEED, encoding="utf-8"))
    os.makedirs(OUT, exist_ok=True); os.makedirs(APP_OUT, exist_ok=True)
    for it in menu["items"]:
        emoji = ITEM_EMOJI.get(it["id"], DEFAULT_EMOJI.get(it["category_id"], "🍽️"))
        img = make(it["id"], it["category_id"], emoji)
        path = os.path.join(OUT, it["id"] + ".jpg")
        img.save(path, quality=82, optimize=True)
        shutil.copy(path, os.path.join(APP_OUT, it["id"] + ".jpg"))
    print(f"generated {len(menu['items'])} pictures in {OUT} and {APP_OUT}")

if __name__ == "__main__":
    main()
