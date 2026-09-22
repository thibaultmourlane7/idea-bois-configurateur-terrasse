import type { ProjectInput } from '../domain/types';

export interface CommercialConstructionRule {
  joistSpacingMm: number;
  joistLabel: string;
  sourceUrl: string;
  sourceNote: string;
}

export function getCommercialConstructionRule(input: ProjectInput): CommercialConstructionRule | undefined {
  const recipe = input.board.commercialRecipeId;

  if (recipe === 'idea-pin-nord-145x27') {
    return {
      joistSpacingMm: 500,
      joistLabel: 'Lambourde pin Classe 4 60 × 40 mm',
      sourceUrl: 'https://www.idea-bois.com/art-liteau-pin-maritime-2400x60x40-mm-trait-classe-4-vert-250.htm',
      sourceNote: 'IDEA Bois : entraxe 50 cm maximum pour la lambourde 60x40.',
    };
  }

  if (recipe === 'idea-cumaru-145x21') {
    return {
      joistSpacingMm: 450,
      joistLabel: 'Lambourde terrasse compatible bois exotique',
      sourceUrl: 'https://www.idea-bois.com/cat-terrasse-bois-en-cumaru-355.htm',
      sourceNote: 'IDEA Bois : entraxe conseillé d’environ 45 cm pour le Cumaru.',
    };
  }

  if (recipe === 'idea-garapa-145x21') {
    return {
      joistSpacingMm: 500,
      joistLabel: 'Lambourde bois exotique / pin Classe 4',
      sourceUrl: 'https://www.idea-bois.com/art-lambourde-en-bois-exotique-4550x65x40-mm-3194.htm',
      sourceNote: 'IDEA Bois : entraxe 50 cm pour la lambourde exotique.',
    };
  }

  if (recipe === 'idea-padouk-120x21') {
    return {
      joistSpacingMm: 500,
      joistLabel: 'Lambourde robuste / traitée compatible Padouk',
      sourceUrl: 'https://www.idea-bois.com/art-lame-terrasse-bois-exotique-padouk-lisse-longueur-1-55-m-120-x-21-mm-4355.htm',
      sourceNote: 'IDEA Bois publie un entraxe de 40 à 50 cm ; la V0.14 retient la limite maximale de 50 cm.',
    };
  }

  if (recipe === 'idea-ipe-140x20') {
    return {
      joistSpacingMm: 400,
      joistLabel: 'Lambourde bois exotique / pin Classe 4',
      sourceUrl: 'https://www.idea-bois.com/cat-terrasse-exotique-en-ipe.htm',
      sourceNote: 'IDEA Bois : espacement conseillé 40 cm maximum pour l’Ipé.',
    };
  }

  if (recipe === 'silvadec-atmosphere-138x23') {
    return {
      joistSpacingMm: 400,
      joistLabel: 'Lambourde compatible SILVADEC',
      sourceUrl: 'https://www.idea-bois.com/art-lame-composite-atmosph-re-bross-e-23x138x4000-mm-gris-ushuaia-silvadec-1845.htm',
      sourceNote: 'SILVADEC / IDEA Bois : entraxe entre lambourdes 400 mm.',
    };
  }

  return undefined;
}
