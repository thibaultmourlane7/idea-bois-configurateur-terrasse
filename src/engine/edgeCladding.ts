import type { ProjectInput, RequiredPiece, StockBoard, StockLengthBreakdown } from '../domain/types';
import {
  EXOTIC_JOIST_VARIANTS,
  PIN_JOIST_VARIANTS,
  type CommercialMaterial,
} from '../catalog/materials';
import { getDeckOutlinePointsM } from './geometry';
import { optimizeCuts } from './cuts';
import { getCommercialConstructionRule } from './constructionRules';

export interface EdgeCladdingCalculation {
  status: 'none' | 'exact' | 'partial';
  mode: 'none' | 'same-decking' | 'dedicated-skirt';
  reason?: string;
  perimeterM: number;
  heightM: number;
  rowCount?: number;
  boardRequiredLinearM?: number;
  boardPurchasedLinearM?: number;
  boardPurchasedAreaM2?: number;
  boardStockBoards?: StockBoard[];
  boardTotalTtc?: number;
  verticalJoistSpacingMm?: number;
  verticalSupportCount?: number;
  verticalJoistRequiredLinearM?: number;
  verticalJoistStockBoards?: StockBoard[];
  verticalJoistTotalTtc?: number;
  verticalJoistLabel?: string;
  verticalJoistStockBreakdown?: StockLengthBreakdown[];
  verticalJoistSourceUrl?: string;
  /** Vis nécessaires pour fixer les lames de rive aux supports verticaux : 2 vis par lame et par support. */
  edgeBoardFixingCount?: number;
  edgeFixingSourceUrl?: string;
  edgeLengthsM: number[];
}

const round2 = (value: number) => Math.round(value * 100) / 100;

function joistVariantsForRule(
  stockLengthsMm: number[],
  productRef?: string,
): CommercialMaterial[] | undefined {
  const groups = [PIN_JOIST_VARIANTS, EXOTIC_JOIST_VARIANTS];
  return groups.find((group) => {
    const coversAllLengths = stockLengthsMm.every((lengthMm) =>
      group.some((item) => item.lengthMm === lengthMm),
    );
    const matchesReference = !productRef || group.some((item) => item.productRef === productRef);
    return coversAllLengths && matchesReference;
  });
}

function stockBreakdown(
  stockBoards: StockBoard[],
  materials: CommercialMaterial[],
): StockLengthBreakdown[] {
  const counts = new Map<number, number>();
  const materialsByLength = new Map(
    materials
      .filter((item) => item.lengthMm != null)
      .map((item) => [item.lengthMm as number, item]),
  );

  for (const stock of stockBoards) {
    counts.set(stock.stockLengthMm, (counts.get(stock.stockLengthMm) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([lengthMm, quantity]) => ({
      lengthMm,
      quantity,
      productRef: materialsByLength.get(lengthMm)?.productRef,
    }));
}


function edgeLengths(input: ProjectInput): number[] {
  if (input.shape === 'circle') return [Math.PI * input.dimensions.circleDiameterM];
  const points = getDeckOutlinePointsM(input);
  return points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    return Math.hypot(next.x - point.x, next.y - point.y);
  }).filter((length) => length > 0.001);
}

function requiredPiecesForRows(lengthsM: number[], rows: number): RequiredPiece[] {
  const pieces: RequiredPiece[] = [];
  for (let row = 0; row < rows; row += 1) {
    lengthsM.forEach((lengthM, edgeIndex) => {
      pieces.push({
        id: `EDGE-R${row + 1}-E${edgeIndex + 1}`,
        rowIndex: row,
        lengthMm: lengthM * 1000,
      });
    });
  }
  return pieces;
}

function verticalSupportPieces(lengthsM: number[], spacingMm: number, heightM: number): { pieces: RequiredPiece[]; count: number } {
  const pieces: RequiredPiece[] = [];
  let index = 0;
  lengthsM.forEach((lengthM, edgeIndex) => {
    const intervals = Math.max(1, Math.ceil((lengthM * 1000) / spacingMm));
    const count = intervals + 1;
    for (let i = 0; i < count; i += 1) {
      pieces.push({
        id: `VJ-E${edgeIndex + 1}-${i + 1}`,
        rowIndex: edgeIndex,
        lengthMm: heightM * 1000,
      });
      index += 1;
    }
  });
  return { pieces, count: index };
}

export function computeEdgeCladding(input: ProjectInput): EdgeCladdingCalculation {
  const lengthsM = edgeLengths(input);
  const perimeterM = lengthsM.reduce((sum, value) => sum + value, 0);
  const heightM = Math.max(0, input.edgeCladdingHeightCm) / 100;

  if (input.edgeFinishMode !== 'full-perimeter' || heightM <= 0) {
    return { status: 'none', mode: 'none', perimeterM, heightM, edgeLengthsM: lengthsM };
  }

  if (input.board.technical.materialFamily === 'composite') {
    return {
      status: 'partial',
      mode: 'dedicated-skirt',
      perimeterM,
      heightM,
      edgeLengthsM: lengthsM,
      reason: 'Le composite conserve son accessoire de finition dédié ; le calcul détaillé reste géré par le panier SILVADEC.',
    };
  }

  if (input.shape === 'circle') {
    return {
      status: 'partial',
      mode: 'same-decking',
      perimeterM,
      heightM,
      edgeLengthsM: lengthsM,
      reason: 'Une rive circulaire nécessite une solution de cintrage ou de facettage à valider. Aucune quantité de lame droite n’est inventée.',
    };
  }

  if (!input.board.availableLengthsMm?.length || input.board.priceTtcPerM2 == null) {
    return {
      status: 'partial',
      mode: 'same-decking',
      perimeterM,
      heightM,
      edgeLengthsM: lengthsM,
      reason: 'Les longueurs commerciales ou le prix de la lame sont nécessaires pour chiffrer l’habillage.',
    };
  }

  const pitchM = (input.board.widthMm + (input.board.gapMm ?? 0)) / 1000;
  if (pitchM <= 0) {
    return {
      status: 'partial',
      mode: 'same-decking',
      perimeterM,
      heightM,
      edgeLengthsM: lengthsM,
      reason: 'Le jeu de pose de la lame doit être validé pour calculer le nombre de rangs d’habillage.',
    };
  }

  const rowCount = Math.ceil(heightM / pitchM);
  const boardPieces = requiredPiecesForRows(lengthsM, rowCount);
  const boardStockBoards = optimizeCuts(boardPieces, input.board.availableLengthsMm);
  const boardRequiredLinearM = boardPieces.reduce((sum, piece) => sum + piece.lengthMm, 0) / 1000;
  const boardPurchasedLinearM = boardStockBoards.reduce((sum, board) => sum + board.stockLengthMm, 0) / 1000;
  const boardPurchasedAreaM2 = boardPurchasedLinearM * (input.board.widthMm / 1000);
  const boardTotalTtc = round2(boardPurchasedAreaM2 * input.board.priceTtcPerM2);

  const rule = getCommercialConstructionRule(input);
  if (!rule || rule.status !== 'validated' || rule.joistSpacingMm <= 0) {
    return {
      status: 'partial',
      mode: 'same-decking',
      perimeterM,
      heightM,
      rowCount,
      boardRequiredLinearM,
      boardPurchasedLinearM,
      boardPurchasedAreaM2,
      boardStockBoards,
      boardTotalTtc,
      edgeLengthsM: lengthsM,
      reason: 'L’habillage en lame identique est calculé, mais l’entraxe des supports verticaux reste à valider pour cette gamme.',
    };
  }

  const verticalMaterials = joistVariantsForRule(rule.joistStockLengthsMm, rule.joistProductRef);
  if (!verticalMaterials) {
    return {
      status: 'partial',
      mode: 'same-decking',
      perimeterM,
      heightM,
      rowCount,
      boardRequiredLinearM,
      boardPurchasedLinearM,
      boardPurchasedAreaM2,
      boardStockBoards,
      boardTotalTtc,
      verticalJoistSpacingMm: rule.joistSpacingMm,
      edgeLengthsM: lengthsM,
      reason: 'La règle de structure est connue mais les longueurs commerciales/prix de la lambourde associée ne sont pas entièrement validés pour l’habillage vertical.',
    };
  }

  const vertical = verticalSupportPieces(lengthsM, rule.joistSpacingMm, heightM);
  const verticalJoistStockBoards = optimizeCuts(vertical.pieces, rule.joistStockLengthsMm);
  const verticalJoistRequiredLinearM = vertical.pieces.reduce((sum, piece) => sum + piece.lengthMm, 0) / 1000;
  const materialByLength = new Map(
    verticalMaterials
      .filter((item) => item.lengthMm != null)
      .map((item) => [item.lengthMm as number, item]),
  );
  const verticalJoistTotalRaw = verticalJoistStockBoards.reduce((sum, stock) => {
    const material = materialByLength.get(stock.stockLengthMm);
    return material ? sum + material.unitPriceTtc : Number.NaN;
  }, 0);

  if (!Number.isFinite(verticalJoistTotalRaw)) {
    return {
      status: 'partial',
      mode: 'same-decking',
      perimeterM,
      heightM,
      rowCount,
      boardRequiredLinearM,
      boardPurchasedLinearM,
      boardPurchasedAreaM2,
      boardStockBoards,
      boardTotalTtc,
      verticalJoistSpacingMm: rule.joistSpacingMm,
      verticalSupportCount: vertical.count,
      verticalJoistRequiredLinearM,
      verticalJoistStockBoards,
      edgeLengthsM: lengthsM,
      reason: 'Une longueur de lambourde sélectionnée pour l’habillage vertical n’a pas encore de prix commercial validé.',
    };
  }

  const verticalJoistTotalTtc = round2(verticalJoistTotalRaw);
  const verticalJoistStockBreakdown = stockBreakdown(verticalJoistStockBoards, verticalMaterials);
  const edgeBoardFixingCount = rowCount * vertical.count * 2;

  return {
    status: 'exact',
    mode: 'same-decking',
    perimeterM,
    heightM,
    rowCount,
    boardRequiredLinearM,
    boardPurchasedLinearM,
    boardPurchasedAreaM2,
    boardStockBoards,
    boardTotalTtc,
    verticalJoistSpacingMm: rule.joistSpacingMm,
    verticalSupportCount: vertical.count,
    verticalJoistRequiredLinearM,
    verticalJoistStockBoards,
    verticalJoistTotalTtc,
    verticalJoistLabel: rule.joistLabel,
    verticalJoistStockBreakdown,
    verticalJoistSourceUrl: rule.sourceUrl,
    edgeBoardFixingCount,
    edgeFixingSourceUrl: 'https://www.idea-bois.com/userfiles/product_File/470.pdf',
    edgeLengthsM: lengthsM,
  };
}
