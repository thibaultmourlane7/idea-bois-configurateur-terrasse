# Sprint G — 3D professionnelle — V1.1.0

Date : 2026-09-23

## Base roadmap
Le Sprint G doit :
- faire correspondre chaque lame 3D aux vrais segments calculés ;
- améliorer l’environnement ;
- améliorer le rendu client.

Il ne doit pas introduire le multi-niveaux, les escaliers ou les garde-corps, qui restent dans les sprints suivants.

## Architecture
Création de `src/engine/scene3d.ts`, moteur pur séparé de l’UI.

La scène 3D contient :
- lames ;
- lambourdes ;
- plots/appuis ;
- rives ;
- réservations ;
- contour ;
- niveaux Z.

## Lames
Règle forte :
**1 segment de calepinage = 1 objet lame 3D.**

Chaque objet conserve :
- identifiant du segment source ;
- produit ;
- zone ;
- longueur ;
- largeur ;
- épaisseur ;
- quatre sommets supérieurs ;
- quatre sommets inférieurs ;
- niveau fini aux deux extrémités.

La vue ne reconstruit plus un faux plancher par lignes régulières.

## Pentes et niveaux
Les niveaux 3D utilisent :
- hauteur finie ;
- pente X ;
- pente Y ;
- niveaux du support pour les plots.

Les lames et la structure suivent donc les données existantes du moteur.

## Structure
La 3D reprend directement :
- les segments de lambourdes du plan structure ;
- les rôles périphérie / séparation de zone / raccord ;
- le double lambourdage ;
- les points d’appui réels ;
- les appuis hors gamme comme état d’alerte.

Aucune trame fictive n’est créée si le plan structurel est indisponible.

## Rives et réservations
La scène reprend :
- profil ;
- habillage ;
- lame de rive ;
- drainage ;
- piscine ;
- arbre ;
- poteau ;
- autres réservations.

Les traitements restent limités aux rives réellement configurées.

## Rendu client
La vue 3D dispose maintenant :
- d’un environnement plus lisible ;
- d’ombres de lecture ;
- de faces supérieures et latérales des lames ;
- de matières/couleurs produit disponibles ;
- d’un mode « Rendu client » ;
- d’un mode « Vue technique » ;
- d’une rotation simple de caméra ;
- du mode éclaté existant.

## Vérité métier
Si le calepinage est bloqué, aucune lame 3D n’est inventée.
Si la structure est partielle, seules les données réellement calculées sont rendues et un diagnostic de scène est conservé.

## Non inclus — sprints suivants
- multi-niveaux / plateformes : Sprint H ;
- escaliers : Sprint I ;
- garde-corps : Sprint J.
