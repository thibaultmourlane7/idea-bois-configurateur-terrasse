# IDEA Bois — Configurateur Terrasse V0.6

Démo indépendante préparée pour IDEA Bois et SpeedArti.

## Principe V0.6

La première version publique est pensée pour un particulier : 4 étapes simples (dimensions, support, lames, résultat). La complexité technique reste invisible dans le parcours normal.

Le moteur applique uniquement les règles pour lesquelles une donnée validée existe. En cas de donnée manquante, de système propriétaire ou de sortie du domaine couvert, il bloque ou demande une vérification au lieu d'inventer une valeur.

### Inclus

- rectangle et forme en L ;
- aperçu 2D et 3D ;
- quantitatif lames et optimisation matière ;
- premier chemin résidentiel NF DTU 51.4 / NF B54-040 version 2018 ;
- calcul automatique de l'entraxe réel des lambourdes à partir d'une valeur admissible validée ;
- calcul des longueurs de lambourdes et du nombre de points d’appui ;
- contrôle de hauteur, drainage et systèmes hors DTU ;
- blocage du composite tant que les règles fabricant ne sont pas intégrées ;
- balises techniques stables `SA-TERR-*` ;
- préparation ERP / PIM IDEA Bois et pont SpeedArti ;
- aucun calcul de temps de pose, heures ou coût de main-d'œuvre.

### Important

Le catalogue est volontairement `DEMO-*`. Aucune référence, aucun prix et aucun stock IDEA Bois ne sont inventés.

La V0.6 contient uniquement les lignes normatives réellement utilisées par le scénario de démonstration. Elle n'extrapole pas un tableau incomplet.

Le plan matière peut contenir des aboutages. Tant que leur placement sur appui et le traitement des joints n'est pas finalisé, le moteur marque le quantitatif de fixations comme provisoire au lieu d'afficher un nombre définitif.

## Commandes

```bash
npm install
npm test
npm run build
npm run dev
```
