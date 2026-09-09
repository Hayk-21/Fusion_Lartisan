# Site web & commande en ligne

Le serveur sert un site public bilingue (FR/EN) :

| Adresse | Contenu |
|---|---|
| `/` | Page d'accueil : présentation, badge *ouvert / fermé* et heures du jour, quelques plats, « comment ça marche », avis Google, adresse + carte, heures d'ouverture. |
| `/commander` | Le menu complet (le même que sur les tablettes, mis à jour dès que l'admin enregistre le menu), panier, puis confirmation avec **heure de ramassage**, **pourboire** et **mode de paiement**. |
| `/commander/confirmation.html` | Page de suivi de la commande (numéro, heure de ramassage, statut mis à jour toutes les 15 s). |
| `/tablette` | Version web de l'application tablette (kiosque). |
| `/admin` | Panneau d'administration. |

Tout se règle dans le panneau d'administration → **🌐 Site web**. Aucune modification de code n'est nécessaire.

## 1. Ouvert / fermé

- **Heures d'ouverture** par jour de la semaine (case *Fermé* pour un jour de fermeture) et **fuseau horaire** (`America/Toronto`).
- **Fermé exceptionnellement** : à cocher pour fermer le site immédiatement (vacances, panne…). Le site affiche le **message de fermeture** que vous saisissez et refuse les commandes. Décochez pour rouvrir.
- **Accepter les commandes en ligne** : décoché, le site reste visible (menu consultable) mais le bouton *Confirmer* est désactivé.

Le site vérifie l'état **côté serveur** : même si un client garde la page ouverte, une commande envoyée après la fermeture est refusée avec un message.

## 2. Heure de ramassage

Le client choisit :

- **Dès que possible** — dans *Délai « dès que possible »* minutes (15 par défaut) ;
- ou un **créneau** (toutes les *Créneaux* minutes, 15 par défaut) jusqu'à la fermeture moins *Dernière commande avant fermeture* (15 par défaut).

Exemple : ouvert jusqu'à 19 h 30, il est 14 h 00 → « Dès que possible (~15 min) », 14 h 30, 14 h 45 … 19 h 15. À 19 h 20 il n'y a plus de créneau : le site indique « trop tard pour commander aujourd'hui ».

## 3. Paiement

| Mode | Ce que voit le client | Ce que voit l'admin |
|---|---|---|
| **Paiement au comptoir** (par défaut) | Confirme sans payer ; la page de confirmation dit « À régler au comptoir ». | Carte marquée **À payer au comptoir** + bouton **💵 Marquer payée**. Le ticket imprimé porte « À PAYER AU COMPTOIR ». |
| **Paiement en ligne (Stripe)** | Après *Confirmer*, redirection vers la page de paiement Stripe : **carte, Apple Pay, Google Pay** (et Link). La commande n'apparaît en cuisine **qu'une fois payée**. | Carte **Payée ✓** ; une annulation rembourse automatiquement. |
| **Les deux** | Le client choisit. | — |

Google Pay et Apple Pay ne peuvent pas être proposés « seuls » : ils passent obligatoirement par un prestataire de paiement (Stripe, Square, Moneris, etc.) qui encaisse et reverse au café — c'est pour cela que le mode « au comptoir » est actif par défaut, sans aucun compte ni frais.

### Activer Stripe (quand vous le déciderez)

1. Créez un compte sur <https://dashboard.stripe.com> (entreprise canadienne, devise CAD). Frais Stripe Canada : environ 2,9 % + 0,30 $ par paiement.
2. **Developers → API keys** : copiez la *Publishable key* (`pk_live_…`) et la *Secret key* (`sk_live_…`) dans Site web → Paiement. (Pour tester d'abord : les clés `pk_test_…` / `sk_test_…` et la carte `4242 4242 4242 4242`.)
3. **Developers → Webhooks → Add endpoint** : URL = `https://VOTRE-APP.up.railway.app/api/stripe/webhook`, événement **`checkout.session.completed`**. Copiez le *Signing secret* (`whsec_…`) dans Site web → Paiement.
4. Apple Pay : dans Stripe → **Settings → Payment methods → Apple Pay**, ajoutez votre domaine Railway (Stripe fournit le fichier de vérification automatiquement pour les pages Checkout hébergées par Stripe). Google Pay est actif d'office.
5. Mode = *Paiement en ligne* ou *Les deux* → **Enregistrer**.

Le serveur ne stocke jamais de numéro de carte : le paiement se fait entièrement sur la page Stripe. Le pourboire est ajouté au montant payé (non taxé).

## 4. Pourboire

Cochez *Proposer un pourboire* et listez les pourcentages (par défaut `0, 10, 15, 20`). Le pourboire est calculé sur le sous-total avant taxes, affiché sur la carte de commande, le ticket et dans Statistiques (*Pourboires*).

## 5. Avis Google sur la page d'accueil

Le site affiche la note et les derniers avis de la fiche Google du café. Cela demande une clé **Google Places API (New)** (gratuite jusqu'à un volume très large ; le serveur met les avis en cache 1 heure).

1. <https://console.cloud.google.com> → créez un projet (ex. « Fusion L'Artisan ») ; activez la facturation (obligatoire chez Google même si l'usage reste gratuit).
2. **APIs & Services → Library** → activez **Places API (New)**.
3. **APIs & Services → Credentials → Create credentials → API key**. Restreignez la clé : *API restrictions* → Places API (New) uniquement.
4. Collez la clé dans Site web → Avis Google → **Enregistrer**, puis **⟳ Recharger les avis**. Le *Place ID* est trouvé automatiquement à partir du nom et de l'adresse du café (vous pouvez aussi le coller vous-même).

Sans clé, la section « Avis » de la page d'accueil est masquée. La carte Google Maps, elle, ne demande aucune clé.

## 6. Contenu de la page d'accueil

- **Informations du café** : adresse, téléphone, courriel, Instagram, Facebook, slogan et présentation (FR et EN), lien Google Maps.
- **Plats mis en avant** : cochez jusqu'à 6 à 8 plats du menu (photo, description et prix « à partir de » sont repris du menu).
- Le **logo** est celui des Paramètres (Général → Logo) ; les **photos** des plats sont celles du menu.

## 7. Commandes en ligne dans le panneau

Sur le tableau *Commandes en direct*, une commande du site porte le badge **🌐 En ligne**, l'**heure de ramassage**, le **téléphone** du client (cliquable) et l'état du paiement. L'*Historique* et les *Statistiques* distinguent les commandes en ligne (*Site web*) des tablettes.

Le ticket imprimé commence par **COMMANDE EN LIGNE**, l'heure de ramassage en gros caractères, et « PAYÉ EN LIGNE » ou « À PAYER AU COMPTOIR ».

Une commande Stripe non payée après 35 minutes est annulée automatiquement.

## 8. Ce que le client fournit

Nom (obligatoire), téléphone (obligatoire — pour vous joindre en cas de problème), courriel (facultatif). Ces informations sont visibles dans le panneau et sur le ticket ; elles ne servent à rien d'autre.
