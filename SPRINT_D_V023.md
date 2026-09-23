# Sprint D — Catalogue métier / compatibilités — V0.23.0

Date : 2026-09-23

## Objectif
Créer une matrice métier qui couvre toutes les références du catalogue et empêcher toute compatibilité silencieusement supposée.

## Couverture catalogue
Les 38 références de lame IDEA Bois présentes dans le dépôt sont désormais évaluées sur :
- données catalogue ;
- jeu de pose / calepinage ;
- structure / lambourdes ;
- fixations ;
- plots / appuis ;
- rives / finitions ;
- aptitude à être utilisée comme produit distinct dans une zone.

Chaque famille est classée :
- validée ;
- partielle ;
- manquante.

Une compatibilité manquante reste affichée comme telle.

## Produit différent par zone
Une zone de pose peut désormais sélectionner une lame différente du produit principal.

### Garde-fou obligatoire
Le changement est autorisé uniquement lorsque :
- les deux lames appartiennent au même système constructif / recette validée ;
- le jeu de pose exact est connu pour les deux ;
- structure et fixations sont validées ;
- l'épaisseur est identique.

Un mélange entre systèmes différents est bloqué avec le diagnostic :
`SA-TERR-COMPAT-ZONE-002`.

Exemple : plusieurs variantes Pin du Nord 145 × 27 mm peuvent être utilisées sur des zones distinctes.
Un passage Pin du Nord → Cumaru n'est pas autorisé tant que la jonction structurelle entre ces systèmes n'est pas documentée.

## Calculs par produit
Le calepinage utilise pour chaque zone :
- largeur de lame ;
- jeu de pose ;
- longueurs commerciales ;
- produit sélectionné.

Les achats sont ensuite regroupés par référence :
- pièces nécessaires ;
- optimisation de coupe ;
- longueurs commerciales achetées ;
- chutes ;
- surface achetée ;
- prix de la lame.

Les chutes de deux références différentes ne sont jamais mélangées dans le même stock.

## Structure
Le multi-produit est volontairement limité à un même système constructif.
Le moteur structurel existant reste donc valable sans inventer une règle de jonction entre deux familles différentes.

## Interface
L'éditeur de zones propose désormais un sélecteur de produit limité aux variantes compatibles.
Une matrice de compatibilité est affichée pour le produit principal sélectionné.

## PDF / panier
Le panier peut contenir plusieurs lignes de lames, une par référence utilisée.
Le dossier PDF détaille les stocks et zones pour chaque produit.

## Non-régression
Les projets mono-produit gardent leur comportement historique :
- identifiant de ligne panier `decking` conservé ;
- moteur de structure inchangé ;
- optimisation des chutes V0.21 conservée ;
- rives V0.22 conservées.

## Règles de vérité
- aucun SKU inventé ;
- aucune compatibilité inter-systèmes supposée ;
- aucune règle de transition de niveau inventée ;
- aucune donnée fabricante manquante remplacée par une valeur générique.
