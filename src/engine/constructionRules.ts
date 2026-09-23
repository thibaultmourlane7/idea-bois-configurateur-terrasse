import type { ProjectInput, StructureJoistChoice } from '../domain/types';

export type StructureRuleStatus = 'validated' | 'partial';

export interface CommercialConstructionRule {
  status: StructureRuleStatus;
  joistSpacingMm: number;
  joistLabel: string;
  joistProductRef?: string;
  joistStockLengthsMm: number[];
  joistHeightMm: number;
  plotSpacingMm: number;
  plotCatalogueValidated: boolean;
  sourceUrl: string;
  sourceLabel: string;
  sourceNote: string;
  joistChoiceRequired?: boolean;
}

export interface CommercialJoistOption {
  id: StructureJoistChoice;
  label: string;
  subtitle: string;
}

export function getCommercialJoistOptions(input: ProjectInput): CommercialJoistOption[] {
  const recipe = input.board.commercialRecipeId;
  if (recipe !== 'idea-garapa-145x21' && recipe !== 'idea-padouk-120x21') return [];
  return [
    {
      id: 'pin-class4',
      label: 'Pin Classe 4',
      subtitle: 'Lambourde 60 × 40 mm — solution documentée par IDEA Bois.',
    },
    {
      id: 'exotic',
      label: 'Bois exotique',
      subtitle: 'Lambourde 65 × 42 mm — solution compatible documentée par IDEA Bois.',
    },
  ];
}

function selectableHardwoodRule(
  input: ProjectInput,
  recipe: 'idea-garapa-145x21' | 'idea-padouk-120x21',
): CommercialConstructionRule {
  const label = recipe === 'idea-garapa-145x21' ? 'Garapa' : 'Padouk';
  const sourceUrl = recipe === 'idea-garapa-145x21'
    ? 'https://www.idea-bois.com/art-lame-terrasse-bois-exotique-garapa-lisse-l-4-00-m-145x21-mm-visser-3471.htm'
    : 'https://www.idea-bois.com/art-lame-terrasse-bois-exotique-padouk-lisse-longueur-2-45-m-120-x-21-mm-4760.htm';

  if (!input.structureJoistChoice) {
    return {
      status: 'partial',
      joistSpacingMm: 0,
      joistLabel: 'Choix de lambourde requis',
      joistStockLengthsMm: [],
      joistHeightMm: 0,
      plotSpacingMm: 700,
      plotCatalogueValidated: true,
      sourceUrl,
      sourceLabel: `IDEA Bois — ${label} : plusieurs structures compatibles`,
      sourceNote: `${label} : IDEA Bois documente plusieurs familles de lambourdes compatibles. Le client doit choisir Pin Classe 4 ou bois exotique avant le calcul structurel définitif.`,
      joistChoiceRequired: true,
    };
  }

  if (input.structureJoistChoice === 'pin-class4') {
    return {
      status: 'validated',
      joistSpacingMm: 500,
      joistLabel: 'Lambourde pin Classe 4 60 × 40 mm',
      joistProductRef: 'L240060040SE',
      joistStockLengthsMm: [2400, 3000],
      joistHeightMm: 40,
      plotSpacingMm: 700,
      plotCatalogueValidated: true,
      sourceUrl,
      sourceLabel: `IDEA Bois — ${label} + lambourde pin Classe 4`,
      sourceNote: `${label} : choix client Pin Classe 4. Entraxe retenu 50 cm, dans la plage documentée de 40 à 50 cm.`,
    };
  }

  return {
    status: 'validated',
    joistSpacingMm: 500,
    joistLabel: 'Lambourde bois exotique 65 × 42 mm',
    joistProductRef: 'LEX395065042',
    joistStockLengthsMm: [1850, 2450, 3950],
    joistHeightMm: 42,
    plotSpacingMm: 700,
    plotCatalogueValidated: true,
    sourceUrl: 'https://www.idea-bois.com/art-lambourde-bois-exotique-65x42-mm-pour-terrasse-long-3-95-m-3221.htm',
    sourceLabel: `IDEA Bois — ${label} + lambourde bois exotique`,
    sourceNote: `${label} : choix client bois exotique. IDEA Bois indique la compatibilité de la lambourde exotique 65 × 42 mm et un entraxe de 50 cm.`,
  };
}

export function getCommercialConstructionRule(input: ProjectInput): CommercialConstructionRule | undefined {
  const recipe = input.board.commercialRecipeId;

  if (recipe === 'idea-pin-nord-145x27' || recipe === 'idea-resineux-class4') {
    return {
      status: 'validated',
      joistSpacingMm: 500,
      joistLabel: 'Lambourde pin Classe 4 60 × 40 mm',
      joistProductRef: 'L240060040SE',
      joistStockLengthsMm: [2400, 3000],
      joistHeightMm: 40,
      plotSpacingMm: 700,
      plotCatalogueValidated: true,
      sourceUrl: 'https://idea-bois.com/cat-lambourdes-ossatures-270.htm',
      sourceLabel: 'IDEA Bois — lambourde pin Classe 4 + guide plots YEED/JOUPLAST',
      sourceNote: 'Lambourdes bois naturel à 50 cm maximum ; plots tous les 50 à 70 cm.',
    };
  }

  if (recipe === 'idea-cumaru-145x21') {
    return {
      status: 'validated',
      joistSpacingMm: 450,
      joistLabel: 'Lambourde bois exotique 65 × 42 mm',
      joistProductRef: 'LEX395065042',
      joistStockLengthsMm: [1850, 2450, 3950],
      joistHeightMm: 42,
      plotSpacingMm: 700,
      plotCatalogueValidated: true,
      sourceUrl: 'https://idea-bois.com/cat-lambourdes-ossatures-270.htm',
      sourceLabel: 'IDEA Bois — terrasse Cumaru + lambourde exotique + plots bois',
      sourceNote: 'Cumaru : entraxe conseillé d’environ 45 cm ; lambourde exotique compatible ; plots bois jusqu’à 70 cm.',
    };
  }

  if (recipe === 'idea-garapa-145x21') {
    return selectableHardwoodRule(input, recipe);
  }

  if (recipe === 'idea-padouk-120x21') {
    return selectableHardwoodRule(input, recipe);
  }

  if (recipe === 'idea-ipe-140x20') {
    return {
      status: 'validated',
      joistSpacingMm: 400,
      joistLabel: 'Lambourde bois exotique 65 × 42 mm',
      joistProductRef: 'LEX395065042',
      joistStockLengthsMm: [1850, 2450, 3950],
      joistHeightMm: 42,
      plotSpacingMm: 700,
      plotCatalogueValidated: true,
      sourceUrl: 'https://idea-bois.com/cat-lambourdes-ossatures-270.htm',
      sourceLabel: 'IDEA Bois — terrasse Ipé + lambourde exotique + plots bois',
      sourceNote: 'Ipé : 40 cm maximum entre lambourdes ; jeu 4 à 5 mm ; plots réglables recommandés.',
    };
  }

  if (recipe === 'silvadec-atmosphere-138x23') {
    return {
      status: 'validated',
      joistSpacingMm: 400,
      joistLabel: 'Lambourde aluminium Réversil SILVADEC 63 × 40 × 3600 mm',
      joistProductRef: 'SILAMB2102',
      joistStockLengthsMm: [3600],
      joistHeightMm: 40,
      plotSpacingMm: 600,
      plotCatalogueValidated: false,
      sourceUrl: 'https://fr.silvadec.com/wp-content/pdf/fr-PU39.pdf',
      sourceLabel: 'SILVADEC PU7 / PU39 — Atmosphère sur Réversil',
      sourceNote: 'Résidentiel : entraxe lambourdes 400 mm max ; plots sous Réversil 600 mm max. Le choix commercial du plot reste à valider.',
    };
  }

  if (recipe === 'idea-bamboo-137x20') {
    return {
      status: 'partial',
      joistSpacingMm: 0,
      joistLabel: 'Lambourde bois compatible Bambou',
      joistStockLengthsMm: [],
      joistHeightMm: 0,
      plotSpacingMm: 0,
      plotCatalogueValidated: false,
      sourceUrl: 'https://idea-bois.com/art-lame-de-terrasse-reversible-en-bambou-brun-fonce-1850x137x20-mm-x-treme-moso-2956.htm',
      sourceLabel: 'IDEA Bois — Bambou MOSO',
      sourceNote: 'Support lambourde bois et clips documentés ; entraxe de lambourdes et règle de plots non suffisamment documentés pour un plan précis.',
    };
  }

  return undefined;
}
