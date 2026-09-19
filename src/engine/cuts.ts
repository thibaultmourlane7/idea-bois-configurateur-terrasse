import type { RequiredPiece, StockBoard } from '../domain/types';

export const CUT_TAG = 'IB-TERR-CUT-001';

function splitOversizedPieces(pieces: RequiredPiece[], stockLengthMm: number): RequiredPiece[] {
  const out: RequiredPiece[] = [];
  for (const p of pieces) {
    let remaining = p.lengthMm;
    let n = 1;
    while (remaining > stockLengthMm) {
      out.push({ ...p, id: `${p.id}.${n}`, lengthMm: stockLengthMm });
      remaining -= stockLengthMm;
      n += 1;
    }
    if (remaining > 0.0001) out.push({ ...p, id: `${p.id}.${n}`, lengthMm: remaining });
  }
  return out;
}

/**
 * Best-fit decreasing déterministe.
 * Pour un très grand jeu de pièces, il s'agit d'une optimisation pratique,
 * pas d'une preuve mathématique d'optimalité globale du bin-packing.
 */
export function optimizeCuts(pieces: RequiredPiece[], stockLengthMm: number): StockBoard[] {
  const normalized = splitOversizedPieces(pieces, stockLengthMm)
    .slice()
    .sort((a, b) => b.lengthMm - a.lengthMm);

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
      const b = boards[bestIndex];
      b.cuts.push({ pieceId: piece.id, rowIndex: piece.rowIndex, lengthMm: piece.lengthMm });
      b.remainingMm -= piece.lengthMm;
    }
  }

  return boards;
}
