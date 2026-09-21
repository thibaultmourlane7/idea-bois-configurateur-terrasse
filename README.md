# IDEA Bois — Configurateur Terrasse V0.13

## Gros lot V0.13 — géométrie avancée

Cette version transforme la géométrie en vrai moteur de projet.

### Formes disponibles
- rectangle ;
- forme en L ;
- forme en T ;
- forme en U ;
- cercle.

### Réservations / zones exclues
Le particulier peut ajouter plusieurs zones qui ne doivent pas recevoir de lames :
- piscine ;
- arbre ;
- poteau ;
- regard ;
- autre réservation.

Chaque réservation possède une position et des dimensions explicites.

### Impact réel des réservations
Les réservations :
- retirent leur surface de la surface nette ;
- réduisent les quantités et les budgets ;
- coupent les rangées de lames en plusieurs segments ;
- influencent l'optimisation des longueurs commerciales ;
- sont visibles dans les vues 2D et 3D ;
- sont conservées dans la sauvegarde locale ;
- sont conservées dans le lien partagé ;
- apparaissent dans le PDF client.

### Contrôles
Le moteur bloque :
- une réservation hors de la terrasse ;
- des dimensions nulles ou négatives ;
- deux réservations qui se chevauchent ;
- une géométrie T/U/L incohérente.

### Compatibilité
Les anciennes fonctions restent présentes :
catalogue réel, comparateur, panier matériaux, finitions, PDF, partage, devis/rappel et préparation du panier.

## Connexions
ERP/PIM/CRM/e-commerce restent préparés mais non activés avant vente du module.

## Règle ferme
Aucun temps de pose, aucune durée, aucune heure ni aucun coût de main-d'œuvre.
