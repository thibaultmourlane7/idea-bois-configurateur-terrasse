# Sprint J — Garde-corps — V1.4.0

Date : 2026-09-23

## Périmètre roadmap
Le Sprint J couvre exactement :
- côtés concernés ;
- poteaux ;
- sections ;
- références.

La roadmap ne fournit aucune valeur réglementaire, aucun entraxe fabricant, aucune section standard et aucune référence produit de garde-corps. Le moteur n’en invente donc aucune.

## Côtés concernés
Un garde-corps peut être ajouté explicitement sur :
- une rive droite de la terrasse ;
- le côté gauche d’un escalier calculé ;
- le côté droit d’un escalier calculé.

Aucun garde-corps n’est créé automatiquement en fonction de la hauteur de terrasse.

Les rives courbes ne sont pas générées automatiquement : un tracé dédié serait nécessaire pour éviter d’inventer une implantation.

## Poteaux
Pour chaque côté, l’utilisateur renseigne explicitement :
- hauteur du garde-corps en mm ;
- nombre total de poteaux ;
- section du poteau largeur × profondeur lorsqu’elle est connue.

Le moteur place les poteaux de manière géométrique régulière entre les deux extrémités **uniquement parce que le nombre total a été saisi**.

Il ne choisit jamais un entraxe maximal.

## Sections
Le nombre de sections est une conséquence géométrique :
**nombre de sections = nombre de poteaux - 1**.

Le moteur calcule :
- longueur en plan du côté ;
- longueur 3D du côté ;
- nombre de sections ;
- longueur moyenne géométrique d’une section.

Sur un escalier, la longueur 3D suit la pente des marches.

## Références
Champs explicites disponibles :
- référence système ;
- référence poteau ;
- référence section / remplissage ;
- référence fixation.

Une référence absente reste « à confirmer ».

## Panier
Pour chaque garde-corps :
- ligne poteaux avec quantité réelle saisie ;
- ligne sections avec quantité calculée ;
- ligne fixations sans quantité automatique.

Même si une référence est renseignée, le prix reste à confirmer tant qu’aucune donnée commerciale validée n’est associée à cette référence.

## 2D / 3D
Plan 2D :
- sections matérialisées par le rail ;
- poteaux matérialisés individuellement ;
- étiquette du garde-corps.

3D :
- poteaux verticaux à la hauteur saisie ;
- main courante / ligne supérieure entre poteaux ;
- côtés d’escalier suivant la pente.

Aucun remplissage intermédiaire n’est dessiné automatiquement sans définition produit.

## PDF
Le dossier chantier ajoute une page « Garde-corps » avec :
- côté concerné ;
- longueur en plan et 3D ;
- hauteur ;
- nombre de poteaux ;
- nombre de sections ;
- longueur moyenne ;
- section de poteau ;
- références connues / à confirmer.

Le plan des finitions matérialise également les garde-corps.

## Validation
Blocage si :
- côté cible absent ;
- garde-corps sur rive courbe ;
- hauteur absente ou invalide ;
- nombre de poteaux absent ou inférieur à 2 ;
- section saisie avec valeur invalide ;
- doublon sur le même côté.

Avertissement sans blocage si :
- section de poteau incomplète ;
- référence poteau manquante ;
- référence section/remplissage manquante ;
- référence fixation manquante.

## Sauvegarde et partage
- sauvegarde locale : schemaVersion 13 ;
- partage URL : V13 ;
- lecture des versions précédentes conservée.

## Hors périmètre
- obligation réglementaire automatique ;
- vérification de conformité normative ;
- entraxe de poteaux inventé ;
- section standard inventée ;
- référence fabricant inventée ;
- prix live ;
- stock live ;
- ERP ;
- main-d’œuvre ;
- durée de pose.
