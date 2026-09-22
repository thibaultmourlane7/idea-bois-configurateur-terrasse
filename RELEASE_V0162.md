# Release stable V0.16.2 — validation du socle

Date de validation : 2026-09-22
Commit de référence : 95ff60b34a6a75c18ab0f66b362976d838681e8b

## État validé

- géométries rectangle, L, T, U, cercle et forme libre ;
- forme libre cotée, déplacement de sommets et dessin point par point ;
- réservations intérieures, débordantes et totalement extérieures ;
- calepinage lames : pose droite, décalée 1/2 et décalée 1/3 ;
- raccords de lames alignés sur des axes globaux cohérents ;
- lambourdes de champ, lambourdes de contour et option double lambourdage ;
- plots et niveaux pour la recette Pin du Nord validée ;
- quantités et panier associés ;
- plan 2D coté ;
- non-régression du bug de multiplication massive des lambourdes/plots en forme libre avec rive inclinée.

## Vérification automatisée

Workflow GitHub Actions : run 35744890453
- 11 fichiers de tests : OK
- 87 tests : OK
- build TypeScript/Vite : OK
- GitHub Pages : déploiement OK

## Limites conservées

- Les structures précises des autres familles restent à valider avant activation.
- La pose diagonale n'est pas activée.
- Les textures réalistes restent hors chantier.
- L'ERP IDEA Bois n'est pas connecté.

Cette version constitue la base stable de référence avant extension fonctionnelle.
