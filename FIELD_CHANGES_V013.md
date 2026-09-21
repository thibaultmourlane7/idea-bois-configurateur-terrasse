# Changements de champs — V0.13

Aucun champ existant n'est renommé ou supprimé.

## ShapeType
Valeurs ajoutées :
- `t-shape`
- `u-shape`
- `circle`

## Dimensions
Ajouts :
- `circleDiameterM: number`
- `tStemWidthM: number`
- `tBarDepthM: number`
- `uOpeningWidthM: number`
- `uOpeningDepthM: number`

Unités : mètres.

## TerraceObstacle
Nouveau type :
- `id: string`
- `kind: pool | tree | post | manhole | other`
- `label: string`
- `shape: rectangle | circle`
- `xM: number`
- `yM: number`
- `widthM?: number`
- `heightM?: number`
- `diameterM?: number`

Les coordonnées sont mesurées depuis le coin supérieur gauche de la boîte englobante du projet.

## ProjectInput
Ajout :
- `obstacles: TerraceObstacle[]`

## GeometryResult
Ajouts :
- `grossAreaM2`
- `excludedAreaM2`
- `outerPerimeterM`
- `obstaclePerimeterM`
- `obstacleCount`

`areaM2` reste la surface nette.
`perimeterM` reste le périmètre extérieur pour compatibilité avec les finitions de rive.

## Partage / sauvegarde
Le snapshot partagé passe au schéma V2 et conserve les nouvelles formes et réservations.
Les anciens liens V1 restent lisibles.
