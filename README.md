# IDEA Bois — Configurateur Terrasse

Dépôt de développement autonome du configurateur Terrasse IDEA Bois, préparé pour intégration dans SpeedArti.

## Objectifs
- Démo testable en navigateur.
- Moteur métier TypeScript séparé de l’interface.
- Calculs traçables et reproductibles.
- Aucun SKU, prix, stock ou règle fabricant inventé.
- Intégration future aux vrais circuits SpeedArti / ERP IDEA Bois.

## Démo actuelle V0.1
Le socle permet :
- saisie d’un projet rectangle ;
- calcul exact surface et périmètre ;
- saisie manuelle temporaire des dimensions produit ;
- balises info / alerte / bloquant ;
- journal de calcul lisible ;
- interface responsive ;
- tests automatisés ;
- déploiement GitHub Pages.

Les calculs matière, calepinage, sous-structure, plots, fixations, pertes, prix et stocks restent volontairement désactivés tant que les règles/données IDEA Bois ne sont pas validées.

## Lancer localement
```bash
npm install
npm run dev
```

## Tester
```bash
npm test
```

## Compiler
```bash
npm run build
```

## GitHub Pages
Le workflow `.github/workflows/pages.yml` compile, teste et publie automatiquement la démo après un push sur `main`.

Dans GitHub : `Settings > Pages > Build and deployment > Source = GitHub Actions`.

## Règle de périmètre
Aucun temps de pose, aucune durée de chantier, aucune heure de main-d’œuvre et aucun coût de main-d’œuvre ne sont calculés.
