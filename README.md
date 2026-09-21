# IDEA Bois — Configurateur Terrasse V0.9

Démo B2C indépendante préparée pour IDEA Bois et SpeedArti.

## Objectif V0.9
Le particulier configure sa terrasse, obtient son panier matériaux et peut maintenant choisir les finitions réellement souhaitées avant le récapitulatif.

## Parcours
1. Dimensions
2. Support
3. Lames
4. Finitions
5. Votre projet

## Nouveautés
- nouvelle étape **Finitions** ;
- choix « sans habillage » ou « habiller tout le pourtour » ;
- ajout optionnel du géotextile GEODECK sur sol stabilisé ;
- géotextile calculé par rouleaux réels de 20 m² ;
- finitions SILVADEC Atmosphère reliées aux jupes de finition IDEA Bois ;
- vis de finition SILVADEC associées à la teinte lorsque le produit est connu ;
- pour les terrasses bois sans référence de rive validée, la ligne reste explicitement `pending` ;
- aucun montant de finition non validé n'est ajouté silencieusement au total ;
- panier B2C et diagnostics techniques restent séparés.

## Principe de prix
- `exact` : quantité + référence + prix connus ;
- `range` : consommation publiée sous forme de plage ;
- `informative` : produit et prix connus, mais calepinage final à confirmer ;
- `pending` : référence, compatibilité ou règle encore nécessaire.

Un total TTC complet n'est déclaré que lorsque toutes les lignes obligatoires sont réellement calculables.

## Connexions
Les connexions ERP/PIM/stock/panier/commande restent prévues dans l'architecture mais ne sont pas activées avant vente du module.

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
