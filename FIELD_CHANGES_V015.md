# Changements de champs — V0.15

## ShapeType
Ajout :
- `freeform`

Valeurs existantes conservées :
- rectangle
- l-shape
- t-shape
- u-shape
- circle

## TerracePoint
Nouveau type :
```ts
interface TerracePoint {
  xM: number;
  yM: number;
}
```

Unités : mètres.

## ProjectInput
Ajout optionnel :
```ts
freeformPoints?: TerracePoint[];
```

Ce champ n'est utilisé que lorsque `shape === 'freeform'`.

## Partage
Snapshot passé en version 4.
Les versions 1, 2 et 3 restent lisibles.

## Sauvegarde locale
Clé active :
`idea-bois-terrasse-v015`

La clé V0.14 reste dans la chaîne de compatibilité.

## Intégration SpeedArti
Version payload :
`0.15.0`

Aucun champ existant n'est supprimé ou renommé.
