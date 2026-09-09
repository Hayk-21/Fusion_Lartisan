#!/usr/bin/env python3
"""
Generates server/data/menu.seed.json — the initial L'Artisan menu.

Sources (priority when prices conflict, as decided with the owner):
  1. Fusion L'Artisan – Menu (English) PDF  (galettes, crêpes, formulas, signatures, trilogy)
  2. Hot-drinks image (Les boissons chaudes)
  3. Boissons & Juices PDF
  4. Milkshakes & Coupes glacées PDF
  5. Spécial du jour PDFs (FR + EN)
  6. HTML tablet mock-up (only for items missing from the PDFs: sweet signatures,
     sweet trilogy, Formule de l'Artisan 25,99 $, Eau Eska, Thé maison)

Run:  python3 tools/build_menu_seed.py
"""
import json, os

OUT = os.path.join(os.path.dirname(__file__), "..", "server", "data", "menu.seed.json")

def t(fr, en=None):
    return {"fr": fr, "en": en if en is not None else fr}

def opt(id, fr, en=None, price=0.0, section=None):
    o = {"id": id, "name": t(fr, en), "price": round(price, 2), "available": True}
    if section: o["section"] = section
    return o

def group(id, fr, en, options, type="multi", required=False, min=0, max=None,
          included=0, extra_price=0.0, hint=None):
    g = {"id": id, "name": t(fr, en), "type": type, "required": required,
         "min": min, "max": max, "included": included, "extra_price": round(extra_price, 2),
         "options": options}
    if hint: g["hint"] = hint
    return g

def variant(id, fr, en=None, price=0.0, included=None, desc=None):
    v = {"id": id, "name": t(fr, en), "price": round(price, 2)}
    if included: v["included"] = included
    if desc: v["description"] = desc
    return v

items = []
def item(id, cat, fr, en, price, desc=None, variants=None, groups=None, badge=None, sort=None):
    it = {"id": id, "category_id": cat, "name": t(fr, en), "image": f"/shared/dishes/{id}.jpg",
          "description": desc or t("", ""), "price": round(price, 2),
          "available": True, "sort": sort if sort is not None else len(items) + 1,
          "badge": badge, "variants": variants or [], "option_groups": groups or []}
    items.append(it)
    return it

categories = [
    {"id": "du-jour", "name": t("Spécial du jour", "Today's Special"), "icon": "⭐", "sort": 1, "visible": True,
     "description": t("Une création salée et une création sucrée, le temps d'une journée",
                      "One savory creation and one sweet creation, just for the day"), "daily_special": True},
    {"id": "galettes", "name": t("Galettes salées", "Savoury Galettes"), "icon": "🥙", "sort": 2, "visible": True,
     "description": t("Sarrasin bio, sans gluten — composez votre galette", "Organic buckwheat, gluten-free — build your galette")},
    {"id": "signatures-salees", "name": t("Signatures de l'Atelier", "Atelier Signatures"), "icon": "✨", "sort": 3, "visible": True,
     "description": t("Galettes bio & sans gluten, servies avec une petite salade du jour", "Organic & gluten-free galettes, served with a small salad of the day")},
    {"id": "trilogie-salee", "name": t("La Trilogie du Cœur", "The Trilogy of the Heart"), "icon": "❤️", "sort": 4, "visible": True,
     "description": t("Pour chaque crêpe vendue de cette trilogie, 1 $ est versé à une cause qui nous tient à cœur.",
                      "For every crêpe sold from this trilogy, $1 is donated to a cause close to our hearts.")},
    {"id": "formules-salees", "name": t("Formules salées", "Savoury Formulas"), "icon": "🍽️", "sort": 5, "visible": True,
     "description": t("Des formules combinées pour un repas complet", "Combo formulas for a complete meal")},
    {"id": "crepes", "name": t("Crêpes sucrées", "Sweet Crêpes"), "icon": "🍓", "sort": 6, "visible": True,
     "description": t("L'Artisan, c'est vous — composez votre crêpe sucrée", "L'Artisan is You — build your own sweet crêpe")},
    {"id": "signatures-sucrees", "name": t("Crêpes signatures", "Signature Crêpes"), "icon": "🌟", "sort": 7, "visible": True,
     "description": t("Nos créations sucrées, un voyage pour les papilles", "Our sweet creations, a journey for the taste buds")},
    {"id": "formules-sucrees", "name": t("Formules sucrées", "Sweet Formulas"), "icon": "🍨", "sort": 8, "visible": True,
     "description": t("Pour bien commencer la journée", "To start your day right")},
    {"id": "glaces", "name": t("Milkshakes & Coupes glacées", "Milkshakes & Ice Cream"), "icon": "🍦", "sort": 9, "visible": True,
     "description": t("À composer soi-même — crème Chantilly incluse", "Build your own — whipped cream included")},
    {"id": "boissons-chaudes", "name": t("Boissons chaudes", "Hot Drinks"), "icon": "☕", "sort": 10, "visible": True,
     "description": t("Café barista, thés & lattés", "Barista coffee, teas & lattes")},
    {"id": "boissons-froides", "name": t("Boissons & Jus", "Drinks & Juices"), "icon": "🥤", "sort": 11, "visible": True,
     "description": t("Fraîcheurs maison, cocktails sans alcool, smoothies", "House refreshers, mocktails, smoothies")},
]

# ---------------------------------------------------------------- Spécial du jour
item("dj-oeuf-jardin", "du-jour", "L'Œuf & Jardin", "The Egg & Garden", 15.99,
     t("Galette de sarrasin bio sans gluten, œuf miroir, fromage fondant, champignons de Paris poêlés, courgettes, épinards frais, tomates et graines de sésame grillées.",
       "Organic gluten-free buckwheat galette, sunny-side-up egg, melted cheese, pan-seared button mushrooms, zucchini, fresh spinach, tomatoes & toasted sesame seeds."),
     badge=t("Salée du jour", "Savory of the day"))
item("dj-gourmande-chef", "du-jour", "La Gourmande du Chef", "The Chef's Indulgence", 13.99,
     t("Crêpe de froment, Nutella®, banane, fraises fraîches et crème Chantilly. Offerte selon l'inspiration du chef, sur demande.",
       "Wheat crêpe, Nutella®, banana, fresh strawberries and whipped cream. Offered at the chef's inspiration, upon request."),
     badge=t("Sucrée du jour", "Sweet of the day"))
item("dj-latte", "du-jour", "Latte du jour", "Latte of the Day", 5.25,
     t("Vanille, caramel, pistache ou noisette, selon l'inspiration du jour.", "Vanilla, caramel, pistachio or hazelnut, depending on today's inspiration."))
item("dj-iced-latte", "du-jour", "Iced Latte du jour", "Iced Latte of the Day", 6.25,
     t("Espresso, lait froid et saveur du jour, servi sur glace.", "Espresso, cold milk and today's flavor, served over ice."))
item("dj-matcha", "du-jour", "Matcha du jour", "Matcha of the Day", 6.55,
     t("Matcha japonais, lait et saveur du jour : pistache, fraise ou vanille.", "Japanese matcha, milk and today's flavor: pistachio, strawberry or vanilla."))
item("dj-cafe-filtre", "du-jour", "Café filtre", "Filter Coffee", 3.25,
     t("Café fraîchement préparé, servi chaud.", "Freshly brewed coffee, served hot."))

# ---------------------------------------------------------------- Galettes (build your own)
galette_fillings = [
    # Cheeses
    opt("cheddar", "Cheddar", "Cheddar", 0, t("Fromages", "Cheeses")),
    opt("fromage-creme", "Fromage à la crème", "Cream cheese", 0, t("Fromages", "Cheeses")),
    opt("creme-fraiche", "Crème fraîche", "Crème fraîche", 0, t("Fromages", "Cheeses")),
    opt("emmental", "Emmental suisse", "Swiss Emmental", 2.49, t("Fromages", "Cheeses")),
    opt("chevre", "Fromage de chèvre", "Goat cheese", 2.49, t("Fromages", "Cheeses")),
    # Meats
    opt("jambon-poulet", "Jambon de poulet", "Chicken ham", 0, t("Viandes", "Meats")),
    opt("jambon-dinde", "Jambon de dinde", "Turkey ham", 0, t("Viandes", "Meats")),
    opt("jambon-dinde-fume", "Jambon de dinde fumé", "Smoked turkey ham", 0, t("Viandes", "Meats")),
    opt("oeuf", "Œuf — miroir ou brouillé", "Egg — sunny-side up or scrambled", 0, t("Viandes", "Meats")),
    opt("poulet-marine", "Poulet mariné", "Marinated chicken", 4.99, t("Viandes", "Meats")),
    opt("boeuf-hache", "Bœuf haché", "Ground beef", 4.00, t("Viandes", "Meats")),
    opt("saucisse", "Saucisse artisanale maison", "House-made artisan sausage", 4.50, t("Viandes", "Meats")),
    # Vegetables
    opt("champignons", "Champignons", "Mushrooms", 0, t("Légumes", "Vegetables")),
    opt("epinards", "Épinards frais", "Fresh spinach", 0, t("Légumes", "Vegetables")),
    opt("tomates", "Tomates fraîches", "Fresh tomatoes", 0, t("Légumes", "Vegetables")),
    opt("tomates-sechees", "Tomates séchées", "Sun-dried tomatoes", 0, t("Légumes", "Vegetables")),
    opt("courgettes", "Courgettes", "Zucchini", 0, t("Légumes", "Vegetables")),
    opt("aubergines", "Aubergines", "Eggplant", 0, t("Légumes", "Vegetables")),
    opt("poivrons", "Poivrons", "Bell peppers", 0, t("Légumes", "Vegetables")),
    opt("pommes-terre", "Pommes de terre", "Potatoes", 0, t("Légumes", "Vegetables")),
    opt("oignons-caramelises", "Oignons caramélisés", "Caramelized onions", 0, t("Légumes", "Vegetables")),
    opt("avocat", "Avocat", "Avocado", 2.49, t("Légumes", "Vegetables")),
    # Seafood
    opt("thon", "Thon", "Tuna", 4.49, t("Poissons", "Seafood")),
    opt("saumon-fume", "Saumon fumé", "Smoked salmon", 5.99, t("Poissons", "Seafood")),
    opt("crevettes", "Crevettes", "Shrimp", 5.99, t("Poissons", "Seafood")),
]
galette_sauces = [
    opt("bechamel", "Sauce béchamel", "Béchamel sauce", 1.55),
    opt("tomate", "Sauce tomate", "Tomato sauce", 1.55),
    opt("pesto", "Sauce pesto", "Pesto sauce", 1.55),
    opt("miel-moutarde", "Miel moutarde", "Honey mustard", 1.75),
    opt("sirop-erable", "Sirop d'érable pur", "Pure maple syrup", 1.75),
    opt("miel-bio", "Miel bio", "Organic honey", 1.75),
    opt("mayonnaise", "Mayonnaise", "Mayonnaise", 0.75),
    opt("moutarde", "Moutarde", "Mustard", 0.75),
    opt("sriracha", "Sriracha", "Sriracha", 0.75),
]
item("galette-composer", "galettes", "Composez votre galette", "Build your galette", 14.99,
     t("Galette de sarrasin bio, sans gluten. Servie avec notre salade maison et sa vinaigrette signature. Les garnitures au-delà de l'inclus s'ajoutent à +2,99 $.",
       "Organic buckwheat galette, gluten-free. Served with our house salad and signature vinaigrette. Fillings beyond the included ones are +$2.99 each."),
     variants=[
         variant("essentiel", "L'Essentiel", "The Essential", 14.99, {"garnitures": 3}, t("Base + 3 garnitures au choix", "Base + 3 fillings of your choice")),
         variant("gourmand", "Le Gourmand", "The Gourmet", 17.99, {"garnitures": 4}, t("Base + 4 garnitures au choix", "Base + 4 fillings")),
         variant("nature", "Base Nature", "Plain Base", 9.99, {"garnitures": 0}, t("Galette sarrasin bio, sans garniture", "Organic buckwheat galette, gluten-free, no filling")),
     ],
     groups=[
         group("garnitures", "Garnitures", "Fillings", galette_fillings, included=3, extra_price=2.99,
               hint=t("Garniture supplémentaire : +2,99 $. Certains ingrédients ont un supplément.", "Extra filling: +$2.99. Some ingredients carry a surcharge.")),
         group("sauces", "Sauces", "Sauces", galette_sauces, included=0, extra_price=0),
     ], badge=t("Sans gluten", "Gluten-free"))

# ---------------------------------------------------------------- Signatures salées
sig = [
    ("foret-verte", "La Forêt Verte", "The Green Forest", 18.99, t("VEGAN", "VEGAN"),
     t("Galette de sarrasin bio croustillante, houmous onctueux, tofu fumé mariné et doré, champignons sautés à l'ail, jeunes pousses d'épinards, sauce citron-tahini et graines de citrouille grillées.",
       "Crisp organic buckwheat galette, silky hummus, marinated smoked tofu golden-seared, garlic-sautéed mushrooms, baby spinach, lemon-tahini sauce and toasted pumpkin seeds.")),
    ("eveil-levant", "L'Éveil du Levant", "Dawn of the Levant", 18.99, None,
     t("Labneh, œuf mollet, salsa croquante de concombre, tomates cerises et menthe fraîche, parfumés au za'atar et à l'huile d'olive extra vierge.",
       "Labneh, soft-boiled egg, crisp cucumber salsa, cherry tomatoes and fresh mint, scented with za'atar and extra virgin olive oil.")),
    ("chevre-gourmand", "Le Chèvre Gourmand", "The Gourmet Goat Cheese", 20.99, None,
     t("Fromage de chèvre du Québec, jeunes épinards, noix, figues séchées marinées au miel bio et au romarin, filet de balsamique.",
       "Québec goat cheese, baby spinach, walnuts, dried figs marinated in organic honey and rosemary, a drizzle of balsamic.")),
    ("nordique", "La Nordique", "The Nordic", 22.99, None,
     t("Saumon fumé de l'Atlantique sur crème fraîche à l'aneth, câpres maison croustillantes et oignons rouges.",
       "Atlantic smoked salmon over dill-infused crème fraîche, crisp house capers and red onions.")),
    ("cidre-vague", "Le Cidre et la Vague", "Cider & the Wave", 22.99, None,
     t("Crevettes sautées à l'ail déglacées au vinaigre de cidre, fondue de poireaux et champignons, sauce crémeuse au persil.",
       "Garlic-sautéed shrimp deglazed with cider vinegar, leek and mushroom fondue, creamy parsley sauce.")),
    ("tandoori", "La Tandoori", "The Tandoori", 20.99, None,
     t("Poulet mariné aux épices tandoori, compotée d'oignons caramélisés, tomates fraîches et raïta concombre-coriandre à la menthe.",
       "Chicken marinated in tandoori spices, caramelized onion compote, fresh tomatoes and minted cucumber-coriander raita.")),
    ("smoked-meat", "La Smoked Meat", "The Smoked Meat", 21.99, None,
     t("Généreuses tranches de smoked meat, cheddar fondu, cornichons croquants et authentique moutarde de Montréal.",
       "Generous slices of smoked meat, melted cheddar, crisp pickles and authentic Montreal mustard.")),
]
for id, fr, en, p, badge, d in sig:
    item("sig-" + id, "signatures-salees", fr, en, p, d, badge=badge)

# ---------------------------------------------------------------- Trilogie du cœur (savoury, from PDF)
tri = [
    ("amour-maman", "L'Amour de Maman", "Mom's Love", 19.99,
     t("Galette de sarrasin bio, boulette de bœuf maison aux herbes, ratatouille mijotée, épinards frais et cheddar fondu.",
       "Organic buckwheat galette, house-made herbed beef meatball, slow-simmered ratatouille, fresh spinach and melted cheddar.")),
    ("signature-pa", "La Signature de Pa'", "Pa's Signature", 19.99,
     t("Galette de sarrasin bio, poulet effiloché, champignons de Paris à l'ail, jeunes épinards et crème d'Isigny au thym, cheddar fondu.",
       "Organic buckwheat galette, shredded chicken, garlic Paris mushrooms, baby spinach and thyme Isigny cream, all finished with melted cheddar.")),
    ("festin-soeurs", "Le Festin des Sœurs", "The Sisters' Feast", 19.99,
     t("Galette croustillante garnie de ratatouille maison, cheddar fondu, œuf miroir crémeux, fromage de chèvre et graines de citrouille grillées.",
       "Crisp galette topped with house ratatouille, melted cheddar, creamy sunny-side egg, goat cheese and toasted pumpkin seeds.")),
]
for id, fr, en, p, d in tri:
    item("tri-" + id, "trilogie-salee", fr, en, p, d, badge=t("1 $ reversé", "$1 donated"))

# ---------------------------------------------------------------- Formules salées
drink_incl = group("boisson", "Boisson incluse", "Included drink", [
    opt("cafe-filtre", "Café filtre (12 oz)", "Filter coffee (12 oz)"),
    opt("the", "Thé maison", "House tea"),
    opt("eska", "Eau Eska", "Eska water"),
], type="single", required=True, min=1, max=1)

item("form-lunch-pro", "formules-salees", "Formule Lunch Pro", "Lunch Pro Formula", 13.99,
     t("Un déjeuner savoureux et abordable pour égayer votre après-midi. 1 galette de sarrasin au choix + 1 boisson.",
       "A tasty, affordable lunch to brighten your afternoon. 1 buckwheat galette of your choice + 1 drink."),
     groups=[
         group("galette", "Choix de galette", "Galette choice", [
             opt("dinde-champ-cheddar", "Jambon de dinde, champignons, cheddar", "Turkey ham, mushrooms, cheddar"),
             opt("oeuf-champ-cheddar", "Œuf, champignons, cheddar (végétarienne)", "Egg, mushrooms, cheddar (vegetarian)"),
         ], type="single", required=True, min=1, max=1),
         drink_incl,
     ], badge=t("Populaire", "Popular"))
item("form-etudiant", "formules-salees", "Formule Étudiant", "Student Formula", 11.99,
     t("Sur présentation d'une carte étudiante valide — du lundi au vendredi, de 11 h à 15 h. 1 galette salée au choix + 1 boisson.",
       "Valid student ID required — Mon. to Fri., 11 am to 3 pm. 1 savoury galette of your choice + 1 drink."),
     groups=[
         group("galette", "Choix de galette", "Galette choice", [
             opt("dinde-cheddar", "Jambon de dinde, cheddar", "Turkey ham, cheddar"),
             opt("oeuf-cheddar", "Œuf, cheddar (végétarienne)", "Egg, cheddar (vegetarian)"),
         ], type="single", required=True, min=1, max=1),
         drink_incl,
     ])
item("form-artisan-salee", "formules-salees", "La Formule de l'Artisan", "The Artisan's Formula", 25.99,
     t("Une expérience gourmande complète : 1 galette salée + 1 crêpe sucrée + 1 boisson.",
       "A complete gourmet experience: 1 savoury galette + 1 sweet crêpe + 1 drink."),
     groups=[
         group("galette", "Votre galette", "Your galette", [
             opt("chakchouka", "La Chakchouka de l'Artisan (chakchouka maison mijotée, œufs, fromage fondant)", "L'Artisan Chakchouka (house shakshuka, eggs, melted cheese)"),
             opt("dinde-champ-cheddar", "Jambon de dinde, champignons, cheddar", "Turkey ham, mushrooms, cheddar"),
         ], type="single", required=True, min=1, max=1),
         group("crepe", "Votre crêpe sucrée", "Your sweet crêpe", [
             opt("nutella", "Nutella & crème fouettée", "Nutella & whipped cream"),
             opt("caramel", "Caramel au beurre salé & crème fouettée", "Salted butter caramel & whipped cream"),
         ], type="single", required=True, min=1, max=1),
         drink_incl,
     ])

# ---------------------------------------------------------------- Crêpes sucrées (build your own)
sweet_fillings = [
    opt("nutella", "Nutella", "Nutella", 0, t("Nappages", "Toppings")),
    opt("choc-noir", "Chocolat noir belge", "Belgian dark chocolate", 0, t("Nappages", "Toppings")),
    opt("choc-lait", "Chocolat au lait belge", "Belgian milk chocolate", 0, t("Nappages", "Toppings")),
    opt("choc-blanc", "Chocolat blanc", "White chocolate", 0, t("Nappages", "Toppings")),
    opt("caramel-bs", "Caramel au beurre salé", "Salted butter caramel", 0, t("Nappages", "Toppings")),
    opt("coulis-fr", "Coulis de fruits rouges", "Mixed berry coulis", 0, t("Nappages", "Toppings")),
    opt("biscoff", "Lotus Biscoff", "Lotus Biscoff", 0, t("Nappages", "Toppings")),
    opt("beurre-arachide", "Beurre d'arachide", "Peanut butter", 0, t("Nappages", "Toppings")),
    opt("beurre-amande", "Beurre d'amande", "Almond butter", 0, t("Nappages", "Toppings")),
    opt("sirop-erable", "Sirop d'érable", "Maple syrup", 0, t("Nappages", "Toppings")),
    opt("miel-bio", "Miel bio", "Organic honey", 0, t("Nappages", "Toppings")),
    opt("confiture-fraise", "Confiture de fraise", "Strawberry preserves", 0, t("Nappages", "Toppings")),
    opt("confiture-abricot", "Confiture d'abricot", "Apricot preserves", 0, t("Nappages", "Toppings")),
    opt("bananes", "Bananes", "Bananas", 0, t("Fruits", "Fruits")),
    opt("fraises", "Fraises", "Strawberries", 0, t("Fruits", "Fruits")),
    opt("pommes", "Pommes fraîches", "Fresh apples", 0, t("Fruits", "Fruits")),
    opt("pommes-caramel", "Pommes caramélisées", "Caramelized apples", 0, t("Fruits", "Fruits")),
    opt("ananas", "Ananas frais", "Fresh pineapple", 0, t("Fruits", "Fruits")),
    opt("bleuets", "Bleuets", "Blueberries", 0, t("Fruits", "Fruits")),
    opt("kiwis", "Kiwis", "Kiwis", 0, t("Fruits", "Fruits")),
    opt("mangues", "Mangues", "Mangoes", 0, t("Fruits", "Fruits")),
    opt("poires", "Poires", "Pears", 0, t("Fruits", "Fruits")),
    opt("amandes", "Amandes effilées grillées", "Toasted sliced almonds", 0, t("Finitions", "Finishes")),
    opt("noix", "Noix de Grenoble", "Walnuts", 0, t("Finitions", "Finishes")),
    opt("cacahuetes", "Cacahuètes concassées", "Crushed peanuts", 0, t("Finitions", "Finishes")),
    opt("coco", "Noix de coco râpée", "Shredded coconut", 0, t("Finitions", "Finishes")),
    opt("oreo", "Oreos écrasés", "Crushed Oreos", 0, t("Finitions", "Finishes")),
    opt("sucre-canne", "Sucre de canne bio", "Organic cane sugar", 0, t("Finitions", "Finishes")),
    opt("beurre", "Beurre", "Butter", 0, t("Finitions", "Finishes")),
]
item("crepe-composer", "crepes", "Composez votre crêpe", "Build your crêpe", 10.49,
     t("Notre pâte maison est élaborée à partir d'un mélange exclusif de deux farines, dont une farine bio naturellement sans gluten. Garniture supplémentaire : +2,49 $.",
       "Our house-made batter is crafted from an exclusive blend of two carefully selected flours, including a naturally gluten-free organic flour. Extra filling: +$2.49."),
     variants=[
         variant("essentiel", "L'Essentiel", "The Essential", 10.49, {"garnitures": 1}, t("Base au choix + 1 garniture", "Base of your choice + 1 filling")),
         variant("gourmand", "Le Gourmand", "The Gourmet", 12.99, {"garnitures": 2}, t("Base au choix + 2 garnitures", "Base of your choice + 2 fillings")),
     ],
     groups=[
         group("base", "Votre base", "Your base", [
             opt("froment", "Crêpe de froment traditionnelle", "Traditional wheat crêpe"),
             opt("sarrasin", "Crêpe de sarrasin bio (sans gluten)", "Organic buckwheat crêpe (gluten-free)"),
             opt("pancakes", "Duo de pancakes", "Duo of pancakes"),
             opt("gaufre", "Gaufre artisanale", "Artisan waffle", 2.49),
         ], type="single", required=True, min=1, max=1),
         group("garnitures", "Garnitures", "Fillings", sweet_fillings, included=1, extra_price=2.49,
               hint=t("Garniture supplémentaire : +2,49 $", "Extra filling: +$2.49")),
         group("premium", "Garnitures premium — crèmes signature", "Premium fillings — signature creams", [
             opt("pistache", "Crème de pistache", "Pistachio cream", 3.50),
             opt("marrons", "Crème de marrons", "Chestnut cream", 3.50),
             opt("praline", "Praliné noisette", "Hazelnut praline cream", 3.50),
             opt("speculoos", "Crème Spéculoos Biscoff", "Spéculoos Biscoff cream", 3.50),
         ], included=0),
         group("chantilly", "La Touche de l'Artisan", "The Artisan's Touch", [
             opt("chantilly", "Rosace de crème Chantilly (offerte)", "Whipped cream rosette (on request)"),
         ], type="multi", included=0),
     ])

# ---------------------------------------------------------------- Crêpes signatures (sucrées) — from HTML
ssig = [
    ("acidule-boreal", "L'Acidulé Boréal", "The Boreal Citrus", 14.99, t("Crémeux citron-lime, caramel au beurre salé, sablé citron & crumble amande.", "Lemon-lime cream, salted butter caramel, lemon shortbread & almond crumble.")),
    ("erable-royal", "L'Érable Royal", "The Royal Maple", 16.99, t("Beurre d'arachide salé, bananes, cacahuètes, filet de sirop d'érable pur.", "Salted peanut butter, bananas, peanuts, drizzle of pure maple syrup.")),
    ("elegance", "Élégance", "Elegance", 18.99, t("Poires pochées hibiscus, ganache chocolat noir, amandes torréfiées, caramel beurre salé, glace vanille.", "Hibiscus-poached pears, dark chocolate ganache, roasted almonds, salted butter caramel, vanilla ice cream.")),
    ("emeraude-pistache", "L'Émeraude de Pistache", "The Pistachio Emerald", 18.99, t("Crème de pistache fleur d'oranger, chocolat belge 55 %, kataifi croustillant, pistaches grillées, coulis framboise.", "Orange-blossom pistachio cream, 55% Belgian chocolate, crispy kataifi, roasted pistachios, raspberry coulis.")),
    ("matcha-anko", "Matcha-Anko — De Tokyo à Montréal", "Matcha-Anko — From Tokyo to Montréal", 17.99, t("Pâte d'anko, bananes, crème fouettée au matcha, amandes effilées, coulis de fruits rouges.", "Anko paste, bananas, matcha whipped cream, sliced almonds, mixed berry coulis.")),
    ("estivale", "L'Estivale", "The Summer Crêpe", 17.99, t("Fraises au basilic, bananes, glace vanille, caramel beurre salé, chantilly, coulis de fruits rouges, crumble breton.", "Basil strawberries, bananas, vanilla ice cream, salted butter caramel, whipped cream, mixed berry coulis, Breton crumble.")),
]
for id, fr, en, p, d in ssig:
    item("ssig-" + id, "signatures-sucrees", fr, en, p, d)
stri = [
    ("amour-maman", "L'Amour de Maman", "Mom's Love", t("Pommes rôties, mascarpone vanillée, noix de pécan et Grenoble, crumble spéculoos, caramel fleur de sel.", "Roasted apples, vanilla mascarpone, pecans and walnuts, spéculoos crumble, fleur de sel caramel.")),
    ("signature-pa", "Signature de Pa'", "Pa's Signature", t("Banane rôtie au lait de coco, caramel beurre salé, noix de Grenoble grillées, chantilly vanille, noix de coco toastée.", "Coconut-milk roasted banana, salted butter caramel, toasted walnuts, vanilla whipped cream, toasted coconut.")),
    ("festin-soeurs", "Le Festin des Sœurs", "The Sisters' Feast", t("Fraises & bleuets, mangue, miel bio, crème fouettée, pâte de pistache, crumble croustillant.", "Strawberries & blueberries, mango, organic honey, whipped cream, pistachio paste, crunchy crumble.")),
]
for id, fr, en, d in stri:
    item("stri-" + id, "signatures-sucrees", fr + " (sucrée)", en + " (sweet)", 18.99, d, badge=t("Trilogie du Cœur", "Trilogy of the Heart"))

# ---------------------------------------------------------------- Formules sucrées
item("form-artisan-sucree", "formules-sucrees", "Formule de l'Artisan", "The Artisan's Formula", 17.99,
     t("Notre création sucrée signature, servie avec un smoothie maison (fruits selon disponibilité).",
       "Our signature sweet creation, served with a house smoothie (fruit subject to availability)."),
     groups=[group("crepe", "Votre crêpe signature", "Your signature crêpe", [
         opt("choc-noisette", "L'Artisan Chocolat Noisette — ganache chocolat noir, banane rôtie, praliné noisette, chantilly vanille", "L'Artisan Chocolat Noisette — dark chocolate ganache, roasted banana, hazelnut praline, vanilla whipped cream"),
         opt("boreale", "La Boréale Fruité-Exotique — ananas rôti au miel, coulis mangue-passion, chantilly vanille, coco toastée", "La Boréale — honey-roasted pineapple, mango-passion coulis, vanilla whipped cream, toasted coconut"),
         opt("douceur-nordique", "La Douceur Nordique — pommes caramélisées à l'érable, chantilly vanille, pécan grillées", "La Douceur Nordique — maple-caramelized apples, vanilla whipped cream, toasted pecans"),
     ], type="single", required=True, min=1, max=1)], badge=t("Signature", "Signature"))
item("form-midi", "formules-sucrees", "Formule Midi", "Midday Formula", 14.99,
     t("La pause déjeuner qui fait du bien. Crêpe L'Indémodable — Nutella, bananes fraîches, fraises juteuses, couronnée de chantilly + 1 café ou thé (12 oz).",
       "The lunch break that does you good. Crêpe L'Indémodable — Nutella, fresh bananas, juicy strawberries, crowned with whipped cream + 1 coffee or tea (12 oz)."),
     groups=[group("boisson", "Boisson incluse", "Included drink", [
         opt("cafe-filtre", "Café filtre (12 oz)", "Filter coffee (12 oz)"),
         opt("the", "Thé maison", "House tea"),
     ], type="single", required=True, min=1, max=1)])
item("form-express", "formules-sucrees", "Formule Express — Grab & Go", "Express Formula — Grab & Go", 12.99,
     t("Pour les matins où chaque seconde compte. Crêpe signature aux fruits du jour + café filtre à emporter. Prête en moins de 3 minutes · Disponible jusqu'à 11 h.",
       "For mornings when every second counts. Signature crêpe with the fruit of the day + filter coffee to go. Ready in under 3 minutes · Available until 11 am."),
     groups=[group("fruit", "Fruit du jour (selon disponibilité)", "Fruit of the day (subject to availability)", [
         opt("nutella", "Nutella", "Nutella"), opt("fraise", "Fraise", "Strawberry"), opt("banane", "Banane", "Banana"),
     ], type="single", required=True, min=1, max=1)])

# ---------------------------------------------------------------- Milkshakes & coupes glacées
parfums = [opt(i, fr, en) for i, fr, en in [
    ("chocolat", "Crème glacée chocolat", "Chocolate ice cream"), ("vanille", "Crème glacée vanille", "Vanilla ice cream"),
    ("fraise", "Crème glacée à la fraise", "Strawberry ice cream"), ("banane", "Crème glacée à la banane", "Banana ice cream"),
    ("bleuet", "Crème glacée au bleuet", "Blueberry ice cream"), ("pistache", "Crème glacée à la pistache", "Pistachio ice cream"),
    ("caramel", "Crème glacée au caramel", "Caramel ice cream"), ("the-vert", "Crème glacée au thé vert", "Green tea ice cream"),
    ("erable", "Crème glacée à l'érable", "Maple ice cream")]]
toppings = [
    opt("nutella", "Nutella", "Nutella", 0, t("Nappages", "Sauces")),
    opt("caramel-bs", "Caramel beurre salé", "Salted butter caramel", 0, t("Nappages", "Sauces")),
    opt("choc-noir", "Chocolat noir intense", "Intense dark chocolate", 0, t("Nappages", "Sauces")),
    opt("choc-blanc", "Chocolat blanc onctueux", "Creamy white chocolate", 0, t("Nappages", "Sauces")),
    opt("choc-lait", "Chocolat au lait", "Milk chocolate", 0, t("Nappages", "Sauces")),
    opt("coulis-fr", "Coulis de fruits rouges", "Mixed berry coulis", 0, t("Nappages", "Sauces")),
    opt("creme-speculoos", "Crème de spéculoos", "Spéculoos cream", 0, t("Nappages", "Sauces")),
    opt("oreo", "Oreo concassés", "Crushed Oreo", 0, t("Gourmandises", "Treats")),
    opt("speculoos", "Spéculoos concassés", "Crushed spéculoos", 0, t("Gourmandises", "Treats")),
    opt("amandes", "Amandes effilées torréfiées", "Toasted sliced almonds", 0, t("Gourmandises", "Treats")),
    opt("bananes", "Bananes fraîches", "Fresh bananas", 0, t("Fruits", "Fruits")),
    opt("fraises", "Fraises fraîches", "Fresh strawberries", 0, t("Fruits", "Fruits")),
    opt("framboises", "Framboises", "Raspberries", 0, t("Fruits", "Fruits")),
    opt("pomme-caramel", "Pommes caramélisées", "Caramelized apples", 0, t("Fruits", "Fruits")),
]
item("glace-composer", "glaces", "Compose ton dessert glacé", "Build your frozen dessert", 8.99,
     t("Préparé à la commande, crème Chantilly incluse. Parfum supplémentaire : +2,50 $ · Topping supplémentaire : +2,00 $.",
       "Made to order, whipped cream included. Extra flavour: +$2.50 · Extra topping: +$2.00."),
     variants=[
         variant("milkshake", "Milkshake", "Milkshake", 8.99, {"parfums": 1, "toppings": 1}, t("1 parfum au choix + 1 topping au choix", "1 flavour + 1 topping of your choice")),
         variant("coupe", "Coupe glacée", "Ice cream cup", 7.99, {"parfums": 2, "toppings": 1}, t("2 boules au choix + 1 topping au choix", "2 scoops + 1 topping of your choice")),
     ],
     groups=[
         group("parfums", "Parfums — crèmes glacées & sorbets", "Flavours — ice creams & sorbets", parfums, required=True, min=1, included=1, extra_price=2.50),
         group("toppings", "Toppings", "Toppings", toppings, included=1, extra_price=2.00),
     ])
version_group = group("version", "Votre version", "Your version", [
    opt("coupe", "Coupe glacée", "Ice cream cup"), opt("milkshake", "Milkshake", "Milkshake")], type="single", required=True, min=1, max=1)
gsig = [
    ("artisan-royal", "L'Artisan Royal", t("Signature exclusive — introuvable ailleurs. Glace vanille bourbon, caramel beurre salé maison, crème spéculoos, crumble croustillant, chocolat noir intense, crème Chantilly.", "Exclusive signature. Bourbon vanilla ice cream, house salted butter caramel, spéculoos cream, crunchy crumble, intense dark chocolate, whipped cream."), t("Exclusif", "Exclusive")),
    ("bueno-crush", "Bueno Crush", t("Glace vanille, Nutella, Kinder Bueno croquant, crème Chantilly.", "Vanilla ice cream, Nutella, crunchy Kinder Bueno, whipped cream."), t("Best-seller", "Best-seller")),
    ("oreo-cloud", "Oreo Cloud", t("Glace vanille, chocolat au lait onctueux, Oreo concassés, crème Chantilly.", "Vanilla ice cream, milk chocolate sauce, crushed Oreos, whipped cream."), t("Best-seller", "Best-seller")),
    ("mango-sunset", "Mango Sunset", t("Sorbet mangue, coulis passion, mangue fraîche, crème Chantilly.", "Mango sorbet, passion fruit coulis, fresh mango, whipped cream."), t("Best-seller", "Best-seller")),
    ("strawberry-bliss", "Strawberry Bliss", t("Sorbet fraise, coulis de fruits rouges, fraises fraîches, crème Chantilly.", "Strawberry sorbet, mixed berry coulis, fresh strawberries, whipped cream."), None),
    ("banana-gold", "Banana Gold", t("Glace vanille, bananes fraîches, Nutella, caramel beurre salé, crème Chantilly.", "Vanilla ice cream, fresh bananas, Nutella, salted butter caramel, whipped cream."), None),
    ("pistachio-luxe", "Pistachio Luxe", t("Glace pistache, coulis de fruits rouges, spéculoos croquant, crème Chantilly.", "Pistachio ice cream, mixed berry coulis, crunchy spéculoos, whipped cream."), None),
]
for id, name, d, badge in gsig:
    item("gsig-" + id, "glaces", name, name, 12.99, d, groups=[version_group], badge=badge)

# ---------------------------------------------------------------- Boissons chaudes (hot-drinks image)
milk_group = group("lait", "Lait végétal", "Plant milk", [
    opt("avoine", "Lait d'avoine", "Oat milk", 0.75), opt("amande", "Lait d'amande", "Almond milk", 0.75)], type="single")
def sd(id, fr, en, s, d=None):
    vs = [variant("single", "Simple", "Single", s)]
    if d is not None: vs.append(variant("double", "Double", "Double", d))
    item("hot-" + id, "boissons-chaudes", fr, en, s, variants=vs if d is not None else [])
sd("espresso", "Espresso", "Espresso", 3.00, 3.50)
sd("americano", "Americano", "Americano", 3.95, 4.25)
sd("macchiato", "Macchiato", "Macchiato", 3.75, 4.25)
sd("flat-white", "Flat White", "Flat White", 4.75, 5.55)
sd("cortado", "Cortado", "Cortado", 4.25, 4.75)
sd("cafe-bonbon", "Café Bonbon", "Café Bonbon", 5.00)
sd("affogato", "Affogato", "Affogato", 6.55)
def sml(id, fr, en, s, m, l, milk=True):
    item("hot-" + id, "boissons-chaudes", fr, en, s,
         variants=[variant("s", "Petit (S)", "Small (S)", s), variant("m", "Moyen (M)", "Medium (M)", m), variant("l", "Grand (L)", "Large (L)", l)],
         groups=[milk_group] if milk else [])
sml("cafe-filtre", "Café filtre", "Filtered coffee", 2.55, 2.95, 3.45, milk=False)
sml("cappuccino", "Cappuccino", "Cappuccino", 4.75, 5.25, 5.75)
sml("latte", "Latté", "Latte", 4.75, 5.25, 5.75)
item("hot-latte-aromatise", "boissons-chaudes", "Latté aromatisé", "Flavoured latte", 5.45,
     t("Vanille, noisette ou caramel", "Vanilla, hazelnut or caramel"),
     variants=[variant("s", "Petit (S)", "Small (S)", 5.45), variant("m", "Moyen (M)", "Medium (M)", 5.95), variant("l", "Grand (L)", "Large (L)", 6.45)],
     groups=[group("saveur", "Saveur", "Flavour", [opt("vanille", "Vanille", "Vanilla"), opt("noisette", "Noisette", "Hazelnut"), opt("caramel", "Caramel", "Caramel")],
                   type="single", required=True, min=1, max=1), milk_group])
sml("moccaccino", "Moccaccino", "Moccaccino", 5.45, 5.95, 6.45)
sml("latte-macchiato", "Latté Macchiato", "Latte Macchiato", 5.45, 5.95, 6.45)
sml("chocolat-chaud", "Chocolat chaud (vanille)", "Hot chocolate (vanilla)", 4.25, 4.59, 5.00)
sml("spanish-latte", "Spanish Latté", "Spanish Latte", 5.25, 6.25, 6.95)
sml("caramel-macchiato", "Caramel Macchiato", "Caramel Macchiato", 5.30, 6.35, 7.09)
sml("matcha-latte", "Matcha Latté", "Matcha Latte", 5.40, 5.95, 6.55)
sml("chai-latte", "Chaï Latté", "Chai Latte", 5.35, 5.95, 6.45)
sml("golden-chai", "Golden Chaï Latté à l'érable", "Golden Maple Chai Latte", 6.05, 7.05, 7.59)
sml("dirty-chai", "Dirty Chaï", "Dirty Chai", 5.95, 6.95, 8.05)
sml("london-fog", "London Fog", "London Fog", 5.05, 5.55, 6.05)
sml("matcha-pistache", "Matcha à la pistache", "Pistachio Matcha", 5.65, 6.25, 6.85)
item("hot-latte-pistache", "boissons-chaudes", "Latté pistache maison", "House pistachio latte", 6.25, groups=[milk_group])
item("hot-moka-noir", "boissons-chaudes", "Moka chocolat noir maison", "House dark chocolate mocha", 6.25, groups=[milk_group])
item("hot-the-infusion", "boissons-chaudes", "Thé / Infusion", "Tea / Infusion", 3.50,
     groups=[group("the", "Votre thé", "Your tea", [opt("menthe", "Menthe", "Mint"), opt("jasmin", "Jasmin", "Jasmine"),
             opt("camomille", "Camomille", "Chamomile"), opt("the-vert", "Thé vert", "Green tea")], type="single", required=True, min=1, max=1)])

# ---------------------------------------------------------------- Boissons froides & jus
flav = group("saveur", "Choisis ta saveur", "Choose your flavour", [
    opt("original", "Original", "Original"), opt("passion", "Passion", "Passion fruit"), opt("peche", "Pêche", "Peach"),
    opt("hibiscus", "Hibiscus", "Hibiscus"), opt("fraise", "Fraise", "Strawberry")], type="single", required=True, min=1, max=1)
item("cold-the-vert-glace", "boissons-froides", "Thé vert glacé maison — 36 cl", "House iced green tea — 36 cl", 5.49,
     t("Citron vert, menthe fraîche, cassonade", "Lime, fresh mint, brown sugar"), groups=[flav])
item("cold-citronnade", "boissons-froides", "Citronnade maison — 36 cl", "House lemonade — 36 cl", 5.49,
     t("Citron jaune pressé, citron vert, eau minérale, menthe fraîche, cassonade", "Pressed lemon, lime, mineral water, fresh mint, brown sugar"))
item("cold-sunny-red", "boissons-froides", "Sunny Red — 36 cl", "Sunny Red — 36 cl", 5.49,
     t("Jus d'orange, jus d'ananas, sirop de grenadine", "Orange juice, pineapple juice, grenadine syrup"))
item("cold-pink-yuzu", "boissons-froides", "Pink Yuzu Fizz — 36 cl", "Pink Yuzu Fizz — 36 cl", 5.49,
     t("Citron jaune pressé, yuzu, fruit du dragon, eau pétillante, citron vert et menthe fraîche", "Pressed lemon, yuzu, dragon fruit, sparkling water, lime and fresh mint"))
item("cold-oranges-pressees", "boissons-froides", "Oranges pressées — 36 cl", "Fresh-squeezed orange juice — 36 cl", 6.49,
     t("Jus frais pressé sur place", "Squeezed fresh on site"))
item("cold-virgin-mojito", "boissons-froides", "Virgin Mojito — 40 cl", "Virgin Mojito — 40 cl", 7.95,
     t("Citron vert pressé, menthe fraîche, cassonade, eau pétillante", "Pressed lime, fresh mint, brown sugar, sparkling water"), groups=[flav], badge=t("Sans alcool", "Alcohol-free"))
item("cold-maracuja", "boissons-froides", "Virgin Maracuja Dream — 30 cl", "Virgin Maracuja Dream — 30 cl", 7.95,
     t("Passion, pêche, vanille, eau pétillante", "Passion fruit, peach, vanilla, sparkling water"), badge=t("Sans alcool", "Alcohol-free"))
item("cold-cosmo-bloom", "boissons-froides", "Virgin Cosmo Bloom — 30 cl", "Virgin Cosmo Bloom — 30 cl", 7.95,
     t("Fleur de sakura, pamplemousse, fruit du dragon", "Sakura blossom, grapefruit, dragon fruit"), badge=t("Sans alcool", "Alcohol-free"))
item("cold-tropical-punch", "boissons-froides", "Virgin Tropical Punch — 30 cl", "Virgin Tropical Punch — 30 cl", 7.95,
     t("Ananas, baie de passion, grenade, hibiscus", "Pineapple, passion fruit, pomegranate, hibiscus"), badge=t("Sans alcool", "Alcohol-free"))
item("cold-miss-red", "boissons-froides", "Smoothie Miss Red — 30 cl", "Miss Red Smoothie — 30 cl", 7.49, t("Fraise · Banane · Orange", "Strawberry · Banana · Orange"))
item("cold-mango-island", "boissons-froides", "Smoothie Mango Island — 30 cl", "Mango Island Smoothie — 30 cl", 7.49, t("Mangue · Ananas · Vanille", "Mango · Pineapple · Vanilla"))
item("cold-tropical-dream", "boissons-froides", "Smoothie Tropical Dream — 30 cl", "Tropical Dream Smoothie — 30 cl", 7.95, t("Passion · Mangue · Coco", "Passion fruit · Mango · Coconut"))
item("cold-dragon-kiss", "boissons-froides", "Smoothie Dragon Kiss — 30 cl", "Dragon Kiss Smoothie — 30 cl", 7.49, t("Framboise · Fruit du dragon · Citron pressé", "Raspberry · Dragon fruit · Pressed lemon"))
item("cold-eska", "boissons-froides", "Eau Eska", "Eska water", 2.50)

menu = {"version": 1, "seed_version": 2, "currency": "CAD", "categories": categories, "items": items}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(menu, f, ensure_ascii=False, indent=2)
print(f"wrote {OUT}: {len(categories)} categories, {len(items)} items")
