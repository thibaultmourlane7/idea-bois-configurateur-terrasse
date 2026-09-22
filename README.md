# IDEA Bois — Configurateur Terrasse V0.14.2-A

## Bibliothèque de textures réalistes

La V0.14.2-A remplace le rendu global de la V0.14.1 par une bibliothèque indépendante de matériaux.

### États de texture
- **exact** : texture du produit exact, source vérifiée ;
- **close** : texture de projection proche, source et licence explicites ;
- **neutral** : aucune texture suffisamment fiable.

Une texture proche n'est jamais présentée comme la photo contractuelle du produit.

## 8 finitions prioritaires couvertes
- Pin du Nord strié vert ;
- Pin du Nord strié marron ;
- Cumaru ;
- Padouk ;
- Ipé ;
- Garapa ;
- SILVADEC Atmosphère Gris Ushuaia ;
- SILVADEC Atmosphère Nuances Ipé.

Les variantes Pin lisse vert/marron sont également mappées pour cohérence catalogue.

## Nouveau rendu 2D
La texture n'est plus projetée comme une grande image sur toute la terrasse.

Chaque lame est maintenant dessinée séparément :
- largeur réelle de lame ;
- jeu réel entre lames ;
- orientation longueur/largeur ;
- coupure réelle autour des réservations ;
- décalage de texture entre les rangées ;
- stries longitudinales visibles pour les profils striés ;
- même matière utilisée pour les rives lorsque l'habillage est réalisé avec la même lame.

## Sources de base
Les textures de projection utilisées dans ce lot viennent de Poly Haven, sous licence CC0.
Les pages produit IDEA Bois ou bibliothèques spécialisées servent de référence visuelle pour la teinte/essence, sans être revendiquées comme texture exacte.

## 3D
La vue 3D utilise désormais le même résolveur de matériau.
Le PBR avancé (normal, roughness, relief des stries, éclairage) reste prévu pour V0.14.2-B.

## Règle ferme
Aucun temps de pose, aucune durée, aucune heure ni aucun coût de main-d'œuvre.
