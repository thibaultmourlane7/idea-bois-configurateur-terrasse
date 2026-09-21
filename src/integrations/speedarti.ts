import type { ConfiguratorResult, ProjectInput } from '../domain/types';

export const SPEEDARTI_TAG = 'SA-TERR-SA-001';

export interface SpeedArtiTerracePayload {
  source: 'idea-bois-configurateur-terrasse';
  version: '0.6.0';
  projectName: string;
  input: ProjectInput;
  materialSummary: {
    areaM2: number;
    purchasedAreaM2: number;
    stockBoards: number;
    joistLinearM: number;
    supportPointCount: number;
    fixingCount?: number;
    materialTtc?: number;
  };
  excludesLabor: true;
}

export function toSpeedArtiPayload(input: ProjectInput, result: ConfiguratorResult): SpeedArtiTerracePayload {
  if (!result.valid || !result.geometry || !result.layout || !result.structure) {
    throw new Error('Projet invalide : export SpeedArti interdit.');
  }

  return {
    source: 'idea-bois-configurateur-terrasse',
    version: '0.6.0',
    projectName: input.projectName,
    input,
    materialSummary: {
      areaM2: result.geometry.areaM2,
      purchasedAreaM2: result.layout.purchasedAreaM2,
      stockBoards: result.layout.stockBoards.length,
      joistLinearM: result.structure.joistLinearM,
      supportPointCount: result.structure.supportPointCount,
      fixingCount: result.structure.fixingCount,
      materialTtc: result.pricing?.materialTtc,
    },
    excludesLabor: true,
  };
}
