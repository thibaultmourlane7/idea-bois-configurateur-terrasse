# IDEA Bois — Configurateur Terrasse V0.16

## Gros lot V0.16 — structure technique avancée

La V0.16 ajoute un plan structurel calculé pour la recette Pin du Nord 145x27 + lambourde pin Classe 4 60x40 + plots réglables.

### Niveaux et pente
L'étape Support permet de renseigner :
- la hauteur finie au point de référence ;
- un support plan ou un relevé de niveaux aux 4 coins ;
- les écarts de niveau en millimètres, avec le coin haut-gauche comme référence 0 ;
- une pente volontaire du dessus fini sur X et Y.

Aucune pente n'est imposée automatiquement.

### Implantation des plots
Pour la recette prise en charge :
- les lambourdes sont positionnées à partir de l'entraxe commercial documenté ;
- les plots sont implantés avec un espacement maximum de 70 cm conformément à la fiche IDEA Bois / JOUPLAST utilisée par cette version ;
- les réservations qui coupent une lambourde créent des segments et des appuis de rive ;
- la hauteur de chaque plot est calculée individuellement ;
- si une hauteur n'est couverte par aucune référence du catalogue intégré, elle reste explicitement à confirmer.

### Carte de hauteurs
La V0.16 affiche :
- lambourdes ;
- plots ;
- hauteur requise de chaque plot ;
- hauteur mini / maxi ;
- références de plots regroupées par plage ;
- quantité de lambourdes commerciales ;
- jonctions de lames détectées.

### Double lambourdage : option uniquement
Le double lambourdage aux jonctions de lames n'est PAS appliqué dans le calcul de base.

Par défaut :
- les jonctions sont repérées ;
- une seule lambourde est comptée sur l'axe de jonction ;
- les quantités structurelles restent en simple lambourdage.

Si l'utilisateur active l'option « Double lambourdage » :
- une seconde lambourde est ajoutée sur chaque axe de jonction détecté ;
- les longueurs de lambourdes sont recalculées ;
- les plots correspondants sont doublés dans le panier ;
- les vues 2D / 3D montrent le renfort.

### Panier structurel
Pour la recette V0.16 prise en charge, le panier utilise :
- les longueurs réelles du plan de lambourdes ;
- l'optimisation en pièces commerciales de 2,40 m ;
- le nombre réel d'appuis du plan ;
- le choix de la gamme de plot selon la hauteur de chaque appui ;
- le double lambourdage uniquement si l'option est activée.

### Limites volontaires
Le plan précis V0.16 n'est pas étendu automatiquement aux autres gammes lorsque la section de lambourde ou la règle fabricant n'est pas suffisamment validée.

## V0.15 conservée
L'éditeur interactif, la forme libre, les réservations déplaçables, zoom/pan, annuler/rétablir et fond plan/photo restent disponibles.

## Textures
Le chantier textures reste volontairement en pause au point V0.14.2-B1.

## Règle permanente
Aucun temps de pose, aucune durée, aucune heure ni aucun coût de main-d'œuvre.
