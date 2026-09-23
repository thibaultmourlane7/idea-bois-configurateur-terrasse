# Tâche 8 — Supports verticaux d’habillage alignés sur la structure — V0.19.5

Date : 2026-09-23

## Problème corrigé

L’habillage latéral bois utilisait systématiquement une lambourde Pin Classe 4 de 2,40 m, même lorsque la structure validée de la terrasse utilisait une lambourde exotique.

## Nouvelle règle

Les supports verticaux d’habillage reprennent désormais :
- le **matériau de lambourde** défini par la règle structurelle validée de la lame ;
- les **longueurs commerciales validées** de cette même structure ;
- les **prix correspondants par longueur** ;
- les SKU uniquement lorsqu’ils sont vérifiés.

### Pin / résineux Classe 4
Longueurs autorisées : 2,40 m et 3,00 m.

### Cumaru / Garapa / Padouk / Ipé
Longueurs de lambourdes exotiques autorisées : 1,85 m, 2,45 m et 3,95 m.

Le composite SILVADEC conserve son système de jupe dédié et n’utilise pas cette logique.

## Garde-fous

- si la règle structurelle n’est pas validée, l’habillage vertical reste partiel ;
- si les longueurs commerciales/prix de la lambourde associée ne sont pas entièrement connus, aucune ligne exacte n’est créée ;
- aucune lambourde Pin n’est substituée silencieusement à une structure exotique ;
- le détail par longueur est transmis au panier avec les SKU vérifiés quand disponibles.
