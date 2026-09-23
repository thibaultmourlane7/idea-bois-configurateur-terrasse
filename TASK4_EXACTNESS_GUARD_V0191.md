# Tâche 4 — Garde-fou d’exactitude structurelle — V0.19.1

## Objectif

Empêcher qu’un plan structurel ou un panier soit présenté comme exact quand le calepinage des lames n’est pas disponible ou lorsqu’une portion de lambourdage périphérique courbe reste non résolue.

## Règles appliquées

- sans calepinage : aucun plan structurel précis n’est généré ; le statut devient `unavailable` ;
- contour de terrasse circulaire : le plan est `partial` tant que la solution de lambourde périphérique courbe n’est pas validée ;
- réservation circulaire : même garde-fou ;
- dans ces cas, lambourdes, protection et plots ne sont plus chiffrés comme des lignes exactes ;
- les autres lignes indépendantes, par exemple certaines fixations documentées, peuvent rester calculées ;
- un plan partiel génère un diagnostic explicite.

## Cas protégés

- Garapa et Padouk tant que le jeu/calepinage final n’est pas validé ;
- terrasse circulaire ;
- piscine/arbre/réservation circulaire ;
- toute future géométrie dont la lambourde périphérique courbe est signalée comme non résolue.

Aucune donnée de prix, de catalogue ou d’ERP n’est modifiée par cette tâche.
