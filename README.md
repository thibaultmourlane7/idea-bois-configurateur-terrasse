# IDEA Bois — Configurateur Terrasse V0.14.1

## Correctif visuels produit

La V0.14.1 corrige le défaut principal de la V0.14 : les couleurs et veinages simulés ne sont plus utilisés pour représenter un produit réel IDEA Bois.

### Règle visuelle stricte
Un produit peut avoir trois états :

- `verified-media` : URL média IDEA Bois directement vérifiée ; la photo peut être utilisée comme base visuelle.
- `verified-product-page` : la fiche produit officielle IDEA Bois est identifiée et vérifiée, mais l'URL directe du média n'est pas encore mappée ; le configurateur affiche volontairement un rendu neutre.
- `unmapped` : aucune fiche visuelle précise n'est encore reliée à ce groupe ; rendu neutre.

Aucun bois artificiel, aucune fausse couleur et aucun faux veinage ne sont affichés lorsqu'un média officiel n'est pas vérifié.

## Mapping prioritaire V0.14.1
Les pages produit officielles sont désormais identifiées pour :
- Pin du Nord lisse Classe 4 vert ;
- Pin du Nord strié Classe 4 vert ;
- Pin du Nord lisse Classe 4 marron ;
- Pin du Nord strié Classe 4 marron ;
- Pin du Nord qualité US marron ;
- Cumaru 145x21 ;
- Garapa 145x21 ;
- Ipé 140x20 ;
- Padouk 120x21 ;
- SILVADEC Atmosphère Gris Ushuaia ;
- SILVADEC Atmosphère Nuances Ipé.

Le Padouk conserve le premier média direct déjà vérifié.
Les autres références ci-dessus restent neutres tant que leur URL média directe n'est pas reliée.

## V0.14 conservée
La construction progressive, les lambourdes, plots, rives, supports verticaux, vue de côté et couches 2D/3D restent inchangés.

## Règle ferme
Aucun temps de pose, aucune durée, aucune heure ni aucun coût de main-d'œuvre.
