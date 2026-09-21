# IDEA Bois — Configurateur Terrasse V0.10

Démo B2C indépendante préparée pour IDEA Bois et SpeedArti.

## Objectif V0.10
Le particulier peut maintenant télécharger un PDF client directement depuis le récapitulatif de son projet, sans serveur et sans connexion ERP.

## Parcours
1. Dimensions
2. Support
3. Lames
4. Finitions
5. Votre projet + panier + PDF

## PDF client
Le PDF reprend exactement les données déjà calculées par le configurateur :
- nom du projet et date de génération ;
- forme, dimensions, surface et périmètre ;
- support, système d'appui et hauteur finie ;
- lame choisie et sens de pose ;
- finitions sélectionnées ;
- vue 2D schématique ;
- lignes du panier avec familles, produits, références, quantités et prix TTC ;
- total, fourchette ou sous-total selon le niveau réel de complétude ;
- mention claire des éléments restant à confirmer.

Le PDF n'invente aucun prix absent et ne contient aucun calcul de main-d'œuvre.

## Technique
- génération 100 % navigateur avec `jsPDF 4.2.1` ;
- chargement dynamique au clic pour ne pas alourdir le démarrage du configurateur ;
- modèle PDF pur séparé du rendu PDF ;
- tests dédiés du modèle PDF ;
- aucun serveur nécessaire.

## Connexions
Les connexions ERP/PIM/stock/panier/commande restent prévues mais non activées avant vente du module.

## Règle ferme
Aucun temps de pose, aucune durée de chantier, aucune heure de main-d'œuvre et aucun coût de main-d'œuvre.

## Commandes
```bash
npm install
npm test
npm run build
npm run dev
```

## Publication
Le workflow GitHub Pages teste, compile puis publie automatiquement après un push sur `main`.
