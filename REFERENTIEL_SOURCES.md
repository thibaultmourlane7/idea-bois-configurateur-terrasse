# Sources techniques — V0.6

Référentiel de départ : **NF DTU 51.4 — Platelages extérieurs en bois, édition décembre 2018**, avec la norme produit **NF B54-040, décembre 2018**.

Source publique utilisée pour vérifier les règles encodées dans cette V0.6 :

- FCBA / France Bois Forêt, *Guide de conception et de réalisation des terrasses en bois*, version 4, mars 2020, conforme au NF DTU 51.4 de décembre 2018.
- URL : https://franceboisforet.fr/wp-content/uploads/2020/06/Guide_Terrasse-FNB-LCB-ATB-ARBUST-FCBA_avec_liens_BD.pdf

## Règles effectivement encodées

- Domaine non structural et bascule hors périmètre au-delà de 1 m.
- Limites des appuis sous lambourdes : 60 cm sur 2 appuis / 70 cm sur 3 appuis ou plus.
- Parcours résidentiel uniquement dans cette première version publique.
- Ligne de démonstration lame bois : épaisseur 24–27 mm, largeur 140 mm, classe C24/D24, entraxe maximal 670 mm en sollicitation résidentielle.
- Lambourde de démonstration 45 × 60 mm, C24 : portée d'appuis issue des cas précalculés correspondant à l'entraxe réel des lambourdes.
- Réduction de 15 % pour une lame sur 2 appuis et de 25 % pour une lambourde sur 2 appuis : architecture prévue, non déclenchée par le scénario DEMO courant.
- Support béton : contrôle simplifié particulier de l'évacuation d'eau ; les valeurs exactes de pente restent dans le référentiel technique et doivent être vérifiées sur chantier.
- Plots polymères : alerte au-delà de 30 cm sous les lames.
- Deux vis par croisement à partir de 60 mm de largeur de lame.
- Systèmes composites et systèmes propriétaires : aucune extrapolation des tableaux bois, règles fabricant obligatoires.

## Principe SpeedArti

Une règle absente ou une donnée critique non fournie ne déclenche jamais une valeur inventée. Le moteur retourne un blocage ou une vérification à réaliser.
