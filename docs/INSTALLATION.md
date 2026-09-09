# Installation du serveur (laptop de l'admin)

Le serveur tourne sur l'ordinateur du comptoir. Il sert le panneau d'administration, reçoit les commandes
des tablettes et leur envoie le menu. Il doit être **allumé et connecté au même Wi-Fi que les tablettes** pendant le service.

## 1. Windows (configuration actuelle)

### Prérequis — une seule fois
1. Installez **Node.js LTS** (version 22 ou plus récente) depuis <https://nodejs.org> — cliquez sur le gros bouton « LTS », puis *Suivant* jusqu'à la fin de l'installateur.
2. Copiez le dossier `lartisan-cafe` quelque part de stable, par exemple `C:\LArtisan\lartisan-cafe`.
   (Évitez le Bureau/OneDrive synchronisé : la base de données ne doit pas être synchronisée pendant l'écriture.)

### Démarrer le serveur
Double-cliquez sur **`server\start-windows.bat`**.

- Au premier lancement, le script installe les deux dépendances (`express`, `ws`) — ça prend 10–20 secondes et nécessite internet **une seule fois**. Ensuite tout fonctionne hors ligne.
- Le navigateur s'ouvre sur `http://localhost:3000/admin`. PIN : **2121**.
- La fenêtre noire affiche l'adresse à donner aux tablettes, par exemple :

```
  ║   Admin panel :  http://localhost:3000/admin
  ║   Tablets     :  http://192.168.1.20:3000   (Wi-Fi)
```

**Laissez cette fenêtre ouverte.** La fermer arrête le serveur (les commandes déjà reçues sont conservées dans la base).

### Pare-feu Windows
Le script tente d'ouvrir automatiquement les ports **TCP 3000** et **UDP 47474**. Si Windows n'a pas accordé les droits,
les tablettes ne pourront pas joindre le laptop. Dans ce cas, faites un clic droit sur **`server\setup-firewall-windows.bat` → Exécuter en tant qu'administrateur** (une seule fois).

Si un antivirus tiers gère le pare-feu, autorisez « Node.js » pour les réseaux privés.

### Réseau Wi-Fi
- Le laptop et les tablettes doivent être sur **le même réseau Wi-Fi** (même SSID ; pas le « réseau invité » qui isole souvent les appareils entre eux).
- Idéalement, réservez une **adresse IP fixe** au laptop dans l'interface de votre routeur (« DHCP reservation ») pour que l'adresse ne change jamais. Sinon, la découverte automatique de l'app retrouve le serveur quand même.

### Démarrage automatique avec Windows (recommandé)
1. Appuyez sur `Win + R`, tapez `shell:startup`, Entrée.
2. Faites un clic droit → *Nouveau → Raccourci* vers `C:\LArtisan\lartisan-cafe\server\start-windows.bat`.
3. Le serveur démarrera à chaque ouverture de session. Vous pouvez aussi ajouter un raccourci sur le bureau.

### Mettre à jour le serveur
Remplacez le dossier `server\src` et `server\public` par la nouvelle version, **sans toucher à `server\data`** (c'est là que sont vos commandes, votre menu et vos réglages). Relancez `start-windows.bat`.

## 2. macOS (migration prévue)

1. Installez Node.js LTS depuis <https://nodejs.org> (ou `brew install node`).
2. Copiez le dossier `lartisan-cafe` (par ex. dans `~/LArtisan`). **Copiez aussi `server/data/lartisan.db`** depuis le PC Windows pour conserver l'historique, le menu et les réglages.
3. Double-cliquez sur `server/start-macos.command`. Si macOS refuse (« développeur non identifié »), clic droit → *Ouvrir* la première fois, ou dans le Terminal : `chmod +x start-macos.command`.
4. macOS demandera « Autoriser node à accepter les connexions réseau entrantes ? » → **Autoriser**.
5. Démarrage automatique : *Réglages Système → Général → Ouverture* → ajoutez `start-macos.command`.

Rien d'autre ne change : même panneau, mêmes tablettes, même base de données.

## 3. Options avancées

| Variable d'environnement | Effet | Défaut |
|---|---|---|
| `PORT` | Port HTTP du serveur | `3000` |

Exemple Windows : créez un fichier `start-3100.bat` contenant `set PORT=3100` puis `node src\index.js`.

### Sauvegardes
- Automatique chaque nuit à 3 h : `server/data/backups/lartisan-<date>.db` (30 dernières conservées).
- Manuelle : *Paramètres → Créer une sauvegarde maintenant*.
- Restaurer : arrêtez le serveur, remplacez `server/data/lartisan.db` par la copie de sauvegarde, relancez.

### Réinitialiser complètement
Arrêtez le serveur et supprimez `server/data/lartisan.db` (et `lartisan.db-wal`, `lartisan.db-shm` s'ils existent). Au prochain démarrage, le menu d'origine (`menu.seed.json`) est rechargé et l'historique est vide.
