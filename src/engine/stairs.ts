import type { BoardSpec, LayingZone, ProjectInput, RequiredPiece, StairConfig, TerracePoint } from '../domain/types';
import { boardForZone } from '../catalog/compatibility';
import { isPointInsideBaseDeck } from './geometry';
import { pointInZone } from './layingGeometry';
import {
  computeTerrainModel,
  type TerrainBoundarySegment,
  type TerrainPlatform,
  type TerrainRelation,
} from './terrain';

export const STAIR_TAG = 'SA-TERR-STAIR-130';
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
  relationId: string;
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

function platformFinishedDeltaMm(platform: TerrainPlatform, point: TerracePoint): number {
  return platform.finishedLevelOffsetMm
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

function lowNormal(
  input: ProjectInput,
  boundary: TerrainBoundarySegment,
  lowPlatformId: string,
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
    belongsToPlatform(input, lowPlatformId, {
      xM: midpoint.xM + normal.x * 0.02,
      yM: midpoint.yM + normal.y * 0.02,
    })
  );
}

function selectedBoard(input: ProjectInput, config: StairConfig): BoardSpec {
  return boardForZone(input.board, config.boardId);
}

function pendingResult(input: ProjectInput, config: StairConfig, issues: string[]): StairResult {
  const board = selectedBoard(input, config);
  return {
    id: config.id,
    label: config.label,
    relationId: config.relationId,
    status: 'pending',
    issues,
    boardId: board.id,
    boardLabel: board.label,
    boundarySegmentIndex: config.boundarySegmentIndex,
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

function invalidResult(input: ProjectInput, config: StairConfig, issues: string[]): StairResult {
  return { ...pendingResult(input, config, issues), status: 'invalid' };
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

export function computeStairs(input: ProjectInput): StairResult[] {
  const terrain = computeTerrainModel(input);
  return (input.stairs ?? []).map((config) => {
    const relation = terrain.relations.find((item) => item.id === config.relationId);
    if (!relation) return invalidResult(input, config, ['La transition de niveau liée à cet escalier n’existe plus.']);
    if (!relation.transitionRequired) return invalidResult(input, config, ['La relation sélectionnée ne présente plus de différence de niveau.']);

    const boundary = relation.boundarySegments[config.boundarySegmentIndex];
    if (!boundary) return invalidResult(input, config, ['Le segment de frontière sélectionné n’existe plus.']);

    const issues: string[] = [];
    if (!(config.widthM != null && Number.isFinite(config.widthM) && config.widthM > 0)) issues.push('Largeur d’escalier à renseigner.');
    if (!(config.treadDepthMm != null && Number.isFinite(config.treadDepthMm) && config.treadDepthMm > 0)) issues.push('Profondeur de marche à renseigner.');
    if (!(config.stepCount != null && Number.isInteger(config.stepCount) && config.stepCount > 0)) issues.push('Nombre de marches à renseigner.');
    if (!(config.boundaryOffsetM != null && Number.isFinite(config.boundaryOffsetM) && config.boundaryOffsetM >= 0)) issues.push('Position sur la frontière à renseigner.');
    if (issues.length) return pendingResult(input, config, issues);

    const widthM = config.widthM!;
    const treadDepthMm = config.treadDepthMm!;
    const stepCount = config.stepCount!;
    const offsetM = config.boundaryOffsetM!;
    if (offsetM + widthM > boundary.lengthM + 0.0001) {
      return invalidResult(input, config, ['La largeur et la position dépassent la frontière disponible.']);
    }

    const { a, b } = relationPlatforms(relation, terrain.platforms);
    if (!a || !b) return invalidResult(input, config, ['Les plateformes liées à cette transition sont introuvables.']);

    const dx = boundary.end.xM - boundary.start.xM;
    const dy = boundary.end.yM - boundary.start.yM;
    const length = Math.hypot(dx, dy);
    if (length <= EPS) return invalidResult(input, config, ['La frontière sélectionnée est trop courte.']);
    const ux = dx / length;
    const uy = dy / length;

    const edgeStart = { xM: boundary.start.xM + ux * offsetM, yM: boundary.start.yM + uy * offsetM };
    const edgeEnd = { xM: edgeStart.xM + ux * widthM, yM: edgeStart.yM + uy * widthM };
    const mid = { xM: (edgeStart.xM + edgeEnd.xM) / 2, yM: (edgeStart.yM + edgeEnd.yM) / 2 };

    const deltaMid = platformFinishedDeltaMm(b, mid) - platformFinishedDeltaMm(a, mid);
    if (Math.abs(deltaMid) <= 0.5) return invalidResult(input, config, ['La différence de niveau au droit de l’escalier est devenue nulle.']);
    const low = deltaMid > 0 ? a : b;
    const high = deltaMid > 0 ? b : a;

    const deltaStart = platformFinishedDeltaMm(high, edgeStart) - platformFinishedDeltaMm(low, edgeStart);
    const deltaEnd = platformFinishedDeltaMm(high, edgeEnd) - platformFinishedDeltaMm(low, edgeEnd);
    if (deltaStart * deltaEnd <= 0) {
      return invalidResult(input, config, ['La différence de niveau change de sens sur la largeur de l’escalier. Réduisez ou déplacez sa largeur.']);
    }

    const normal = lowNormal(input, boundary, low.id);
    if (!normal) return invalidResult(input, config, ['Le côté bas de la frontière ne peut pas être déterminé géométriquement.']);

    const totalRunM = stepCount * treadDepthMm / 1000;
    const footprint: StairResult['footprint'] = [
      edgeStart,
      edgeEnd,
      { xM: edgeEnd.xM + normal.x * totalRunM, yM: edgeEnd.yM + normal.y * totalRunM },
      { xM: edgeStart.xM + normal.x * totalRunM, yM: edgeStart.yM + normal.y * totalRunM },
    ];

    const board = selectedBoard(input, config);
    if (board.gapMm == null || !Number.isFinite(board.gapMm) || board.gapMm < 0) {
      return invalidResult(input, config, ['Le jeu de pose de la lame des marches n’est pas validé ; aucune quantité de marches n’est inventée.']);
    }
    const maxBoardLengthMm = Math.max(...(board.availableLengthsMm?.length ? board.availableLengthsMm : [board.lengthMm]));
    if (widthM * 1000 > maxBoardLengthMm + 0.1) {
      return invalidResult(input, config, [`La largeur de l’escalier (${Math.round(widthM * 1000)} mm) dépasse la plus grande longueur commerciale validée (${Math.round(maxBoardLengthMm)} mm). Un raccord de marche nécessiterait une règle structurelle non validée.`]);
    }
    if (!belongsToPlatform(input, low.id, footprint[2]) || !belongsToPlatform(input, low.id, footprint[3])) {
      return invalidResult(input, config, ['L’emprise de l’escalier sort de la plateforme basse ou rencontre une autre zone. Réduisez la profondeur totale ou déplacez l’escalier.']);
    }
    const pitchMm = board.widthMm + board.gapMm;
    const rows = Math.max(1, Math.ceil((treadDepthMm + board.gapMm) / Math.max(1, pitchMm)));
    const requiredPieces: RequiredPiece[] = [];
    const treads: StairTreadGeometry[] = [];
    const baseHeightM = input.heightCm / 100;
    const startLowMm = platformFinishedDeltaMm(low, edgeStart);
    const endLowMm = platformFinishedDeltaMm(low, edgeEnd);
    const startHighMm = platformFinishedDeltaMm(high, edgeStart);
    const endHighMm = platformFinishedDeltaMm(high, edgeEnd);

    for (let step = 0; step < stepCount; step += 1) {
      const ratio = (step + 1) / stepCount;
      const nearDistanceM = (stepCount - step - 1) * treadDepthMm / 1000;
      const farDistanceM = (stepCount - step) * treadDepthMm / 1000;
      const leftZ = baseHeightM + (startLowMm + (startHighMm - startLowMm) * ratio) / 1000;
      const rightZ = baseHeightM + (endLowMm + (endHighMm - endLowMm) * ratio) / 1000;
      const leftNear = { xM: edgeStart.xM + normal.x * nearDistanceM, yM: edgeStart.yM + normal.y * nearDistanceM, zM: leftZ };
      const rightNear = { xM: edgeEnd.xM + normal.x * nearDistanceM, yM: edgeEnd.yM + normal.y * nearDistanceM, zM: rightZ };
      const rightFar = { xM: edgeEnd.xM + normal.x * farDistanceM, yM: edgeEnd.yM + normal.y * farDistanceM, zM: rightZ };
      const leftFar = { xM: edgeStart.xM + normal.x * farDistanceM, yM: edgeStart.yM + normal.y * farDistanceM, zM: leftZ };
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
      const lineCount = config.structureLineCount;
      for (let index = 0; index < lineCount; index += 1) {
        const ratio = lineCount === 1 ? 0.5 : index / (lineCount - 1);
        const boundaryPoint = {
          xM: edgeStart.xM + (edgeEnd.xM - edgeStart.xM) * ratio,
          yM: edgeStart.yM + (edgeEnd.yM - edgeStart.yM) * ratio,
        };
        const lowMm = platformFinishedDeltaMm(low, boundaryPoint);
        const highMm = platformFinishedDeltaMm(high, boundaryPoint);
        const start = {
          xM: boundaryPoint.xM + normal.x * totalRunM,
          yM: boundaryPoint.yM + normal.y * totalRunM,
          zM: baseHeightM + lowMm / 1000 - board.thicknessMm / 1000,
        };
        const end = {
          xM: boundaryPoint.xM,
          yM: boundaryPoint.yM,
          zM: baseHeightM + highMm / 1000 - board.thicknessMm / 1000,
        };
        const axisLength = Math.hypot(end.xM - start.xM, end.yM - start.yM, end.zM - start.zM);
        structureAxes.push({ id: `${config.id}-S${index + 1}`, start, end, lengthM: axisLength });
      }
      structureLinearM = structureAxes.reduce((sum, axis) => sum + axis.lengthM, 0);
    }

    return {
      id: config.id,
      label: config.label,
      relationId: config.relationId,
      status: 'ready',
      issues: config.structureLineCount == null
        ? ['Nombre de lignes porteuses / limons non renseigné : quantité de structure à confirmer.']
        : [],
      boardId: board.id,
      boardLabel: board.label,
      boundarySegmentIndex: config.boundarySegmentIndex,
      lowPlatformId: low.id,
      lowPlatformLabel: low.label,
      highPlatformId: high.id,
      highPlatformLabel: high.label,
      widthM,
      treadDepthMm,
      stepCount,
      boundaryOffsetM: offsetM,
      totalRunM,
      riseLeftMm: startHighMm - startLowMm,
      riseRightMm: endHighMm - endLowMm,
      riserHeightLeftMm: (startHighMm - startLowMm) / stepCount,
      riserHeightRightMm: (endHighMm - endLowMm) / stepCount,
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
  });
}

export function stairRequiredPieces(input: ProjectInput): RequiredPiece[] {
  return computeStairs(input)
    .filter((stair) => stair.status === 'ready')
    .flatMap((stair) => stair.requiredPieces);
}

export function stairExclusionZones(input: ProjectInput, lowPlatformId: string): LayingZone[] {
  return computeStairs(input)
    .filter((stair) => stair.status === 'ready' && stair.lowPlatformId === lowPlatformId && stair.footprint)
    .map((stair) => ({
      id: `__stair-exclusion-${stair.id}`,
      label: `Emprise escalier ${stair.label}`,
      points: stair.footprint!,
      direction: input.layingDirection ?? input.orientation,
      pattern: input.layingPattern ?? 'straight',
      start: input.layingStart ?? 'left',
    }));
}
