# Tâche 10 — Fiabilisation finale de l’habillage — V0.19.7

Date : 2026-09-23

## Corrections

1. **Aucun jeu nul inventé**
   - si une lame n’a pas de jeu exact validé, le nombre de rangs d’habillage n’est plus calculé avec 0 mm par défaut ;
   - Garapa avec plage 8–10 mm et Padouk sans jeu unique restent partiels tant qu’une valeur de pose n’est pas validée.

2. **Longueurs de rive traçables**
   - les lames utilisées pour l’habillage conservent maintenant leur répartition réelle par longueur commerciale ;
   - le panier affiche le SKU par longueur uniquement lorsqu’il existe dans le mapping catalogue vérifié.

3. **Cohérence du choix de lambourde**
   - le calcul de prix des lambourdes suit désormais la règle structurelle réellement choisie ;
   - pour Garapa/Padouk, un choix Pin Classe 4 n’est plus susceptible d’être interprété comme lambourde exotique dans le moteur panier.

4. **Date catalogue affichée**
   - l’interface distingue désormais la base catalogue du 04/09/2026 des variantes revérifiées jusqu’au 23/09/2026.

Aucune donnée ERP, stock temps réel ou main-d’œuvre n’est ajoutée.
