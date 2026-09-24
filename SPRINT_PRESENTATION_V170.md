# Sprint Présentation IDEA Bois — V1.7.0

Date : 2026-09-24

## Objectif
Préparer le configurateur pour une présentation propre à IDEA Bois tout en conservant le mode technique complet.

## Mode par défaut
Le configurateur démarre en **Présentation IDEA Bois**.

Un bouton discret dans l’en-tête permet de basculer :
- Présentation IDEA Bois ;
- Mode technique.

Le retour vers Présentation remet automatiquement :
- la vue finale ;
- les couches « terrasse finie » ;
- la vue 3D.

## Éléments masqués en présentation
Les éléments de contrôle/développement restent dans le code mais ne sont pas rendus ou sont masqués :
- bannière de version ;
- matrice de compatibilité produit ;
- badges de maturité catalogue ;
- dates de vérification internes ;
- disponibilité snapshot non live ;
- optimisation des chutes ;
- faux parcours commercial / connexions post-vente ;
- contrôles de couches techniques ;
- carte détaillée des plots ;
- dossier chantier PDF ;
- diagnostics et traces moteur ;
- codes SA-TERR / IB-TERR visibles ;
- mentions SPRINT ;
- légendes techniques sous les vues ;
- statut « Texture proche » dans la présentation ;
- notes internes de validation/règles.

Le mode technique conserve ces éléments.

## 3D : correction de la couleur bois
La couleur principale des lames n’utilise plus systématiquement le gris neutre de `BoardVisualData`.

Nouvelle règle :
1. si une texture produit mappée possède une `tintColor`, cette teinte référencée devient la base du matériau 3D ;
2. le veinage et l’accent sont dérivés de cette même teinte pour conserver un rendu cohérent ;
3. si le produit reste `neutral`, aucune couleur n’est inventée : on conserve les couleurs visuelles existantes.

Exemples concernés :
- Pin du Nord vert ;
- Pin du Nord marron ;
- Cumaru ;
- Garapa ;
- Ipé ;
- Padouk ;
- SILVADEC mappé.

## Fidélité métier
Aucun calcul ne change :
- géométrie ;
- calepinage ;
- structure ;
- plots ;
- quantités ;
- prix ;
- escalier ;
- garde-corps.

Le sprint agit uniquement sur :
- la présentation de l’interface ;
- le choix des informations visibles ;
- le rendu visuel 3D.

## Version
- application : V1.7.0 ;
- moteur : IB-TERR-VERSION-1.7.0.

## Recette
Tests dédiés :
- Pin vert : couleur de texture référencée utilisée ;
- Pin marron / Ipé : couleurs distinctes ;
- produit non mappé : aucune teinte inventée ;
- scène 3D : toutes les lames reprennent la couleur résolue.
