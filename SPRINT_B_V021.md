# Sprint B — Optimisation des chutes — V0.21.0

Date : 2026-09-23

## Portée
Le Sprint B transforme l'optimisation matière existante en plan de coupe traçable sans surcharger le plan principal.

## Identifiants métier
- `B001`, `B002`… : lames commerciales achetées.
- `CUT001`, `CUT002`… : découpes.
- `C001`, `C002`… : chutes créées.
- Les pièces conservent leurs identifiants de calepinage existants.

## Chaîne de traçabilité
Chaque lame conserve la source de chaque découpe, la longueur disponible avant coupe, la pièce consommée, la chute créée, son éventuel réemploi et le reste final.

Exemple :
`B001 4000 mm → P017 2650 mm → C001 1350 mm → P042 1180 mm → C002 170 mm`.

## Règles non inventées
Aucune valeur générique n'est imposée pour la longueur minimale réutilisable, la distance minimale entre joints ou le trait de scie.
Ces données restent **À confirmer fabricant / atelier**.
Un reste final n'est pas classé silencieusement comme déchet.

## Interface
Le bouton **Optimisation des chutes** ouvre un écran séparé avec :
- lames commerciales ;
- longueur achetée et posée ;
- réemplois ;
- reste final brut ;
- détail lame par lame et découpe par découpe ;
- restes finaux identifiés ;
- règles restant à confirmer.

Le plan principal 2D/3D reste lisible et n'affiche pas ces détails.

## Compatibilité
`optimizeCuts()` reste disponible pour les moteurs existants.
`optimizeCutsDetailed()` fournit la traçabilité V0.21.

## Limites
- heuristique déterministe, pas preuve d'optimum mathématique global ;
- aucun trait de scie sans donnée validée ;
- aucune règle fabricant inventée ;
- aucune main-d'œuvre ni durée de pose.
