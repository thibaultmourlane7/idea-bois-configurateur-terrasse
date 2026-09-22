# Changements de champs — stabilisation V0.16

## TerraceObstacle

Aucun champ ajouté.

### Changement de sémantique
- `xM: number` — mètres ; peut désormais être négatif.
- `yM: number` — mètres ; peut désormais être négatif.

Une coordonnée négative signifie que la réservation dépasse à gauche / en haut du repère de terrasse. Seule l'intersection réservation × terrasse impacte le calcul.

## LayoutResult

Ajouts :

```ts
boardSegments: LayoutBoardSegment[];
buttJoints: LayoutButtJoint[];
```

### LayoutBoardSegment
- `rowIndex` : index de rangée ;
- `intervalIndex` : index du segment géométrique de la rangée ;
- `segmentIndex` : morceau de lame dans l'intervalle ;
- `transverseCenterMm` : position du centre de rangée, en mm ;
- `startMm` : début longitudinal, en mm ;
- `endMm` : fin longitudinale, en mm ;
- `lengthMm` : longueur du morceau, en mm.

### LayoutButtJoint
- `rowIndex` : rangée concernée ;
- `transverseCenterMm` : centre de la rangée, en mm ;
- `axisPositionMm` : position longitudinale du raccord, en mm.

## PlannedJoistSegment

Ajout optionnel :

```ts
role?: 'field' | 'perimeter' | 'butt-joint';
```

- `field` : lambourde courante ;
- `perimeter` : lambourde de contour ;
- `butt-joint` : axe supportant un raccord de lames.

## SupportPlanResult

Ajout optionnel :

```ts
pendingCurvedPerimeter?: boolean;
```

`true` signale qu'une partie courbe du contour a été détectée mais qu'aucune solution de lambourde courbe n'a été inventée / comptée.
