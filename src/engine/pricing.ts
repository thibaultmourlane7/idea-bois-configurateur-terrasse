import type { GeometryResult, LayoutResult, PricingResult, ProjectInput } from '../domain/types';

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

  const boardPurchaseTtc = layout.purchasedAreaM2 * unit;
  return {
    unitPriceTtcPerM2: unit,
    surfaceNetTtc,
    boardPurchaseTtc,
    materialTtc: boardPurchaseTtc,
    status: 'board-purchase',
    isCompleteMaterialTotal: false,
    missingCostFamilies,
    sourceDate,
  };
}
