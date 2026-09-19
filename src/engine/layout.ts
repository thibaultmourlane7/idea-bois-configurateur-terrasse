import type { LayoutResult, ProjectInput, RequiredPiece } from '../domain/types';
import { optimizeCuts } from './cuts';

export const LAYOUT_TAG = 'IB-TERR-LAYOUT-001';

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
  const rowCount = Math.max(1, Math.ceil((transverse + input.board.gapMm) / pitch));
  const requiredPieces: RequiredPiece[] = [];

  for (let row = 0; row < rowCount; row += 1) {
    const center = row * pitch + input.board.widthMm / 2;
    if (center > transverse + 0.0001) break;
    requiredPieces.push({
      id: `R${row + 1}`,
      rowIndex: row,
      lengthMm: longitudinalSpanForRowMm(input, center),
    });
  }

  const stockBoards = optimizeCuts(requiredPieces, input.board.lengthMm);
  const totalRequiredMm = requiredPieces.reduce((s, p) => s + p.lengthMm, 0);
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
  };
}
