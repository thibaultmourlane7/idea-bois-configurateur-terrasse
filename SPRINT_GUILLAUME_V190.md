# Sprint V1.9 — Corrections Guillaume

Date : 2026-10-08

## Objectifs
- permettre de retirer puis rechoisir une lame sans conserver silencieusement l’ancienne référence ;
- afficher la structure/lambourde associée dès l’étape Lames ;
- conserver les statuts de calculabilité comme informations techniques uniquement ;
- permettre de choisir le côté de départ des lambourdes sur le plan chantier ;
- conserver les prix des éléments réellement calculés même lorsqu’un complément de rive courbe reste à confirmer ;
- rendre les contrôles d’affichage 2D/3D accessibles en mode présentation ;
- restaurer la vue 2D comme vue initiale, sans forcer ensuite la vue choisie.

## Garde-fous
- aucune donnée technique inventée ;
- aucune substitution automatique par le Pin si une autre lame est choisie ;
- une lame désélectionnée bloque le calcul ;
- le côté de départ des lambourdes n’altère pas les quantités ;
- les compléments courbes restent explicitement à confirmer ;
- base Ángel mise à jour dans le même lot.

## Version
Application : 1.9.0
Moteur : IB-TERR-VERSION-1.9.0
Base Ángel : IB-TERR-ANGEL-KB-1.2.0
