import type {
  ProjectInput,
  TerraceEdgeContext,
  TerraceEdgeResult,
  TerraceEdgeTreatment,
} from '../domain/types';
import { getDeckOutlinePointsM } from './geometry';

export const EDGE_TAG = 'SA-TERR-EDGE-022';

export const EDGE_CONTEXT_LABELS: Record<TerraceEdgeContext, string> = {
  free: 'Rive libre',
  wall: 'Contre mur',
  facade: 'Façade',
  threshold: 'Seuil',
  access: 'Accès',
  finish: 'Rive de finition',
};

export const EDGE_TREATMENT_LABELS: Record<TerraceEdgeTreatment, string> = {
  none: 'Aucun traitement ajouté',
  cladding: 'Habillage / bandeau',
  profile: 'Profil de finition',
  'edge-board': 'Lame de rive',
  drainage: 'Drainage / évacuation',
};

function vertexLabel(index: number): string {
  let value = index + 1;
  let out = '';
  while (value > 0) {
    value -= 1;
    out = String.fromCharCode(65 + (value % 26)) + out;
    value = Math.floor(value / 26);
  }
  return out;
}

const validContexts = new Set<TerraceEdgeContext>(['free', 'wall', 'facade', 'threshold', 'access', 'finish']);
const validTreatments = new Set<TerraceEdgeTreatment>(['none', 'cladding', 'profile', 'edge-board', 'drainage']);

function configFor(input: ProjectInput, edgeIndex: number) {
  const config = (input.edgeConfigs ?? []).find((item) => item.edgeIndex === edgeIndex);
  if (!config) return undefined;
  return {
    ...config,
    context: validContexts.has(config.context) ? config.context : 'free',
    treatment: validTreatments.has(config.treatment) ? config.treatment : 'none',
  };
}

function treatmentFor(input: ProjectInput, edgeIndex: number): TerraceEdgeTreatment {
  if (input.edgeFinishMode === 'full-perimeter') return 'cladding';
  if (input.edgeFinishMode === 'none') return 'none';
  return configFor(input, edgeIndex)?.treatment ?? 'none';
}

export function computeTerraceEdges(input: ProjectInput): TerraceEdgeResult[] {
  if (input.shape === 'circle') {
    const diameterM = input.dimensions.circleDiameterM;
    const radiusM = diameterM / 2;
    const config = configFor(input, 0);
    return [{
      id: 'EDGE-1',
      edgeIndex: 0,
      label: 'Rive circulaire',
      start: { xM: diameterM, yM: radiusM },
      end: { xM: diameterM, yM: radiusM },
      lengthM: Math.PI * diameterM,
      curved: true,
      context: config?.context ?? 'free',
      treatment: treatmentFor(input, 0),
      configured: Boolean(config),
      note: config?.note,
    }];
  }

  const points = getDeckOutlinePointsM(input);
  return points.map((point, edgeIndex) => {
    const next = points[(edgeIndex + 1) % points.length];
    const config = configFor(input, edgeIndex);
    return {
      id: `EDGE-${edgeIndex + 1}`,
      edgeIndex,
      label: `${vertexLabel(edgeIndex)}${vertexLabel((edgeIndex + 1) % points.length)}`,
      start: { xM: point.x, yM: point.y },
      end: { xM: next.x, yM: next.y },
      lengthM: Math.hypot(next.x - point.x, next.y - point.y),
      curved: false,
      context: config?.context ?? 'free',
      treatment: treatmentFor(input, edgeIndex),
      configured: Boolean(config),
      note: config?.note,
    };
  });
}

export function edgesForTreatment(input: ProjectInput, treatment: TerraceEdgeTreatment): TerraceEdgeResult[] {
  return computeTerraceEdges(input).filter((edge) => edge.treatment === treatment);
}

export function edgeTreatmentLengthM(input: ProjectInput, treatment: TerraceEdgeTreatment): number {
  return edgesForTreatment(input, treatment).reduce((sum, edge) => sum + edge.lengthM, 0);
}

export function hasEdgeTreatment(input: ProjectInput, treatment: TerraceEdgeTreatment): boolean {
  return edgesForTreatment(input, treatment).length > 0;
}
