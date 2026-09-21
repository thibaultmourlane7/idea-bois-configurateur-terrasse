# Changements de champs — V0.9

Aucun champ existant n'est renommé ou supprimé.

## ProjectInput

### edgeFinishMode
Type :
`'none' | 'full-perimeter'`

Obligatoire.

Rôle métier :
- `none` : aucune finition latérale ajoutée ;
- `full-perimeter` : demande d'habillage sur l'ensemble du périmètre géométrique.

Impact :
- ajoute des lignes `accessories` au panier ;
- utilise le périmètre calculé ;
- ne force jamais une référence incompatible.

### includeGeotextile
Type :
`boolean`

Obligatoire.

Rôle métier :
- permet au particulier d'ajouter ou non le géotextile au panier ;
- pris en compte uniquement avec `supportType = 'stabilized-ground'`.

Impact :
- quantité = nombre entier de rouleaux nécessaires pour couvrir la surface ;
- rouleau structuré : 20 m².

## Catalogue matériaux
Ajouts V0.9 :
- GEODECK 20 m² ;
- jupe SILVADEC Atmosphère Gris Ushuaia ;
- jupe SILVADEC Atmosphère Nuances Ipé ;
- vis de finition SILVADEC grises/brunes.

## Moteur panier
Ajout d'un bloc `accessoryLines()` indépendant des calculs de structure.

La finition SILVADEC est marquée `informative` tant que le calepinage des angles/chutes de rive n'est pas verrouillé. Les rives bois restent `pending` tant qu'une référence compatible n'est pas validée.
