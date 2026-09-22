import type {
  DeckLayingPattern,
  LayoutBoardSegment,
  LayoutButtJoint,
  LayoutResult,
  ProjectInput,
  RequiredPiece,
} from '../domain/types';
import { optimizeCuts } from './cuts';
import { getDeckBoundingSizeM, getDeckIntervalsAtMm } from './geometry';

export const LAYOUT_TAG = 'SA-TERR-LAYOUT-002';

interface PatternCell {
  index: number;
  startMm: number;
  endMm: number;
}

function starterLengthForPattern(pattern: DeckLayingPattern, rowIndex: number, materialLengthMm: number): number {
  if (pattern === 'half') return rowIndex % 2 === 0 ? materialLengthMm : materialLengthMm / 2;
  if (pattern === 'third') {
    const cycle = rowIndex % 3;
    if (cycle === 0) return materialLengthMm;
    if (cycle === 1) return (materialLengthMm * 2) / 3;
    return materialLengthMm / 3;
  }
  return materialLengthMm;
}

function buildPatternCells(runLengthMm: number, materialLengthMm: number, starterLengthMm: number): PatternCell[] {
  const cells: PatternCell[] = [];
  let cursor = 0;
  let index = 0;

  while (cursor < runLengthMm - 0.001) {
    const targetLengthMm = index === 0 ? starterLengthMm : materialLengthMm;
    const endMm = Math.min(runLengthMm, cursor + Math.max(1, targetLengthMm));
    cells.push({ index, startMm: cursor, endMm });
    cursor = endMm;
    index += 1;
  }

  return cells;
}

/**
 * Calepinage terrasse inspiré de CALPI :
 * le motif est défini globalement sur chaque rangée, puis intersecté avec la géométrie réelle.
 * Une rive diagonale ne décale donc plus le raccord de chaque rangée et n'engendre plus
 * un nouvel axe de lambourde pour chaque lame.
 */
export function computeLayout(input: ProjectInput): LayoutResult {
  if (input.board.gapMm == null || !Number.isFinite(input.board.gapMm) || input.board.gapMm < 0) {
    throw new Error('SA-TERR-GAP-001: jeu entre lames non validé.');
  }

  const bounds = getDeckBoundingSizeM(input);
  const transverseMm = (input.orientation === 'length' ? bounds.widthM : bounds.lengthM) * 1000;
  const runLengthMm = (input.orientation === 'length' ? bounds.lengthM : bounds.widthM) * 1000;
  const pitchMm = input.board.widthMm + input.board.gapMm;
  const requiredPieces: RequiredPiece[] = [];
  const boardSegments: LayoutBoardSegment[] = [];
  const buttJoints: LayoutButtJoint[] = [];
  const stockLengthsMm = input.board.availableLengthsMm?.length
    ? input.board.availableLengthsMm
    : [input.board.lengthMm];
  const maxStockLengthMm = Math.max(...stockLengthsMm);
  const pattern: DeckLayingPattern = input.layingPattern ?? 'straight';
  let rowIndex = 0;

  for (let centerMm = input.board.widthMm / 2; centerMm <= transverseMm + 0.001; centerMm += pitchMm) {
    const intervals = getDeckIntervalsAtMm(input, centerMm, input.orientation, input.board.widthMm / 2);
    if (!intervals.length) continue;

    const starterLengthMm = starterLengthForPattern(pattern, rowIndex, maxStockLengthMm);
    const patternCells = buildPatternCells(runLengthMm, maxStockLengthMm, starterLengthMm);
    let intervalIndex = 0;

    for (const [intervalStartMm, intervalEndMm] of intervals) {
      if (intervalEndMm - intervalStartMm <= 1) continue;

      const installed: LayoutBoardSegment[] = [];
      for (const cell of patternCells) {
        const startMm = Math.max(intervalStartMm, cell.startMm);
        const endMm = Math.min(intervalEndMm, cell.endMm);
        if (endMm - startMm <= 1) continue;

        const segmentIndex = installed.length;
        const id = `R${rowIndex + 1}-I${intervalIndex + 1}-P${segmentIndex + 1}`;
        const segment: LayoutBoardSegment = {
          id,
          rowIndex,
          intervalIndex,
          segmentIndex,
          transverseCenterMm: centerMm,
          startMm,
          endMm,
          lengthMm: endMm - startMm,
        };
        installed.push(segment);
        boardSegments.push(segment);
        requiredPieces.push({ id, rowIndex, lengthMm: segment.lengthMm });
      }

      for (let i = 0; i + 1 < installed.length; i += 1) {
        const left = installed[i];
        const right = installed[i + 1];
        if (Math.abs(left.endMm - right.startMm) > 0.01) continue;
        buttJoints.push({
          id: `BJ-R${rowIndex + 1}-I${intervalIndex + 1}-P${i + 1}`,
          rowIndex,
          transverseCenterMm: centerMm,
          axisPositionMm: left.endMm,
        });
      }

      intervalIndex += 1;
    }

    rowIndex += 1;
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
