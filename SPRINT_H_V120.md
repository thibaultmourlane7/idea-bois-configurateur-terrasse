# Sprint H — Terrain avancé — V1.2.0

Date : 2026-09-23

## Périmètre roadmap
Le Sprint H couvre :
- multi-niveaux ;
- relations entre plateformes ;
- niveaux complexes.

Les escaliers restent explicitement hors périmètre et sont réservés au Sprint I.

## Principe structurel
Une plateforme multi-niveau réutilise une **zone réelle du calepinage**.

Cela garantit que :
- les lames sont déjà séparées à la frontière ;
- la structure possède déjà une séparation de zone ;
- une même lame ne traverse pas artificiellement deux hauteurs différentes ;
- le changement de niveau ne repose pas sur un simple effet visuel.

## Données par plateforme
Chaque zone peut désormais porter :
- `finishedLevelOffsetMm` : décalage du dessus fini ;
- `supportLevelOffsetMm` : décalage mesuré du support ;
- `targetSlopeXPercent` : pente locale X optionnelle ;
- `targetSlopeYPercent` : pente locale Y optionnelle.

Les pentes locales absentes reprennent la pente globale du projet.

## Plateforme principale
Le reste de la terrasse constitue la plateforme principale :
- niveau fini relatif : 0 mm ;
- support relatif : 0 mm ;
- pente globale du projet.

## Relations entre plateformes
Le moteur `terrain.ts` calcule les frontières réellement communes entre :
- plateforme principale et zones ;
- deux zones adjacentes.

Chaque relation expose :
- longueur de frontière ;
- écart de niveau fini minimum / maximum ;
- écart de support minimum / maximum ;
- nécessité ou non d’une transition physique.

Une frontière partagée entre deux zones n’est pas comptée une seconde fois comme frontière avec la plateforme principale.

## Plots et structure
Les hauteurs de plots sont recalculées avec :
**hauteur finie + niveau/pente de plateforme - niveau du support - lame - lambourde**.

Les points d’appui conservent le `zoneId` ayant piloté leur niveau.

La structure existante est conservée :
- lambourdes de champ ;
- périphérie ;
- séparation de zones ;
- double lambourdage aux raccords.

## 3D
La scène V1.1 utilise maintenant les niveaux Sprint H :
- lame par lame ;
- lambourdes ;
- appuis ;
- réservations ;
- pentes locales ;
- offsets de plateformes.

La 3D affiche également le nombre de plateformes et de transitions détectées.

## Interface
L’étape Support comporte un bloc « Plateformes et niveaux multiples ».

Pour chaque zone :
- niveau fini relatif ;
- niveau support relatif ;
- pente locale X ;
- pente locale Y ;
- retour possible à la pente globale.

Les relations entre plateformes sont listées avec la longueur de frontière et l’écart de niveau.

## Sauvegarde / partage
- sauvegarde locale : schemaVersion 11 ;
- partage URL : snapshot V11 ;
- compatibilité de lecture maintenue pour les snapshots V1 à V10.

## Dossier chantier
Le dossier chantier ajoute une page :
**Niveaux et plateformes**

Elle contient :
- plan des zones de niveau ;
- offsets fini/support ;
- pentes ;
- relations ;
- frontières communes ;
- écarts de niveau.

## Garde-fou transition
Lorsqu’un écart de niveau fini existe, le moteur émet :
`SA-TERR-TERRAIN-TRANSITION-120`.

Le Sprint H **ne crée pas** :
- marche ;
- escalier ;
- rampe ;
- fixation de transition ;
- pièce de raccord inventée.

Ces éléments seront traités au Sprint I ou à partir d’une règle fabricant explicitement validée.

## Hors périmètre
- Escaliers : Sprint I.
- Garde-corps : Sprint J.
- Prix/stock live et ERP : uniquement après vente.
