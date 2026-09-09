# Le menu : structure, règles de prix et provenance des données

## 1. Sources utilisées et priorités

Le menu initial (`server/data/menu.seed.json`, généré par `tools/build_menu_seed.py`) a été construit à partir de vos fichiers.
Quand deux sources se contredisaient, **les PDF et images ont eu priorité sur le fichier HTML** (décision prise avec vous).

| Section du menu | Source principale | Remarques |
|---|---|---|
| Spécial du jour | `menufr2_10.pdf` / `menuen2_10.pdf` | Salée du jour 15,99 $, Sucrée du jour 13,99 $, latte/iced latte/matcha du jour, café filtre 3,25 $. Catégorie marquée « du jour » : modifiez-la chaque jour ou masquez-la. |
| Galettes salées (à composer) | Menu anglais p.4 | L'Essentiel 14,99 $ (3 garnitures), Le Gourmand 17,99 $ (4), Base nature 9,99 $, extra +2,99 $. Suppléments : Emmental/chèvre +2,49, poulet mariné +4,99, bœuf +4,00, saucisse +4,50, avocat +2,49, thon +4,49, saumon/crevettes +5,99, sauces 0,75–1,75 $. *(HTML : 15,95 / 19,95 / 9,95 — non retenus.)* |
| Signatures de l'Atelier | Menu anglais p.6 | 7 galettes 18,99–22,99 $ (descriptions FR traduites depuis l'anglais). |
| Trilogie du Cœur (salée) | Menu anglais p.7 | 3 × 19,99 $, mention « 1 $ reversé ». |
| Formules salées | Menu anglais p.5 + HTML | Lunch Pro 13,99 $, Étudiant 11,99 $ *(HTML : 15,99 / 12,99 — non retenus)*, Formule de l'Artisan 25,99 $ (HTML uniquement). Boisson incluse au choix (café filtre / thé / Eska). |
| Crêpes sucrées (à composer) | Menu anglais p.2 | L'Essentiel 10,49 $ (1 garniture), Le Gourmand 12,99 $ (2), extra +2,49 $, gaufre +2,49 $, crêpe de sarrasin sans supplément *(HTML : +1,49 — non retenu)*, crèmes premium +3,50 $ *(HTML : 4,50 — non retenu)*. |
| Crêpes signatures sucrées + Trilogie sucrée | HTML uniquement | L'Acidulé Boréal 14,99 … L'Estivale 17,99 ; Trilogie sucrée 3 × 18,99 $. Nommées « (sucrée) » pour ne pas confondre avec la trilogie salée. |
| Formules sucrées | Menu anglais p.3 | Formule de l'Artisan 17,99 $ (choix parmi 3 crêpes signature, listées dans le HTML), Formule Midi 14,99 $, Express 12,99 $. |
| Milkshakes & coupes glacées | PDF Milkshakes | Milkshake 8,99 $ (1 parfum + 1 topping), Coupe 7,99 $ (2 boules + 1 topping), parfum suppl. +2,50 $, topping suppl. +2,00 $. 7 signatures à 12,99 $ (coupe ou milkshake). |
| Boissons chaudes | Image « Les boissons chaudes » | Liste détaillée Simple/Double et S/M/L (espresso 3,00/3,50 … matcha pistache 5,65/6,25/6,85, thé/infusion 3,50). Ajoutés depuis le PDF barista : latte pistache maison 6,25 $, moka chocolat noir 6,25 $, lait végétal +0,75 $. *(Le PDF barista donnait des prix « résumés » différents — espresso 3,25/3,50, latte 5,50 : non retenus car la carte détaillée est plus complète.)* |
| Boissons & jus | PDF Boissons & Juices | Thé vert glacé 5,49 $ (5 saveurs), citronnade 5,49 $, oranges pressées 6,49 $, virgin cocktails 7,95 $, smoothies 7,49–7,95 $. **Sunny Red et Pink Yuzu Fizz n'ont pas de prix sur le PDF → 5,49 $ par défaut, à vérifier.** Eau Eska 2,50 $ (HTML). |

Tout est modifiable dans l'éditeur du panneau d'administration ; ce tableau sert seulement à savoir d'où viennent les chiffres.

## 2. Structure du menu (JSON)

```jsonc
{
  "version": 3,                       // incrémenté à chaque enregistrement ; les tablettes comparent ce numéro
  "currency": "CAD",
  "categories": [
    { "id": "galettes", "name": {"fr": "Galettes salées", "en": "Savoury Galettes"},
      "description": {"fr": "…", "en": "…"}, "icon": "🥙", "sort": 2, "visible": true, "daily_special": false }
  ],
  "items": [
    { "id": "galette-composer", "category_id": "galettes", "sort": 1, "available": true,
      "name": {"fr": "Composez votre galette", "en": "Build your galette"},
      "description": {"fr": "…", "en": "…"},
      "price": 14.99,                                       // utilisé seulement s'il n'y a pas de variantes
      "badge": {"fr": "Sans gluten", "en": "Gluten-free"},  // ou null
      "image": "/uploads/1725-galette.jpg",                 // facultatif
      "variants": [                                         // tailles / formules — le client doit en choisir une
        { "id": "essentiel", "name": {"fr": "L'Essentiel", "en": "L'Essentiel"}, "price": 14.99,
          "description": {"fr": "Base + 3 garnitures", "en": "Base + 3 fillings"},
          "included": { "garnitures": 3 } }                 // remplace group.included pour cette variante
      ],
      "option_groups": [
        { "id": "garnitures", "name": {"fr": "Garnitures", "en": "Fillings"},
          "type": "multi",            // "single" = un seul choix (radio), "multi" = plusieurs (cases)
          "required": false, "min": 0, "max": null,
          "included": 3,              // choix gratuits
          "extra_price": 2.99,        // prix de chaque choix au-delà de l'inclus
          "hint": {"fr": "…", "en": "…"},
          "options": [
            { "id": "cheddar", "name": {"fr": "Cheddar", "en": "Cheddar"}, "price": 0, "available": true,
              "section": {"fr": "Fromages", "en": "Cheeses"} },
            { "id": "saumon-fume", "name": {"fr": "Saumon fumé", "en": "Smoked salmon"}, "price": 5.99 }
          ] }
      ] }
  ]
}
```

## 3. Règles de prix (appliquées à l'identique par le serveur, la version web et l'app)

1. **Prix de base** = prix de la variante choisie, sinon `price` de l'article.
2. Pour chaque groupe d'options :
   - `inclus` = `variant.included[group]` si défini, sinon `group.included` ;
   - les choix sont comptés dans l'ordre où le client les coche ; les choix au-delà de `inclus` coûtent `extra_price` chacun ;
   - chaque option cochée ajoute **en plus** son propre `price` (supplément).
3. **Total de ligne** = (base + options) × quantité, arrondi au cent.
4. **Sous-total** = somme des lignes ; **TPS** = sous-total × 5 % ; **TVQ** = sous-total × 9,975 % ; **Total** = sous-total + TPS + TVQ.

Exemple : galette *L'Essentiel* 14,99 $ avec cheddar, jambon de dinde, champignons, saumon fumé et sauce pesto
→ 14,99 + (4ᵉ garniture : 2,99 extra + 5,99 supplément saumon) + pesto 1,55 = **25,52 $**.

Ces règles sont couvertes par des tests automatiques : `cd server && npm test`.

## 4. Modélisations courantes

| Besoin | Comment le faire dans l'éditeur |
|---|---|
| Café en 3 tailles | 3 variantes S/M/L avec leur prix ; groupe *Lait végétal* (un seul choix, non obligatoire, options +0,75 $) |
| Espresso simple / double | 2 variantes Simple / Double |
| Thé avec choix de parfum | Groupe *Votre thé* : un seul choix, **obligatoire** |
| Galette « 3 garnitures incluses, +2,99 $ ensuite » | Groupe multi, `inclus = 3`, `prix extra = 2,99` ; suppléments par option |
| Formule « L'Essentiel = 3 incluses, Le Gourmand = 4 » | Deux variantes ; sur chacune, « Choix inclus pour Garnitures » = 3 et 4 |
| Formule avec boisson incluse | Groupe *Boisson incluse* : un seul choix, obligatoire, options à 0 $ |
| Sauce toujours payante | Groupe *Sauces* : `inclus = 0`, `prix extra = 0`, prix sur chaque option |
| Milkshake 1 parfum / Coupe 2 boules | Deux variantes avec « Choix inclus pour Parfums » = 1 et 2 ; `prix extra` du groupe = 2,50 |
| Article en rupture | Décochez *Disponible* (ou *Dispo* sur une seule option, ex. « fraises » en hiver) |
| Section saisonnière | Décochez *Visible sur les tablettes* sur la catégorie |
| Spécial du jour | Modifiez les articles de la catégorie ⭐ chaque matin, puis *Enregistrer* |

## 5. Photos

Chaque article du menu d'origine a une **photo exemple** générée (`server/public/shared/dishes/<id>.jpg`, aussi embarquée dans l'app). Remplacez-les par de vraies photos dans l'éditeur (📷 Choisir une photo). `python3 tools/generate_dish_images.py` regénère les exemples.

## 6. Regénérer le menu d'origine

`python3 tools/build_menu_seed.py` réécrit `server/data/menu.seed.json`. Le serveur l'utilise au **premier démarrage** (base vide), via *Menu ⋯ → Rétablir le menu d'origine*, et **automatiquement** lorsqu'une nouvelle version du menu d'origine est livrée (`seed_version`) tant que l'admin n'a jamais enregistré de modification.
