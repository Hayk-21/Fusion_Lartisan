# Guide du panneau d'administration

Adresse : **http://localhost:3000/admin** sur le laptop (ou `http://<adresse-du-laptop>:3000/admin` depuis n'importe quel appareil du Wi-Fi, y compris un téléphone).
PIN par défaut : **2121**. Le panneau existe en français et en anglais (boutons FR / EN en bas à gauche).

La session reste ouverte 24 h ; après 5 PIN erronés, il faut attendre 1 minute.

---

## 1. Commandes en direct — le « mode café »

C'est l'écran à laisser affiché pendant le service (bouton ⛶ pour le plein écran).

1. Cliquez **☕ Ouvrir le café**. Ce clic est obligatoire : les navigateurs interdisent de jouer un son sans une action de l'utilisateur. Le mode café reste mémorisé même si vous rechargez la page.
2. Chaque nouvelle commande :
   - joue le **carillon une fois** (son et volume réglables dans *Paramètres* ; une option permet de le répéter toutes les 20 s tant que la commande est dans *Nouvelles*) ;
   - apparaît dans la colonne **Nouvelles** avec : numéro (#12), prénom du client, sur place / à emporter, heure, tablette d'origine, chaque article avec sa taille, ses options et les suppléments, les notes du client, le total.
3. Boutons sur chaque carte :
   - **Commencer** → passe dans *En préparation* (le carillon s'arrête pour cette commande).
   - **Prête ✓** → passe dans *Prêtes* — appelez le client par son numéro / prénom.
   - **Terminer ➜** → la commande disparaît de l'écran (elle reste dans l'historique et compte dans les statistiques). C'est l'action « rouler » pour libérer de la place.
   - **Annuler** → demande confirmation ; la commande est marquée annulée (visible dans l'historique, exclue des ventes).
   - **🖨** → réimprime le ticket (si une imprimante est configurée ; le ticket part automatiquement à la réception de la commande).
4. Le temps écoulé depuis la commande s'affiche et passe en **rouge après 15 minutes**.
5. La pastille en bas à gauche indique si le panneau est connecté au serveur. Plusieurs écrans peuvent afficher le mode café en même temps (ex. laptop + tablette en cuisine) : ils sont synchronisés.

> Le paiement se fait au comptoir, manuellement. Le système n'encaisse rien : il ne fait que transmettre la commande et calculer le total avec taxes.

## 2. Historique

Toutes les commandes par date et statut. Cliquez **Voir** pour le détail (imprimable avec 🖨). Une commande terminée ou annulée par erreur peut être **remise en cours** (elle réapparaît dans *Nouvelles*).
**Exporter CSV** produit un fichier Excel-compatible de la période (une ligne par commande, articles en clair).

## 3. Menu

L'éditeur se lit de gauche à droite : **Catégories → Articles de la catégorie → Fiche de l'article**.
Toutes les modifications sont locales tant que vous n'avez pas cliqué **💾 Enregistrer & envoyer aux tablettes** (ou `Ctrl+S`). Un bandeau « Modifications non enregistrées » vous le rappelle.

### Catégories
- **+ Catégorie** pour en créer une ; ▲▼ pour changer l'ordre des onglets sur la tablette.
- Nom FR / EN, description, icône (un emoji), **Visible sur les tablettes** (décochez pour masquer toute une section, ex. les glaces en hiver), **Section « du jour »** (l'onglet apparaît en doré).
- **Supprimer** efface la catégorie et ses articles (confirmation demandée).

### Articles
- **+ Article** crée un article dans la catégorie sélectionnée. ▲▼ pour l'ordre. **Dupliquer** pour partir d'un article existant.
- **Général** : nom et description FR/EN, catégorie, **prix de base**, badge (ex. *Populaire*, *Sans gluten*, *Best-seller*), **Disponible** (décochez pour un article en rupture : il apparaît grisé sur les tablettes et est refusé par le serveur), **photo** — chaque article est livré avec une *photo exemple* (illustration) ; cliquez **📷 Choisir une photo** pour la remplacer par une vraie photo du plat (redimensionnée automatiquement, envoyée aux tablettes à l'enregistrement).
- **Tailles / formules** (facultatif) : ex. *Petit 4,75 $ / Moyen 5,25 $ / Grand 5,75 $*, ou *L'Essentiel 14,99 $ / Le Gourmand 17,99 $*. Le client doit en choisir une ; **son prix remplace le prix de base**. Pour chaque taille, vous pouvez fixer le nombre de **choix inclus** de chaque groupe d'options (ex. L'Essentiel = 3 garnitures incluses, Le Gourmand = 4).
- **Groupes d'options** : ex. *Garnitures*, *Sauces*, *Lait végétal*, *Saveur*.
  - **Type** : *un seul choix* (boutons radio) ou *plusieurs choix* (cases).
  - **Obligatoire** : le client doit choisir (ex. la taille d'un café, la saveur d'un thé glacé).
  - **Minimum / Maximum** : bornes du nombre de choix (vide = illimité).
  - **Inclus (gratuits)** : nombre de choix sans frais ; **Prix extra** : coût de chaque choix au-delà (ex. 3 inclus, +2,99 $ ensuite).
  - Chaque **option** a un nom FR/EN, une **section** facultative pour regrouper l'affichage (Fromages, Viandes, Légumes…), un **supplément** propre (ex. saumon fumé +5,99 $ même s'il est « inclus » dans le compte) et une case *Dispo*.
  - **📋 Coller une liste** : ajoutez 20 options d'un coup en collant `Nom FR | Nom EN | prix`, une par ligne.

### Règle de prix (résumé)
`prix de la taille (ou prix de base)` + `suppléments des options choisies` + `(nombre de choix − inclus) × prix extra` → × quantité.
TPS et TVQ sont ajoutées sur le sous-total de la commande. Le serveur applique exactement cette règle ; la tablette affiche la même chose.

### Menu ⋯ (en haut à droite)
- **Exporter le menu (JSON)** : sauvegarde de votre menu dans un fichier (à conserver !).
- **Importer un menu (JSON)** : restaure un fichier exporté (remplace tout).
- **Renvoyer le menu aux tablettes** : force les tablettes à retélécharger le menu.
- **Rétablir le menu d'origine** : revient au menu importé de vos PDF (perd vos modifications).

Chaque enregistrement crée une nouvelle **version** du menu ; l'onglet *Tablettes* montre quelle version chaque tablette possède.

## 4. Statistiques

Seules les commandes **terminées** comptent comme ventes (les annulées sont comptées à part).
Périodes rapides (Aujourd'hui, Hier, 7 jours, 30 jours, Ce mois) ou dates libres.

- Indicateurs : chiffre d'affaires TTC, ventes HT, commandes, panier moyen, articles vendus, taxes collectées (TPS+TVQ), annulations, temps de préparation moyen (commande → *Prête*).
- Graphiques : CA par jour, commandes par heure (pour voir les rushs), articles les plus vendus, ventes par catégorie.
- Tableaux : détail des articles, sur place vs à emporter, ventes par tablette.
- **Exporter CSV** : toutes les commandes de la période, pour Excel / comptable.

## 4 bis. Site web

Tout le site public et la commande en ligne se règlent ici : état ouvert/fermé et heures d'ouverture, « fermé exceptionnellement » avec message, activation de la commande en ligne, délais et créneaux de ramassage, mode de paiement (au comptoir par défaut, Stripe en option), pourboire, informations du café (adresse, téléphone, courriel, réseaux sociaux, textes FR/EN), plats mis en avant sur la page d'accueil, avis Google. Détails dans [SITE_WEB.md](SITE_WEB.md).

Les commandes du site apparaissent dans *Commandes en direct* avec le badge **🌐 En ligne**, l'heure de ramassage, le téléphone du client et l'état du paiement (**💵 Marquer payée** quand le client règle au comptoir).

## 5. Tablettes

- L'**adresse du serveur** à saisir dans l'app (ou à ouvrir dans Chrome pour la version web).
- La liste des tablettes qui se sont connectées : en ligne / hors ligne, version du menu qu'elles ont (un badge *menu obsolète* signale qu'une tablette n'a pas encore reçu la dernière version — elle la prendra à sa prochaine connexion), dernier contact.

## 6. Paramètres

| Réglage | Rôle |
|---|---|
| Nom du café | Affiché sur les tablettes et le panneau |
| Logo | **📷 Choisir un logo** (PNG à fond transparent recommandé, carré ou légèrement large) : remplacé immédiatement dans le panneau, sur la version web et dans l'application des tablettes (sans réinstaller). **Rétablir le logo d'origine** revient au logo L'Artisan. |
| Langue par défaut des tablettes | FR ou EN au premier lancement (le client peut changer) |
| Demander le prénom / sur place-à emporter | Affiche ou non ces champs à la confirmation (le prénom est désactivé par défaut) |
| Durée de l'écran « Merci » | Secondes avant retour automatique au menu |
| Numérotation | Recommence à #1 chaque jour (recommandé) ou continue |
| TPS / TVQ | Taux en % (Québec : 5 et 9,975) |
| Son, volume, répétition | Alerte de nouvelle commande — jouée une fois par commande (répétition désactivée par défaut) — **▶ Tester le son** |
| 🖨 Imprimante à tickets | Impression automatique de chaque commande sur la Star TSP650 (USB via pilote Star, ou réseau), ticket de test, copies, prix ou non. Détails : `docs/IMPRIMANTE.md` |
| Nouveau PIN | 4 à 8 chiffres ; laissez vide pour ne pas changer |
| Sauvegarde | Crée une copie de la base dans `server/data/backups` |
| Journal d'activité | Trace des connexions, changements de menu, statuts de commandes |

Cliquez **💾 Enregistrer** en haut à droite. Les tablettes reçoivent immédiatement les nouveaux réglages (nom, taxes, champs demandés).
