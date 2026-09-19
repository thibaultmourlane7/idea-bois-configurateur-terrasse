import type { Diagnostic, ProjectInput } from './types';

export const VALIDATION_TAG = 'IB-TERR-VALID-001';

export function validateProject(input: ProjectInput): Diagnostic[] {
  const d: Diagnostic[] = [];
  const { dimensions: g, board } = input;

  const positive = [
    ['longueur terrasse', g.lengthM],
    ['largeur terrasse', g.widthM],
    ['largeur lame', board.widthMm],
    ['longueur lame', board.lengthMm],
  ] as const;

  for (const [label, value] of positive) {
    if (!Number.isFinite(value) || value <= 0) {
      d.push({ tag: VALIDATION_TAG, severity: 'blocking', message: `${label} doit être strictement positive.` });
    }
  }

  if (!Number.isFinite(board.gapMm) || board.gapMm < 0) {
    d.push({ tag: VALIDATION_TAG, severity: 'blocking', message: 'Le jeu entre lames doit être positif ou nul.' });
  }

  if (input.shape === 'l-shape') {
    if (g.notchLengthM <= 0 || g.notchWidthM <= 0) {
      d.push({ tag: VALIDATION_TAG, severity: 'blocking', message: 'Les dimensions du décroché en L sont obligatoires.' });
    }
    if (g.notchLengthM >= g.lengthM || g.notchWidthM >= g.widthM) {
      d.push({ tag: VALIDATION_TAG, severity: 'blocking', message: 'Le décroché doit rester inférieur aux dimensions de la terrasse.' });
    }
  }

  if (board.isDemo) {
    d.push({
      tag: VALIDATION_TAG,
      severity: 'warning',
      message: 'Produit DEMO : aucune donnée fabricant IDEA Bois n’est considérée comme validée.',
    });
  }

  if (board.priceTtcPerM2 == null) {
    d.push({
      tag: VALIDATION_TAG,
      severity: 'info',
      message: 'Prix absent : le quantitatif est calculé, mais aucun prix matériel n’est affiché.',
    });
  }

  return d;
}
