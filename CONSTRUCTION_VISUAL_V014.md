# Construction visuelle & habillage — V0.14

## Règles de structure visuelle
Les entraxes sont centralisés dans `src/engine/constructionRules.ts`.
Aucune gamme sans règle documentée ne reçoit automatiquement une structure visuelle précise.

Règles actuellement structurées :
- Pin du Nord 145x27 : 500 mm ;
- Cumaru 145x21 : 450 mm ;
- Garapa 145x21 : 500 mm ;
- Padouk 120x21 : limite 500 mm à partir de la plage publiée 400–500 mm ;
- Ipé 140x20 : 400 mm ;
- SILVADEC Atmosphère : 400 mm.

## Habillage
`src/engine/edgeCladding.ts` sépare le calcul d'habillage du composant d'interface.

Pour le bois :
- même BoardSpec que le platelage ;
- rangs horizontaux selon largeur + jeu ;
- optimisation multi-longueurs ;
- coût basé sur la surface réellement achetée ;
- structure verticale calculée rive par rive ;
- chaque rive reçoit ses appuis d'extrémité ;
- hauteur du morceau vertical = hauteur d'habillage.

## Visualisation
`src/engine/constructionVisual.ts` fournit les lambourdes, points de plots et supports verticaux aux vues 2D/3D.

Les composants visuels ne recalculent pas les règles métier.

## Limite plots V0.14
Lorsque le panier contient une quantité commerciale exacte de plots, la V0.14 la répartit visuellement sur les lambourdes.
Cette distribution ne remplace pas encore un plan d'implantation structurel certifié.
