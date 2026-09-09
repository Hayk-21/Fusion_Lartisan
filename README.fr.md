# L'Artisan Café — Système de commande sur tablette

Système complet de prise de commande pour **Fusion L'Artisan** (crêperie & café, Montréal) :
les clients composent leur commande sur une tablette Android, la commande arrive instantanément
sur l'ordinateur du comptoir avec une alerte sonore, et l'administrateur gère le menu, les commandes
et les statistiques depuis un panneau web — **sans jamais toucher au code**.

Tout fonctionne **en local** sur le Wi-Fi du café. Aucun internet, aucun abonnement, aucun paiement en ligne
(le paiement se fait au comptoir).

```
   ┌────────────────┐        Wi-Fi du café         ┌──────────────────────────────┐
   │ Tablette 1     │ ───── commande ───────────▶  │  Laptop de l'admin           │
   │ (app Android)  │ ◀──── menu à jour ────────── │  ┌────────────────────────┐  │
   └────────────────┘                              │  │ Serveur L'Artisan      │  │
   ┌────────────────┐                              │  │ (Node.js + SQLite)     │  │
   │ Tablette 2     │ ───── commande ───────────▶  │  └───────────┬────────────┘  │
   └────────────────┘                              │              │               │
   ┌────────────────┐                              │  ┌───────────▼────────────┐  │
   │ Tablette N …   │                              │  │ Panneau d'admin (web)  │  │
   └────────────────┘                              │  │ http://localhost:3000  │  │
                                                   │  │ /admin  — PIN 2121     │  │
                                                   │  └────────────────────────┘  │
                                                   └──────────────────────────────┘
```

---

## Sommaire

| Document | Contenu |
|---|---|
| **[docs/INSTALLATION.md](docs/INSTALLATION.md)** | Installer et démarrer le serveur sur Windows (et macOS), pare-feu, démarrage automatique |
| **[docs/GUIDE_ADMIN.md](docs/GUIDE_ADMIN.md)** | Guide d'utilisation du panneau d'administration (mode café, menu, statistiques, réglages) |
| **[docs/TABLETTES.md](docs/TABLETTES.md)** | Compiler l'application Android, l'installer sur les tablettes, la configurer, mode kiosque |
| **[docs/MENU_DATA.md](docs/MENU_DATA.md)** | Comment le menu est structuré (catégories, articles, tailles, options), règles de prix, notes sur les prix importés |
| **[docs/API.md](docs/API.md)** | Référence technique de l'API REST / WebSocket et de la base de données |
| **[docs/IMPRIMANTE.md](docs/IMPRIMANTE.md)** | Imprimante à tickets Star TSP650 : installation, impression automatique |
| **[docs/SITE_WEB.md](docs/SITE_WEB.md)** | Site web public et commande en ligne : heures, créneaux de ramassage, pourboire, paiement au comptoir / Stripe, avis Google |
| **[docs/DEPLOIEMENT_RAILWAY.md](docs/DEPLOIEMENT_RAILWAY.md)** | Héberger le serveur en ligne sur Railway (Volume pour la base), connecter les tablettes et l'agent d'impression |
| **[docs/DEPANNAGE.md](docs/DEPANNAGE.md)** | Problèmes fréquents et solutions |

---

## Ce qui est inclus

```
lartisan-cafe/
├── README.md                     ← ce fichier
├── docs/                         ← documentation détaillée
├── server/                       ← serveur + panneau d'admin + version web de la tablette
│   ├── start-windows.bat         ← DOUBLE-CLIC pour démarrer (Windows)
│   ├── start-macos.command       ← double-clic pour démarrer (macOS)
│   ├── setup-firewall-windows.bat← à exécuter une fois en administrateur si les tablettes ne joignent pas le serveur
│   ├── src/                      ← code du serveur (Node.js, aucune dépendance native)
│   ├── public/admin/             ← panneau d'administration
│   ├── public/tablet/            ← version web du menu (secours sans application)
│   ├── data/menu.seed.json       ← menu initial (importé de vos PDF / images)
│   ├── data/lartisan.db          ← base de données (créée au premier lancement)
│   └── test/                     ← tests automatiques du moteur de prix
├── android-app/                  ← projet Android Studio (Kotlin + Jetpack Compose)
├── assets/                       ← logo extrait de votre charte, icône de l'app
└── tools/                        ← scripts utilitaires (génération du menu, synchro app)
```

---

## Démarrage rapide (5 minutes)

1. **Sur le laptop** : installez [Node.js LTS](https://nodejs.org) (version 22 ou plus), puis double-cliquez sur
   `server/start-windows.bat`. Le panneau s'ouvre sur <http://localhost:3000/admin> — **PIN : 2121**.
2. Onglet **Tablettes** : notez l'adresse affichée (ex. `http://192.168.1.20:3000`).
3. **Sur chaque tablette** : installez l'APK (voir [docs/TABLETTES.md](docs/TABLETTES.md)), ouvrez l'app,
   touchez **Détecter automatiquement** (ou tapez l'adresse), donnez un nom à la tablette (« Tablette 1 »), **Enregistrer**.
   > Sans l'application : ouvrez simplement l'adresse dans Chrome sur la tablette — c'est le même menu.
4. Dans le panneau, onglet **Commandes en direct** → **☕ Ouvrir le café**. Les commandes arrivent avec un carillon.

---

## Fonctionnement en un coup d'œil

### Côté client (tablette)
- Menu bilingue **FR / EN** (bouton en haut à droite), catégories en onglets, cartes d'articles, panier à droite — la mise en page reprend votre maquette HTML.
- Articles configurables : tailles (S/M/L, Simple/Double), formules (L'Essentiel / Le Gourmand), garnitures incluses/supplémentaires, suppléments, lait végétal, quantité, note pour la cuisine.
- Le prix se met à jour en direct. Écran **« Vérifiez votre commande »** avec sous-total, TPS, TVQ, total, prénom (facultatif), sur place / à emporter → **Confirmer**.
- Écran **« Merci ! »** avec un grand **numéro de commande** que le client donne au comptoir pour payer. Retour automatique au menu.
- Le menu est **stocké dans l'application** : elle démarre même sans serveur. Dès que l'admin enregistre une modification, le serveur envoie un signal et chaque tablette télécharge la nouvelle version.
- Un panier abandonné se vide après 5 minutes. Appui long sur le logo → PIN → réglages de la tablette.

### Côté admin (laptop)
- **Commandes en direct** (mode café) : colonnes *Nouvelles → En préparation → Prêtes*, carillon à chaque nouvelle commande (répété toutes les 20 s tant qu'une commande n'est pas prise en charge), détail complet, bouton **Terminer** qui fait disparaître la commande, annulation, plein écran.
- **Menu** : éditeur complet — catégories, articles, descriptions FR/EN, photos, badges, tailles/formules, groupes d'options avec inclus/suppléments, disponibilité en un clic, section « Spécial du jour » activable, import/export JSON, retour au menu d'origine. **Enregistrer** = envoi immédiat à toutes les tablettes.
- **Statistiques** : chiffre d'affaires, commandes, panier moyen, taxes, articles les plus vendus, ventes par heure/jour/catégorie, sur place vs à emporter, par tablette, export CSV.
- **Historique**, **Tablettes** (en ligne / hors ligne, version du menu), **Paramètres** (nom, taxes, son, PIN, numérotation, sauvegardes).

---

## Choix techniques (pourquoi c'est simple à faire vivre)

- **Node.js 22+ uniquement** — pas de compilation, pas de base de données à installer : SQLite est intégré à Node (`node:sqlite`). Deux dépendances (`express`, `ws`).
- **Zéro internet requis** en service : toutes les librairies (Chart.js, sons, logo) sont locales.
- **Une seule source de vérité pour les prix** : le serveur recalcule chaque commande à partir du menu courant (`server/src/pricing.js`) ; la tablette n'affiche qu'une estimation identique (`Pricing.kt`). Impossible de tricher ou d'avoir un prix périmé.
- **Base SQLite** dans `server/data/lartisan.db`, sauvegarde automatique chaque nuit (30 conservées), sauvegarde manuelle en un clic.
- **Découverte automatique** du serveur par les tablettes (UDP 47474) — aucune adresse IP à taper si le Wi-Fi le permet.
- Passage à **macOS** plus tard : même dossier `server/`, lancez `start-macos.command`. Rien d'autre à changer.

---

## Notes importantes

- **Prix** : lorsque vos documents se contredisaient, les **PDF / images ont eu priorité** sur le fichier HTML (votre choix). Les articles présents uniquement dans le HTML (crêpes signatures sucrées, Formule de l'Artisan 25,99 $, Eau Eska, thé maison) ont été ajoutés. Deux boissons de la carte « Boissons & Juices » n'ont **pas de prix** sur le PDF (Sunny Red, Pink Yuzu Fizz) : elles sont à 5,49 $ par défaut — **à vérifier dans l'éditeur de menu**. Détails dans [docs/MENU_DATA.md](docs/MENU_DATA.md).
- **APK** : l'environnement où ce projet a été produit ne pouvait pas télécharger le SDK Android ; le projet Android Studio est complet et vérifié syntaxiquement mais **l'APK doit être compilé sur votre ordinateur** (un clic dans Android Studio — procédure pas à pas dans [docs/TABLETTES.md](docs/TABLETTES.md)). En attendant, la **version web** du menu (même adresse que le serveur) fonctionne immédiatement sur n'importe quelle tablette.
- **PIN admin** : 2121 par défaut, modifiable dans Paramètres. Le PIN des réglages de la tablette est aussi 2121 (modifiable dans l'app).
- **Taxes** : TPS 5 % + TVQ 9,975 % calculées sur le sous-total (Québec). Modifiables dans Paramètres.

---

*Version 1.0.0 — septembre 2026.*
