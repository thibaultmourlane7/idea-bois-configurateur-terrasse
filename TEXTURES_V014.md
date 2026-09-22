# Référentiel visuel produit — V0.14.1

## Principe
La fidélité visuelle est prioritaire sur un rendu décoratif approximatif.

Aucune couleur synthétique ne doit être présentée comme le rendu du produit réel.

## États
### verified-media
Une URL média IDEA Bois a été directement vérifiée.
La photo peut être utilisée dans :
- carte produit ;
- plan 2D ;
- base visuelle 3D.

### verified-product-page
La fiche produit officielle est vérifiée, mais l'URL directe de la photo n'est pas encore mappée.
Le configurateur affiche un placeholder neutre « Photo IDEA Bois — page produit vérifiée ».

### unmapped
Le groupe n'est pas encore relié à une fiche produit visuelle précise.
Le configurateur reste neutre.

## Produits prioritaires mappés vers leur fiche officielle
| Groupe | Produit de référence | Code officiel | Statut média |
| --- | --- | --- | --- |
| G027 | Pin du Nord lisse Classe 4 vert 145x27 | TSL300145027E | fiche vérifiée |
| G028 | Pin du Nord strié Classe 4 vert 145x27 | TSS300145027E | fiche vérifiée |
| G029 | Pin du Nord lisse Classe 4 marron 145x27 | TSL300145027M | fiche vérifiée |
| G030 | Pin du Nord strié Classe 4 marron 145x27 | TSS300145027M | fiche vérifiée |
| G031 | Pin du Nord qualité US marron 145x27 | T420145027USM | fiche vérifiée |
| G005 | Cumaru lisse 145x21 | TCL490145021 | fiche vérifiée |
| G008 | Garapa lisse 145x21 | TGL215145021 | fiche vérifiée |
| G011 | Ipé lisse 140x20 | code à compléter | fiche vérifiée |
| G015 | Padouk lisse 120x21 | TPAD27512021 | média direct vérifié |
| G037 | SILVADEC Atmosphère Gris Ushuaia | SILVAGRIS | fiche vérifiée |
| G038 | SILVADEC Atmosphère Nuances Ipé | SILVAIPE | fiche vérifiée |

## Étape suivante
Pour passer un produit de `verified-product-page` à `verified-media`, il faut récupérer et vérifier l'URL média directe IDEA Bois correspondant exactement au produit/gamme puis l'ajouter dans `src/catalog/visuals.ts`.

Aucun média tiers ne doit être utilisé comme substitut.
