# Préparation intégration ERP IDEA Bois

Balise : `IB-TERR-ERP-001`

## Données minimales
Pour chaque référence : SKU stable, libellé, gamme, matière, dimensions, longueurs, règles fabricant, unité de vente, conditionnement, prix, stock par dépôt, statut actif et médias.

## Flux attendus
1. Lecture catalogue.
2. Lecture prix.
3. Lecture disponibilité / stock par dépôt.
4. Lecture conditionnements.
5. Création / alimentation d'un devis.
6. Création / alimentation d'une commande après validation.
7. Retour des identifiants ERP dans le projet.

## Anti-hallucination
Si une donnée fabricant ou ERP manque : ne rien inventer, afficher une alerte et bloquer le calcul si la donnée est critique.

## Hors périmètre
Aucun temps de pose, aucune durée, aucune heure ni coût de main-d'œuvre.
