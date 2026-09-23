import type { GeometryResult, LayoutResult, PricingResult, ProjectInput } from '../domain/types';
import { boardForZone } from '../catalog/compatibility';

export const PRICE_TAG = 'SA-TERR-PRICE-001';

export function computePricing(input: ProjectInput, geometry: GeometryResult, layout?: LayoutResult): PricingResult {
  const unit = input.board.priceTtcPerM2;
  const sourceDate = input.board.catalog?.sourceDate;
  const missingCostFamilies = ['sous-structure', 'plots / appuis', 'fixations', 'accessoires / rives'];

  if (unit == null) {
    return {
      status: 'unavailable',
      isCompleteMaterialTotal: false,
      missingCostFamilies,
      sourceDate,
    };
  }

  const surfaceNetTtc = geometry.areaM2 * unit;
  if (!layout) {
    return {
      unitPriceTtcPerM2: unit,
      surfaceNetTtc,
      status: 'surface-price',
      isCompleteMaterialTotal: false,
      missingCostFamilies,
      sourceDate,
    };
  }

  const productTotals = layout.productSummaries.map((summary) => {
    const board = boardForZone(input.board, summary.boardId);
    return board.priceTtcPerM2 == null ? undefined : summary.purchasedAreaM2 * board.priceTtcPerM2;
  });
  const boardPurchaseTtc = productTotals.some((value) => value == null)
    ? undefined
    : productTotals.reduce((sum, value) => sum + (value ?? 0), 0);

  return {
    unitPriceTtcPerM2: layout.productSummaries.length === 1 ? unit : undefined,
    surfaceNetTtc,
    boardPurchaseTtc,
    materialTtc: boardPurchaseTtc,
    status: boardPurchaseTtc == null ? 'surface-price' : 'board-purchase',
    isCompleteMaterialTotal: false,
    missingCostFamilies,
    sourceDate,
  };
}
