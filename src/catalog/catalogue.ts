import type { BoardSpec, JoistSpec } from '../domain/types';

/**
 * Catalogue DEMO uniquement. Aucune référence, aucun prix et aucun stock IDEA Bois n'est inventé.
 * Le premier produit bois est volontairement calé sur une combinaison couverte par le référentiel V0.6
 * afin de démontrer le moteur résidentiel.
 */
export const demoBoards: BoardSpec[] = [
  {
    id: 'DEMO-BOIS-C24-140-3000',
    label: 'Lame bois démo',
    subtitle: '140 × 27 mm — longueur 3,00 m',
    widthMm: 140,
    lengthMm: 3000,
    thicknessMm: 27,
    gapMm: 5,
    isDemo: true,
    technical: {
      materialFamily: 'solid-wood',
      mechanicalClass: 'C24',
      useClass: '4',
      densityKgM3: 500,
      technicalEngine: 'nf-dtu-51-4',
      manufacturerRulesValidated: false,
      sourceLabel: 'Données DEMO + NF DTU 51.4 / NF B54-040',
      sourceVersion: '2018-12',
    },
  },
  {
    id: 'DEMO-COMPOSITE-140-4000',
    label: 'Lame composite démo',
    subtitle: 'Données fabricant nécessaires avant calcul technique',
    widthMm: 140,
    lengthMm: 4000,
    thicknessMm: 23,
    gapMm: 5,
    isDemo: true,
    technical: {
      materialFamily: 'composite',
      technicalEngine: 'manufacturer-rules',
      manufacturerRulesValidated: false,
      sourceLabel: 'Fabricant requis',
    },
  },
];

export const demoJoist: JoistSpec = {
  id: 'DEMO-LAMB-C24-45x60',
  label: 'Lambourde bois démo 45 × 60 mm',
  widthMm: 45,
  heightMm: 60,
  mechanicalClass: 'C24',
  isDemo: true,
};
