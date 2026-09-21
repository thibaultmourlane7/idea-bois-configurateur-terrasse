import type { BoardSpec, ProjectInput } from '../domain/types';

export const ERP_TAG = 'SA-TERR-ERP-001';

export interface ErpProductRecord {
  sku: string;
  label: string;
  subtitle?: string;
  widthMm: number;
  lengthMm: number;
  thicknessMm: number;
  priceTtcPerM2?: number;
  stockByDepot?: Record<string, number>;
  materialFamily: 'solid-wood' | 'composite';
  mechanicalClass?: 'C18' | 'C24' | 'D18' | 'D24' | 'D30' | 'D40' | 'D50';
  useClass?: '3.1' | '3.2' | '4';
  densityKgM3?: number;
  technicalSource?: string;
  technicalSourceVersion?: string;
  manufacturerRulesValidated: boolean;
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
    subtitle: record.subtitle ?? `${record.widthMm} × ${record.thicknessMm} mm — longueur ${(record.lengthMm / 1000).toLocaleString('fr-FR')} m`,
    widthMm: record.widthMm,
    lengthMm: record.lengthMm,
    thicknessMm: record.thicknessMm,
    gapMm,
    priceTtcPerM2: record.priceTtcPerM2,
    isDemo: false,
    technical: {
      materialFamily: record.materialFamily,
      mechanicalClass: record.mechanicalClass,
      useClass: record.useClass,
      densityKgM3: record.densityKgM3,
      technicalEngine: record.materialFamily === 'composite' ? 'manufacturer-rules' : 'nf-dtu-51-4',
      manufacturerRulesValidated: record.manufacturerRulesValidated,
      sourceLabel: record.technicalSource ?? 'ERP / PIM IDEA Bois',
      sourceVersion: record.technicalSourceVersion,
    },
  };
}
