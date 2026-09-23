# Sprint I — Correctif escaliers — V1.3.1

Date : 2026-09-23

## Problème constaté
La première version V1.3.0 ne permettait de créer un escalier que sur une transition entre deux plateformes du Sprint H.

Conséquence : sur une terrasse simple à un seul niveau, l'utilisateur voyait qu'aucune transition n'était disponible et ne pouvait pas créer l'escalier d'accès vers le jardin / sol extérieur.

Le moteur d'escalier existait, mais le cas d'usage principal d'un escalier de terrasse était absent.

## Correctif
Le Sprint I gère désormais deux modes explicites :

1. **Accès extérieur**
   - départ sur une rive droite de la terrasse ;
   - position sur la rive ;
   - largeur ;
   - niveau d'arrivée extérieur saisi en mm par rapport au support de référence du projet ;
   - profondeur de marche ;
   - nombre de marches ;
   - nombre de lignes porteuses / limons optionnel.

2. **Entre plateformes**
   - fonctionnement V1.3 conservé ;
   - transition réelle Sprint H ;
   - segment de frontière ;
   - position, largeur, profondeur, marches et structure.

## Aucun niveau d'arrivée inventé
Pour un escalier extérieur, le niveau d'arrivée est une donnée obligatoire.

Le moteur ne suppose pas automatiquement que :
- le jardin est à 0 mm ;
- le sol extérieur est au niveau du support ;
- une hauteur de marche standard doit être utilisée.

La valeur 0 mm peut être saisie volontairement si l'arrivée correspond au support de référence.

## Géométrie extérieure
Le moteur détermine le côté extérieur de la rive puis développe l'escalier hors de la terrasse.

Le niveau de la terrasse au droit de l'escalier tient compte :
- de la hauteur finie du projet ;
- de la plateforme présente derrière la rive ;
- de sa pente locale.

Le niveau d'arrivée peut être plus bas ou plus haut que la terrasse.

## Affichage
Les emprises d'escaliers extérieurs sont incluses dans :
- le cadrage du plan 2D ;
- le cadrage 3D ;
- le plan Escaliers du dossier chantier PDF.

Un escalier extérieur n'est donc plus coupé lorsqu'il dépasse du contour de la terrasse.

## Quantités
Comme en V1.3 :
- les lames de marches entrent dans l'optimiseur matière ;
- elles peuvent partager les longueurs commerciales et les chutes avec les lames de terrasse ;
- la structure et les fixations restent « à confirmer » sans règle fabricant.

## Limite explicite
Une rive courbe n'est pas transformée automatiquement en implantation d'escalier.
Le moteur exige actuellement une rive droite pour l'accès extérieur, afin de ne pas inventer une tangente ou une géométrie d'implantation.

## Version
- application : V1.3.1 ;
- moteur : IB-TERR-VERSION-1.3.1 ;
- schéma de partage : V12 inchangé, les nouveaux champs étant optionnels et compatibles avec les projets V1.3.
