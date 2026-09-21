# IDEA Bois — Configurateur Terrasse V0.8

Démo B2C indépendante préparée pour IDEA Bois et SpeedArti.

## Objectif V0.8
Le particulier configure sa terrasse et obtient un panier matériaux lisible : lames, lambourdes, plots/appuis, fixations et protections. Le moteur distingue les montants exacts, les fourchettes publiées et les lignes restant à confirmer.

## Nouveautés
- panier matériaux visible même lorsqu'une vérification technique reste bloquante ;
- total TTC affiché uniquement lorsque toutes les lignes obligatoires sont chiffrées ;
- fourchette TTC lorsqu'un fabricant publie une consommation sous forme de plage ;
- sous-total exact quand certaines familles restent à confirmer ;
- choix du système de support : plots réglables, cales/appuis fixes ou indéterminé ;
- référentiel commercial V0.8 séparé du moteur normatif ;
- recette commerciale IDEA Bois pour Pin du Nord 145x27 : jeu 5 mm, lambourdes 60x40 Classe 4, bande bitumineuse, vis inox et plots compatibles selon hauteur ;
- règles SILVADEC Atmosphère : jeu 5 mm et clips à 18 unités/m² ; structure encore à valider avant total complet ;
- diagnostics techniques repliés par défaut pour ne pas encombrer le parcours particulier ;
- aucune connexion ERP/PIM/stock/panier activée avant vente du module.

## Principe de prix
Un montant absent n'est jamais remplacé par une estimation silencieuse.
- `exact` : quantité + référence + prix connus ;
- `range` : consommation publiée sous forme de plage ;
- `informative` : prix commercial connu mais quantité de commande non finalisée ;
- `pending` : donnée/règle encore nécessaire.

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
