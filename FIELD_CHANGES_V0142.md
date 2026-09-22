# Changements de champs — V0.14.2-A

Aucun champ métier existant n'est supprimé.

## TextureQualityStatus
Nouveau :
- `exact`
- `close`
- `neutral`

## TextureFinishType
Nouveau :
- `smooth`
- `grooved`
- `brushed`
- `structured`
- `reversible`
- `other`

## ProductTextureAsset
Nouveau modèle visuel indépendant du BoardSpec :
- `id`
- `boardIds`
- `label`
- `materialFamily`
- `finishType`
- `tone`
- `status`
- `previewImageUrl?`
- `textureImageUrl?`
- `sourceLabel`
- `sourceUrl?`
- `sourceLicense?`
- `referenceSourceUrl?`
- `textureScaleMmX`
- `textureScaleMmY`
- `repeatMode`
- `tintColor?`
- `tintOpacity?`
- `grooveCount?`
- `notes?`

Les dimensions de texture sont en millimètres.

## Séparation métier / visuel
Les champs de texture n'entrent dans aucun calcul de prix, quantité, panier, structure ou validation technique.
