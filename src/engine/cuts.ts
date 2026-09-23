import type { CutOffcut, CutOptimizationResult, CutPlacement, RequiredPiece, StockBoard } from '../domain/types';

export const CUT_TAG = 'SA-TERR-CUT-002';
const EPS = 0.0001;

function normalizeStockLengths(stockLengthsMm: number[]): number[] {
  return [...new Set(stockLengthsMm.filter((value) => Number.isFinite(value) && value > 0))].sort((a, b) => a - b);
}

function splitOversizedPieces(pieces: RequiredPiece[], stockLengthsMm: number[]): RequiredPiece[] {
  const lengths = normalizeStockLengths(stockLengthsMm);
  const maxStockLengthMm = lengths[lengths.length - 1];
  if (!maxStockLengthMm) return [];
  const out: RequiredPiece[] = [];
  for (const piece of pieces) {
    let remaining = piece.lengthMm;
    let n = 1;
    while (remaining > maxStockLengthMm + EPS) {
      out.push({ ...piece, id: `${piece.id}.${n}`, lengthMm: maxStockLengthMm });
      remaining -= maxStockLengthMm;
      n += 1;
    }
    if (remaining > EPS) out.push({ ...piece, id: `${piece.id}.${n}`, lengthMm: remaining });
  }
  return out;
}

function chooseNewStockLength(pieceLengthMm: number, remainingPieces: RequiredPiece[], stockLengthsMm: number[]): number {
  const candidates = stockLengthsMm.filter((length) => length + EPS >= pieceLengthMm);
  if (!candidates.length) return stockLengthsMm[stockLengthsMm.length - 1];
  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const residual = candidate - pieceLengthMm;
    let largestFollowUp = 0;
    for (const other of remainingPieces) {
      if (other.lengthMm <= residual + EPS && other.lengthMm > largestFollowUp) largestFollowUp = other.lengthMm;
    }
    const score = (residual - largestFollowUp) * 100000 + candidate;
    if (score < bestScore) { bestScore = score; best = candidate; }
  }
  return best;
}

const pad = (prefix: string, value: number) => `${prefix}${String(value).padStart(3, '0')}`;

export function optimizeCutsDetailed(pieces: RequiredPiece[], stockLengthsMmInput: number | number[]): CutOptimizationResult {
  const stockLengthsMm = normalizeStockLengths(Array.isArray(stockLengthsMmInput) ? stockLengthsMmInput : [stockLengthsMmInput]);
  const rules = {
    status: 'pending-manufacturer-validation' as const,
    note: 'Longueur minimale réutilisable, distance minimale entre joints et trait de scie : à confirmer selon les règles fabricant / atelier. Aucun seuil n’est inventé.',
  };
  if (!stockLengthsMm.length) return { boards: [], offcuts: [], totalStockMm: 0, totalRequiredMm: 0, finalRemainingMm: 0, reusedOffcutCount: 0, rules };

  const normalized = splitOversizedPieces(pieces, stockLengthsMm)
    .slice().sort((a, b) => b.lengthMm - a.lengthMm || a.id.localeCompare(b.id));
  const boards: StockBoard[] = [];
  const offcuts: CutOffcut[] = [];
  let cutCounter = 0;
  let offcutCounter = 0;
  let reusedOffcutCount = 0;

  const createOffcut = (board: StockBoard, cutId: string, lengthMm: number) => {
    if (lengthMm <= EPS) return undefined;
    const id = pad('C', ++offcutCounter);
    offcuts.push({ id, stockBoardId: board.id, createdByCutId: cutId, lengthMm, status: 'remaining' });
    return id;
  };

  for (let pIndex = 0; pIndex < normalized.length; pIndex += 1) {
    const piece = normalized[pIndex];
    let bestIndex = -1;
    let bestAfter = Number.POSITIVE_INFINITY;
    for (let i = 0; i < boards.length; i += 1) {
      const after = boards[i].remainingMm - piece.lengthMm;
      if (after >= -EPS && after < bestAfter) { bestIndex = i; bestAfter = after; }
    }

    const cutId = pad('CUT', ++cutCounter);
    if (bestIndex < 0) {
      const stockLengthMm = chooseNewStockLength(piece.lengthMm, normalized.slice(pIndex + 1), stockLengthsMm);
      const board: StockBoard = {
        index: boards.length + 1, id: pad('B', boards.length + 1), stockLengthMm,
        cuts: [], remainingMm: Math.max(0, stockLengthMm - piece.lengthMm), reuseCount: 0,
      };
      const resultingOffcutId = createOffcut(board, cutId, board.remainingMm);
      const placement: CutPlacement = {
        id: cutId, pieceId: piece.id, rowIndex: piece.rowIndex, lengthMm: piece.lengthMm,
        sourceType: 'stock-board', sourceId: board.id, sourceLengthBeforeMm: stockLengthMm,
        remainingAfterMm: board.remainingMm, resultingOffcutId,
      };
      board.cuts.push(placement);
      board.finalOffcutId = resultingOffcutId;
      boards.push(board);
      continue;
    }

    const board = boards[bestIndex];
    const sourceOffcutId = board.finalOffcutId;
    const sourceOffcut = sourceOffcutId ? offcuts.find((item) => item.id === sourceOffcutId) : undefined;
    const sourceLengthBeforeMm = board.remainingMm;
    if (sourceOffcut) { sourceOffcut.status = 'reused'; sourceOffcut.reusedByCutId = cutId; }
    board.remainingMm = Math.max(0, board.remainingMm - piece.lengthMm);
    board.reuseCount += 1;
    reusedOffcutCount += 1;
    const resultingOffcutId = createOffcut(board, cutId, board.remainingMm);
    board.finalOffcutId = resultingOffcutId;
    board.cuts.push({
      id: cutId, pieceId: piece.id, rowIndex: piece.rowIndex, lengthMm: piece.lengthMm,
      sourceType: 'offcut', sourceId: sourceOffcutId ?? board.id, sourceLengthBeforeMm,
      remainingAfterMm: board.remainingMm, resultingOffcutId,
    });
  }

  return {
    boards, offcuts,
    totalStockMm: boards.reduce((sum, board) => sum + board.stockLengthMm, 0),
    totalRequiredMm: normalized.reduce((sum, piece) => sum + piece.lengthMm, 0),
    finalRemainingMm: boards.reduce((sum, board) => sum + board.remainingMm, 0),
    reusedOffcutCount, rules,
  };
}

export function optimizeCuts(pieces: RequiredPiece[], stockLengthsMmInput: number | number[]): StockBoard[] {
  return optimizeCutsDetailed(pieces, stockLengthsMmInput).boards;
}
