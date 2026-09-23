# Tâche 7 — Visserie de l’habillage latéral — V0.19.4

Date : 2026-09-23

## Règle métier vérifiée

Le guide IDEA Bois / support habillage latéral indique de fixer chaque lame de rive à la lambourde avec **2 vis**.

Source :
https://www.idea-bois.com/userfiles/product_File/470.pdf

Les vis 5×60 mm utilisées par le configurateur restent les références déjà validées pour les lames bois de 21 à 27 mm. Les pages IDEA Bois indiquent également une consommation de 35 à 40 vis/m² pour le platelage.

## Calcul

Pour un habillage bois exact :
`vis_habillage = nombre_de_rangs × nombre_de_supports_verticaux × 2`

Ces vis sont ajoutées au besoin du platelage **avant** l’arrondi au nombre de boîtes de 200. On évite ainsi de facturer une boîte séparée qui pourrait être inutile si la boîte déjà ouverte pour le platelage contient assez de vis.

Exemple de régression :
- rectangle 6 × 4 m ;
- habillage 20 cm ;
- 2 rangs ;
- 44 supports verticaux ;
- 176 vis d’habillage supplémentaires ;
- besoin total arrondi à 6 boîtes de 200 au lieu de 5 sans habillage.

Pour 50 cm d’habillage :
- 4 rangs ;
- 44 supports ;
- 352 vis d’habillage ;
- le besoin global devient une fourchette de 6 à 7 boîtes selon la consommation platelage 35–40 vis/m².

## Garde-fous

- aucune vis supplémentaire n’est calculée si les supports verticaux ne sont pas validés ;
- dans ce cas une ligne « Visserie de l’habillage latéral » reste à confirmer ;
- la vis de fixation de la petite lambourde verticale au support n’est **pas** ajoutée automatiquement : le guide la décrit dans une option de montage spécifique et le configurateur ne modélise pas encore le choix d’option ;
- aucun temps de pose ni main-d’œuvre n’est calculé.
