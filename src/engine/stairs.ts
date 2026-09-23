import type {
  BoardSpec,
  LayingZone,
  ProjectInput,
  RequiredPiece,
  StairConfig,
  StairMode,
  TerracePoint,
} from '../domain/types';
import { boardForZone } from '../catalog/compatibility';
import { computeTerraceEdges } from './edges';
import { isPointInsideBaseDeck } from './geometry';
import { pointInZone } from './layingGeometry';
import {
  computeTerrainModel,
  targetFinishedDeltaMm,
  terrainPlatformAt,
  type TerrainBoundarySegment,
  type TerrainPlatform,
  type TerrainRelation,
} from './terrain';

export const STAIR_TAG = 'SA-TERR-STAIR-131';
const EPS = 1e-6;

export interface StairPoint3D extends TerracePoint {
  zM: number;
}

export interface StairTreadGeometry {
  id: string;
  index: number;
  top: [StairPoint3D, StairPoint3D, StairPoint3D, StairPoint3D];
}

export interface StairStructureAxis {
  id: string;
  start: StairPoint3D;
  end: StairPoint3D;
  lengthM: number;
}

export interface StairResult {
  id: string;
  label: string;
  mode: StairMode;
  relationId: string;
  edgeIndex?: number;
  landingLevelOffsetMm?: number;
  status: 'ready' | 'pending' | 'invalid';
  issues: string[];
  boardId: string;
  boardLabel: string;
  boundarySegmentIndex: number;
  lowPlatformId?: string;
  lowPlatformLabel?: string;
  highPlatformId?: string;
  highPlatformLabel?: string;
  widthM?: number;
  treadDepthMm?: number;
  stepCount?: number;
  boundaryOffsetM?: number;
  totalRunM?: number;
  riseLeftMm?: number;
  riseRightMm?: number;
  riserHeightLeftMm?: number;
  riserHeightRightMm?: number;
  treadAreaM2?: number;
  treadBoardRows?: number;
  treadRequiredLinearM?: number;
  structureLineCount?: number;
  structureLinearM?: number;
  footprint?: [TerracePoint, TerracePoint, TerracePoint, TerracePoint];
  treads: StairTreadGeometry[];
  structureAxes: StairStructureAxis[];
  requiredPieces: RequiredPiece[];
}

interface StairAttachment {
  mode: StairMode;
  relationId: string;
  edgeIndex?: number;
  boundarySegmentIndex: number;
  boundary: TerrainBoundarySegment;
  extensionNormal: { x: number; y: number };
  boundaryPlatformId: string;
  boundaryPlatformLabel: string;
  landingPlatformId: string;
  landingPlatformLabel: string;
  boundaryLevelMm: (point: TerracePoint) => number;
  landingLevelMm: (point: TerracePoint) => number;
  validateLandingPoint?: (point: TerracePoint) => boolean;
  landingLevelOffsetMm?: number;
}

function modeOf(config: StairConfig): StairMode {
  return config.mode ?? (config.relationId ? 'platform-transition' : 'external-edge');
}

function attachmentId(config: StairConfig): string {
  return modeOf(config) === 'external-edge'
    ? `EDGE-${config.edgeIndex ?? 'unset'}`
    : config.relationId ?? 'REL-unset';
}

function platformFinishedAbsoluteMm(input: ProjectInput, platform: TerrainPlatform, point: TerracePoint): number {
  return input.heightCm * 10
    + platform.finishedLevelOffsetMm
    + point.xM * platform.targetSlopeXPercent * 10
    + point.yM * platform.targetSlopeYPercent * 10;
}

function belongsToPlatform(input: ProjectInput, platformId: string, point: TerracePoint): boolean {
  if (!isPointInsideBaseDeck(input, point.xM, point.yM)) return false;
  if (platformId === 'main') {
    return !(input.layingZones ?? []).some((zone) => pointInZone(point, zone));
  }
  const zone = (input.layingZones ?? []).find((item) => item.id === platformId);
  return Boolean(zone && pointInZone(point, zone));
}

function selectedBoard(input: ProjectInput, config: StairConfig): BoardSpec {
  return boardForZone(input.board, config.boardId);
}

function baseResult(input: ProjectInput, config: StairConfig, status: StairResult['status'], issues: string[]): StairResult {
  const board = selectedBoard(input, config);
  return {
    id: config.id,
    label: config.label,
    mode: modeOf(config),
    relationId: attachmentId(config),
    edgeIndex: config.edgeIndex,
    landingLevelOffsetMm: config.landingLevelOffsetMm,
    status,
    issues,
    boardId: board.id,
    boardLabel: board.label,
    boundarySegmentIndex: config.boundarySegmentIndex ?? 0,
    widthM: config.widthM,
    treadDepthMm: config.treadDepthMm,
    stepCount: config.stepCount,
    boundaryOffsetM: config.boundaryOffsetM,
    structureLineCount: config.structureLineCount,
    treads: [],
    structureAxes: [],
    requiredPieces: [],
  };
}

function pendingResult(input: ProjectInput, config: StairConfig, issues: string[]): StairResult {
  return baseResult(input, config, 'pending', issues);
}

function invalidResult(input: ProjectInput, config: StairConfig, issues: string[]): StairResult {
  return baseResult(input, config, 'invalid', issues);
}

function relationPlatforms(
  relation: TerrainRelation,
  platforms: TerrainPlatform[],
): { a?: TerrainPlatform; b?: TerrainPlatform } {
  return {
    a: platforms.find((platform) => platform.id === relation.aPlatformId),
    b: platforms.find((platform) => platform.id === relation.bPlatformId),
  };
}

function normalIntoPlatform(
  input: ProjectInput,
  boundary: TerrainBoundarySegment,
  platformId: string,
): { x: number; y: number } | undefined {
  const dx = boundary.end.xM - boundary.start.xM;
  const dy = boundary.end.yM - boundary.start.yM;
  const length = Math.hypot(dx, dy);
  if (length <= EPS) return undefined;
  const ux = dx / length;
  const uy = dy / length;
  const midpoint = {
    xM: (boundary.start.xM + boundary.end.xM) / 2,
    yM: (boundary.start.yM + boundary.end.yM) / 2,
  };
  const candidates = [
    { x: -uy, y: ux },
    { x: uy, y: -ux },
  ];
  return candidates.find((normal) =>
    belongsToPlatform(input, platformId, {
      xM: midpoint.xM + normal.x * 0.03,
      yM: midpoint.yM + normal.y * 0.03,
    })
  );
}

function outwardNormal(input: ProjectInput, boundary: TerrainBoundarySegment): { x: number; y: number } | undefined {
  const dx = boundary.end.xM - boundary.start.xM;
  const dy = boundary.end.yM - boundary.start.yM;
  const length = Math.hypot(dx, dy);
  if (length <= EPS) return undefined;
  const ux = dx / length;
  const uy = dy / length;
  const midpoint = {
    xM: (boundary.start.xM + boundary.end.xM) / 2,
    yM: (boundary.start.yM + boundary.end.yM) / 2,
  };
  const candidates = [
    { x: -uy, y: ux },
    { x: uy, y: -ux },
  ];
  return candidates.find((normal) =>
    !isPointInsideBaseDeck(
      input,
      midpoint.xM + normal.x * 0.03,
      midpoint.yM + normal.y * 0.03,
    )
  );
}

function internalAttachment(
  input: ProjectInput,
  config: StairConfig,
): StairAttachment | StairResult {
  const terrain = computeTerrainModel(input);
  const relation = terrain.relations.find((item) => item.id === config.relationId);
  if (!relation) return invalidResult(input, config, ['La transition de niveau liée à cet escalier n’existe plus.']);
  if (!relation.transitionRequired) return invalidResult(input, config, ['La relation sélectionnée ne présente plus de différence de niveau.']);

  const boundarySegmentIndex = config.boundarySegmentIndex ?? 0;
  const boundary = relation.boundarySegments[boundarySegmentIndex];
  if (!boundary) return invalidResult(input, config, ['Le segment de frontière sélectionné n’existe plus.']);

  const { a, b } = relationPlatforms(relation, terrain.platforms);
  if (!a || !b) return invalidResult(input, config, ['Les plateformes liées à cette transition sont introuvables.']);

  const midpoint = {
    xM: (boundary.start.xM + boundary.end.xM) / 2,
    yM: (boundary.start.yM + boundary.end.yM) / 2,
  };
  const aLevel = platformFinishedAbsoluteMm(input, a, midpoint);
  const bLevel = platformFinishedAbsoluteMm(input, b, midpoint);
  if (Math.abs(aLevel - bLevel) <= 0.5) {
    return invalidResult(input, config, ['La différence de niveau au droit de l’escalier est devenue nulle.']);
  }

  const high = aLevel > bLevel ? a : b;
  const low = aLevel > bLevel ? b : a;
  const normal = normalIntoPlatform(input, boundary, low.id);
  if (!normal) return invalidResult(input, config, ['Le côté bas de la frontière ne peut pas être déterminé géométriquement.']);

  return {
    mode: 'platform-transition',
    relationId: relation.id,
    boundarySegmentIndex,
    boundary,
    extensionNormal: normal,
    boundaryPlatformId: high.id,
    boundaryPlatformLabel: high.label,
    landingPlatformId: low.id,
    landingPlatformLabel: low.label,
    boundaryLevelMm: (point) => platformFinishedAbsoluteMm(input, high, point),
    landingLevelMm: (point) => platformFinishedAbsoluteMm(input, low, point),
    validateLandingPoint: (point) => belongsToPlatform(input, low.id, point),
  };
}

function externalAttachment(
  input: ProjectInput,
  config: StairConfig,
): StairAttachment | StairResult {
  if (config.edgeIndex == null || !Number.isInteger(config.edgeIndex)) {
    return pendingResult(input, config, ['Rive extérieure à sélectionner.']);
  }
  if (config.landingLevelOffsetMm == null || !Number.isFinite(config.landingLevelOffsetMm)) {
    return pendingResult(input, config, ['Niveau d’arrivée extérieur à renseigner.']);
  }

  const edge = computeTerraceEdges(input).find((item) => item.edgeIndex === config.edgeIndex);
  if (!edge) return invalidResult(input, config, ['La rive extérieure sélectionnée n’existe plus.']);
  if (edge.curved) {
    return invalidResult(input, config, ['Les escaliers sur rive courbe ne sont pas générés automatiquement : implantation à valider sur un segment droit.']);
  }

  const boundary: TerrainBoundarySegment = {
    start: edge.start,
    end: edge.end,
    lengthM: edge.lengthM,
  };
  const normal = outwardNormal(input, boundary);
  if (!normal) return invalidResult(input, config, ['Le côté extérieur de cette rive ne peut pas être déterminé.']);

  const midpoint = {
    xM: (edge.start.xM + edge.end.xM) / 2 - normal.x * 0.03,
    yM: (edge.start.yM + edge.end.yM) / 2 - normal.y * 0.03,
  };
  const platform = terrainPlatformAt(input, midpoint.xM, midpoint.yM);
  const landingLevel = config.landingLevelOffsetMm;

  return {
    mode: 'external-edge',
    relationId: `EDGE-${edge.edgeIndex}`,
    edgeIndex: edge.edgeIndex,
    boundarySegmentIndex: 0,
    boundary,
    extensionNormal: normal,
    boundaryPlatformId: platform.id,
    boundaryPlatformLabel: platform.label,
    landingPlatformId: 'external-landing',
    landingPlatformLabel: 'Niveau d’arrivée extérieur',
    boundaryLevelMm: (point) => input.heightCm * 10 + targetFinishedDeltaMm(input, point.xM, point.yM, platform.id),
    landingLevelMm: () => landingLevel,
    landingLevelOffsetMm: landingLevel,
  };
}

function resolveAttachment(input: ProjectInput, config: StairConfig): StairAttachment | StairResult {
  return modeOf(config) === 'external-edge'
    ? externalAttachment(input, config)
    : internalAttachment(input, config);
}

function isStairResult(value: StairAttachment | StairResult): value is StairResult {
  return 'status' in value;
}

function commonIssues(config: StairConfig): string[] {
  const issues: string[] = [];
  if (!(config.widthM != null && Number.isFinite(config.widthM) && config.widthM > 0)) issues.push('Largeur d’escalier à renseigner.');
  if (!(config.treadDepthMm != null && Number.isFinite(config.treadDepthMm) && config.treadDepthMm > 0)) issues.push('Profondeur de marche à renseigner.');
  if (!(config.stepCount != null && Number.isInteger(config.stepCount) && config.stepCount > 0)) issues.push('Nombre de marches à renseigner.');
  if (!(config.boundaryOffsetM != null && Number.isFinite(config.boundaryOffsetM) && config.boundaryOffsetM >= 0)) issues.push('Position sur la frontière à renseigner.');
  return issues;
}

function buildStair(
  input: ProjectInput,
  config: StairConfig,
  attachment: StairAttachment,
): StairResult {
  const issues = commonIssues(config);
  if (issues.length) return pendingResult(input, config, issues);

  const widthM = config.widthM!;
  const treadDepthMm = config.treadDepthMm!;
  const stepCount = config.stepCount!;
  const offsetM = config.boundaryOffsetM!;
  const boundary = attachment.boundary;

  if (offsetM + widthM > boundary.lengthM + 0.0001) {
    return invalidResult(input, config, ['La largeur et la position dépassent la frontière disponible.']);
  }

  const dx = boundary.end.xM - boundary.start.xM;
  const dy = boundary.end.yM - boundary.start.yM;
  const length = Math.hypot(dx, dy);
  if (length <= EPS) return invalidResult(input, config, ['La frontière sélectionnée est trop courte.']);
  const ux = dx / length;
  const uy = dy / length;

  const edgeStart = {
    xM: boundary.start.xM + ux * offsetM,
    yM: boundary.start.yM + uy * offsetM,
  };
  const edgeEnd = {
    xM: edgeStart.xM + ux * widthM,
    yM: edgeStart.yM + uy * widthM,
  };

  const totalRunM = stepCount * treadDepthMm / 1000;
  const footprint: StairResult['footprint'] = [
    edgeStart,
    edgeEnd,
    {
      xM: edgeEnd.xM + attachment.extensionNormal.x * totalRunM,
      yM: edgeEnd.yM + attachment.extensionNormal.y * totalRunM,
    },
    {
      xM: edgeStart.xM + attachment.extensionNormal.x * totalRunM,
      yM: edgeStart.yM + attachment.extensionNormal.y * totalRunM,
    },
  ];

  if (
    attachment.validateLandingPoint
    && (!attachment.validateLandingPoint(footprint[2]) || !attachment.validateLandingPoint(footprint[3]))
  ) {
    return invalidResult(input, config, ['L’emprise de l’escalier sort de la plateforme d’arrivée ou rencontre une autre zone. Réduisez la profondeur totale ou déplacez l’escalier.']);
  }

  const board = selectedBoard(input, config);
  if (board.gapMm == null || !Number.isFinite(board.gapMm) || board.gapMm < 0) {
    return invalidResult(input, config, ['Le jeu de pose de la lame des marches n’est pas validé ; aucune quantité de marches n’est inventée.']);
  }

  const maxBoardLengthMm = Math.max(...(board.availableLengthsMm?.length ? board.availableLengthsMm : [board.lengthMm]));
  if (widthM * 1000 > maxBoardLengthMm + 0.1) {
    return invalidResult(input, config, [`La largeur de l’escalier (${Math.round(widthM * 1000)} mm) dépasse la plus grande longueur commerciale validée (${Math.round(maxBoardLengthMm)} mm). Un raccord de marche nécessiterait une règle structurelle non validée.`]);
  }

  const landingLeft = footprint[3];
  const landingRight = footprint[2];
  const boundaryStartLevelMm = attachment.boundaryLevelMm(edgeStart);
  const boundaryEndLevelMm = attachment.boundaryLevelMm(edgeEnd);
  const landingStartLevelMm = attachment.landingLevelMm(landingLeft);
  const landingEndLevelMm = attachment.landingLevelMm(landingRight);

  const deltaStart = landingStartLevelMm - boundaryStartLevelMm;
  const deltaEnd = landingEndLevelMm - boundaryEndLevelMm;
  if (Math.abs(deltaStart) <= 0.5 && Math.abs(deltaEnd) <= 0.5) {
    return invalidResult(input, config, ['Le niveau de départ et le niveau d’arrivée sont identiques : aucun escalier n’est nécessaire.']);
  }
  if (deltaStart * deltaEnd < 0) {
    return invalidResult(input, config, ['La différence de niveau change de sens sur la largeur de l’escalier. Réduisez ou déplacez sa largeur.']);
  }

  const pitchMm = board.widthMm + board.gapMm;
  const rows = Math.max(1, Math.ceil((treadDepthMm + board.gapMm) / Math.max(1, pitchMm)));
  const requiredPieces: RequiredPiece[] = [];
  const treads: StairTreadGeometry[] = [];

  for (let step = 0; step < stepCount; step += 1) {
    const nearDistanceM = step * treadDepthMm / 1000;
    const farDistanceM = (step + 1) * treadDepthMm / 1000;
    const ratio = step / stepCount;
    const leftZ = (boundaryStartLevelMm + (landingStartLevelMm - boundaryStartLevelMm) * ratio) / 1000;
    const rightZ = (boundaryEndLevelMm + (landingEndLevelMm - boundaryEndLevelMm) * ratio) / 1000;
    const leftNear = {
      xM: edgeStart.xM + attachment.extensionNormal.x * nearDistanceM,
      yM: edgeStart.yM + attachment.extensionNormal.y * nearDistanceM,
      zM: leftZ,
    };
    const rightNear = {
      xM: edgeEnd.xM + attachment.extensionNormal.x * nearDistanceM,
      yM: edgeEnd.yM + attachment.extensionNormal.y * nearDistanceM,
      zM: rightZ,
    };
    const rightFar = {
      xM: edgeEnd.xM + attachment.extensionNormal.x * farDistanceM,
      yM: edgeEnd.yM + attachment.extensionNormal.y * farDistanceM,
      zM: rightZ,
    };
    const leftFar = {
      xM: edgeStart.xM + attachment.extensionNormal.x * farDistanceM,
      yM: edgeStart.yM + attachment.extensionNormal.y * farDistanceM,
      zM: leftZ,
    };
    treads.push({ id: `${config.id}-T${step + 1}`, index: step, top: [leftNear, rightNear, rightFar, leftFar] });

    for (let row = 0; row < rows; row += 1) {
      requiredPieces.push({
        id: `STAIR-${config.id}-T${step + 1}-R${row + 1}`,
        rowIndex: step * rows + row,
        lengthMm: widthM * 1000,
        boardId: board.id,
        zoneId: `stair:${config.id}`,
      });
    }
  }

  const structureAxes: StairStructureAxis[] = [];
  let structureLinearM: number | undefined;
  if (config.structureLineCount != null && Number.isInteger(config.structureLineCount) && config.structureLineCount > 0) {
    for (let index = 0; index < config.structureLineCount; index += 1) {
      const ratio = config.structureLineCount === 1 ? 0.5 : index / (config.structureLineCount - 1);
      const boundaryPoint = {
        xM: edgeStart.xM + (edgeEnd.xM - edgeStart.xM) * ratio,
        yM: edgeStart.yM + (edgeEnd.yM - edgeStart.yM) * ratio,
      };
      const landingPoint = {
        xM: landingLeft.xM + (landingRight.xM - landingLeft.xM) * ratio,
        yM: landingLeft.yM + (landingRight.yM - landingLeft.yM) * ratio,
      };
      const startZ = attachment.boundaryLevelMm(boundaryPoint) / 1000 - board.thicknessMm / 1000;
      const endZ = attachment.landingLevelMm(landingPoint) / 1000 - board.thicknessMm / 1000;
      const start = { ...boundaryPoint, zM: startZ };
      const end = { ...landingPoint, zM: endZ };
      structureAxes.push({
        id: `${config.id}-S${index + 1}`,
        start,
        end,
        lengthM: Math.hypot(end.xM - start.xM, end.yM - start.yM, end.zM - start.zM),
      });
    }
    structureLinearM = structureAxes.reduce((sum, axis) => sum + axis.lengthM, 0);
  }

  const boundaryAverage = (boundaryStartLevelMm + boundaryEndLevelMm) / 2;
  const landingAverage = (landingStartLevelMm + landingEndLevelMm) / 2;
  const boundaryIsHigh = boundaryAverage >= landingAverage;

  return {
    id: config.id,
    label: config.label,
    mode: attachment.mode,
    relationId: attachment.relationId,
    edgeIndex: attachment.edgeIndex,
    landingLevelOffsetMm: attachment.landingLevelOffsetMm,
    status: 'ready',
    issues: config.structureLineCount == null
      ? ['Nombre de lignes porteuses / limons non renseigné : quantité de structure à confirmer.']
      : [],
    boardId: board.id,
    boardLabel: board.label,
    boundarySegmentIndex: attachment.boundarySegmentIndex,
    lowPlatformId: boundaryIsHigh ? attachment.landingPlatformId : attachment.boundaryPlatformId,
    lowPlatformLabel: boundaryIsHigh ? attachment.landingPlatformLabel : attachment.boundaryPlatformLabel,
    highPlatformId: boundaryIsHigh ? attachment.boundaryPlatformId : attachment.landingPlatformId,
    highPlatformLabel: boundaryIsHigh ? attachment.boundaryPlatformLabel : attachment.landingPlatformLabel,
    widthM,
    treadDepthMm,
    stepCount,
    boundaryOffsetM: offsetM,
    totalRunM,
    riseLeftMm: Math.abs(landingStartLevelMm - boundaryStartLevelMm),
    riseRightMm: Math.abs(landingEndLevelMm - boundaryEndLevelMm),
    riserHeightLeftMm: Math.abs(landingStartLevelMm - boundaryStartLevelMm) / stepCount,
    riserHeightRightMm: Math.abs(landingEndLevelMm - boundaryEndLevelMm) / stepCount,
    treadAreaM2: widthM * (treadDepthMm / 1000) * stepCount,
    treadBoardRows: rows,
    treadRequiredLinearM: requiredPieces.reduce((sum, piece) => sum + piece.lengthMm, 0) / 1000,
    structureLineCount: config.structureLineCount,
    structureLinearM,
    footprint,
    treads,
    structureAxes,
    requiredPieces,
  };
}

export function computeStairs(input: ProjectInput): StairResult[] {
  return (input.stairs ?? []).map((config) => {
    const attachment = resolveAttachment(input, config);
    if (isStairResult(attachment)) return attachment;
    return buildStair(input, config, attachment);
  });
}

export function stairRequiredPieces(input: ProjectInput): RequiredPiece[] {
  return computeStairs(input)
    .filter((stair) => stair.status === 'ready')
    .flatMap((stair) => stair.requiredPieces);
}

export function stairExclusionZones(input: ProjectInput, lowPlatformId: string): LayingZone[] {
  return computeStairs(input)
    .filter((stair) =>
      stair.status === 'ready'
      && stair.mode === 'platform-transition'
      && stair.lowPlatformId === lowPlatformId
      && stair.footprint
    )
    .map((stair) => ({
      id: `__stair-exclusion-${stair.id}`,
      label: `Emprise escalier ${stair.label}`,
      points: stair.footprint!,
      direction: input.layingDirection ?? input.orientation,
      pattern: input.layingPattern ?? 'straight',
      start: input.layingStart ?? 'left',
    }));
}
