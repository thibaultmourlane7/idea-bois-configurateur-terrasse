# Sprint F — Recette V1.0 professionnelle

Date : 2026-09-23

## Règle
Aucune nouvelle fonctionnalité métier n’est introduite dans ce sprint.
La V1 est déclarée uniquement si la matrice de non-régression passe sur le code réel.

## Matrice couverte
### Géométries
- rectangle simple ;
- grande terrasse ;
- L ;
- T ;
- U ;
- forme libre ;
- cercle.

### Réservations
- piscine ;
- arbre ;
- poteau ;
- réservation débordante.

### Calepinage
- pose droite ;
- décalage 1/2 ;
- décalage 1/3 ;
- diagonale +45° ;
- diagonale -45° ;
- plusieurs longueurs commerciales ;
- plusieurs zones ;
- orientation, motif, départ et produit propres à une zone.

### Produits
- Pin du Nord ;
- Cumaru ;
- Ipé ;
- Garapa ;
- Padouk ;
- SILVADEC.

**Règle d’acceptation :** si une donnée fabricant nécessaire manque, le scénario est réussi uniquement si le moteur bloque explicitement sans inventer la valeur. Garapa et Padouk restent ainsi bloqués sur le jeu de pose exact tant que cette donnée n’est pas validée.

### Structure et chantier
- lambourdes ;
- axes de raccord ;
- double lambourdage ;
- séparations de zones ;
- plots/appuis ;
- hauteurs variables ;
- pente finie ;
- rives métier ;
- habillage partiel ;
- profils / drainage / lame de rive en « à confirmer » lorsque la référence manque.

### Sorties
- liste d’achat ;
- liste de débit ;
- plan général ;
- plan des lames ;
- plan structure ;
- plan plots/appuis ;
- plan de coupe ;
- plan des finitions ;
- PDF client ;
- dossier chantier ;
- trace moteur.

## Test transversal
Une modification de dimensions est vérifiée sur la chaîne :
**géométrie → calepinage → structure → plots → fixations → chutes → quantités → prix → dossier/PDF**.

## Définition de V1
La V1 professionnelle signifie :
- le moteur ne masque pas les données manquantes ;
- les cas couverts recalculent de manière cohérente ;
- les éléments non documentés sont bloqués ou marqués à confirmer ;
- aucune main-d’œuvre ni durée n’est calculée ;
- les six plans et les deux listes chantier sont présents ;
- les tests historiques et la matrice V1 passent ensemble.
