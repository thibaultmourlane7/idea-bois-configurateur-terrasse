# Sprint A — Calepinage professionnel complet — V0.20.0

Date : 2026-09-23

## Portée
Le Sprint A complète la couche de calepinage avant l’optimisation avancée des chutes.

### Départ du calepinage
La zone principale et chaque zone locale peuvent démarrer depuis :
- gauche ;
- droite ;
- haut ;
- bas ;
- une rive explicitement sélectionnée.

Le changement de départ modifie réellement les axes de raccord.

### Directions
Le moteur accepte :
- longueur ;
- largeur ;
- diagonale +45° ;
- diagonale -45°.

Les diagonales sont calculées par projection géométrique et intersection réelle avec le contour et les réservations. Elles ne sont pas un simple effet visuel.

### Zones de pose
Des zones polygonales sont maintenant supportées par le moteur. L’interface V0.20 permet de créer et régler des zones rectangulaires :
- direction propre ;
- motif propre entière / 1/2 / 1/3 ;
- départ propre ;
- rive de départ propre.

La zone principale couvre automatiquement le reste de la terrasse. Deux zones explicites qui se chevauchent sont bloquées.

### Structure
Les lambourdes sont générées perpendiculairement aux lames dans chaque zone. Les axes de raccord restent des appuis obligatoires et le double lambourdage continue d’être appliqué. Une lambourde de séparation est ajoutée sur les limites des zones explicites.

### Sorties
La vue 2D, la 3D et le PDF technique utilisent les coordonnées réelles des segments calculés, y compris en diagonale.

### Persistance
Les nouveaux paramètres sont enregistrés :
- sauvegarde locale schema 9 ;
- lien de partage snapshot V9.

### Hors Sprint A
Le produit de lame reste global au projet. Le support de produits différents par zone sera traité avec la matrice de compatibilités catalogue du Sprint D afin de ne pas mélanger silencieusement plusieurs règles structurelles.
