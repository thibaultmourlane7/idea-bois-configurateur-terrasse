# Sprint C — Rives / structure chantier — V0.22.0

Date : 2026-09-23

## Objectif
Transformer le contour géométrique en rives métier configurables sans inventer de règles fabricant.

## Rives métier
Chaque rive possède désormais :
- un identifiant stable dans le contour courant : AB, BC, CD… ;
- une longueur géométrique réelle ;
- un contexte chantier ;
- un traitement de rive ;
- une note libre optionnelle.

Pour un cercle, le moteur crée une rive circulaire unique et conserve son statut courbe.

## Contextes chantier
Les contextes disponibles sont :
- rive libre ;
- contre mur ;
- façade ;
- seuil ;
- accès ;
- rive de finition.

Le contexte est descriptif. Il ne déclenche pas silencieusement une règle structurelle non documentée.

## Traitements
Les traitements disponibles sont :
- aucun ;
- habillage / bandeau ;
- profil de finition ;
- lame de rive ;
- drainage / évacuation.

### Habillage
L'habillage existant peut désormais être appliqué à certaines rives seulement.
Les longueurs, lames, supports verticaux et visserie utilisent uniquement les rives sélectionnées.

### Profil / lame de rive / drainage
La longueur géométrique est calculée et transmise au panier.
La référence produit, la compatibilité, la fixation et le prix restent **À confirmer** jusqu'au Sprint D Catalogue / Compatibilités.

## Compatibilité
Les anciens modes sont conservés :
- sans habillage ;
- habillage de tout le pourtour.

Un troisième mode est ajouté :
- configuration rive par rive.

## Interface
L'étape Finitions propose un éditeur de rives avec :
- rive et longueur ;
- contexte chantier ;
- traitement ;
- note chantier.

Le plan 2D affiche les rives configurées et l'habillage ne couvre plus automatiquement les côtés non sélectionnés.
La 3D et la vue de côté tiennent compte de la présence réelle d'un habillage demandé.

## Persistance
- sauvegarde locale : schema 10 ;
- lien de partage : snapshot V10 ;
- les configurations de rives sont restaurées avec le projet.

## Règles de vérité
- aucune référence de profil inventée ;
- aucune règle de drainage inventée ;
- aucune lame de rive imposée sans compatibilité catalogue ;
- une rive courbe ne produit pas un habillage droit faussement exact ;
- aucun temps de pose, aucune main-d'œuvre.
