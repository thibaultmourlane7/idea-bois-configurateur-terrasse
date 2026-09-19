import type { LayoutResult, PricingResult, ProjectInput } from '../domain/types';

export const PRICE_TAG = 'IB-TERR-PRICE-001';

export function computePricing(input: ProjectInput, layout: LayoutResult): PricingResult {
  const unit = input.board.priceTtcPerM2;
  if (unit == null) return {};
  return { unitPriceTtcPerM2: unit, materialTtc: layout.purchasedAreaM2 * unit };
}
