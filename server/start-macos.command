#!/bin/bash
# L'Artisan — order server (macOS / Linux). Double-click in Finder, or run: ./start-macos.command
cd "$(dirname "$0")"
export PATH="$PATH:/usr/local/bin:/opt/homebrew/bin"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js n'est pas installé. Téléchargez la version LTS (22+) sur https://nodejs.org puis relancez."
  open https://nodejs.org/ 2>/dev/null
  read -n 1 -s -r -p "Appuyez sur une touche pour fermer…"; exit 1
fi
MAJ=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$MAJ" -lt 22 ]; then echo "Node.js $MAJ est trop ancien — installez Node.js 22 LTS ou plus récent."; read -n 1 -s -r; exit 1; fi
[ -d node_modules ] || { echo "Première installation des dépendances…"; npm install --omit=dev --no-audit --no-fund; }
echo; echo "Démarrage du serveur… Laissez cette fenêtre ouverte pendant le service (Ctrl+C pour arrêter)."; echo
( sleep 2; open http://localhost:3000/admin 2>/dev/null || xdg-open http://localhost:3000/admin 2>/dev/null ) &
node src/index.js
