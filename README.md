# IDEA Bois — Configurateur Terrasse — V0.5

Démo autonome React + TypeScript destinée au dépôt :
`thibaultmourlane7/idea-bois-configurateur-terrasse`

## Présent dans cette version
- rectangle et terrasse en L ;
- plan 2D dynamique ;
- aperçu 3D isométrique ;
- calepinage dans 2 orientations ;
- surface et périmètre ;
- rangées, longueurs nécessaires et pièces ;
- optimisation pratique de coupe et réemploi des chutes ;
- quantité achetée, surface achetée, taux de chute ;
- chiffrage matériel uniquement si un prix est fourni ;
- journal de calcul et balises techniques ;
- validation bloquante des données critiques ;
- architecture catalogue / ERP / SpeedArti ;
- sauvegarde locale ;
- tests automatisés ;
- GitHub Pages.

## Règle ferme IDEA Bois
Le configurateur ne calcule jamais : temps de pose, durée de chantier, nombre d'heures ou coût de main-d'œuvre.

## Données produits
Le dépôt contient uniquement des références `DEMO-*`. Elles ne représentent pas le catalogue IDEA Bois.
Aucun SKU, prix, stock ou règle fabricant IDEA Bois n'est inventé.

## Lancer
```bash
npm install
npm run dev
```

## Tester / compiler
```bash
npm test
npm run build
```

## GitHub Pages
Le workflow `.github/workflows/pages.yml` publie la démo après un push sur `main`.
Dans GitHub : `Settings > Pages > Build and deployment > Source = GitHub Actions`.

## Balises
- `IB-TERR-GEO-001` géométrie
- `IB-TERR-LAYOUT-001` calepinage
- `IB-TERR-CUT-001` optimisation de coupe
- `IB-TERR-MAT-001` quantitatif
- `IB-TERR-PRICE-001` chiffrage matériel
- `IB-TERR-VALID-001` validation
- `IB-TERR-ERP-001` contrat ERP
- `IB-TERR-SA-001` pont SpeedArti
- `IB-TERR-VERSION-001` sauvegarde / variantes
