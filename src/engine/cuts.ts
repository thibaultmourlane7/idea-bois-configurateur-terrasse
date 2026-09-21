import type { RequiredPiece, StockBoard } from '../domain/types';

export const CUT_TAG = 'SA-TERR-CUT-001';

function splitOversizedPieces(pieces: RequiredPiece[], stockLengthMm: number): RequiredPiece[] {
  const out: RequiredPiece[] = [];
  for (const piece of pieces) {
    let remaining = piece.lengthMm;
    let n = 1;
    while (remaining > stockLengthMm + 0.0001) {
      out.push({ ...piece, id: `${piece.id}.${n}`, lengthMm: stockLengthMm });
      remaining -= stockLengthMm;
      n += 1;
    }
    if (remaining > 0.0001) out.push({ ...piece, id: `${piece.id}.${n}`, lengthMm: remaining });
  }
  return out;
}

/** Optimisation matière déterministe (best-fit decreasing). */
export function optimizeCuts(pieces: RequiredPiece[], stockLengthMm: number): StockBoard[] {
  const normalized = splitOversizedPieces(pieces, stockLengthMm)
    .slice()
    .sort((a, b) => b.lengthMm - a.lengthMm || a.id.localeCompare(b.id));

  const boards: StockBoard[] = [];
  for (const piece of normalized) {
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
