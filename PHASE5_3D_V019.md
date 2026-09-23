# Phase 5 — V0.19 — 3D enrichie

Date : 2026-09-22

## Évolutions intégrées

- la vue 3D utilise le plan structurel réel quand il est disponible ;
- les lambourdes de contour sont distinguées ;
- le double lambourdage est conservé visuellement à partir de la multiplicité réelle du moteur ;
- les raccords de lames issus du calepinage sont matérialisés ;
- les plots reprennent les positions et hauteurs du plan structurel ;
- une surface de sol simple est affichée pour donner un repère visuel ;
- les réservations sont mieux différenciées : piscine, arbre, poteau ;
- les structures non validées ne génèrent plus de trame 3D fictive ;
- le Bambou reste sans structure 3D calculée tant que ses règles structurelles ne sont pas validées ;
- les textures réalistes restent volontairement hors chantier.

## Garde-fous

- aucune donnée structurelle n'est inventée pour améliorer le rendu ;
- la 3D suit le moteur métier et non l'inverse ;
- les couches peuvent toujours être affichées/masquées ;
- l'ERP IDEA Bois reste hors périmètre.

## Vérification

Les tests de non-régression couvrent :
- forme libre avec réservation ;
- reprise du plan structurel réel ;
- absence de structure fictive pour le Bambou ;
- conservation du double lambourdage.
