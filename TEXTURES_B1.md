# Affinage Pin strié — V0.14.2-B1

## Architecture
Nouveaux fichiers :
- `src/visual/materialProfiles.ts`
- `src/visual/textureVariants.ts`
- `src/visual/texturePainter.ts`

## Profil de rainures
Pour G028 et G030 :
- bande 1 : 3,5 % à 31 % de la largeur ;
- bande centrale : 31 % à 69 %, volontairement plus lisse ;
- bande 2 : 69 % à 96,5 % ;
- 13 rainures par bande ;
- 26 rainures visuelles au total.

Les joints extérieurs restent plus marqués que les rainures internes.

## Variantes
Quatre variantes déterministes sont disponibles.
Chaque variante change :
- le départ de texture ;
- légèrement la luminosité ;
- la position de quelques nœuds.

La sélection dépend de l'index de lame et de segment, donc un projet partagé ou rouvert conserve le même aspect.

## Source de base
Poly Haven — Coated Pine, CC0.
La page Poly Haven identifie la matière comme pin noueux et fournit diffuse, normal et roughness.
La V0.14.2-B1 n'utilise encore que la diffuse ; les cartes PBR sont réservées au lot B3.

## Statut
Le Pin strié vert et marron restent `close`, pas `exact`.
