# Stabilisation V0.16 — lot de travail local

## Statut

Travail préparé localement à partir de `main` V0.16.0 (`ffa4a1fe...`).
Aucun push GitHub n'a été effectué.

## Corrections / évolutions codées

1. Réservations débordantes autorisées.
   - `xM` / `yM` peuvent être négatifs.
   - une réservation peut être partiellement ou totalement hors terrasse ;
   - seule l'intersection réelle avec la terrasse est soustraite de la surface ;
   - une réservation totalement extérieure produit une information non bloquante ;
   - l'éditeur permet déplacement/redimensionnement hors contour.

2. Géométrie d'intersection.
   - rectangle/polygone ;
   - cercle/polygone ;
   - cercle/cercle ;
   - les bandes de lames/lambourdes restent coupées uniquement sur la zone réellement intersectée.

3. Forme libre.
   - dessin point par point ;
   - mode d'aide « angles à 90° » pour le dessin ;
   - repères A, B, C… ;
   - cotes éditables directement sur le plan ;
   - mêmes cotes disponibles dans des champs ;
   - modifier AB conserve A fixe et déplace B dans la direction actuelle ;
   - aucun angle n'est inventé ;
   - refus des polygones croisés.

4. Raccords de lames.
   - le layout conserve désormais chaque segment de lame posé rangée par rangée ;
   - chaque raccord conserve sa rangée, sa position transversale et son axe ;
   - Plan2D affiche un trait de jonction court à l'endroit réel de chaque raccord.

5. Lambourdes de contour.
   - génération du contour utile après réservations ;
   - ajout de segments de rôle `perimeter` ;
   - suppression des doublons déjà couverts par une lambourde de champ ;
   - intégration dans les longueurs et l'optimisation commerciale ;
   - un contour courbe est signalé comme « à confirmer » et n'est pas transformé arbitrairement en lambourdes droites.

6. Double lambourdage.
   - la logique existante est conservée ;
   - quand aucun raccord n'existe, `LevelingEditor` affiche quand même la préférence simple/double au lieu de faire disparaître totalement la fonctionnalité ;
   - quand les raccords existent, le bloc historique de `App.tsx` continue de prendre le relais.

7. Plan2D coté.
   - repères des sommets ;
   - longueurs de côtés ;
   - diamètre du cercle ;
   - dimensions et coordonnées X/Y des réservations ;
   - raccords de lames ;
   - distinction visuelle des lambourdes de contour.

## Limites explicitement non inventées

- aucune distance physique entre les deux lambourdes d'un double lambourdage n'est créée ;
- aucune solution de lambourde cintrée/facettée n'est déduite pour un contour circulaire ;
- l'extension du plan structurel V0.16 aux autres familles de lames reste bloquée tant que lambourde/section/support/compatibilités fabricant ne sont pas validés ;
- le fond photo/plan reste une référence visuelle non calibrée métriquement dans ce lot.

## Vérifications effectuées localement

- parsing TypeScript/TSX des fichiers de travail : OK ;
- typecheck strict du moteur pur isolé : OK ;
- typecheck des composants modifiés avec stubs React/visuels de contrôle : OK ;
- tests ciblés Node sur intersections de réservations : OK ;
- tests ciblés sur layout/raccords/contour structurel : OK ;
- tests ciblés forme libre + validation réservations extérieures : OK.

## Vérification encore obligatoire avant déclaration « terminée »

Les commandes du dépôt réel doivent encore être exécutées sur le projet complet :

```bash
npm test
npm run build
```

Le lot ne doit pas être déclaré terminé et ne doit pas être poussé avant ces vérifications et l'autorisation explicite de Thibault.