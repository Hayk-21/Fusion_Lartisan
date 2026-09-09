# Héberger le serveur en ligne (Railway)

Depuis la version 1.4, le serveur peut tourner **en ligne** au lieu du laptop du café. Le même programme sert alors :

- le **site web public** (`https://VOTRE-APP.up.railway.app/`) et la **commande en ligne** (`/commander`) ;
- le **panneau d'administration** (`/admin`) — accessible de n'importe où avec le PIN ;
- les **tablettes** (l'application Android se connecte à l'adresse en ligne) et la version web tablette (`/tablette`) ;
- l'**agent d'impression** qui tourne sur l'ordinateur du café pour imprimer les tickets (voir `IMPRIMANTE.md`, section 6).

La base de données (commandes, menu, réglages, photos) reste **un seul fichier SQLite**, stocké sur un **Volume** Railway : un nouveau déploiement remplace le code, jamais les données.

## 1. Préparer le dépôt

1. Créez un dépôt Git (GitHub) contenant le dossier `lartisan-cafe` (le dossier `server/` doit être dedans).
   `server/.gitignore` exclut déjà `data/`, `node_modules/` et `print-agent/print-agent.json`.
2. Vérifiez que `server/Dockerfile`, `server/railway.json` et `server/package-lock.json` sont bien présents (ils le sont).

## 2. Créer le service sur Railway

1. <https://railway.app> → **New Project → Deploy from GitHub repo** → choisissez le dépôt.
2. Dans le service : **Settings → Source → Root Directory** = `server` (important : c'est là que sont le `Dockerfile` et `package.json`).
3. **Settings → Networking → Generate Domain** : Railway vous donne une adresse du type `https://lartisan-production-xxxx.up.railway.app`. Port à indiquer si demandé : **3000**.

## 3. Le Volume (obligatoire — sinon les données disparaissent à chaque déploiement)

1. Dans le projet : clic droit sur le service (ou **+ New → Volume**) → **Add Volume** → attachez-le au service.
2. **Mount path** : `/data`
3. **Variables** du service (onglet *Variables*) :

   | Variable | Valeur |
   |---|---|
   | `LARTISAN_DATA_DIR` | `/data` |
   | `TZ` | `America/Toronto` *(facultatif : le serveur applique lui-même le fuseau des Paramètres)* |

   `PORT` est fourni automatiquement par Railway ; le serveur l'utilise.

4. Redéployez (**Deploy**). Dans les logs vous devez voir la bannière du serveur avec `Data : /data`.

Ce que contient le Volume : `/data/lartisan.db` (base), `/data/uploads/` (photos, logo), `/data/backups/` (sauvegarde automatique chaque nuit à 3 h, et bouton *Créer une sauvegarde* dans Paramètres).

> **Migrer les données du laptop** : copiez `server/data/lartisan.db` et `server/data/uploads/` du laptop vers le Volume (Railway → service → Volume → *Files*, ou via `railway ssh`). Faites-le **avant** la première utilisation en ligne, sinon la base en ligne repart de zéro (menu d'origine, PIN 2121).

## 4. Première configuration en ligne

1. Ouvrez `https://VOTRE-APP.up.railway.app/admin` → PIN (**2121** par défaut → **changez-le** dans Paramètres → Sécurité, le panneau est maintenant accessible depuis Internet).
2. **Site web** → *Adresse publique du site* = `https://VOTRE-APP.up.railway.app` → Enregistrer (utilisé pour les liens de paiement et l'adresse affichée dans *Tablettes*).
3. **Site web** → vérifiez les heures d'ouverture, le téléphone, le courriel.
4. **Paramètres → Imprimante** → *Connexion* = **Agent d'impression** → **Générer** un jeton → installez l'agent sur l'ordinateur du café (`IMPRIMANTE.md` § 6).
5. **Tablettes** : dans l'application, appui long sur le logo → PIN → *Adresse du serveur* = `VOTRE-APP.up.railway.app` (sans `http`, l'app met `https://` toute seule) → Enregistrer. La détection automatique (📡) ne sert que pour un serveur local sur le même Wi-Fi.

## 5. Mettre à jour le serveur

`git push` sur la branche suivie → Railway reconstruit l'image et redéploie (1 à 2 minutes). Les tablettes et l'agent d'impression se reconnectent tout seuls. Les données du Volume ne sont pas touchées.

## 6. Coûts et limites

- Railway facture à l'usage (un service Node + un Volume de quelques centaines de Mo coûte quelques dollars par mois ; le plan gratuit/trial suffit pour tester).
- Le serveur ne dort pas : l'agent d'impression et les tablettes gardent une connexion WebSocket ouverte.
- Un seul « replica » : ne pas activer la mise à l'échelle horizontale (la base SQLite est locale au conteneur).

## 7. Revenir au mode local

Le mode local (serveur sur le laptop, `start.bat`) fonctionne toujours exactement comme avant : mêmes fichiers, base dans `server/data/`. Les deux ne partagent pas leurs données.

## 8. Dépannage

| Symptôme | Cause / solution |
|---|---|
| Après un redéploiement, le menu / les commandes ont disparu | Le Volume n'est pas monté sur `/data` ou `LARTISAN_DATA_DIR` n'est pas défini. Vérifiez les Variables et le Mount path, puis restaurez `/data/backups/…`. |
| `/api/health` ne répond pas, déploiement en échec | Root Directory ≠ `server`, ou build Docker en erreur : lisez les *Build Logs*. |
| Les tablettes disent « serveur injoignable » | L'adresse saisie doit être celle du domaine Railway (`https://…`). Vérifiez la connexion Internet de la tablette. |
| Les tickets ne s'impriment pas | L'agent d'impression n'est pas lancé sur l'ordinateur du café, ou le jeton a changé (Paramètres → Imprimante montre « Aucun agent connecté »). |
| L'heure des commandes est décalée | Site web → *Fuseau horaire* = `America/Toronto`. |
