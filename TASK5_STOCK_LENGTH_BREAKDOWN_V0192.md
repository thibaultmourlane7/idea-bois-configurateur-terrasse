# Tâche 5 — Détail des lames par longueur commerciale — V0.19.2

## Objectif

Afficher les quantités réellement calculées par longueur commerciale, sans inventer de correspondance entre une longueur et une référence produit.

## Implémentation

- le panier conserve une répartition structurée `stockBreakdown` ;
- chaque entrée contient uniquement `lengthMm` et `quantity` tant qu'aucun mapping longueur → SKU n'est explicitement validé ;
- l'interface affiche les longueurs réellement sorties par l'optimiseur de découpe ;
- le PDF reprend la même répartition ;
- les références catalogue existantes restent affichées comme références disponibles mais sont explicitement indiquées comme non associées automatiquement aux longueurs.

## Exemple d'affichage

`12 × 5,40 m + 8 × 4,20 m + 13 × 3,00 m`

Le contenu exact dépend du résultat réel de l'optimiseur pour le projet.

## Garde-fou

Aucun SKU/référence n'est affecté à une longueur commerciale tant qu'une source catalogue ne fournit pas cette correspondance de manière vérifiable.
