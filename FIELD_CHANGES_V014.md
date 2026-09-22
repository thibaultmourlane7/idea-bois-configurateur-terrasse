# Changements de champs — V0.14

Aucun champ existant n'est supprimé.

## BoardVisualData
Nouveau type :
- `baseColor: string`
- `grainColor: string`
- `accentColor?: string`
- `imageUrl?: string`
- `imageSourcePageUrl?: string`
- `imageStatus: 'verified-media' | 'catalog-described'`

## BoardSpec
Ajout :
- `visual?: BoardVisualData`

## ProjectInput
Ajout :
- `edgeCladdingHeightCm: number`

Unité : centimètres.
Obligatoire.
Utilisé uniquement lorsque l'habillage latéral est activé.

## Partage / sauvegarde
Le snapshot partagé passe en version 3.
La hauteur d'habillage est conservée.
Les versions précédentes restent lisibles avec reprise de la valeur par défaut du projet.
