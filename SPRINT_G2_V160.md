# Sprint G2 — 3D immersive — V1.6.0

Date : 2026-09-23

## Objectif
Améliorer fortement l’expérience 3D client sans modifier le moteur de calcul.

Le Sprint G2 ajoute :
- une vue réaliste par défaut ;
- une vraie scène WebGL ;
- éclairage et ombres ;
- matériaux plus crédibles ;
- un bouton « Main » pour piloter uniquement la caméra ;
- rotation libre autour du projet ;
- zoom molette / pincement ;
- déplacement de caméra ;
- recentrage ;
- une vue technique séparée qui conserve l’ancien rendu de contrôle.

## Source de vérité
La scène réaliste ne reconstruit pas une terrasse approximative.

Elle consomme directement `buildProfessional3DScene()`, donc :
- chaque lame vient d’un segment réel du calepinage ;
- les pentes et niveaux viennent du moteur ;
- les lambourdes et plots restent les éléments calculés ;
- les marches sont celles du Sprint I ;
- les garde-corps sont ceux du Sprint J ;
- les réservations restent celles du projet.

Aucun calcul métier n’est déplacé dans le moteur d’affichage.

## Vue réaliste
Technologie :
- Three.js / WebGL ;
- caméra perspective ;
- éclairage hémisphérique ;
- soleil directionnel avec ombres douces ;
- tone mapping ;
- sol neutre de mise en situation ;
- matériaux de lames générés à partir des couleurs et profils visuels déjà présents.

Les textures « proches » restent explicitement signalées comme telles.

## Outil Main
Le bouton « Main » active ou verrouille les contrôles de caméra.

Main active :
- glisser : tourner autour du projet ;
- molette / pincement : zoomer ;
- clic droit / deux doigts : déplacer le point de vue.

Le bouton ne modifie jamais :
- géométrie ;
- dimensions ;
- calepinage ;
- structure ;
- quantités ;
- prix ;
- projet.

## Vue technique
L’ancienne vue 3D canvas est conservée dans `TechnicalPreview3D.tsx`.

Elle reste disponible via le bouton « Vue technique ».

Elle sert à :
- contrôler structure ;
- visualiser plots / lambourdes ;
- vérifier les couches ;
- conserver le rendu historique en secours si nécessaire.

## Réalisme et fidélité
La vue réaliste représente :
- lames avec épaisseur ;
- chants ;
- escaliers ;
- garde-corps ;
- obstacles ;
- habillages de rive ;
- structure si les couches correspondantes sont activées ;
- plots si activés.

Les niveaux verticaux et limites de caméra utilisent les vraies bornes de la scène.

## Responsive
La vue WebGL :
- s’adapte à la largeur du conteneur ;
- limite le ratio de pixels pour préserver les performances ;
- accepte souris, trackpad et tactile ;
- conserve un cadrage mobile dédié.

## Garde-fou WebGL
Si WebGL n’est pas disponible :
- un message explicite est affiché ;
- la vue technique reste accessible immédiatement.

## Recette
Scénarios obligatoires :
- rectangle ;
- terrasse en L ;
- terrasse en U ;
- pose diagonale ;
- produit à plusieurs longueurs commerciales ;
- multi-niveaux ;
- escalier extérieur ;
- garde-corps escalier.

Vérification critique :
la construction de la scène immersive ne doit modifier aucun résultat de géométrie, prix, panier ou débit.

## Version
- application : V1.6.0 ;
- moteur : IB-TERR-VERSION-1.6.0 ;
- tag visuel immersif : SA-TERR-3D-IMMERSIVE-160.

## Hors périmètre
- aucune nouvelle règle de calcul ;
- aucune modification des quantités ;
- aucune modification des prix ;
- aucun objet décoratif présenté comme élément réel du chantier ;
- aucun changement ERP / stock / prix live.
