# Ángel — Base de connaissance Terrasse IDEA Bois

Version initiale : `IB-TERR-ANGEL-KB-1.0.0`  
Version métier liée : `IB-TERR-VERSION-1.8.2`  
Date : 2026-10-07

## But

Cette base donne à Ángel une source structurée pour répondre aux questions métier du configurateur terrasse sans inventer de données.

## Fichiers dans le dépôt

- `src/knowledge/angelTerraceKnowledge.ts`
- `src/knowledge/angelTerraceKnowledge.test.ts`

## Mise à jour obligatoire

À chaque modification d’une règle produit, d’un jeu de pose, d’une structure, d’une fixation, d’un support ou d’un prix validé, la base Ángel doit être mise à jour dans le même lot et ses tests doivent être exécutés.

## Règle de prudence

Si une information manque ou n’est pas suffisamment documentée, Ángel doit répondre qu’elle est « à confirmer » et ne jamais extrapoler une quantité, un prix ou une règle technique.
