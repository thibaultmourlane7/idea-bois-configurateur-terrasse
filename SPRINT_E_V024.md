# Sprint E — Dossier chantier professionnel — V0.24.0

Date : 2026-09-23

## Objectif
Créer un dossier chantier distinct du PDF client, destiné au contrôle technique et à la préparation réelle du projet.

Le dossier est généré uniquement à partir des données présentes dans le configurateur et des sorties du moteur.

## Deux documents séparés
Le configurateur conserve :
- **PDF client** : synthèse lisible du projet et du panier ;
- **Dossier chantier PDF** : document technique détaillé pour l’artisan, le conseiller ou la préparation de commande.

Aucune donnée d’identité, adresse de chantier, référence de dossier ou information non saisie n’est inventée.

## Contenu du dossier chantier

### 1. Synthèse projet
- nom du projet ;
- version moteur ;
- date de génération ;
- état du dossier : prêt / avec points à confirmer / bloqué ;
- surface, périmètre, support, hauteur ;
- nombre de zones, références de lame, lambourdes et appuis ;
- rappel du périmètre : matériaux uniquement, aucune main-d’œuvre ni durée.

### 2. Plan de pose
- contour réel ;
- réservations ;
- segments de lames réellement calculés ;
- zones de pose ;
- produit utilisé par zone ;
- direction, motif, départ, nombre de rangées ;
- axes de raccord.

### 3. Achats de lames
Pour chaque référence réellement utilisée :
- zones concernées ;
- mètres linéaires nécessaires ;
- mètres linéaires achetés ;
- longueurs commerciales ;
- nombre de lames ;
- surface achetée ;
- chute calculée.

Les stocks de références différentes restent séparés.

### 4. Structure et appuis
- plan des lambourdes ;
- lambourdes de champ ;
- périphérie ;
- séparations de zones ;
- axes de raccord / double lambourdage ;
- mètres linéaires ;
- stock de lambourdes ;
- nombre de plots/appuis ;
- entraxes ;
- hauteurs minimales et maximales ;
- groupes de plots ;
- appuis hors gamme signalés.

### 5. Rives
Pour chaque rive :
- identifiant ;
- longueur ;
- contexte chantier ;
- traitement ;
- note chantier éventuelle.

### 6. Matrice de compatibilité
Pour chaque produit utilisé :
- catalogue ;
- calepinage ;
- structure ;
- fixations ;
- plots/appuis ;
- rives/finitions ;
- aptitude produit par zone.

Chaque famille reste classée **validée / partielle / manquante**.

### 7. Optimisation des coupes
Pour chaque référence :
- chaque lame commerciale ;
- pièces découpées ;
- source lame ou chute ;
- reste final ;
- réemploi des chutes ;
- règles de réemploi restant à confirmer.

Le dossier ne transforme pas une chute en déchet sur la base d’un seuil inventé.

### 8. Panier matériaux
- famille ;
- produit ;
- référence lorsqu’elle est vérifiée ;
- quantité ;
- montant ;
- statut exact / fourchette / indicatif / à confirmer ;
- note technique associée.

### 9. Points à confirmer
Le dossier reprend :
- diagnostics bloquants ;
- avertissements ;
- lignes panier en attente ;
- règles de coupe non validées ;
- éléments de structure/appui non couverts.

### 10. Traçabilité
- sources du référentiel ;
- trace moteur ;
- version du configurateur.

## États du dossier
- **Prêt pour contrôle chantier** : aucun blocage et aucun point significatif en attente ;
- **Avec points à confirmer** : le projet est calculable mais certains éléments restent partiels ;
- **Bloqué — corrections requises** : état réservé aux blocages détectés après obtention d’une géométrie exploitable.

Si un blocage empêche le calcul de la géométrie réelle, le dossier chantier n’est pas généré. Le configurateur refuse plutôt que de produire un document technique incomplet ou trompeur.

## Interface
Dans le récapitulatif final :
- le bouton historique devient **PDF client** ;
- un nouveau bouton **Dossier chantier PDF** est ajouté ;
- les deux documents restent indépendants.

## Règles de vérité
- aucune donnée client ou chantier inventée ;
- aucune adresse inventée ;
- aucun SKU manquant fabriqué ;
- aucun prix manquant remplacé ;
- aucune compatibilité déduite hors matrice ;
- aucune main-d’œuvre ;
- aucune durée de pose ;
- les éléments partiels restent explicitement à confirmer.
