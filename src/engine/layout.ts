import type { LayoutBoardSegment, LayoutButtJoint, LayoutResult, ProjectInput, RequiredPiece } from '../domain/types';
import { optimizeCuts } from './cuts';
import { getDeckBoundingSizeM, getDeckIntervalsAtMm } from './geometry';

export const LAYOUT_TAG = 'SA-TERR-LAYOUT-001';

export function computeLayout(input: ProjectInput): LayoutResult {
  if (input.board.gapMm == null || !Number.isFinite(input.board.gapMm) || input.board.gapMm < 0) {
    throw new Error('SA-TERR-GAP-001: jeu entre lames non validé.');
  }

  const bounds = getDeckBoundingSizeM(input);
  const transverse = (input.orientation === 'length' ? bounds.widthM : bounds.lengthM) * 1000;
  const pitch = input.board.widthMm + input.board.gapMm;
  const requiredPieces: RequiredPiece[] = [];
  const boardSegments: LayoutBoardSegment[] = [];
  const buttJoints: LayoutButtJoint[] = [];
  const stockLengthsMm = input.board.availableLengthsMm?.length
    ? input.board.availableLengthsMm
    : [input.board.lengthMm];
  const maxStockLengthMm = Math.max(...stockLengthsMm);
  let rowIndex = 0;

  for (let center = input.board.widthMm / 2; center <= transverse + 0.001; center += pitch) {
    const intervals = getDeckIntervalsAtMm(input, center, input.orientation, input.board.widthMm / 2);
    let intervalIndex = 0;

    for (const [start, end] of intervals) {
      const lengthMm = end - start;
      if (lengthMm <= 1) continue;
      requiredPieces.push({
        id: `R${rowIndex + 1}-S${intervalIndex + 1}`,
        rowIndex,
        lengthMm,
      });

      let cursor = start;
      let segmentIndex = 0;
      while (cursor < end - 0.001) {
        const next = Math.min(end, cursor + maxStockLengthMm);
        boardSegments.push({
          id: `R${rowIndex + 1}-I${intervalIndex + 1}-P${segmentIndex + 1}`,
          rowIndex,
          intervalIndex,
          segmentIndex,
          transverseCenterMm: center,
          startMm: cursor,
          endMm: next,
          lengthMm: next - cursor,
        });

        if (next < end - 0.001) {
          buttJoints.push({
            id: `BJ-R${rowIndex + 1}-I${intervalIndex + 1}-P${segmentIndex + 1}`,
            rowIndex,
            transverseCenterMm: center,
            axisPositionMm: next,
          });
        }

        cursor = next;
        segmentIndex += 1;
      }
      intervalIndex += 1;
    }

    if (intervalIndex > 0) rowIndex += 1;
  }

  const hasButtJoints = buttJoints.length > 0;
  const stockBoards = optimizeCuts(requiredPieces, stockLengthsMm);
  const totalRequiredMm = requiredPieces.reduce((sum, piece) => sum + piece.lengthMm, 0);
  const purchasedMm = stockBoards.reduce((sum, board) => sum + board.stockLengthMm, 0);
  const wasteMm = Math.max(0, purchasedMm - totalRequiredMm);
  const purchasedAreaM2 = (purchasedMm / 1000) * (input.board.widthMm / 1000);

  return {
    rowCount: rowIndex,
    requiredPieces,
    boardSegments,
    buttJoints,
    totalRequiredLinearM: totalRequiredMm / 1000,
    stockBoards,
    purchasedLinearM: purchasedMm / 1000,
    wasteLinearM: wasteMm / 1000,
    wastePercent: purchasedMm > 0 ? (wasteMm / purchasedMm) * 100 : 0,
    purchasedAreaM2,
    hasButtJoints,
  };
}