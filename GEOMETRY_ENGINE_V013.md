# Moteur géométrique — V0.13

## Principe
La source de vérité géométrique est `src/engine/geometry.ts`.

Le même moteur fournit :
- contour du projet ;
- surface ;
- périmètre extérieur ;
- tests point-dans-forme ;
- intervalles de lames par rangée ;
- soustraction des réservations.

## Calepinage
Chaque rangée peut maintenant produire plusieurs segments.
Exemple : une piscine au milieu d'une terrasse coupe une rangée en une partie gauche et une partie droite.

Ces segments sont ensuite transmis au moteur d'optimisation des coupes existant.

## Marge de sécurité vis-à-vis des réservations
Pour le calepinage, le test de croisement tient compte de la demi-largeur de la lame sur l'axe transversal afin d'éviter qu'une lame empiète visuellement dans une réservation.

## Structure
Le calcul normatif de structure utilise désormais les mêmes intervalles géométriques lorsqu'il est disponible.

## Limite V0.13
Les réservations sont saisies par coordonnées et dimensions.
Le déplacement direct à la souris et la forme libre sont prévus pour V0.14.
