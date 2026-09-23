# Rapport final — Phases 1 à 5 — Configurateur Terrasse IDEA Bois

Date de clôture : 2026-09-22

## État global

Les cinq phases autorisées ont été exécutées sur le dépôt `thibaultmourlane7/idea-bois-configurateur-terrasse` avec déploiement direct sur `main`.

La connexion ERP IDEA Bois n'a pas été développée, conformément au périmètre fixé.

## Phase 1 — TERMINÉE — stabilisation V0.16.2

- socle V0.16.2 figé et documenté ;
- correction du bug forme libre créant une multiplication anormale de lambourdes/plots ;
- calepinage droite, 1/2 et 1/3 aligné sur la logique CALPI ;
- réservations débordantes gérées par intersection réelle ;
- raccords de lames alignés sur des axes globaux cohérents ;
- lambourdes de champ, de contour et double lambourdage conservés ;
- tests de non-régression ajoutés.

## Phase 2 — PARTIELLE MAIS SÉCURISÉE — structures multi-matériaux

### Structures activées avec règles documentées
- Pin / résineux Classe 4 ;
- Cumaru ;
- Garapa ;
- Padouk ;
- Ipé ;
- SILVADEC Atmosphère avec structure Réversil.

### À CONFIRMER
- Bambou : support bois et clips documentés, mais entraxe/appuis insuffisamment documentés pour activer un plan précis.

### Garde-fous
- aucune règle Pin du Nord recopiée silencieusement sur une autre famille ;
- aucune valeur unique inventée lorsqu'une plage seulement est documentée ;
- SILVADEC calcule la géométrie de structure sans inventer un modèle commercial de plot ;
- le panier utilise la lambourde commerciale cohérente lorsque la recette le permet.

## Phase 3 — TERMINÉE — V0.17 plan/photo calibré

- import local d'un plan ou d'une photo ;
- calibration par deux points et une distance réelle ;
- échelle pixels ↔ millimètres ;
- déplacement du fond ;
- rotation ;
- zoom du fond ;
- opacité ;
- verrouillage ;
- persistance des paramètres de calibration ;
- diagnostics explicites lorsque le fond n'est pas calibré ;
- aucune dimension n'est déduite automatiquement par IA ;
- le fichier image reste local au navigateur, seule sa transformation métrique est persistée.

## Phase 4 — TERMINÉE — V0.18 PDF technique

Le PDF inclut désormais selon les données disponibles :
- projet, produit et surfaces ;
- réservations ;
- cotes du contour et repères ;
- sens de pose et motif de calepinage ;
- raccords ;
- synthèse des longueurs commerciales ;
- plan des lambourdes ;
- lambourdes de contour et doubles ;
- plots, entraxes et hauteurs ;
- niveaux et pentes ;
- panier matériaux ;
- références et sources techniques ;
- avertissements et éléments restant à confirmer.

Aucune donnée non validée n'est présentée comme certaine.

## Phase 5 — TERMINÉE — V0.19 3D enrichie

- reprise de la structure réelle ;
- lambourdes de contour distinguées ;
- double lambourdage conservé ;
- raccords réels du calepinage affichés ;
- plots avec hauteurs relatives ;
- terrain de référence ;
- piscine, arbre et poteau mieux représentés ;
- aucune trame fictive lorsque la structure n'est pas validée ;
- textures réalistes laissées en pause.

## Champs / types principaux ajoutés ou étendus

- `DeckLayingPattern = straight | half | third`
- `ReferencePlanTransform`
- recettes structurelles supplémentaires par gamme ;
- rôle de lambourde `field | perimeter | butt-joint` conservé dans la visualisation.

## Tests

Le dernier pipeline validé avant la clôture V0.19 comportait :
- 14 fichiers de tests ;
- 99 tests réussis ;
- build TypeScript/Vite réussi.

Un pipeline final est relancé avec la version V0.19 pour confirmer que ces résultats restent verts après le changement de version.

## Hors périmètre

NON FAIT :
- connexion ERP IDEA Bois ;
- stock temps réel ;
- prix ERP ;
- commande ERP ;
- synchronisation dépôt/stock ;
- chantier spécifique de textures réalistes ;
- pose diagonale.

Ces éléments nécessitent un nouveau cadrage et une nouvelle autorisation.

## Limites restantes

- Bambou : structure précise à confirmer ;
- certaines données commerciales restent des données catalogue et non temps réel ;
- la 3D est une visualisation métier enrichie, pas encore un moteur 3D photoréaliste ;
- la pose diagonale reste désactivée tant que son moteur géométrique n'est pas développé et validé.
