# Tablettes Android — compiler, installer, configurer

Le dossier `android-app/` est un projet **Android Studio** complet (Kotlin + Jetpack Compose, Android 7.0+ / API 24).
Le menu est **embarqué dans l'application** (`app/src/main/assets/menu.json`) puis tenu à jour automatiquement par le serveur.

> Pourquoi l'APK n'est-il pas fourni déjà compilé ? L'environnement dans lequel ce projet a été produit n'avait pas accès aux
> serveurs de Google (SDK Android / Maven). Le projet est complet et vérifié syntaxiquement ; la compilation se fait en un clic
> sur votre ordinateur. En attendant, la **version web** (section 5) fonctionne tout de suite.

---

## 1. Compiler l'APK (une fois, sur n'importe quel ordinateur)

1. Installez **Android Studio** (<https://developer.android.com/studio>) — version Koala (2024.1) ou plus récente, avec les composants par défaut.
2. *File → Open…* → sélectionnez le dossier **`android-app`** → *OK*. Laissez Gradle synchroniser (première fois : quelques minutes, il télécharge le SDK 34 et les librairies). Si Android Studio propose d'installer *Android SDK Platform 34* ou *Build-Tools 34*, acceptez.
3. **Build → Generate Signed App Bundle / APK… → APK → Next.**
   - *Key store path* → **Create new…** : choisissez un fichier (ex. `lartisan-release.jks`), un mot de passe, un alias (`lartisan`), remplissez au moins le nom. **Conservez ce fichier et le mot de passe** : ils serviront pour toutes les mises à jour futures de l'app.
   - *Next* → *release* → **Create**.
4. L'APK est dans `android-app/app/release/app-release.apk` (un lien « locate » apparaît en bas à droite).

Alternative rapide pour tester : **Build → Build Bundle(s) / APK(s) → Build APK(s)** produit `app/build/outputs/apk/debug/app-debug.apk` (signé avec la clé de debug, parfaitement installable sur vos tablettes).

En ligne de commande (après une première ouverture dans Android Studio, ou avec `ANDROID_HOME` défini) :
```
cd android-app
gradlew.bat assembleDebug        (Windows)
./gradlew assembleDebug          (macOS)
```

## 2. Installer sur les tablettes depuis le panneau (recommandé)

1. Compilez l'APK une fois (section 1). Le fichier est `android-app/app/build/outputs/apk/debug/app-debug.apk`.
2. Panneau d'administration → **Tablettes** → carte **📲 Application tablette** → **Téléverser un APK** → choisissez ce fichier, indiquez le numéro de version. Il est conservé sur le serveur (volume de données).
3. Sur chaque tablette ou téléphone : ouvrez Chrome à l'adresse `https://VOTRE-SERVEUR/app` (ou scannez le code QR affiché dans le panneau) → **Installer l'application** → ouvrez le fichier téléchargé → autorisez l'installation depuis Chrome si demandé → Installer.
4. L'application démarre directement sur le menu : depuis la version 1.3.1 elle connaît l'adresse du serveur en ligne. Le nom de la tablette est « Tablette <modèle> » ; changez-le si vous voulez (appui long sur le logo → PIN).

Pour une mise à jour : téléversez le nouvel APK dans le panneau, puis réinstallez-le sur les tablettes depuis la même page (les réglages sont conservés).

## 2 bis. Installer sur les tablettes (installation manuelle, câble USB)

**Méthode A — par fichier (la plus simple)**
1. Copiez `app-release.apk` sur la tablette (câble USB, Google Drive, e-mail à soi-même, ou clé USB avec adaptateur).
2. Ouvrez le fichier depuis l'app *Fichiers*. Android demande d'autoriser l'installation d'apps de « sources inconnues » pour cette app → *Autoriser* → *Installer*.

**Méthode B — par câble avec ADB**
1. Sur la tablette : *Paramètres → À propos → touchez 7 fois « Numéro de build »* → puis *Options pour les développeurs → Débogage USB*.
2. Branchez la tablette, acceptez l'empreinte, puis : `adb install -r app-release.apk`.

Pour mettre à jour l'app plus tard, réinstallez le nouvel APK par-dessus (même clé de signature) : les réglages sont conservés.

## 3. Première configuration de l'app

Au premier lancement, l'écran **« Connexion au comptoir »** apparaît :

1. **Serveur en ligne (Railway)** : tapez simplement l'adresse du site, ex. `lartisan-production.up.railway.app` (l'app ajoute `https://`). La tablette a seulement besoin d'Internet (Wi-Fi du café ou autre).
   **Serveur local (sur le laptop)** : la tablette doit être sur le **même Wi-Fi** ; touchez **📡 Détecter automatiquement** (le serveur répond avec son adresse en ≈ 2 s) ou tapez l'adresse affichée dans le panneau *Tablettes*, ex. `192.168.1.20:3000`.
2. L'adresse à utiliser est toujours affichée dans le panneau d'administration → **Tablettes**.
3. **Tester la connexion** → « Connecté ».
4. Donnez un **nom à la tablette** (« Tablette 1 », « Comptoir », « Terrasse »…) — il apparaît sur chaque commande dans le panneau.
5. **Enregistrer**. Le menu à jour est téléchargé et l'app passe au menu.

Pour revenir à ces réglages plus tard : **appui long (2 s) sur le logo** en haut à gauche → PIN **2121** (modifiable dans cet écran) → réglages : adresse, nom, recharger le menu, revenir au menu intégré, quitter l'application.

## 4. Comportement en service

- **Mise à jour du menu** : l'app garde une connexion légère au serveur. Quand l'admin enregistre le menu, le serveur envoie `menu_updated` → l'app télécharge la nouvelle version et l'affiche (bandeau « Le menu a été mis à jour »). Si la tablette était éteinte, elle se met à jour à la reconnexion.
- **Hors ligne** : le menu reste consultable (copie locale) mais la confirmation affiche « Impossible de joindre le comptoir » — le client commande alors au comptoir. La pastille en haut à droite est verte quand le serveur est joignable.
- **Panier abandonné** : vidé après 5 minutes sans interaction. L'écran « Merci » revient au menu après le délai réglé dans l'admin.
- **Plein écran** : l'app masque les barres système (un glissement depuis le bord les fait réapparaître temporairement) et garde l'écran allumé.
- **Orientation** : l'app suit la rotation de la tablette. En paysage, le panier est à droite ; en portrait, une barre en bas affiche le total et ouvre le panier.
- **Photos** : les photos exemples sont intégrées dans l'app (visibles même hors ligne) ; les photos ajoutées par l'admin sont chargées depuis le serveur.

### Mode kiosque (optionnel, recommandé)
Pour empêcher les clients de sortir de l'app :
- **Épinglage d'écran** (toutes les tablettes) : *Paramètres → Sécurité → Épinglage d'écran/Épingler des fenêtres → Activer*, puis ouvrez l'app, bouton « Applications récentes », touchez l'icône de l'app → *Épingler*. Pour sortir : maintenir *Retour* + *Récents*, code de verrouillage.
- **Application d'accueil** : l'app se déclare comme lanceur possible ; si vous la choisissez comme *Application d'accueil par défaut* (Android le propose au premier appui sur *Accueil*), la tablette démarre directement dessus.
- Réglez la *Mise en veille* de l'écran sur « Jamais » ou branchez la tablette : l'app garde de toute façon l'écran allumé tant qu'elle est au premier plan.

## 5. Version web (sans application)

Le serveur sert exactement le même menu à l'adresse **`http://<adresse-du-laptop>:3000/`** (ex. `http://192.168.1.20:3000`).
Sur la tablette : Chrome → cette adresse → menu ⋮ → **Ajouter à l'écran d'accueil**. L'icône ouvre le menu en plein écran.
Appui long sur le logo pour nommer la tablette. Différences avec l'app : nécessite le serveur allumé pour s'ouvrir, et pas de détection automatique (l'adresse est dans l'URL).

## 6. Mettre à jour le menu embarqué dans l'APK

Ce n'est **pas nécessaire** au quotidien (les tablettes se synchronisent seules). C'est utile pour qu'une tablette neuve ait déjà le bon menu avant même sa première connexion :
```
node tools/update-app-menu.js               # serveur sur ce PC
node tools/update-app-menu.js http://192.168.1.20:3000
```
puis recompilez l'APK (section 1).

## 7. Structure du projet Android

```
android-app/app/src/main/java/ca/lartisan/menu/
├── App.kt, MainActivity.kt          ← démarrage, plein écran, écran toujours allumé
├── data/Models.kt                   ← modèle du menu (identique au JSON du serveur)
├── data/Pricing.kt                  ← moteur de prix (copie fidèle de server/src/pricing.js)
├── data/MenuRepository.kt           ← menu intégré (assets) + cache + téléchargement
├── data/ServerClient.kt             ← REST, WebSocket (mises à jour), découverte UDP
├── data/Prefs.kt, data/Strings.kt   ← réglages persistants, textes FR/EN
└── ui/                              ← AppViewModel (état), écrans Compose : menu, fiche article, vérification, merci, réglages
```
Version de l'app : `versionCode` / `versionName` dans `app/build.gradle.kts` (augmentez `versionCode` à chaque nouvel APK).
