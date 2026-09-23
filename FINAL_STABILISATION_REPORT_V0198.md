# Rapport de stabilisation — Configurateur Terrasse V0.19.8

Date : 2026-09-23

## Périmètre
Cette séquence a fiabilisé le configurateur Terrasse après les phases V0.16 à V0.19, sans développer l’ERP ni les textures réalistes.

## Corrections consolidées
- libellés de version et retour de calibration corrigés ;
- faux statuts « exacts » supprimés lorsque le calepinage ou une rive courbe reste non résolu ;
- longueurs commerciales détaillées dans le panier et le PDF ;
- longueurs/SKU IDEA Bois revérifiés, sans inventer les correspondances absentes ;
- lambourdes multi-longueurs et prix associés intégrés ;
- visserie d’habillage latéral intégrée à partir de la règle documentée ;
- supports verticaux d’habillage alignés sur le matériau de structure ;
- Garapa/Padouk : choix explicite Pin Classe 4 ou bois exotique lorsqu’il existe plusieurs solutions documentées ;
- aucun jeu de pose nul n’est inventé pour calculer un habillage ;
- lames de rive : détail des longueurs et SKU vérifiés transmis au panier ;
- aucun ancien code interne n’est présenté comme SKU de commande lorsqu’une longueur n’a pas de référence vérifiée.

## Garde-fous actifs
- aucune main-d’œuvre, temps de pose ou coût horaire ;
- aucune donnée ERP, stock temps réel ou prix live ;
- aucune structure Bambou inventée ;
- aucune lambourde courbe inventée ;
- aucun SKU déduit d’un code interne ;
- aucune valeur unique inventée quand le fabricant publie seulement une plage.

## Limite de production restante
L’optimisation de coupe ne modélise pas encore une largeur de trait de scie. Cette valeur dépend de l’outil/lame réellement utilisé et ne doit pas être inventée. Les plans de coupe restent donc à vérifier avant commande/atelier lorsque plusieurs pièces sont débitées dans une même longueur commerciale.

## État
Version applicative : V0.19.8.
L’ERP, le stock temps réel, la synchronisation de prix et les textures réalistes restent hors périmètre de cette séquence.
