# Tâche 6 — Catalogue longueurs + SKU vérifiés — V0.19.3

Date de vérification : 2026-09-23

## Objectif
Mettre à jour les longueurs commerciales réellement proposées par IDEA Bois et associer une longueur à un SKU uniquement quand une page produit officielle permet de vérifier cette correspondance.

## Lames mises à jour / revérifiées
- Pin du Nord lisse 145×27 : longueurs du groupe conservées ; SKU vérifiés pour 3,00 / 3,60 / 4,20 / 4,50 / 4,80 / 5,40 m. La longueur 5,10 m reste sans SKU tant que la page produit exacte n'est pas identifiée.
- Cumaru lisse 145×21 à 94,50 €/m² : ajout de 5,50 m ; variantes actuelles revérifiées. Plusieurs SKU sont maintenant associés aux longueurs exactes, dont 1,85 / 2,15 / 2,45 / 2,75 / 3,35 / 4,00 / 4,30 / 4,90 / 5,50 m.
- Garapa : groupes de longueurs/prix existants confirmés par les catégories actuelles ; aucune correspondance SKU ajoutée sans page produit précise.
- Ipé 140×20 à 164,52 €/m² : ajout des longueurs 2,45 / 3,95 / 4,60 / 4,90 / 4,95 / 5,20 m, confirmées par la catégorie IDEA Bois. Aucun SKU n'est inventé.
- Padouk : longueurs existantes revérifiées ; SKU vérifiés pour 1,55 / 2,45 / 2,75 m.

## Lambourdes
Pin Classe 4 60×40 :
- 2,40 m — L240060040SE — 7,37 € TTC ;
- 3,00 m — L300060040SE — 9,22 € TTC.

Bois exotique 65×42 :
- 1,85 m — 9,98 € TTC — SKU non affiché faute de page produit exacte vérifiée ;
- 2,45 m — LEX245065042 — 13,22 € TTC ;
- 3,95 m — LEX395065042 — 21,32 € TTC.

Le moteur de coupe des lambourdes utilise ces longueurs vérifiées et le panier additionne le prix correspondant à chaque longueur sélectionnée.

## Sources principales
- https://www.idea-bois.com/cat-terrasse-en-pin-du-nord-429.htm
- https://www.idea-bois.com/cat-terrasse-bois-en-cumaru-355.htm
- https://www.idea-bois.com/cat-terrasse-bois-exotique-garapa-433.htm
- https://www.idea-bois.com/cat-terrasse-exotique-en-ipe.htm
- https://idea-bois.com/cat-lames-terrasse-bois-exotique-140.htm
- https://idea-bois.com/cat-lambourdes-ossatures-270.htm

## Garde-fou
Une longueur peut être utilisée lorsqu'elle est confirmée pour le groupe produit et le même niveau de prix. Le champ SKU reste vide si la correspondance longueur → référence n'a pas été vérifiée explicitement. Aucun SKU n'est déduit depuis un ancien code interne SpeedArti. Aucun stock temps réel ni ERP n'est utilisé.
