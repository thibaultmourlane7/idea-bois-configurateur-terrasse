# Changements de champs — V0.8

Les ajouts ci-dessous sont explicites afin d'éviter toute rupture silencieuse lors de l'intégration.

## ProjectInput
Ajout :
- `supportSystem: 'adjustable-pedestals' | 'pads' | 'unknown'`
- obligatoire ;
- rôle : sélectionne le mode d'appui à chiffrer ;
- aucune valeur n'est déduite silencieusement.

## BoardSpec
Ajout :
- `commercialRecipeId?: 'idea-pin-nord-145x27' | 'silvadec-atmosphere-138x23'`
- optionnel ;
- rôle : rattacher une lame à une recette commerciale documentée sans modifier le moteur normatif.

## ConfiguratorResult
Ajout :
- `basket?: BasketResult`
- rôle : panier matériaux B2C indépendant des diagnostics normatifs.

## BasketResult / BasketLine
Nouveaux types :
- familles : decking, joists, supports, fixings, protection, accessories ;
- statuts : exact, range, informative, pending ;
- montants exacts ou bornes min/max explicitement séparés.

Aucun champ existant n'a été renommé ou supprimé en V0.8.
