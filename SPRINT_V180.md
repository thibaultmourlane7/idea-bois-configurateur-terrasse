# Sprint V1.8 — 3D, navigation et options avancées

Date : 2026-09-24

## Objectifs validés
1. Afficher en 3D les vraies jonctions de lames déjà visibles en 2D.
2. Corriger le rendu trop blanc des lames en 3D.
3. Revenir automatiquement en haut de page à chaque changement d'étape.
4. Replier par défaut les options non indispensables.

## Jonctions 3D
La vue réaliste utilise uniquement `layout.buttJoints`.
Chaque raccord calculé par le moteur devient un marqueur transversal discret sur la lame.
Aucun raccord supplémentaire n'est inventé.

## Couleur des lames
La teinte du produit reste issue du référentiel existant.
Le matériau Three.js porte désormais explicitement cette teinte.
La texture procédurale sert au veinage et devient quasi neutre afin de ne plus délav er la couleur.
L'éclairage et l'exposition ont également été réduits pour préserver la couleur du bois.

## Navigation entre étapes
Tout changement d'étape déclenche un retour en haut de page :
- bouton Continuer ;
- bouton Retour ;
- clic direct sur une étape ;
- reprise d'un projet ouvrant l'étape finale.

Comportement identique smartphone / ordinateur.

## Options avancées repliées par défaut
Les fonctions restent disponibles mais ne surchargent plus le parcours principal :
- zones à exclure / réservations ;
- zones de pose supplémentaires ;
- renfort aux jonctions ;
- niveaux et pente du support ;
- plateformes multi-niveaux ;
- escaliers ;
- drainage ;
- garde-corps.

Les blocs utilisent des éléments `details` fermés par défaut, donc accessibles sans supprimer aucune fonction métier.

## Non-régression
Aucun changement sur :
- géométrie ;
- quantités ;
- prix ;
- calepinage ;
- structure ;
- règles de compatibilité ;
- PDF ;
- logique des escaliers / garde-corps.

Version application : 1.8.0
Moteur : IB-TERR-VERSION-1.8.0
