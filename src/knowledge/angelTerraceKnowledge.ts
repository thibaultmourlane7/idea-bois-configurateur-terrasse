/**
 * Base de connaissance Ángel — Configurateur Terrasse IDEA Bois
 * Version métier : V1.9.0 — 2026-10-08
 *
 * Règles absolues :
 * - Ne jamais inventer une donnée technique, un prix, une référence ou une compatibilité.
 * - Une solution alternative non suffisamment documentée reste "à confirmer".
 * - Aucune main-d’œuvre, durée ou coût de pose n’est calculé.
 * - Les règles fabricant priment pour les systèmes propriétaires (MOSO, DASSO, SILVADEC, PROLIN).
 * - Le code du configurateur reste la source de vérité métier.
 */

export type AngelKnowledgeStatus =
  | 'validated'
  | 'partial'
  | 'blocked'
  | 'project-decision';

export interface AngelKnowledgeSource {
  label: string;
  url?: string;
  date?: string;
  kind: 'manufacturer' | 'supplier' | 'project' | 'code';
}

export interface AngelKnowledgeEntry {
  id: string;
  title: string;
  tags: string[];
  status: AngelKnowledgeStatus;
  answer: string;
  details?: string[];
  warnings?: string[];
  sources: AngelKnowledgeSource[];
}

export const ANGEL_TERRACE_KNOWLEDGE_VERSION = 'IB-TERR-ANGEL-KB-1.2.0';
export const ANGEL_TERRACE_BUSINESS_VERSION = 'IB-TERR-VERSION-1.9.0';

export const ANGEL_TERRACE_GLOBAL_RULES = [
  'Ne jamais inventer une donnée technique, un prix, une référence produit, un entraxe, un jeu de pose ou une compatibilité.',
  'Quand une solution est techniquement possible mais non documentée avec assez de précision, la conserver comme choix utilisateur mais la marquer « à confirmer » et ne pas produire de quantités ou de prix fictifs.',
  'Ne jamais calculer de temps de pose, d’heures de main-d’œuvre, de coût de main-d’œuvre ou de durée de chantier.',
  'Pour les systèmes fabricant, utiliser en priorité le système préconisé par le fabricant et proposer les alternatives compatibles uniquement si elles sont autorisées.',
  'Ne jamais appliquer une règle bois générique à un système fabricant propriétaire si la notice fabricant impose une règle spécifique.',
  'La hauteur saisie dans le configurateur est la hauteur totale de la terrasse : distance entre le support existant et le dessus des lames finies au point de référence. Ce n’est pas la hauteur du plot.',
  'Si la hauteur totale disponible est inférieure ou égale à l’épaisseur de lame + la hauteur de lambourde documentée, le projet doit être signalé comme impossible avant même de calculer les appuis.',
  'Les réservations peuvent se chevaucher : la zone commune est autorisée et doit être déduite une seule fois de la surface, sans double comptage.',
  'Les niveaux, pentes et plateformes modifient réellement les hauteurs d’appuis ; aucune pente ne doit être ignorée dans le calcul structurel.',
  'Le champ drainage global n’alimente actuellement aucun calcul métier : ne pas prétendre qu’il modifie le dimensionnement ou le prix.',
  'Une lame explicitement désélectionnée bloque le calcul : ne jamais continuer silencieusement avec la dernière lame en mémoire.',
  'Le choix de lambourde doit être présenté dès l’étape Lames lorsque le produit impose ou permet plusieurs structures.',
  'Une portion de rive courbe non résolue ne doit pas annuler les prix des éléments droits déjà calculés : conserver le sous-total exact et isoler uniquement le complément courbe à confirmer.',
  'Le côté d’entrée des lambourdes oriente le départ sur le plan chantier mais ne doit pas modifier artificiellement les quantités.',
] as const;

export const ANGEL_TERRACE_KNOWLEDGE: AngelKnowledgeEntry[] = [
  {
    id: 'scope-no-labor',
    title: 'Périmètre du configurateur',
    tags: ['périmètre', 'main-d’œuvre', 'temps', 'prix', 'pose'],
    status: 'validated',
    answer: 'Le configurateur calcule les matériaux et les règles techniques documentées. Il ne calcule ni temps de pose, ni durée, ni coût de main-d’œuvre.',
    sources: [{ label: 'Règle projet IDEA Bois / SpeedArti', kind: 'project', date: '2026-10-07' }],
  },
  {
    id: 'height-total',
    title: 'Hauteur totale de la terrasse',
    tags: ['hauteur', 'plot', 'lambourde', 'support', 'terrasse finie'],
    status: 'validated',
    answer: 'La hauteur saisie est la distance entre le support existant et le dessus des lames finies, au point de référence. Elle ne correspond pas directement à la hauteur du plot.',
    details: ['Le moteur retranche notamment l’épaisseur de lame et la hauteur de lambourde pour obtenir la hauteur nécessaire de l’appui.'],
    sources: [{ label: 'Moteur supportPlan.ts — V1.8.3', kind: 'code', date: '2026-10-07' }],
  },
  {
    id: 'minimum-structure-height',
    title: 'Hauteur minimale de structure',
    tags: ['hauteur', 'impossible', 'lame', 'lambourde', 'appui', 'plots'],
    status: 'validated',
    answer: 'Quand la hauteur totale disponible est inférieure ou égale à l’épaisseur de la lame + la hauteur de la lambourde documentée, le configurateur doit bloquer le calcul et expliquer que la structure seule dépasse déjà la hauteur disponible.',
    details: ['Exemple G027 : lame 27 mm + lambourde 40 mm = 67 mm avant tout appui. Une hauteur totale de 50 mm est donc impossible.'],
    sources: [{ label: 'validation.ts — V1.8.3', kind: 'code', date: '2026-10-08' }],
  },
  {
    id: 'overlapping-reservations',
    title: 'Réservations qui se chevauchent',
    tags: ['réservation', 'piscine', 'arbre', 'chevauchement', 'surface', 'union'],
    status: 'validated',
    answer: 'Les réservations peuvent se chevaucher. La zone commune est déduite une seule fois de la surface nette et ne doit pas bloquer le projet.',
    details: ['Le calepinage et la structure utilisent l’union réelle des zones exclues.', 'Une réservation entièrement contenue dans une autre ne retire pas une deuxième fois la même surface.'],
    sources: [{ label: 'geometry.ts + validation.ts — V1.8.3', kind: 'code', date: '2026-10-08' }],
  },
  {
    id: 'garapa-gap',
    title: 'Garapa — jeu entre lames',
    tags: ['garapa', 'jeu', '5 mm', 'calepinage'],
    status: 'project-decision',
    answer: 'Pour le projet IDEA Bois, le jeu de pose retenu pour le Garapa est de 5 mm. Le calepinage est donc calculable.',
    warnings: ['La structure reste à choisir entre les solutions documentées avant de figer le lambourdage.'],
    sources: [{ label: 'Décision projet validée par Thibault', kind: 'project', date: '2026-10-07' }],
  },
  {
    id: 'padouk-gap',
    title: 'Padouk — jeu entre lames',
    tags: ['padouk', 'jeu', '5 mm', 'calepinage'],
    status: 'project-decision',
    answer: 'Pour le projet IDEA Bois, le jeu de pose retenu pour le Padouk est de 5 mm. Le calepinage est donc calculable.',
    warnings: ['La structure reste à choisir entre les solutions documentées avant de figer le lambourdage.'],
    sources: [{ label: 'Décision projet validée par Thibault', kind: 'project', date: '2026-10-07' }],
  },
  {
    id: 'garapa-padouk-structure',
    title: 'Garapa / Padouk — choix de lambourde',
    tags: ['garapa', 'padouk', 'lambourde', 'pin classe 4', 'exotique'],
    status: 'validated',
    answer: 'Le configurateur doit demander un choix explicite de structure : lambourde Pin Classe 4 60 × 40 mm ou lambourde bois exotique 65 × 42 mm. Il ne choisit pas silencieusement à la place du client.',
    details: ['Le calcul structurel définitif ne doit être figé qu’après ce choix.'],
    sources: [{ label: 'IDEA Bois — pages produits et lambourdes', url: 'https://idea-bois.com/cat-lambourdes-ossatures-270.htm', kind: 'supplier' }],
  },
  {
    id: 'cumaru-g003-price',
    title: 'Cumaru G003 — prix projet',
    tags: ['cumaru', 'G003', 'prix', '94,50', 'TCL455145021'],
    status: 'project-decision',
    answer: 'La référence Cumaru G003 145 × 21 mm en 4,55 m utilise pour ce projet un prix de 94,50 € TTC/m².',
    details: ['Référence produit vérifiée : TCL455145021.'],
    sources: [
      { label: 'Décision projet validée par Thibault', kind: 'project', date: '2026-10-07' },
      { label: 'IDEA Bois — Cumaru 4,55 m', url: 'https://www.idea-bois.com/art-lame-de-terrasse-en-cumaru-lisse-a-visser-long-4-55m-145x21-mm-5002.htm', kind: 'supplier', date: '2026-10-07' },
    ],
  },
  {
    id: 'moso-bamboo',
    title: 'Bambou MOSO — système recommandé',
    tags: ['bambou', 'moso', 'x-treme', 'lambourde bambou', 'BO-SB155', 'clips'],
    status: 'validated',
    answer: 'Pour le Bambou MOSO X-treme 137 × 20 mm, le configurateur propose en priorité la lambourde bambou MOSO Thermo-Density BO-SB155, 60 × 40 × 2440 mm.',
    details: [
      'Jeu retenu : 5 mm, dans la plage fabricant 5 à 6 mm.',
      'Entraxe de lambourdes utilisé : 462,5 mm.',
      'Fixation par système de clips MOSO ; ne pas remplacer automatiquement par des vis bois génériques.',
      'Le prix IDEA Bois de la lambourde et la référence commerciale précise des appuis restent à confirmer si absents du catalogue.',
    ],
    warnings: ['Une autre structure compatible peut être choisie, mais ses caractéristiques doivent être confirmées avant de produire un plan ou un prix définitif.'],
    sources: [
      { label: 'MOSO Bamboo X-treme — documentation technique', url: 'https://www.moso-bamboo.com/fr/documentation/catalogue-technique-bamboo-x-treme-france/', kind: 'manufacturer' },
      { label: 'MOSO — accessoires extérieur', url: 'https://www.moso-bamboo.com/fr/produit/accessoires-exterieur/', kind: 'manufacturer' },
    ],
  },
  {
    id: 'dasso-bamboo',
    title: 'Bambou DASSO — système recommandé',
    tags: ['bambou', 'dasso', 'xtr', 'lambourde', 'XJ30-48-UAC', 'clips'],
    status: 'partial',
    answer: 'Pour la référence Bambou DASSO du catalogue, le configurateur recommande la lambourde bambou DASSO XTR XJ30-48-UAC et conserve la fixation par clips fabricant.',
    details: ['Le calepinage des lames est disponible avec un jeu projet de 5 mm.', 'Le plan exact des appuis de la lambourde n’est pas suffisamment documenté dans le référentiel actuel.'],
    warnings: ['Ne pas inventer l’entraxe des appuis, une référence de plot ou un prix manquant.'],
    sources: [{ label: 'DASSO XTR Bamboo Joist', url: 'https://fr.dassogroup.com/index.php/structural-bamboo/dassoXTR-Bamboo-Joist.html', kind: 'manufacturer' }],
  },
  {
    id: 'silvadec-reversil',
    title: 'SILVADEC Atmosphère — structure Réversil recommandée',
    tags: ['silvadec', 'atmosphère', 'réversil', 'aluminium', 'SILAMB2102', 'plots'],
    status: 'validated',
    answer: 'Pour les lames SILVADEC Atmosphère, le configurateur propose en priorité la lambourde aluminium Réversil SILVADEC 63 × 40 × 3600 mm, référence SILAMB2102.',
    details: ['Entraxe de lambourdes : 400 mm maximum en résidentiel.', 'Appuis sous Réversil : 600 mm maximum.', 'Le modèle commercial précis du plot peut rester à confirmer tant qu’il n’est pas référencé.'],
    warnings: ['Ne pas appliquer des clips génériques prévus pour une autre structure : la fixation doit être adaptée à Réversil.'],
    sources: [{ label: 'SILVADEC — notice PU39 / système Réversil', url: 'https://fr.silvadec.com/wp-content/pdf/fr-PU39.pdf', kind: 'manufacturer' }],
  },
  {
    id: 'silvadec-alternative',
    title: 'SILVADEC — structure alternative',
    tags: ['silvadec', 'alternative', 'bois', 'composite', 'plots'],
    status: 'partial',
    answer: 'Une autre structure compatible peut être sélectionnée. Sur plots, SILVADEC autorise notamment une structure bois massif adaptée ou Réversil aluminium ; une lambourde composite non structurelle ne doit pas être utilisée sur plots.',
    warnings: ['Si le client choisit « autre structure compatible », conserver le choix mais laisser section, entraxe, appuis, quantités et prix à confirmer tant que la structure exacte n’est pas renseignée.'],
    sources: [
      { label: 'SILVADEC — guide de choix des lambourdes', url: 'https://fr.silvadec.com/actualites/lambourdes-pour-terrasse-composite-ou-aluminium-comment-choisir', kind: 'manufacturer' },
      { label: 'SILVADEC PU39', url: 'https://fr.silvadec.com/wp-content/pdf/fr-PU39.pdf', kind: 'manufacturer' },
    ],
  },
  {
    id: 'pin-g026-g029',
    title: 'Pin du Nord G026 / G029',
    tags: ['pin du nord', 'G026', 'G029', 'lambourde', 'classe 4'],
    status: 'project-decision',
    answer: 'Les références G026 et G029 sont rattachées à la recette standard Pin du Nord 145 × 27 mm dans la V1.8.3.',
    details: ['Jeu de pose : 5 mm.', 'Structure standard : lambourde Pin Classe 4 60 × 40 mm selon la recette actuelle.'],
    sources: [{ label: 'Code catalogue V1.8.3', kind: 'code', date: '2026-10-07' }],
  },
  {
    id: 'pin-g025-prolin',
    title: 'Pin du Nord G025 PROLIN',
    tags: ['pin du nord', 'G025', 'prolin', 'clips invisibles', '120x28'],
    status: 'partial',
    answer: 'G025 PROLIN est volontairement séparé de la recette Pin standard car son système de pose est spécifique, avec clips invisibles sur lambourdes bois autoclave.',
    warnings: ['Le jeu exact, la référence précise du clip et les entraxes nécessaires au calcul définitif doivent rester à confirmer tant qu’ils ne sont pas suffisamment documentés.'],
    sources: [{ label: 'IDEA Bois — PROLIN', url: 'https://www.idea-bois.com/art-lame-terrasse-en-pin-du-nord-cl4-huil-4200x120x28-mm-profil-bomb-prolin-3055.htm', kind: 'supplier' }],
  },
  {
    id: 'board-selection-v190',
    title: 'Sélection / désélection d’une lame',
    tags: ['lame', 'sélection', 'désélection', 'calcul', 'blocage'],
    status: 'validated',
    answer: 'En V1.9, cliquer à nouveau sur la lame sélectionnée retire explicitement la sélection. Le moteur bloque alors le calcul jusqu’à ce qu’une nouvelle lame soit choisie ; il ne continue jamais avec le Pin ou une ancienne lame en arrière-plan.',
    sources: [{ label: 'validation.ts + App.tsx — V1.9.0', kind: 'code', date: '2026-10-08' }],
  },
  {
    id: 'joist-choice-early-v190',
    title: 'Lambourdes visibles dès le choix de lame',
    tags: ['lambourde', 'structure', 'étape 2', 'lame', 'fabricant'],
    status: 'validated',
    answer: 'La structure associée à la lame est présentée dès l’étape Lames. Si plusieurs familles sont documentées, le choix est demandé à cet endroit ; si la structure est connue, son libellé et son entraxe documenté sont affichés immédiatement.',
    sources: [{ label: 'StructureChoicePanel.tsx — V1.9.0', kind: 'code', date: '2026-10-08' }],
  },
  {
    id: 'curved-structure-partial-v190',
    title: 'Rive courbe et panier partiel',
    tags: ['rive courbe', 'lambourde', 'plots', 'bande bitumineuse', 'panier', 'prix'],
    status: 'validated',
    answer: 'Une rive courbe restant à valider ne met plus toute la structure à zéro. Les lambourdes droites, la bande bitumineuse et les plots réellement calculés restent chiffrés ; seuls les compléments propres à la rive courbe restent à confirmer.',
    warnings: ['Le panier reste partiel tant que le complément courbe n’est pas validé.'],
    sources: [{ label: 'basket.ts — V1.9.0', kind: 'code', date: '2026-10-08' }],
  },
  {
    id: 'joist-entry-v190',
    title: 'Côté d’entrée des lambourdes',
    tags: ['lambourde', 'entrée chantier', 'départ', 'plan 2d', 'orientation'],
    status: 'project-decision',
    answer: 'Le client peut choisir le côté d’entrée des lambourdes lorsque le plan structurel est calculable. Ce choix inverse si nécessaire le point de départ des segments sur le plan et affiche un repère « Départ lambourdes » sans modifier artificiellement les quantités.',
    sources: [{ label: 'Décision projet + supportPlan.ts / Plan2D.tsx — V1.9.0', kind: 'project', date: '2026-10-08' }],
  },
  {
    id: 'drainage-field',
    title: 'Drainage global',
    tags: ['drainage', 'évacuation eau', 'support'],
    status: 'partial',
    answer: 'Le champ drainage global est actuellement une information de projet sans effet métier dans le moteur. Ángel ne doit jamais dire qu’il modifie le calcul, les quantités ou le prix.',
    sources: [{ label: 'Audit moteur V1.8.3', kind: 'code', date: '2026-10-07' }],
  },
  {
    id: 'levels-slopes',
    title: 'Niveaux, pentes et plateformes',
    tags: ['niveau', 'pente', 'plateforme', 'plots', 'hauteur'],
    status: 'validated',
    answer: 'Les niveaux, les quatre coins du support, les pentes finies et les plateformes multiples sont réellement pris en compte dans le calcul des hauteurs d’appuis.',
    warnings: ['Ne pas présenter cette fonction comme purement visuelle : elle modifie les hauteurs de plots/appuis.'],
    sources: [{ label: 'terrain.ts + supportPlan.ts — V1.8.3', kind: 'code', date: '2026-10-07' }],
  },
];

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function searchAngelTerraceKnowledge(query: string, limit = 5): AngelKnowledgeEntry[] {
  const normalizedQuery = normalize(query).trim();
  if (!normalizedQuery) return [];
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  return ANGEL_TERRACE_KNOWLEDGE
    .map((entry) => {
      const haystack = normalize([
        entry.title,
        entry.answer,
        ...entry.tags,
        ...(entry.details ?? []),
        ...(entry.warnings ?? []),
      ].join(' '));
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, 'fr'))
    .slice(0, limit)
    .map(({ entry }) => entry);
}
