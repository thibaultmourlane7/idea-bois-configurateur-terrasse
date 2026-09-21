# Contrats commerciaux — V0.11

## Nouveaux contrats
- `CustomerContact`
- `CommercialProjectPayload`
- `CommercialAdapter`
- `CartReadiness`
- `ShareSnapshotV1`

## Données client
Le contact contient prénom, nom, e-mail, téléphone optionnel, code postal et consentement.
En mode démo ces données restent uniquement en mémoire le temps du formulaire.

## Partage
Le lien partagé encode uniquement :
- nom du projet ;
- forme/dimensions ;
- hauteur ;
- support et système d'appui ;
- finitions ;
- sens de pose ;
- identifiant de la lame.

Aucune donnée personnelle n'est ajoutée au lien.

## Panier
`assessCartReadiness()` bloque la création si le panier n'est pas complet ou si un SKU manque.
Le mapping multi-longueurs des lames groupées doit être finalisé avant connexion e-commerce.

## SpeedArti
Le payload SpeedArti passe en version 0.11.0 et accepte désormais un résumé panier même lorsque certaines validations techniques restent en cours.
