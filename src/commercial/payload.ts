import type { ConfiguratorResult, ProjectInput } from '../domain/types';
import type { CommercialIntent, CommercialProjectPayload, CustomerContact } from './types';

export function buildCommercialPayload(
  intent: CommercialIntent,
  project: ProjectInput,
  result: ConfiguratorResult,
  configuratorVersion: string,
  customer?: CustomerContact,
  createdAt = new Date().toISOString(),
): CommercialProjectPayload {
  return {
    source: 'idea-bois-configurateur-terrasse',
    schemaVersion: '1.0',
    configuratorVersion,
    intent,
    createdAt,
    project,
    resultSummary: {
      areaM2: result.geometry?.areaM2,
      perimeterM: result.geometry?.perimeterM,
      basketStatus: result.basket?.status,
      totalTtc: result.basket?.totalTtc,
      totalMinTtc: result.basket?.totalMinTtc,
      totalMaxTtc: result.basket?.totalMaxTtc,
      knownSubtotalTtc: result.basket?.knownSubtotalTtc,
      lines: (result.basket?.lines ?? []).map((line) => ({
        family: line.family,
        label: line.label,
        productRef: line.productRef,
        quantity: line.quantity,
        quantityMin: line.quantityMin,
        quantityMax: line.quantityMax,
        unit: line.unit,
        totalTtc: line.totalTtc,
        totalMinTtc: line.totalMinTtc,
        totalMaxTtc: line.totalMaxTtc,
        status: line.status,
      })),
    },
    customer,
    excludesLabor: true,
  };
}
