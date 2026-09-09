# Dépannage

## Le serveur

**« Node.js n'est pas installé » / la fenêtre se ferme aussitôt**
Installez Node.js LTS (22+) depuis <https://nodejs.org> puis relancez `start-windows.bat`. Vérifiez dans une invite de commandes : `node -v` doit afficher `v22` ou plus.

**« SQLite is an experimental feature » dans la console**
Avertissement inoffensif de Node 22 (la fonction est stable en usage). Aucun impact.

**`EADDRINUSE: address already in use :::3000`**
Le serveur tourne déjà (une autre fenêtre), ou un autre programme utilise le port 3000. Fermez l'autre fenêtre, ou démarrez avec `set PORT=3100` avant `node src\index.js` (et utilisez `:3100` partout).

**Le panneau affiche « Serveur injoignable — reconnexion… »**
Le serveur est arrêté ou l'ordinateur s'est mis en veille. Relancez `start-windows.bat`. Pensez à désactiver la mise en veille (*Paramètres Windows → Système → Alimentation*) pendant les heures d'ouverture.

**J'ai oublié le PIN**
Arrêtez le serveur puis, dans une invite de commandes dans le dossier `server` :
`node -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('data/lartisan.db');d.prepare(\"INSERT INTO settings(key,value) VALUES('pin','\\\"2121\\\"') ON CONFLICT(key) DO UPDATE SET value=excluded.value\").run();console.log('PIN = 2121')"`

## Les tablettes ne joignent pas le serveur

1. **Même Wi-Fi ?** Le laptop et la tablette doivent être sur le même réseau (pas le réseau « invité »). Comparez les 3 premiers nombres de l'adresse IP (ex. `192.168.1.x`).
2. **Pare-feu Windows** : exécutez `server\setup-firewall-windows.bat` en administrateur. Test rapide : sur la tablette, ouvrez Chrome à `http://<adresse-du-laptop>:3000/api/health` — vous devez voir du texte JSON.
3. **Adresse correcte ?** Regardez l'onglet *Tablettes* du panneau ; l'adresse change si le routeur attribue une nouvelle IP au laptop (réservez une IP fixe dans le routeur, ou utilisez la détection automatique de l'app).
4. **Isolation des clients (AP isolation)** : certains routeurs/hotspots empêchent les appareils Wi-Fi de se parler. Désactivez l'option dans le routeur, ou branchez le laptop en Ethernet sur le même routeur.
5. **La détection automatique ne trouve rien** mais l'adresse tapée fonctionne : le routeur bloque le broadcast UDP. Tapez simplement l'adresse ; elle est mémorisée.

## Le son ne joue pas

- Vous devez cliquer **☕ Ouvrir le café** après chaque ouverture de l'onglet (règle des navigateurs).
- Vérifiez le volume dans *Paramètres → Alerte sonore → ▶ Tester le son*, et le volume Windows.
- Dans Chrome, cliquez sur l'icône à gauche de l'adresse → *Son* → *Autoriser*.
- Si le panneau est dans un onglet en arrière-plan, Chrome peut retarder le son : gardez-le au premier plan ou en plein écran.

## Le menu ne se met pas à jour sur une tablette

- L'onglet *Tablettes* montre la version reçue par chaque tablette. Si elle est en retard : la tablette est hors ligne ou en veille ; elle se synchronise à sa reconnexion.
- Forcez : *Menu ⋯ → Renvoyer le menu aux tablettes*, ou sur la tablette : appui long sur le logo → PIN → **⟳ Recharger le menu**.
- Version web : rechargez la page.

## Une commande est refusée (« n'est plus disponible », « veuillez choisir… »)

Le serveur recalcule chaque commande avec le menu courant. Si l'admin a retiré un article entre le moment où le client l'a ajouté et la confirmation, la commande est refusée avec un message ; la tablette recharge le menu et le client retire l'article. C'est voulu : rien ne peut être commandé à un prix périmé.

## Compilation Android

- **« SDK location not found »** : ouvrez le projet via Android Studio (il crée `local.properties`) ou créez ce fichier avec `sdk.dir=C:\\Users\\<vous>\\AppData\\Local\\Android\\Sdk`.
- **Gradle sync très long** : normal la première fois (téléchargement du SDK 34, de Kotlin et de Compose). Il faut internet.
- **« Could not resolve … »** : vérifiez la connexion internet / proxy ; réessayez *File → Sync Project with Gradle Files*.
- **L'app n'affiche pas les photos** : les photos sont servies par le serveur (`/uploads/…`) ; elles nécessitent la connexion. Le reste du menu est local.

## Récupérer des données

- Base : `server/data/lartisan.db` (SQLite). Ouvrable avec *DB Browser for SQLite* pour toute analyse avancée.
- Sauvegardes : `server/data/backups/`. Export CSV des commandes : onglet *Historique* ou *Statistiques*.
- Export du menu : *Menu ⋯ → Exporter le menu (JSON)* — faites-le après chaque grosse modification.
