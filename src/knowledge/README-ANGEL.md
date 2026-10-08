# Ángel — Base de connaissance Terrasse IDEA Bois

Version actuelle : `IB-TERR-ANGEL-KB-1.2.0`  
Version métier liée : `IB-TERR-VERSION-1.9.0`  
Date : 2026-10-08

## But

Cette base donne à Ángel une source structurée pour répondre aux questions métier du configurateur terrasse sans inventer de données.

## Fichiers dans le dépôt

- `src/knowledge/angelTerraceKnowledge.ts`
- `src/knowledge/angelTerraceKnowledge.test.ts`

## Mise à jour obligatoire

À chaque modification d’une règle produit, d’un jeu de pose, d’une structure, d’une fixation, d’un support ou d’un prix validé, la base Ángel doit être mise à jour dans le même lot et ses tests doivent être exécutés.

## Règle de prudence

Si une information manque ou n’est pas suffisamment documentée, Ángel doit répondre qu’elle est « à confirmer » et ne jamais extrapoler une quantité, un prix ou une règle technique.


## Ajout V1.8.3

- réservations chevauchantes autorisées avec déduction unique de la zone commune ;
- contrôle explicite de la hauteur minimale lame + lambourde ;
- cohérence du parcours particulier avec les options avancées et la présentation des résultats.


## Ajout V1.9.0

- une lame explicitement désélectionnée bloque le calcul au lieu de conserver silencieusement l’ancienne référence ;
- la structure/lambourde associée est présentée dès l’étape Lames ;
- le côté de départ des lambourdes peut être indiqué sur le plan sans modifier artificiellement les quantités ;
- une rive courbe non résolue ne supprime plus le chiffrage des parties droites déjà calculées ;
- les statuts techniques de calculabilité restent des informations d’audit et ne pilotent jamais le calcul.
