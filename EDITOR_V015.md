# Éditeur visuel interactif — V0.15

## Séparation UI / moteur
L'éditeur ne calcule ni surface, ni quantité, ni prix.

Les interactions transforment uniquement les champs métier explicites :
- `ProjectInput.shape`
- `ProjectInput.freeformPoints`
- `ProjectInput.obstacles`

Le moteur existant reçoit ensuite le nouveau ProjectInput et recalcule normalement :
- géométrie ;
- calepinage ;
- panier ;
- prix ;
- diagnostics.

## Fichiers
- `src/components/InteractivePlanEditor.tsx` : interactions SVG ;
- `src/editor/interactiveGeometry.ts` : transformations géométriques pures ;
- `src/components/GeometryEditor.tsx` : formulaire, historique et orchestration ;
- `src/engine/geometry.ts` : calcul polygonal de la forme libre ;
- `src/domain/validation.ts` : garde-fous de la forme libre.

## Interactions
### Réservation
Déplacement :
- xM / yM modifiés directement.

Redimensionnement :
- rectangle : widthM / heightM ;
- cercle : diameterM.

Les validations existantes contrôlent ensuite que la réservation reste dans la terrasse et ne chevauche pas une autre réservation.

### Forme libre
Les sommets sont exprimés en mètres :
```
{ xM: number, yM: number }
```

Le moteur accepte le polygon uniquement si :
- au moins 3 sommets ;
- coordonnées finies et positives ;
- contour non auto-croisé ;
- surface non nulle.

## Fond de référence
Le plan/photo importé est un Object URL local, uniquement dans le composant UI.
Il n'est ni sauvegardé, ni partagé, ni envoyé à un serveur, ni utilisé comme donnée métier.

## Historique
L'historique V0.15 est un historique d'édition local à l'étape géométrie.
Une interaction de glisser-déposer crée une étape d'historique au début du geste, pas à chaque pixel déplacé.
