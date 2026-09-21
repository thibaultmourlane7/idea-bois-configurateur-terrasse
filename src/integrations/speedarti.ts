import type { ConfiguratorResult, ProjectInput } from '../domain/types';

export const SPEEDARTI_TAG = 'SA-TERR-SA-002';

export interface SpeedArtiTerracePayload {
  source: 'idea-bois-configurateur-terrasse';
  version: '0.12.0';
  projectName: string;
  input: ProjectInput;
  materialSummary: {
    areaM2: number;
    perimeterM: number;
    purchasedAreaM2?: number;
    stockBoards?: number;
    joistLinearM?: number;
    supportPointCount?: number;
    fixingCount?: number;
    basketStatus?: 'complete' | 'range' | 'partial';
    totalTtc?: number;
    totalMinTtc?: number;
    totalMaxTtc?: number;
    knownSubtotalTtc?: number;
  };
  excludesLabor: true;
}

export function toSpeedArtiPayload(input: ProjectInput, result: ConfiguratorResult): SpeedArtiTerracePayload {
  if (!result.geometry) {
    throw new Error('Projet invalide : géométrie requise pour export SpeedArti.');
  }

  return {
    source: 'idea-bois-configurateur-terrasse',
    version: '0.12.0',
    projectName: input.projectName,
    input,
    materialSummary: {
      areaM2: result.geometry.areaM2,
      perimeterM: result.geometry.perimeterM,
      purchasedAreaM2: result.layout?.purchasedAreaM2,
      stockBoards: result.layout?.stockBoards.length,
      joistLinearM: result.structure?.joistLinearM,
      supportPointCount: result.structure?.supportPointCount,
      fixingCount: result.structure?.fixingCount,
      basketStatus: result.basket?.status,
      totalTtc: result.basket?.totalTtc,
      totalMinTtc: result.basket?.totalMinTtc,
      totalMaxTtc: result.basket?.totalMaxTtc,
      knownSubtotalTtc: result.basket?.knownSubtotalTtc,
    },
    excludesLabor: true,
  };
}
