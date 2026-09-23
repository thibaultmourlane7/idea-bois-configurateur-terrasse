# Sprint I — Escaliers — V1.3.0

Date : 2026-09-23

## Périmètre roadmap
Le Sprint I couvre exactement :
- marches ;
- hauteur ;
- profondeur ;
- structure ;
- quantités.

Le Sprint J garde les garde-corps hors de ce périmètre.

## Principe métier
Un escalier ne peut être créé que sur une **relation de niveau réelle** produite par le Sprint H.

Chaque escalier référence :
- une relation entre plateformes ;
- un segment réel de frontière ;
- une position sur ce segment ;
- une largeur ;
- une profondeur de marche ;
- un nombre de marches ;
- éventuellement un nombre de lignes porteuses / limons saisi humainement ;
- la lame des marches, par défaut la lame principale.

Aucune dimension normative n’est préremplie.

## Marches et hauteurs
Le moteur calcule :
- la plateforme basse et la plateforme haute ;
- la hauteur à franchir à gauche et à droite ;
- la hauteur résultante par marche ;
- le développement horizontal total ;
- la géométrie 3D de chaque marche.

Si la différence de niveau change de sens sur la largeur de l’escalier, le calcul est bloqué.

## Profondeur et implantation
La profondeur de marche est une donnée explicite.
La position et la largeur doivent rester dans la frontière sélectionnée.

L’emprise totale de l’escalier doit rester dans la plateforme basse. Sinon le calcul est bloqué.

## Calepinage et matière
L’emprise de l’escalier est retirée du calepinage de la plateforme basse.

Les morceaux de lame des marches sont ajoutés aux `RequiredPiece` du même moteur que la terrasse.

Conséquence :
- pas de double comptage des lames situées sous l’escalier ;
- optimisation globale terrasse + marches ;
- réemploi possible des chutes entre terrasse et escalier ;
- liste de débit et achat cohérents avec les pièces de marche.

Une marche plus large que la plus grande longueur commerciale validée est bloquée : le moteur n’invente pas un raccord de marche sans règle structurelle.

## Structure
Le moteur **ne choisit pas** le nombre de limons / lignes porteuses.

Ce nombre peut être renseigné explicitement par l’utilisateur.
À partir de ce nombre, le moteur calcule uniquement :
- les axes porteurs géométriques ;
- leur longueur 3D ;
- la longueur totale géométrique.

Restent à valider avant commande :
- section ;
- essence / matériau ;
- référence produit ;
- découpe réelle des limons ;
- mode d’appui ;
- fixations ;
- espacements structurels éventuels.

## Panier
Les lames de marches sont intégrées dans l’optimisation et le panier de lame existants.

Des lignes séparées restent en statut **pending** pour :
- structure escalier ;
- fixations escalier.

Aucun prix ou produit structurel n’est inventé.

## Vues
- Plan 2D : emprise et marches.
- 3D : marches réelles et axes structurels saisis.
- Dossier chantier PDF : page Escaliers avec dimensions, hauteurs, développement et quantités.

## Sauvegarde et partage
- sauvegarde locale : schemaVersion 12 ;
- partage URL : snapshot V12 ;
- lecture des snapshots V1 à V11 maintenue.

## Garde-fous
Le moteur bloque :
- données géométriques manquantes ;
- relation ou segment supprimé ;
- largeur hors frontière ;
- emprise hors plateforme basse ;
- largeur supérieure à la longueur commerciale disponible ;
- différence de niveau inversée sur la largeur ;
- chevauchement de deux escaliers sur la même frontière ;
- nombre de lignes porteuses invalide.

L’absence de nombre de limons ne bloque pas les marches, mais déclenche un avertissement et laisse la structure/fixation à confirmer.

## Hors périmètre
- garde-corps : Sprint J ;
- règles fabricant d’escalier non fournies ;
- prix/stock live ;
- ERP ;
- main-d’œuvre, durée ou coût de pose.
