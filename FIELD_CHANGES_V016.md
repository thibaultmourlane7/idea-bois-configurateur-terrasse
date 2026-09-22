# Changements de champs — V0.16

## ProjectInput

### supportLevelProfile?
Nouveau champ optionnel :
```ts
interface SupportLevelProfile {
  mode: 'flat' | 'four-corners';
  topLeftDeltaMm: number;
  topRightDeltaMm: number;
  bottomRightDeltaMm: number;
  bottomLeftDeltaMm: number;
  targetSlopeXPercent: number;
  targetSlopeYPercent: number;
}
```

### doubleJoistsAtButtJoints?
Nouveau booléen optionnel.

- absent / false : simple lambourdage ;
- true : double lambourdage sur les axes de jonction détectés.

## ConfiguratorResult

Ajout :
```ts
supportPlan?: SupportPlanResult
```

Le supportPlan contient les positions, hauteurs, groupes de plots et quantités structurelles calculées.

## Partage
Snapshot V5.

Les anciennes versions 1 à 4 restent lisibles.

## Sauvegarde locale
Clé active :
`idea-bois-terrasse-v016`

La clé V0.15 reste compatible en lecture.

## SpeedArti
Payload version :
`0.16.0`

Aucun champ métier existant n'est supprimé.
