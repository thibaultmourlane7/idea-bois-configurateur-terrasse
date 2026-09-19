import type { ConfiguratorResult, ProjectInput } from '../domain/types';

export const SPEEDARTI_TAG = 'IB-TERR-SA-001';

export interface SpeedArtiTerracePayload {
  source: 'idea-bois-configurateur-terrasse';
  projectName: string;
  input: ProjectInput;
  materialSummary: {
    areaM2: number;
    purchasedAreaM2: number;
    stockBoards: number;
    materialTtc?: number;
  };
  excludesLabor: true;
}

export function toSpeedArtiPayload(input: ProjectInput, result: ConfiguratorResult): SpeedArtiTerracePayload {
  if (!result.valid || !result.geometry || !result.layout) throw new Error('Projet invalide : export SpeedArti interdit.');
  return {
    source: 'idea-bois-configurateur-terrasse',
    projectName: input.projectName,
    input,
    materialSummary: {
      areaM2: result.geometry.areaM2,
      purchasedAreaM2: result.layout.purchasedAreaM2,
      stockBoards: result.layout.stockBoards.length,
      materialTtc: result.pricing?.materialTtc,
    },
    excludesLabor: true,
  };
}
