import type {
  LayoutResult,
  ProjectInput,
  SupportPlanResult,
  TerraceObstacle,
} from '../domain/types';
import { findBoard } from '../catalog/compatibility';
import { computeTerraceEdges } from './edges';
import { getDeckBoundingSizeM, getDeckOutlinePointsM } from './geometry';
import { computeTerrainModel, targetFinishedDeltaMm, type TerrainModel } from './terrain';

export const SCENE_3D_TAG = 'SA-TERR-3D-110';

export interface Scene3DPoint {
  xM: number;
  yM: number;
  zM: number;
}

export interface Scene3DBoard {
  id: string;
  sourceSegmentId: string;
  boardId: string;
  boardLabel: string;
  zoneId: string;
  widthM: number;
  thicknessM: number;
  lengthM: number;
  top: [Scene3DPoint, Scene3DPoint, Scene3DPoint, Scene3DPoint];
  bottom: [Scene3DPoint, Scene3DPoint, Scene3DPoint, Scene3DPoint];
  baseColor: string;
  grainColor: string;
  accentColor: string;
}

export interface Scene3DJoist {
  id: string;
  role: string;
  zoneId?: string;
  multiplicity: number;
  widthM: number;
  heightM: number;
  start: Scene3DPoint;
  end: Scene3DPoint;
}

export interface Scene3DSupport {
  id: string;
  zoneId?: string;
  xM: number;
  yM: number;
  bottomZM: number;
  topZM: number;
  radiusM: number;
  status: 'exact' | 'unsupported';
  multiplicity: number;
  label?: string;
}

export interface Scene3DEdge {
  id: string;
  label: string;
  treatment: string;
  start: Scene3DPoint;
  end: Scene3DPoint;
  heightM: number;
  curved: boolean;
}

export interface Scene3DObstacle {
  id: string;
  kind: TerraceObstacle['kind'];
  label: string;
  shape: TerraceObstacle['shape'];
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
  diameterM?: number;
  topZM: number;
}

export interface Scene3DModel {
  tag: typeof SCENE_3D_TAG;
  bounds: {
    lengthM: number;
    widthM: number;
    minZM: number;
    maxZM: number;
  };
  deckOutline: Scene3DPoint[];
  boards: Scene3DBoard[];
  joists: Scene3DJoist[];
  supports: Scene3DSupport[];
  edges: Scene3DEdge[];
  obstacles: Scene3DObstacle[];
  terrain: TerrainModel;
  diagnostics: string[];
}

function finishedTopZM(input: ProjectInput, xM: number, yM: number, zoneId?: string): number {
  return input.heightCm / 100 + targetFinishedDeltaMm(input, xM, yM, zoneId) / 1000;
}

function boardObject(input: ProjectInput, layout: LayoutResult, index: number): Scene3DBoard | undefined {
  const segment = layout.boardSegments[index];
  if (
    segment.x1M == null || segment.y1M == null ||
    segment.x2M == null || segment.y2M == null
  ) return undefined;

  const board = findBoard(segment.boardId) ?? input.board;
  const lengthM = Math.hypot(segment.x2M - segment.x1M, segment.y2M - segment.y1M);
  if (lengthM <= .0001) return undefined;

  const dirX = segment.dirX ?? (segment.x2M - segment.x1M) / lengthM;
  const dirY = segment.dirY ?? (segment.y2M - segment.y1M) / lengthM;
  const normalX = segment.normalX ?? -dirY;
  const normalY = segment.normalY ?? dirX;
  const halfWidthM = board.widthMm / 2000;
  const thicknessM = board.thicknessMm / 1000;

  const sLeft = { xM: segment.x1M + normalX * halfWidthM, yM: segment.y1M + normalY * halfWidthM };
  const sRight = { xM: segment.x1M - normalX * halfWidthM, yM: segment.y1M - normalY * halfWidthM };
  const eRight = { xM: segment.x2M - normalX * halfWidthM, yM: segment.y2M - normalY * halfWidthM };
  const eLeft = { xM: segment.x2M + normalX * halfWidthM, yM: segment.y2M + normalY * halfWidthM };
  const startZ = finishedTopZM(input, segment.x1M, segment.y1M, segment.zoneId);
  const endZ = finishedTopZM(input, segment.x2M, segment.y2M, segment.zoneId);

  const top: Scene3DBoard['top'] = [
    { ...sLeft, zM: startZ },
    { ...sRight, zM: startZ },
    { ...eRight, zM: endZ },
    { ...eLeft, zM: endZ },
  ];
  const bottom: Scene3DBoard['bottom'] = top.map((point) => ({ ...point, zM: point.zM - thicknessM })) as Scene3DBoard['bottom'];

  return {
    id: `BOARD3D-${segment.id}`,
    sourceSegmentId: segment.id,
    boardId: board.id,
    boardLabel: board.label,
    zoneId: segment.zoneId ?? 'main',
    widthM: board.widthMm / 1000,
    thicknessM,
    lengthM,
    top,
    bottom,
    baseColor: board.visual?.baseColor ?? '#d8c3a4',
    grainColor: board.visual?.grainColor ?? '#8f775d',
    accentColor: board.visual?.accentColor ?? '#efe6d8',
  };
}

function joistObjects(input: ProjectInput, supportPlan?: SupportPlanResult): Scene3DJoist[] {
  if (!supportPlan) return [];
  const widthM = input.joist.widthMm / 1000;
  const heightM = input.joist.heightMm / 1000;
  const boardThicknessM = input.board.thicknessMm / 1000;

  return supportPlan.joistSegments.map((segment) => {
    const z1 = finishedTopZM(input, segment.x1M, segment.y1M, segment.zoneId) - boardThicknessM - heightM / 2;
    const z2 = finishedTopZM(input, segment.x2M, segment.y2M, segment.zoneId) - boardThicknessM - heightM / 2;
    return {
      id: segment.id,
      role: segment.role ?? 'field',
      zoneId: segment.zoneId,
      multiplicity: segment.multiplicity,
      widthM,
      heightM,
      start: { xM: segment.x1M, yM: segment.y1M, zM: z1 },
      end: { xM: segment.x2M, yM: segment.y2M, zM: z2 },
    };
  });
}

function supportObjects(input: ProjectInput, supportPlan?: SupportPlanResult): Scene3DSupport[] {
  if (!supportPlan) return [];
  const boardThicknessM = input.board.thicknessMm / 1000;
  const joistHeightM = input.joist.heightMm / 1000;

  return supportPlan.supportPoints.map((point) => {
    const topZM = input.heightCm / 100 + point.targetFinishedDeltaMm / 1000 - boardThicknessM - joistHeightM;
    return {
      id: point.id,
      zoneId: point.zoneId,
      xM: point.xM,
      yM: point.yM,
      bottomZM: point.surfaceDeltaMm / 1000,
      topZM,
      radiusM: .045,
      status: point.status,
      multiplicity: point.multiplicity,
      label: point.plotLabel,
    };
  });
}

function edgeObjects(input: ProjectInput): Scene3DEdge[] {
  return computeTerraceEdges(input).map((edge) => {
    const startZ = finishedTopZM(input, edge.start.xM, edge.start.yM);
    const endZ = finishedTopZM(input, edge.end.xM, edge.end.yM);
    return {
      id: edge.id,
      label: edge.label,
      treatment: edge.treatment,
      start: { xM: edge.start.xM, yM: edge.start.yM, zM: startZ },
      end: { xM: edge.end.xM, yM: edge.end.yM, zM: endZ },
      heightM: edge.treatment === 'cladding' ? input.edgeCladdingHeightCm / 100 : .035,
      curved: edge.curved,
    };
  });
}

function obstacleObjects(input: ProjectInput): Scene3DObstacle[] {
  return input.obstacles.map((obstacle) => ({
    id: obstacle.id,
    kind: obstacle.kind,
    label: obstacle.label,
    shape: obstacle.shape,
    xM: obstacle.xM,
    yM: obstacle.yM,
    widthM: obstacle.shape === 'circle' ? obstacle.diameterM ?? 0 : obstacle.widthM ?? 0,
    heightM: obstacle.shape === 'circle' ? obstacle.diameterM ?? 0 : obstacle.heightM ?? 0,
    diameterM: obstacle.diameterM,
    topZM: finishedTopZM(
      input,
      obstacle.xM + (obstacle.shape === 'circle' ? (obstacle.diameterM ?? 0) / 2 : (obstacle.widthM ?? 0) / 2),
      obstacle.yM + (obstacle.shape === 'circle' ? (obstacle.diameterM ?? 0) / 2 : (obstacle.heightM ?? 0) / 2),
    ),
  }));
}

export function buildProfessional3DScene(
  input: ProjectInput,
  layout?: LayoutResult,
  supportPlan?: SupportPlanResult,
): Scene3DModel {
  const bounds = getDeckBoundingSizeM(input);
  const boards = layout?.boardSegments
    .map((_segment, index) => boardObject(input, layout, index))
    .filter((item): item is Scene3DBoard => Boolean(item)) ?? [];
  const joists = joistObjects(input, supportPlan);
  const supports = supportObjects(input, supportPlan);
  const edges = edgeObjects(input);
  const obstacles = obstacleObjects(input);
  const terrain = computeTerrainModel(input);
  const deckOutline = getDeckOutlinePointsM(input).map((point) => ({
    xM: point.x,
    yM: point.y,
    zM: finishedTopZM(input, point.x, point.y, 'main'),
  }));

  const zValues = [
    0,
    ...deckOutline.map((point) => point.zM),
    ...boards.flatMap((board) => [...board.top, ...board.bottom].map((point) => point.zM)),
    ...joists.flatMap((joist) => [joist.start.zM - joist.heightM / 2, joist.end.zM + joist.heightM / 2]),
    ...supports.flatMap((support) => [support.bottomZM, support.topZM]),
  ];

  const diagnostics: string[] = [];
  if (!layout) diagnostics.push('Calepinage indisponible : aucune lame 3D ne peut être créée.');
  if (layout && boards.length !== layout.boardSegments.length) {
    diagnostics.push(`${layout.boardSegments.length - boards.length} segment(s) de lame sans coordonnées 3D exploitables.`);
  }
  if (supportPlan?.status === 'partial') {
    diagnostics.push('Structure partielle : la 3D reflète uniquement les appuis et lambourdes réellement calculés.');
  }
  if (supportPlan?.pendingCurvedPerimeter) {
    diagnostics.push('Contour courbe : la lambourde périphérique courbe reste à confirmer et n’est pas inventée en 3D.');
  }
  diagnostics.push(...terrain.diagnostics);

  return {
    tag: SCENE_3D_TAG,
    bounds: {
      lengthM: bounds.lengthM,
      widthM: bounds.widthM,
      minZM: Math.min(...zValues),
      maxZM: Math.max(...zValues),
    },
    deckOutline,
    boards,
    joists,
    supports,
    edges,
    obstacles,
    terrain,
    diagnostics,
  };
}
