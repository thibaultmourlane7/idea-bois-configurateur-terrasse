# Structure technique avancée — V0.16

## Moteur
Fichier principal :
- `src/engine/supportPlan.ts`

L'UI ne calcule pas les quantités. Elle modifie uniquement les champs du `ProjectInput`.

## Données ajoutées
### supportLevelProfile
- mode : `flat | four-corners`
- topLeftDeltaMm
- topRightDeltaMm
- bottomRightDeltaMm
- bottomLeftDeltaMm
- targetSlopeXPercent
- targetSlopeYPercent

Les unités sont explicites :
- niveaux : millimètres ;
- pente : pourcentage.

### doubleJoistsAtButtJoints
Booléen optionnel.
Valeur absente = `false`.

Ce champ contrôle exclusivement le renfort double sur les axes de jonction de lames.

## Référence des niveaux
Le coin haut-gauche est le point de référence 0.

Les autres valeurs sont interprétées comme des écarts mesurés par rapport à ce point.

## Calcul de hauteur d'un plot
Principe :
```
hauteur plot =
  hauteur finie de référence
  + variation de niveau fini demandée
  - variation du support existant
  - épaisseur de lame
  - hauteur de lambourde
```

Aucune hauteur de plot n'est arrondie vers une référence arbitraire.

Le moteur sélectionne uniquement un produit dont la plage de réglage couvre la hauteur calculée.

## Jonctions de lames
Le calepinage peut détecter un raccord lorsque la longueur à couvrir dépasse la longueur commerciale maximale disponible.

L'axe de raccord est conservé dans le plan.

Par défaut :
- multiplicité lambourde = 1.

Option double activée :
- multiplicité lambourde = 2 ;
- multiplicité des appuis sur cet axe = 2.

Le moteur ne définit pas encore un écart physique entre les deux lambourdes : il compte le renfort matière sans inventer une cote de pose non validée.

## Réservations
Une réservation qui coupe une lambourde divise celle-ci en plusieurs segments.
Chaque segment reçoit ses propres appuis d'extrémité et ses appuis intermédiaires.

## Traçabilité
Tag moteur :
`SA-TERR-SUPPORT-PLAN-016`

Le résultat conserve :
- positions des lambourdes ;
- positions des plots ;
- hauteur demandée de chaque plot ;
- produit associé ;
- jonctions détectées ;
- quantité commerciale de lambourdes ;
- points hors gamme.
