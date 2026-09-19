import type { BoardSpec, ProjectInput } from '../domain/types';

export const ERP_TAG = 'IB-TERR-ERP-001';

export interface ErpProductRecord {
  sku: string;
  label: string;
  widthMm: number;
  lengthMm: number;
  thicknessMm?: number;
  priceTtcPerM2?: number;
  stockByDepot?: Record<string, number>;
}

export interface ErpAdapter {
  getDeckingProducts(): Promise<ErpProductRecord[]>;
  getStock(sku: string, depotId: string): Promise<number | null>;
  createQuote(project: ProjectInput): Promise<{ externalId: string }>;
}

export function erpProductToBoard(record: ErpProductRecord, gapMm: number): BoardSpec {
  return {
    id: record.sku,
    label: record.label,
    widthMm: record.widthMm,
    lengthMm: record.lengthMm,
    thicknessMm: record.thicknessMm,
    gapMm,
    priceTtcPerM2: record.priceTtcPerM2,
    isDemo: false,
  };
}
