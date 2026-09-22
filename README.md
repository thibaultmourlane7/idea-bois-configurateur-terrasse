# IDEA Bois — Configurateur Terrasse V0.14

## Gros lot V0.14 — construction visuelle progressive

La terrasse se construit désormais visuellement au fil du parcours.

### Nouveau parcours
1. Dimensions / forme / réservations
2. Lames et sens de pose
3. Support, hauteur et plots
4. Finitions / rives
5. Projet final

### Construction progressive
- étape 1 : contour et réservations ;
- étape 2 : lambourdes calculées selon la règle documentée de la lame ;
- étape 3 : plots/appuis visualisés sous les lambourdes lorsque le panier fournit une quantité exacte ;
- étape 4 : rives + supports verticaux d'habillage ;
- étape 5 : lames visibles et structure masquée par défaut.

### Couches 2D / 3D
La vue finale propose :
- Lames
- Rives
- Lambourdes
- Lambourdes verticales
- Plots
- Réservations
- Support

Raccourcis :
- Fini
- Structure
- Éclaté

Une vue de côté complète la vue de dessus et l'aperçu 3D.

## Habillage bois intelligent
Pour une terrasse bois sans accessoire de rive dédié :
- la même lame que le platelage est utilisée ;
- la hauteur d'habillage est saisie explicitement ;
- le nombre de rangs est calculé ;
- les longueurs de rive sont optimisées dans les longueurs commerciales ;
- les lambourdes verticales sont ajoutées ;
- chaque morceau vertical a la longueur de la hauteur d'habillage ;
- l'entraxe horizontal suit la règle documentée de la gamme ;
- les extrémités de chaque rive sont supportées ;
- les morceaux de lambourde sont optimisés dans des longueurs commerciales de 2,40 m.

Le composite conserve ses accessoires de finition dédiés lorsqu'ils existent.

## Textures produit
Le modèle visuel distingue :
- `verified-media` : image produit IDEA Bois directement vérifiée ;
- `catalog-described` : rendu visuel basé sur l'essence, le profil et la teinte publiés, sans inventer une photo.

La V0.14 intègre une première texture photo vérifiée sur la gamme Padouk et prépare le même mécanisme pour toutes les autres références dès que leurs médias sont mappés de façon fiable.

## Important
La position des plots en V0.14 est une représentation visuelle répartissant la quantité commerciale exacte du panier sur les lambourdes. Le positionnement structurel définitif des plots fait partie du moteur technique avancé V0.16.

## Règle ferme
Aucun temps de pose, aucune durée, aucune heure ni aucun coût de main-d'œuvre.
