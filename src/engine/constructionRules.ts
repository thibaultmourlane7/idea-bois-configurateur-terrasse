import type { ProjectInput } from '../domain/types';

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
    return {
      status: 'validated',
      joistSpacingMm: 500,
      joistLabel: 'Lambourde bois exotique 65 × 42 mm',
      joistProductRef: 'LEX395065042',
      joistStockLengthsMm: [1850, 2450, 3950],
      joistHeightMm: 42,
      plotSpacingMm: 700,
      plotCatalogueValidated: true,
      sourceUrl: 'https://idea-bois.com/cat-lambourdes-ossatures-270.htm',
      sourceLabel: 'IDEA Bois — Garapa + lambourde exotique + plots bois',
      sourceNote: 'Garapa compatible lambourde exotique ou pin Classe 4 ; guide IDEA Bois : 40 à 50 cm, lambourde exotique à 50 cm.',
    };
  }

  if (recipe === 'idea-padouk-120x21') {
    return {
      status: 'validated',
      joistSpacingMm: 500,
      joistLabel: 'Lambourde bois exotique 65 × 42 mm',
      joistProductRef: 'LEX395065042',
      joistStockLengthsMm: [1850, 2450, 3950],
      joistHeightMm: 42,
      plotSpacingMm: 700,
      plotCatalogueValidated: true,
      sourceUrl: 'https://idea-bois.com/cat-lambourdes-ossatures-270.htm',
      sourceLabel: 'IDEA Bois — pose Padouk + lambourde exotique + plots bois',
      sourceNote: 'Padouk : lambourdes robustes/traitées espacées de 40 à 50 cm ; plots réglables autorisés.',
    };
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
