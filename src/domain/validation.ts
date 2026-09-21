import type { Diagnostic, ProjectInput } from './types';

export const VALIDATION_TAG = 'SA-TERR-VALID-001';

export function validateProject(input: ProjectInput): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const { dimensions: g, board } = input;

  const positive = [
    ['longueur de la terrasse', g.lengthM, 'dimensions.lengthM'],
    ['largeur de la terrasse', g.widthM, 'dimensions.widthM'],
    ['hauteur de la terrasse', input.heightCm, 'heightCm'],
    ['largeur de lame', board.widthMm, 'board.widthMm'],
    ['longueur de lame', board.lengthMm, 'board.lengthMm'],
    ['épaisseur de lame', board.thicknessMm, 'board.thicknessMm'],
  ] as const;

  for (const [label, value, field] of positive) {
    if (!Number.isFinite(value) || value <= 0) {
      diagnostics.push({
        tag: VALIDATION_TAG,
        severity: 'blocking',
        message: `La ${label} doit être renseignée avec une valeur positive.`,
        field,
      });
    }
  }

  if (input.shape === 'l-shape') {
    if (g.notchLengthM <= 0 || g.notchWidthM <= 0) {
      diagnostics.push({
        tag: 'SA-TERR-GEO-002',
        severity: 'blocking',
        message: 'Les dimensions du décroché en L sont nécessaires.',
      });
    }
    if (g.notchLengthM >= g.lengthM || g.notchWidthM >= g.widthM) {
      diagnostics.push({
        tag: 'SA-TERR-GEO-003',
        severity: 'blocking',
        message: 'Le décroché doit rester plus petit que la terrasse.',
      });
    }
  }

  if (board.isDemo) {
    diagnostics.push({
      tag: 'SA-TERR-CATALOG-001',
      severity: 'info',
      message: 'Produit de démonstration : il sera remplacé par le catalogue réel IDEA Bois.',
    });
  }

  return diagnostics;
}
