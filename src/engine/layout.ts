import type { LayoutResult, ProjectInput, RequiredPiece } from '../domain/types';
import { optimizeCuts } from './cuts';

export const LAYOUT_TAG = 'SA-TERR-LAYOUT-001';

const mm = (m: number) => m * 1000;

function transverseSpanMm(input: ProjectInput): number {
  return input.orientation === 'length' ? mm(input.dimensions.widthM) : mm(input.dimensions.lengthM);
}

function longitudinalSpanForRowMm(input: ProjectInput, rowCenterMm: number): number {
  const g = input.dimensions;
  if (input.orientation === 'length') {
    if (input.shape === 'rectangle') return mm(g.lengthM);
    const fullZoneMm = mm(g.widthM - g.notchWidthM);
    return rowCenterMm <= fullZoneMm ? mm(g.lengthM) : mm(g.lengthM - g.notchLengthM);
  }

  if (input.shape === 'rectangle') return mm(g.widthM);
  const fullZoneMm = mm(g.lengthM - g.notchLengthM);
  return rowCenterMm <= fullZoneMm ? mm(g.widthM) : mm(g.widthM - g.notchWidthM);
}

export function computeLayout(input: ProjectInput): LayoutResult {
  const pitch = input.board.widthMm + input.board.gapMm;
  const transverse = transverseSpanMm(input);
  const requiredPieces: RequiredPiece[] = [];
  let rowIndex = 0;

  for (let center = input.board.widthMm / 2; center <= transverse + 0.001; center += pitch) {
    requiredPieces.push({
      id: `R${rowIndex + 1}`,
      rowIndex,
      lengthMm: longitudinalSpanForRowMm(input, center),
    });
    rowIndex += 1;
  }

  const hasButtJoints = requiredPieces.some((p) => p.lengthMm > input.board.lengthMm + 0.001);
  const stockBoards = optimizeCuts(requiredPieces, input.board.lengthMm);
  const totalRequiredMm = requiredPieces.reduce((sum, piece) => sum + piece.lengthMm, 0);
  const purchasedMm = stockBoards.length * input.board.lengthMm;
  const wasteMm = Math.max(0, purchasedMm - totalRequiredMm);
  const purchasedAreaM2 = (purchasedMm / 1000) * (input.board.widthMm / 1000);

  return {
    rowCount: requiredPieces.length,
    requiredPieces,
    totalRequiredLinearM: totalRequiredMm / 1000,
    stockBoards,
    purchasedLinearM: purchasedMm / 1000,
    wasteLinearM: wasteMm / 1000,
    wastePercent: purchasedMm > 0 ? (wasteMm / purchasedMm) * 100 : 0,
    purchasedAreaM2,
    hasButtJoints,
  };
}
