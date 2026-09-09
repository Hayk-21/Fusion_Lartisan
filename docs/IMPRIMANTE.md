# Imprimante à tickets (Star Micronics TSP650)

Chaque nouvelle commande peut être **imprimée automatiquement** sur une imprimante thermique. Testé pour la **Star TSP650 / TSP650II** (langage *Star Line Mode*) ; toute imprimante **ESC/POS** (Epson TM, Bixolon, génériques 80 mm) fonctionne aussi en choisissant le langage ESC/POS.

## 1. Branchement USB sur le laptop Windows (votre cas)

1. Branchez l'imprimante en USB, allumez-la (papier chargé, voyant vert).
2. Installez le **pilote Windows Star** : <https://www.star-m.jp/products/s_print/sdk/windows/manual/en/> → *Star Windows Driver* (ou « Star TSP650 driver »). Après l'installation, *Paramètres Windows → Bluetooth et appareils → Imprimantes* doit afficher **« Star TSP650 (TSP654) »** (le nom exact varie). Faites un *Imprimer une page de test* Windows pour vérifier que le papier sort.
3. Dans le panneau d'administration → **Paramètres → 🖨 Imprimante à tickets** :
   - cochez **Imprimer automatiquement chaque nouvelle commande** ;
   - *Connexion* : **Imprimante installée sur cet ordinateur** ;
   - *Imprimante* : choisissez la Star dans la liste (bouton ⟳ pour actualiser la liste) ;
   - *Langage* : **Star Line Mode** ; *Caractères par ligne* : **42** (papier 80 mm) ;
   - cliquez **🖨 Imprimer un ticket de test** — un ticket d'exemple doit sortir avec les accents corrects ;
   - **💾 Enregistrer**.

Le serveur garde un petit processus d'impression ouvert en permanence (`server/tools/rawprint-worker.ps1`) et lui envoie les octets bruts (mode *RAW* du spouleur Windows) : le ticket part en quelques millisecondes, sans mise en page Windows.

## 2. Imprimante réseau (Ethernet / Wi-Fi)

*Connexion* : **Imprimante réseau**, adresse IP de l'imprimante (imprimée sur le ticket d'auto-test de la Star : maintenir le bouton FEED à l'allumage), port **9100**. Aucun pilote nécessaire. Donnez une IP fixe à l'imprimante dans le routeur.

## 3. Ce qui est imprimé

```
           Fusion L'Artisan
          2026-09-09  12 h 03
                #12               ← gros numéro (double taille)
             À EMPORTER
Tablette : Tablette 1
==========================================
1 x Composez votre galette -
L'Essentiel                        25,52 $
   - Cheddar
   - Jambon de dinde
   - Saumon fumé (+8,98 $)
   >> sans oignon                  ← note du client, en gras
2 x Cappuccino - Grand (L)         13,00 $
------------------------------------------
Sous-total                         38,52 $
TPS / GST                           1,93 $
TVQ / QST                           3,84 $
TOTAL                              44,29 $
==========================================
      Merci ! Paiement au comptoir.
```
Réglages : prix et taxes (décochez pour un ticket cuisine sans prix), coupe automatique, nombre de copies (ex. 2 : une pour la cuisine, une pour le comptoir), texte de bas de ticket.

## 4. Réimprimer

- Sur chaque carte de commande (*Commandes en direct*) : bouton **🖨**.
- Dans *Historique → Voir* : bouton **🖨 Imprimer**.
Si une impression automatique échoue (imprimante éteinte, plus de papier), le panneau affiche une alerte rouge et l'erreur est notée dans le *Journal d'activité* ; la commande reste bien enregistrée.

## 5. Dépannage

| Symptôme | Solution |
|---|---|
| La liste des imprimantes est vide | Le pilote Star n'est pas installé, ou l'imprimante est hors tension. Installez le pilote, rebranchez, ⟳. |
| « Imprimante introuvable » | Le nom a changé (Windows ajoute parfois « (Copie 1) ») : re-sélectionnez-la dans la liste et Enregistrez. |
| Le ticket sort mais avec des caractères bizarres | Mauvais langage : passez de *Star Line Mode* à *ESC/POS* (ou l'inverse). Sur une TSP650II, vérifiez que l'émulation est bien « Star Line Mode » (configuration d'usine). |
| Les accents sont faux (Ã©) | L'imprimante n'est pas en page de code 1252 : le ticket la sélectionne automatiquement ; si le modèle l'ignore, réglez la page de code 1252 / « Windows Latin-1 » dans l'utilitaire Star. |
| Texte qui déborde / trop court | Ajustez *Caractères par ligne* (42 pour 80 mm police A ; 32 pour du papier 58 mm). |
| Rien ne sort, pas d'erreur | Le voyant clignote : plus de papier ou capot ouvert. |

## 6. Serveur hébergé en ligne (Railway) : l'agent d'impression

Quand le serveur tourne sur Railway (voir `DEPLOIEMENT_RAILWAY.md`), il ne peut pas voir l'imprimante USB du café. Un petit programme, **l'agent d'impression**, tourne sur l'ordinateur du café, reste connecté au serveur et imprime chaque ticket qu'il reçoit (délai < 1 s).

### Installation automatique (recommandée)

1. Panneau → **Paramètres → 🖨 Imprimante** → *Connexion* = **Agent d'impression** → cliquez **⬇ Télécharger l'installateur Windows (.bat)**. Le fichier contient l'adresse du serveur et le jeton.
2. Copiez ce fichier sur l'ordinateur relié à l'imprimante (l'imprimante doit déjà apparaître dans Windows → Paramètres → Imprimantes, pilote Star installé ; en Bluetooth, jumelez-la d'abord).
3. Double-cliquez-le. Aucune question : il installe Node.js s'il manque, choisit l'imprimante Star, règle le panneau, s'ajoute au démarrage de Windows, imprime un ticket **« TOUT EST CONNECTÉ »** et démarre l'agent (fenêtre réduite dans la barre des tâches). Si Windows SmartScreen s'affiche : *Informations complémentaires → Exécuter quand même*.

Pour changer d'ordinateur : téléchargez à nouveau l'installateur et lancez-le sur le nouveau PC (l'ancien agent est déconnecté). Le jeton change si vous cliquez **Générer** dans le panneau : il faut alors retélécharger l'installateur.

### Installation manuelle (une fois, sur l'ordinateur du café)

1. Le dossier `server/` du projet doit être présent sur cet ordinateur (comme pour le mode local), avec Node.js installé.
2. Panneau d'administration (en ligne) → **Paramètres → 🖨 Imprimante** → *Connexion* = **Agent d'impression sur l'ordinateur du café** → bouton **Générer** → copiez le jeton (📋). Cochez *Imprimer automatiquement*, **Enregistrer**.
3. Sur l'ordinateur du café, double-cliquez **`server\start-print-agent.bat`**. Au premier lancement il crée `server\print-agent\print-agent.json` et s'arrête : ouvrez ce fichier avec le Bloc-notes et remplissez :

   ```json
   {
     "server_url": "https://VOTRE-APP.up.railway.app",
     "token": "le jeton copié dans le panneau",
     "printer_name": "Star TSP650 (TSP654)",
     "print_mode": "windows",
     "agent_name": "PC du café"
   }
   ```
   Pour connaître le nom exact de l'imprimante : dans une invite de commandes, `cd server` puis `node print-agent\agent.js --printers`.
4. Relancez `start-print-agent.bat` et **laissez la fenêtre ouverte** pendant le service. Le panneau affiche « ● Agent connecté : PC du café » et l'imprimante détectée. Dans le panneau, *Imprimante* = le nom choisi → **🖨 Imprimer un ticket de test**.
5. Pour qu'il démarre tout seul avec Windows : créez un raccourci vers `start-print-agent.bat` dans `shell:startup` (touche Windows + R → `shell:startup`).

L'agent se reconnecte automatiquement (redémarrage du serveur, coupure Internet). Si l'agent est fermé, les commandes sont quand même enregistrées : le panneau affiche l'erreur d'impression et vous pouvez réimprimer (🖨 sur la carte) une fois l'agent relancé.

Imprimante **réseau** (Ethernet) : mettez `"print_mode": "network", "print_host": "192.168.1.50", "print_port": 9100` dans le fichier — l'agent doit alors tourner sur un ordinateur du même réseau que l'imprimante.
