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
  recommended?: boolean;
}

function manufacturerAlternativeRule(
  input: ProjectInput,
  sourceUrl: string,
  sourceLabel: string,
  sourceNote: string,
): CommercialConstructionRule {
  return {
    status: 'partial',
    joistSpacingMm: 0,
    joistLabel: 'Autre structure compatible — caractéristiques à confirmer',
    joistStockLengthsMm: [],
    joistHeightMm: 0,
    plotSpacingMm: 0,
    plotCatalogueValidated: false,
    sourceUrl,
    sourceLabel,
    sourceNote,
    joistChoiceRequired: input.structureJoistChoice === 'other-compatible',
  };
}

export function getCommercialJoistOptions(input: ProjectInput): CommercialJoistOption[] {
  const recipe = input.board.commercialRecipeId;

  if (recipe === 'idea-garapa-145x21' || recipe === 'idea-padouk-120x21') {
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

  if (recipe === 'idea-bamboo-137x20') {
    const moso = input.board.id === 'IDEA-TERR-G002';
    return [
      {
        id: 'manufacturer-recommended',
        label: moso ? 'Lambourde bambou MOSO' : 'Lambourde bambou DASSO',
        subtitle: moso
          ? 'Recommandé fabricant • Thermo-Density BO-SB155 • 2440 × 60 × 40 mm.'
          : 'Recommandé fabricant • dassoXTR XJ30-48-UAC.',
        recommended: true,
      },
      {
        id: 'other-compatible',
        label: 'Autre lambourde compatible',
        subtitle: 'Possible si sa compatibilité est confirmée ; dimensions, entraxes et prix resteront à valider.',
      },
    ];
  }

  if (recipe === 'silvadec-atmosphere-138x23') {
    return [
      {
        id: 'manufacturer-recommended',
        label: 'Aluminium Réversil SILVADEC',
        subtitle: 'Recommandé fabricant • SILAMB2102 • 63 × 40 × 3600 mm.',
        recommended: true,
      },
      {
        id: 'other-compatible',
        label: 'Autre structure compatible',
        subtitle: input.supportSystem === 'adjustable-pedestals'
          ? 'Bois massif Pin Classe 4 ou exotique possible sur plots ; lambourde composite non structurelle interdite sur plots.'
          : 'Une autre structure autorisée par SILVADEC peut être retenue ; ses caractéristiques resteront à confirmer.',
      },
    ];
  }

  return [];
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
      sourceNote: `${label} : plusieurs familles de lambourdes sont compatibles. Le client doit choisir Pin Classe 4 ou bois exotique avant le calcul structurel définitif.`,
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

function silvadecRule(input: ProjectInput): CommercialConstructionRule {
  const sourceUrl = 'https://fr.silvadec.com/wp-content/pdf/fr-PU39.pdf';
  if (input.structureJoistChoice === 'other-compatible') {
    return manufacturerAlternativeRule(
      input,
      sourceUrl,
      'SILVADEC PU7 / PU39 — solution alternative',
      input.supportSystem === 'adjustable-pedestals'
        ? 'Alternative sélectionnée : SILVADEC autorise sur plots une structure bois massif Pin Classe 4 ou exotique, ou Réversil aluminium. Les lambourdes composites ne sont pas structurelles et ne doivent pas être utilisées sur plots. La section et la référence choisies doivent être confirmées avant le calcul définitif.'
        : 'Alternative sélectionnée : la famille exacte de lambourde doit être renseignée avant de figer entraxes, quantités et prix.',
    );
  }

  return {
    status: 'validated',
    joistSpacingMm: 400,
    joistLabel: 'Lambourde aluminium Réversil SILVADEC 63 × 40 × 3600 mm',
    joistProductRef: 'SILAMB2102',
    joistStockLengthsMm: [3600],
    joistHeightMm: 40,
    plotSpacingMm: 600,
    plotCatalogueValidated: false,
    sourceUrl,
    sourceLabel: 'SILVADEC PU7 / PU39 — Atmosphère sur Réversil',
    sourceNote: 'Solution recommandée : Réversil aluminium. En résidentiel, entraxe des lambourdes 400 mm maximum et appuis sous Réversil 600 mm maximum. La référence commerciale du plot reste à confirmer.',
  };
}

function bambooRule(input: ProjectInput): CommercialConstructionRule {
  if (input.board.id === 'IDEA-TERR-G002') {
    const sourceUrl = 'https://www.moso-bamboo.com/fr/documentation/catalogue-technique-bamboo-x-treme-france/';
    if (input.structureJoistChoice === 'other-compatible') {
      return manufacturerAlternativeRule(
        input,
        sourceUrl,
        'MOSO Bamboo X-treme — structure alternative',
        'MOSO autorise notamment aluminium, bois tropical ou pin Classe 4. La solution alternative choisie doit être identifiée avant de figer entraxes, quantités et prix.',
      );
    }

    return {
      status: 'validated',
      joistSpacingMm: 462.5,
      joistLabel: 'Lambourde bambou MOSO Thermo-Density 60 × 40 × 2440 mm',
      joistProductRef: 'BO-SB155',
      joistStockLengthsMm: [2440],
      joistHeightMm: 40,
      plotSpacingMm: 600,
      plotCatalogueValidated: false,
      sourceUrl,
      sourceLabel: 'MOSO Bamboo X-treme — système préconisé fabricant',
      sourceNote: 'Solution recommandée : lambourde bambou MOSO Thermo-Density BO-SB155. Entraxe de lambourdes 462,5 mm pour la lame 137 × 20 mm ; jeu fabricant 5 à 6 mm. La référence commerciale des appuis reste à confirmer.',
    };
  }

  const sourceUrl = 'https://fr.dassogroup.com/index.php/structural-bamboo/dassoXTR-Bamboo-Joist.html';
  if (input.structureJoistChoice === 'other-compatible') {
    return manufacturerAlternativeRule(
      input,
      sourceUrl,
      'DASSO XTR — structure alternative',
      'Une structure alternative compatible peut être retenue, mais sa section, son entraxe et ses appuis doivent être confirmés avant le calcul définitif.',
    );
  }

  return {
    status: 'partial',
    joistSpacingMm: 435,
    joistLabel: 'Lambourde bambou DASSO XTR XJ30-48-UAC',
    joistProductRef: 'XJ30-48-UAC',
    joistStockLengthsMm: [1860],
    joistHeightMm: 30,
    plotSpacingMm: 0,
    plotCatalogueValidated: false,
    sourceUrl,
    sourceLabel: 'DASSO XTR — système préconisé fabricant',
    sourceNote: 'Solution recommandée : lambourde bambou DASSO XTR. Les lames 137 × 20 mm sont documentées avec environ 20 clips/m² et un entraxe dépendant de la longueur ; le plan d’appuis de la lambourde n’est pas encore suffisamment documenté pour être inventé.',
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

  if (recipe === 'idea-prolin-pin-nord-120x28') {
    return {
      status: 'partial',
      joistSpacingMm: 0,
      joistLabel: 'Lambourde pin Classe 4 — système PROLIN à clips',
      joistStockLengthsMm: [],
      joistHeightMm: 0,
      plotSpacingMm: 0,
      plotCatalogueValidated: false,
      sourceUrl: 'https://www.idea-bois.com/art-lame-terrasse-en-pin-du-nord-cl4-huil-4200x120x28-mm-profil-bomb-prolin-3055.htm',
      sourceLabel: 'IDEA Bois / CANJAERE — PROLIN',
      sourceNote: 'PROLIN est documenté en pose par clips invisibles sur lambourdes bois autoclave. Le jeu exact, la référence de clip et les entraxes nécessaires au calcul définitif restent à confirmer.',
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

  if (recipe === 'idea-garapa-145x21') return selectableHardwoodRule(input, recipe);
  if (recipe === 'idea-padouk-120x21') return selectableHardwoodRule(input, recipe);

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

  if (recipe === 'silvadec-atmosphere-138x23') return silvadecRule(input);
  if (recipe === 'idea-bamboo-137x20') return bambooRule(input);

  return undefined;
}
