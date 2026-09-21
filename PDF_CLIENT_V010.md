# PDF client — V0.10

## Source de vérité
Le PDF ne recalcule pas le projet. Il consomme :
- `ProjectInput` ;
- `ConfiguratorResult` ;
- le `BasketResult` déjà produit par le moteur.

Ainsi, le montant du PDF reste identique au montant de l'écran.

## Statuts affichés
- `calcule` : quantité et prix connus ;
- `fourchette` : bornes issues d'une consommation publiée ;
- `indicatif` : produit/prix connus mais détail de calepinage à confirmer ;
- `a confirmer` : donnée manquante non inventée.

## Contenu exclu
Le PDF n'inclut volontairement pas :
- codes de diagnostics internes ;
- journal technique détaillé ;
- temps de pose ;
- heures de main-d'œuvre ;
- coût de main-d'œuvre.

## Génération
La bibliothèque `jsPDF` est chargée dynamiquement uniquement lorsque le client clique sur « Télécharger le PDF ».

Le document est généré localement dans le navigateur puis téléchargé ; aucune donnée de projet n'est envoyée à un serveur pour cette opération.
