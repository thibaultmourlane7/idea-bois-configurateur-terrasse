# IDEA Bois — Configurateur Terrasse V0.15

## Gros lot V0.15 — éditeur visuel interactif

La V0.15 transforme l'étape géométrie en véritable éditeur de plan.

### Réservations interactives
Les piscines, arbres, poteaux, regards et autres réservations peuvent maintenant :
- être déplacés directement au pointeur ;
- être sélectionnés ;
- être redimensionnés avec une poignée ;
- conserver en parallèle leurs champs numériques précis ;
- afficher dimensions et distances depuis la gauche / le haut.

Chaque modification met immédiatement à jour le projet transmis au moteur métier.

### Zoom / pan
L'éditeur fournit :
- zoom avant / arrière ;
- recentrage ;
- déplacement du plan ;
- grille visuelle de 0,50 m.

### Annuler / rétablir
Les modifications de géométrie disposent d'un historique local :
- boutons Annuler / Rétablir ;
- Ctrl/Cmd + Z hors champs de saisie ;
- Ctrl/Cmd + Maj + Z ou Ctrl/Cmd + Y pour rétablir.

### Forme libre
Une nouvelle forme `freeform` est disponible.
Le client peut :
- déplacer les sommets ;
- ajouter un sommet sur la plus longue arête ;
- supprimer un sommet en conservant au minimum 3 points ;
- voir la longueur de chaque arête ;
- recalculer surface, périmètre, lames et panier avec ce vrai contour polygonal.

Une forme libre auto-croisée est bloquée explicitement.

### Fond plan / photo
Un plan ou une photo locale peut être affiché en fond de l'éditeur avec réglage d'opacité.

Important :
- le fichier reste local au navigateur ;
- aucune cote n'est extraite automatiquement ;
- l'image n'entre dans aucun calcul ;
- elle sert uniquement de référence visuelle pour préparer les futurs imports/calibrages.

### Persistance
La forme libre et ses sommets sont intégrés :
- au lien partagé ;
- à la sauvegarde locale ;
- au PDF client ;
- au payload SpeedArti.

## Textures
Le chantier textures V0.14.2-B1 est volontairement mis en pause.
Point de reprise conservé :
- Pin du Nord strié vert/marron : profil B1 déjà intégré ;
- rendu encore à affiner ultérieurement avec le travail dédié textures ;
- V0.15 ne modifie pas ces règles visuelles.

## Règle permanente
Aucun temps de pose, aucune durée, aucune heure ni aucun coût de main-d'œuvre.
