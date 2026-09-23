# Sprint K — Import avancé — V1.5.0

Date : 2026-09-23

## Périmètre roadmap
Le Sprint K couvre :
- import JPG / PNG ;
- import PDF direct ;
- aide à la détection de contours ;
- aide à la détection de cotes ;
- validation humaine obligatoire de toute proposition automatique.

Le Sprint K complète l’import image calibrable déjà présent depuis V0.17 au lieu de le remplacer.

## Import JPG / PNG
Le flux historique est conservé :
- image en fond de plan ;
- déplacement ;
- rotation ;
- opacité ;
- verrouillage ;
- calibration métrique par deux points + distance réelle.

Pour homogénéiser le traitement avec le PDF, l’image est rasterisée dans un canvas local avant l’analyse assistée.

## Import PDF
Ajout de `pdfjs-dist` pour le rendu local des PDF dans le navigateur.

Le fichier PDF :
- n’est pas envoyé à un service externe ;
- est lu localement depuis le fichier sélectionné ;
- expose le nombre de pages ;
- permet de choisir la page de travail ;
- rasterise cette page en image de référence ;
- utilise ensuite le même système de calibration que JPG/PNG.

Le fichier PDF lui-même n’est toujours pas enregistré dans le projet.

## Détection assistée
Nouveau moteur pur :
`src/domain/referenceDetection.ts`

Il analyse le raster et cherche des lignes sombres dominantes :
- lignes verticales ;
- lignes horizontales ;
- paire de limites verticales ;
- paire de limites horizontales.

Lorsque les quatre limites sont suffisamment lisibles, le moteur produit une **proposition de contour orthogonal**.

Ce moteur n’effectue pas d’OCR et ne prétend pas lire automatiquement un texte de cote imprimé sur un plan.

## Aide aux cotes
Avant calibration :
- largeur / hauteur proposées uniquement en pixels.

Après calibration humaine :
- les mêmes distances sont converties en mètres à partir de l’échelle réellement validée.

Les cotes proposées restent informatives tant que le contour n’a pas été validé.

## Validation humaine obligatoire
La détection automatique n’écrit jamais directement dans :
- `shape` ;
- `freeformPoints` ;
- dimensions ;
- réservations ;
- calepinage ;
- structure ;
- quantités.

Pour appliquer une proposition, l’utilisateur doit :
1. importer le plan ;
2. calibrer deux points avec une distance réelle ;
3. lancer la détection ;
4. vérifier visuellement la superposition ;
5. cliquer explicitement **« J’ai vérifié — Valider et utiliser ce contour »**.

Ce clic seul peut convertir la proposition en contour métier.

## Traçabilité
Le transform de référence conserve :
- type de source : image / PDF ;
- nom du fichier ;
- numéro de page PDF ;
- nombre de pages ;
- état de calibration ;
- horodatage de la dernière validation humaine d’un contour assisté.

Le fichier source n’est pas persisté.

## Sauvegarde / partage
- sauvegarde locale : schemaVersion 14 ;
- partage URL : V14 ;
- lecture des versions antérieures conservée.

## Limites explicites
La détection V1.5 cible les contours orthogonaux dominants.

Elle peut échouer sur :
- plans très bruités ;
- photos sans traits nets ;
- plans courbes ;
- formes libres complexes ;
- scans fortement inclinés ;
- cotes uniquement textuelles.

Dans ces cas, l’éditeur manuel existant reste la source de validation.

## Vérité métier
Aucune détection automatique n’est considérée comme une mesure chantier fiable par elle-même.

**Détection → proposition → calibration → vérification visuelle → validation humaine → moteur métier.**

Aucune dimension critique n’est inventée.
