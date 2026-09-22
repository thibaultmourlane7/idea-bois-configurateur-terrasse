# Rapport de tests local — lot stabilisation V0.16

## Contexte
Les fichiers ont été développés hors du dépôt GitHub afin de respecter l'interdiction de push sans autorisation explicite.
Le dépôt complet et ses `node_modules` ne sont pas disponibles dans le conteneur local : les commandes officielles `npm test` et `npm run build` restent donc obligatoires après intégration dans une branche de travail.

## Vérifications réussies

- Parsing TypeScript/TSX de tous les fichiers locaux : **OK**.
- Typecheck strict du moteur pur (`tsc`) : **OK**.
- Typecheck des composants modifiés avec stubs de contrôle React/visuels : **OK**.
- Tests ciblés géométrie : **OK**.
  - réservation intérieure ;
  - réservation débordant à droite ;
  - réservation débordant à gauche avec coordonnée négative ;
  - réservation totalement extérieure ;
  - cercle intérieur ;
  - demi-cercle débordant ;
  - contour utile après ouverture.
- Tests ciblés layout/structure : **OK**.
  - raccords rangée par rangée ;
  - segments de lames ;
  - lambourdes de contour ;
  - double lambourdage ;
  - réservation mordant le bord.
- Tests ciblés éditeur/validation : **OK**.
  - modification numérique d'un côté ;
  - modification orthogonale conservant les angles droits ;
  - coordonnées de réservation négatives ;
  - réservation totalement extérieure = diagnostic informatif et non bloquant.
- Tests ciblés des formes rectangle/L/T/U/cercle/forme libre avec réservation débordante : **OK**.

## Vérification réelle après intégration sur branche de test

GitHub Actions a exécuté le projet complet sur la branche `stabilisation-v016-plan-structure` :

- `npm install` : **OK** ;
- `npm test` : **OK — 11 fichiers de tests, 85 tests réussis** ;
- `npm run build` : **OK — Vite production construit en 3,26 s** ;
- run : `35739907913`.

Aucun déploiement GitHub Pages n'a été effectué pendant ce contrôle. La branche `main` n'a pas été modifiée.
