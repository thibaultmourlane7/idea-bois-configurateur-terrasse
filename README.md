# IDEA Bois — Configurateur Terrasse V0.7

Démo indépendante B2C préparée pour IDEA Bois et SpeedArti.

## Objectif V0.7
Le particulier configure simplement sa terrasse et voit immédiatement le prix public TTC des lames issues du catalogue IDEA Bois local. Les règles techniques absentes ne sont jamais remplacées par des valeurs génériques.

## Nouveautés
- catalogue Terrasse IDEA Bois réel : 99 références de lames regroupées en 38 choix commerciaux ;
- prix public TTC au m² issu du relevé du 04/09/2026 ;
- recherche et filtres par familles de produits ;
- plusieurs longueurs commerciales rattachées à une même gamme ;
- moteur de coupe préparé pour l’optimisation multi-longueurs ;
- prix des lames visible même lorsqu’une règle technique bloque le quantitatif final ;
- balise `SA-TERR-GAP-001` si le jeu fabricant manque ;
- aucune classe mécanique, règle fabricant, référence ERP, stock temps réel ou disponibilité actuelle inventés.

## Parcours particulier
1. Dimensions
2. Support
3. Choix des lames IDEA Bois
4. Projet + prix + vérifications

## Prix affiché
Tant que le calepinage technique complet n’est pas validé, le prix affiché est le prix des lames sur la surface nette. Le total matériel complet devra intégrer les vraies sous-structures, appuis, fixations, accessoires, conditionnements et règles de compatibilité.

## Connexions
Les contrats ERP/PIM/panier/commande restent prévus dans l’architecture mais ne sont pas connectés avant vente du module.

## Règle ferme IDEA Bois
Aucun calcul de temps de pose, durée de chantier, heure de main-d’œuvre ou coût de main-d’œuvre.

## Commandes
```bash
npm install
npm test
npm run build
npm run dev
```

## GitHub Pages
Le workflow `.github/workflows/pages.yml` teste, compile puis publie la démo après un push sur `main`.
