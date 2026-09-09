# Référence technique — API, WebSocket, base de données

Serveur : Node.js ≥ 22.13 (utilise `node:sqlite`), Express 4, `ws` 8. Port par défaut **3000** (variable `PORT`).
Toutes les réponses sont en JSON ; les erreurs ont la forme `{ "error": "message" }`.

## Routes statiques

| URL | Contenu |
|---|---|
| `/` | Version web du menu client (`public/tablet/`) |
| `/admin` | Panneau d'administration (`public/admin/`) |
| `/shared/pricing.js` | Moteur de prix partagé (ES module) |
| `/shared/logo-*.png` | Logos |
| `/uploads/<fichier>` | Photos d'articles téléversées (`data/uploads/`) |

## API publique (tablettes) — sans authentification

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/health` | `{service, version, cafe_name, menu_version, server_time, day}` |
| GET | `/api/menu` | Menu complet + `settings` publics (nom, taxes, langue, champs demandés, durée « merci ») |
| GET | `/api/menu/version` | `{version}` — pour vérifier sans tout télécharger |
| GET | `/api/settings/public` | Réglages sans le PIN |
| POST | `/api/devices/hello` | `{device_id, device_name, app_version, menu_version}` → enregistre la tablette |
| POST | `/api/orders` | Crée une commande (voir ci-dessous) |
| GET | `/api/orders/:id` | Statut d'une commande `{id, number, status, customer_name, total, created_at}` |

### POST /api/orders
```json
{
  "device_id": "tab-1a2b3c4d", "device_name": "Tablette 1",
  "customer_name": "Marie", "service_type": "dine_in",      // "dine_in" | "takeout"
  "lang": "fr",
  "lines": [
    { "item_id": "galette-composer", "variant_id": "essentiel", "qty": 1, "note": "sans oignon",
      "options": [ {"group_id": "garnitures", "option_id": "cheddar"}, {"group_id": "sauces", "option_id": "pesto"} ] },
    { "item_id": "hot-latte", "variant_id": "m", "qty": 2, "options": [ {"group_id": "lait", "option_id": "avoine"} ] }
  ]
}
```
Le serveur **ignore tout prix envoyé** et recalcule à partir du menu courant. Réponse `200` : la commande complète
(`id`, `number`, `status: "new"`, `lines[]` avec noms/prix résolus, `subtotal`, `tax_gst`, `tax_qst`, `total`, `created_at`).
Erreurs : `400` commande vide ; `409` article indisponible / option invalide / choix obligatoire manquant (message lisible dans `error`, dans la langue `lang`).
L'ordre des options dans `options[]` détermine lesquelles sont « incluses ».

## API site web (public)

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/site` | Infos du café, heures, état (ouvert/fermé, créneaux, modes de paiement, pourboires), plats en avant, avis Google (cache 1 h) |
| GET | `/api/site/state` | Seulement l'état ouvert/fermé + créneaux (rafraîchi par le site toutes les 60 s) |
| POST | `/api/online-orders` | `{ lang, customer_name, customer_phone, customer_email?, pickup: 'asap'|'HH:MM', tip_percent, payment: 'counter'|'stripe', lines, note }` → `{ order, checkout_url? }`. Refusé (409) si fermé ou trop tard ; prix recalculés côté serveur. |
| GET | `/api/online-orders/:id?t=<jeton>` | Suivi d'une commande (jeton public renvoyé à la création). `&session_id=` confirme un paiement Stripe au retour. |
| POST | `/api/stripe/webhook` | Webhook Stripe `checkout.session.completed` (signature vérifiée) |

Colonnes `orders` ajoutées en v1.4 : `source` ('tablet'|'online'), `pickup_time`, `tip`, `payment_status` ('unpaid'|'paid'|'refunded'), `payment_method`, `payment_ref`, `customer_phone`, `customer_email`, `public_token`. Statut supplémentaire `pending_payment` (Stripe, expiré après 35 min).

## API admin — cookie de session (`lartisan_admin`) ou en-tête `Authorization: Bearer <token>`

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/admin/login` | `{pin}` → `{ok, token}` + cookie. `401` PIN faux, `429` après 5 échecs (1 min) |
| POST | `/api/admin/logout` | |
| GET | `/api/admin/session` | `{logged_in}` |
| GET | `/api/admin/orders?status=active|new|preparing|ready|completed|cancelled&day=&from=&to=&limit=&offset=` | Liste |
| GET | `/api/admin/orders/:id` | Détail |
| PATCH | `/api/admin/orders/:id/status` | `{status}` ∈ new, preparing, ready, completed, cancelled |
| GET | `/api/admin/orders.csv?from=&to=` | Export CSV |
| GET | `/api/admin/menu` | Menu complet |
| PUT | `/api/admin/menu` | Remplace le menu (validé/normalisé), version +1, diffusion `menu_updated` |
| PATCH | `/api/admin/menu/items/:id` | Champs partiels : `available, price, sort, name, description, badge, category_id` |
| PATCH | `/api/admin/menu/categories/:id` | `visible, name, description, icon, sort` |
| POST | `/api/admin/menu/reset` | Rétablit `menu.seed.json` |
| GET | `/api/admin/menu/export` | Téléchargement JSON |
| POST | `/api/admin/menu/import` | Corps = menu JSON |
| POST | `/api/admin/menu/push` | Rediffuse `menu_updated` |
| POST | `/api/admin/upload` | `{data: "data:image/jpeg;base64,…", name}` → `{url}` |
| GET / PUT | `/api/admin/settings` | Réglages (PUT accepte un sous-ensemble ; `pin` : 4–8 chiffres) |
| GET | `/api/admin/stats?from=YYYY-MM-DD&to=YYYY-MM-DD` | Statistiques (voir `src/stats.js`) |
| GET | `/api/admin/summary` | Résumé du jour pour l'en-tête |
| GET | `/api/admin/devices` | Tablettes connues + `online` |
| PATCH | `/api/admin/orders/:id/payment` | `{ paid: true }` — marque une commande en ligne payée au comptoir |
| GET | `/api/admin/site/state` | État ouvert/fermé pour le panneau |
| GET | `/api/admin/site/reviews/refresh` | Recharge les avis Google (ignore le cache) |
| GET/POST | `/api/admin/print/agent-token` | Lire / régénérer le jeton de l'agent d'impression |
| GET | `/api/admin/network` | Adresses IP locales et URLs |
| GET | `/api/admin/audit?limit=` | Journal |
| POST | `/api/admin/backup` | `VACUUM INTO data/backups/…` |

## WebSocket — `ws://<hôte>:3000/ws`

Client → serveur :
```json
{"type":"hello","role":"tablet","device_id":"tab-…","device_name":"Tablette 1","app_version":"1.0.0","menu_version":3}
{"type":"ping","menu_version":3}
```
Serveur → clients :

| Message | Destinataires | Sens |
|---|---|---|
| `{"type":"welcome","menu_version":3,"server_time":…}` | l'émetteur | Comparer avec sa version locale |
| `{"type":"menu_updated","version":4,"reason":"saved"}` | tous | Retélécharger `GET /api/menu` |
| `{"type":"settings_updated","settings":{…}}` | tous | Nouveaux réglages publics |
| `{"type":"new_order","order":{…}}` | tous | Le panneau joue le son |
| `{"type":"order_updated","order":{…}}` | tous | Changement de statut |
| `{"type":"devices","devices":[…]}` | admins | Liste des tablettes |

Le serveur envoie un ping WebSocket toutes les 15 s et ferme les connexions mortes.

## Découverte UDP

Port **47474**. Une tablette envoie la chaîne `LARTISAN_DISCOVER` en broadcast ; le serveur répond en unicast :
`{"service":"lartisan-cafe","name":"Fusion L'Artisan","port":3000,"addresses":["192.168.1.20"]}`.

## Base de données (`data/lartisan.db`, SQLite, mode WAL)

| Table | Colonnes principales |
|---|---|
| `settings` | `key`, `value` (JSON) — valeurs par défaut dans `src/db.js` |
| `menu` | une seule ligne : `version`, `data` (JSON complet), `updated_at` |
| `orders` | `id`, `number` (par jour), `day`, `customer_name`, `service_type`, `device_id/name`, `lang`, `status`, `lines` (JSON), `subtotal`, `tax_gst`, `tax_qst`, `total`, `note`, `created_at`, `updated_at`, `ready_at`, `completed_at` |
| `devices` | `id`, `name`, `app_version`, `menu_version`, `last_seen` |
| `audit` | `at`, `action`, `detail` |

Le menu est stocké comme un document JSON unique : simple à exporter, à importer et à versionner ; les statistiques agrègent les `lines` JSON des commandes.

## Code

```
server/src/
├── index.js       routes Express, démarrage, sauvegarde nocturne
├── db.js          SQLite, réglages, menu, sauvegardes
├── menuSchema.js  validation/normalisation du menu reçu de l'admin
├── pricing.js     moteur de prix (partagé avec la version web)
├── orders.js      création (recalcul des prix), numérotation, statuts
├── stats.js       agrégations pour les statistiques
├── auth.js        PIN, sessions, limitation des tentatives
├── hub.js         WebSocket : diffusion des événements
└── discovery.js   réponse UDP de découverte, adresses locales
```
Tests : `npm test` (moteur de prix sur le menu réel).
