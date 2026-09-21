import type { RequiredPiece, StockBoard } from '../domain/types';

export const CUT_TAG = 'SA-TERR-CUT-001';

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
    while (remaining > maxStockLengthMm + 0.0001) {
      out.push({ ...piece, id: `${piece.id}.${n}`, lengthMm: maxStockLengthMm });
      remaining -= maxStockLengthMm;
      n += 1;
    }
    if (remaining > 0.0001) out.push({ ...piece, id: `${piece.id}.${n}`, lengthMm: remaining });
  }
  return out;
}

function chooseNewStockLength(pieceLengthMm: number, remainingPieces: RequiredPiece[], stockLengthsMm: number[]): number {
  const candidates = stockLengthsMm.filter((length) => length + 0.0001 >= pieceLengthMm);
  if (!candidates.length) return stockLengthsMm[stockLengthsMm.length - 1];

  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const residual = candidate - pieceLengthMm;
    let largestFollowUp = 0;
    for (const other of remainingPieces) {
      if (other.lengthMm <= residual + 0.0001 && other.lengthMm > largestFollowUp) largestFollowUp = other.lengthMm;
    }
    const projectedWaste = residual - largestFollowUp;
    const score = projectedWaste * 100000 + candidate;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

/**
 * Optimisation matière déterministe multi-longueurs (best-fit decreasing + choix de longueur commerciale).
 * C'est une heuristique reproductible, pas une preuve d'optimum mathématique global.
 */
export function optimizeCuts(pieces: RequiredPiece[], stockLengthsMmInput: number | number[]): StockBoard[] {
  const stockLengthsMm = normalizeStockLengths(Array.isArray(stockLengthsMmInput) ? stockLengthsMmInput : [stockLengthsMmInput]);
  if (!stockLengthsMm.length) return [];

  const normalized = splitOversizedPieces(pieces, stockLengthsMm)
    .slice()
    .sort((a, b) => b.lengthMm - a.lengthMm || a.id.localeCompare(b.id));

  const boards: StockBoard[] = [];
  for (let pIndex = 0; pIndex < normalized.length; pIndex += 1) {
    const piece = normalized[pIndex];
    let bestIndex = -1;
    let bestRemainingAfter = Number.POSITIVE_INFINITY;

    for (let i = 0; i < boards.length; i += 1) {
      const after = boards[i].remainingMm - piece.lengthMm;
      if (after >= -0.0001 && after < bestRemainingAfter) {
        bestIndex = i;
        bestRemainingAfter = after;
      }
    }

    if (bestIndex < 0) {
      const stockLengthMm = chooseNewStockLength(piece.lengthMm, normalized.slice(pIndex + 1), stockLengthsMm);
      boards.push({
        index: boards.length + 1,
        stockLengthMm,
        cuts: [{ pieceId: piece.id, rowIndex: piece.rowIndex, lengthMm: piece.lengthMm }],
        remainingMm: stockLengthMm - piece.lengthMm,
      });
    } else {
      const board = boards[bestIndex];
      board.cuts.push({ pieceId: piece.id, rowIndex: piece.rowIndex, lengthMm: piece.lengthMm });
      board.remainingMm -= piece.lengthMm;
    }
  }
  return boards;
}
