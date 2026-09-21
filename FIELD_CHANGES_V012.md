# Changements de champs — V0.12

## BoardSpec
Ajout :
- `gapRangeMm?: [number, number]`

Rôle :
conserver une plage fabricant sans la convertir en valeur unique.

Exemple V0.12 :
- Garapa 145x21 : `[8, 10]` mm.

Extension :
`commercialRecipeId` accepte maintenant :
- `idea-pin-nord-145x27`
- `idea-cumaru-145x21`
- `idea-garapa-145x21`
- `idea-padouk-120x21`
- `idea-ipe-140x20`
- `silvadec-atmosphere-138x23`

Aucun champ existant n'est renommé ou supprimé.

## Règle moteur
Seules les recettes commerciales explicitement documentées peuvent déclencher automatiquement structure/fixations.
Les produits sans recette restent `pending`.
