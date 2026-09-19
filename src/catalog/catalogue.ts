import type { BoardSpec } from '../domain/types';

/** Catalogue volontairement DEMO. Aucune fausse référence IDEA Bois. */
export const demoBoards: BoardSpec[] = [
  { id: 'DEMO-BOIS-145-3000', label: 'Lame bois DEMO — 145 × 3000 mm', widthMm: 145, lengthMm: 3000, thicknessMm: 27, gapMm: 5, isDemo: true },
  { id: 'DEMO-COMP-138-4000', label: 'Lame composite DEMO — 138 × 4000 mm', widthMm: 138, lengthMm: 4000, thicknessMm: 23, gapMm: 6, isDemo: true },
  { id: 'DEMO-BOIS-120-2400', label: 'Lame bois DEMO — 120 × 2400 mm', widthMm: 120, lengthMm: 2400, thicknessMm: 21, gapMm: 5, isDemo: true },
];
