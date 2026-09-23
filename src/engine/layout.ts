import type {
  DeckLayingPattern,
  LayingDirection,
  LayingStart,
  LayingZone,
  LayoutBoardSegment,
  LayoutButtJoint,
  LayoutResult,
  LayoutZoneResult,
  ProjectInput,
  RequiredPiece,
} from '../domain/types';
import { optimizeCuts } from './cuts';
import {
  effectiveProjectDirection,
  intervalsForRegionAtV,
  resolveLayingBasis,
  worldPointFromUV,
  zoneProjectedBounds,
} from './layingGeometry';

export const LAYOUT_TAG = 'SA-TERR-LAYOUT-003';

interface PatternCell {
  index: number;
  startMm: number;
  endMm: number;
}

interface RegionSpec {
  id: string;
  label: string;
  direction: LayingDirection;
  pattern: DeckLayingPattern;
  start: LayingStart;
  startEdgeIndex?: number;
  zone?: LayingZone;
  excludedZones: LayingZone[];
}

function starterLengthForPattern(pattern: DeckLayingPattern, rowIndex: number, materialLengthMm: number): number {
  if (pattern === 'half') return rowIndex % 2 === 0 ? materialLengthMm : materialLengthMm / 2;
  if (pattern === 'third') {
    const cycle = rowIndex % 3;
    if (cycle === 0) return materialLengthMm;
    if (cycle === 1) return (materialLengthMm * 2) / 3;
    return materialLengthMm / 3;
  }
  return materialLengthMm;
}

function buildPatternCells(minU: number, maxU: number, materialLengthMm: number, starterLengthMm: number): PatternCell[] {
  const cells: PatternCell[] = [];
  let cursor = minU;
  let index = 0;
  while (cursor < maxU - 0.001) {
    const targetLengthMm = index === 0 ? starterLengthMm : materialLengthMm;
    const endMm = Math.min(maxU, cursor + Math.max(1, targetLengthMm));
    cells.push({ index, startMm: cursor, endMm });
    cursor = endMm;
    index += 1;
  }
  return cells;
}

function regions(input: ProjectInput): RegionSpec[] {
  const zones = input.layingZones ?? [];
  const primary: RegionSpec = {
    id: 'main',
    label: 'Zone principale',
    direction: effectiveProjectDirection(input),
    pattern: input.layingPattern ?? 'straight',
    start: input.layingStart ?? 'left',
    startEdgeIndex: input.layingStartEdgeIndex,
    excludedZones: zones,
  };
  return [
    primary,
    ...zones.map((zone) => ({
      id: zone.id,
      label: zone.label,
      direction: zone.direction,
      pattern: zone.pattern,
      start: zone.start,
      startEdgeIndex: zone.startEdgeIndex,
      zone,
      excludedZones: [],
    })),
  ];
}

/**
 * Calepinage V0.20 :
 * - axes globaux CALPI par zone ;
 * - départ explicite par côté/rive ;
 * - directions longitudinales, transversales et diagonales ±45° ;
 * - zones explicites qui remplacent localement les réglages de la zone principale.
 */
export function computeLayout(input: ProjectInput): LayoutResult {
  if (input.board.gapMm == null || !Number.isFinite(input.board.gapMm) || input.board.gapMm < 0) {
    throw new Error('SA-TERR-GAP-001: jeu entre lames non validé.');
  }

  const pitchMm = input.board.widthMm + input.board.gapMm;
  const requiredPieces: RequiredPiece[] = [];
  const boardSegments: LayoutBoardSegment[] = [];
  const buttJoints: LayoutButtJoint[] = [];
  const zoneResults: LayoutZoneResult[] = [];
  const stockLengthsMm = input.board.availableLengthsMm?.length
    ? input.board.availableLengthsMm
    : [input.board.lengthMm];
  const maxStockLengthMm = Math.max(...stockLengthsMm);
  let globalRowIndex = 0;

  for (const region of regions(input)) {
    const basis = resolveLayingBasis(input, region.direction, region.start, region.zone, region.startEdgeIndex);
    const bounds = zoneProjectedBounds(input, basis, region.zone);
    const zoneButtAxes: number[] = [];
    let zoneRowCount = 0;

    for (
      let centerMm = bounds.minV + input.board.widthMm / 2;
      centerMm <= bounds.maxV + 0.001;
      centerMm += pitchMm
    ) {
      const intervals = intervalsForRegionAtV(
        input,
        basis,
        centerMm,
        input.board.widthMm / 2,
        region.zone,
        region.excludedZones,
      );
      if (!intervals.length) continue;

      const starterLengthMm = starterLengthForPattern(region.pattern, zoneRowCount, maxStockLengthMm);
      const patternCells = buildPatternCells(bounds.minU, bounds.maxU, maxStockLengthMm, starterLengthMm);
      let intervalIndex = 0;

      for (const [intervalStartMm, intervalEndMm] of intervals) {
        if (intervalEndMm - intervalStartMm <= 1) continue;
        const installed: LayoutBoardSegment[] = [];

        for (const cell of patternCells) {
          const startMm = Math.max(intervalStartMm, cell.startMm);
          const endMm = Math.min(intervalEndMm, cell.endMm);
          if (endMm - startMm <= 1) continue;

          const segmentIndex = installed.length;
          const id = `${region.id}-R${zoneRowCount + 1}-I${intervalIndex + 1}-P${segmentIndex + 1}`;
          const a = worldPointFromUV(startMm, centerMm, basis);
          const b = worldPointFromUV(endMm, centerMm, basis);
          const segment: LayoutBoardSegment = {
            id,
            rowIndex: globalRowIndex,
            intervalIndex,
            segmentIndex,
            transverseCenterMm: centerMm,
            startMm,
            endMm,
            lengthMm: endMm - startMm,
            zoneId: region.id,
            direction: region.direction,
            x1M: a.xM,
            y1M: a.yM,
            x2M: b.xM,
            y2M: b.yM,
            dirX: basis.dirX,
            dirY: basis.dirY,
            normalX: basis.normalX,
            normalY: basis.normalY,
          };
          installed.push(segment);
          boardSegments.push(segment);
          requiredPieces.push({ id, rowIndex: globalRowIndex, lengthMm: segment.lengthMm });
        }

        for (let i = 0; i + 1 < installed.length; i += 1) {
          const left = installed[i];
          const right = installed[i + 1];
          if (Math.abs(left.endMm - right.startMm) > 0.01) continue;
          const point = worldPointFromUV(left.endMm, centerMm, basis);
          zoneButtAxes.push(left.endMm);
          buttJoints.push({
            id: `BJ-${region.id}-R${zoneRowCount + 1}-I${intervalIndex + 1}-P${i + 1}`,
            rowIndex: globalRowIndex,
            transverseCenterMm: centerMm,
            axisPositionMm: left.endMm,
            zoneId: region.id,
            xM: point.xM,
            yM: point.yM,
            dirX: basis.dirX,
            dirY: basis.dirY,
            normalX: basis.normalX,
            normalY: basis.normalY,
          });
        }
        intervalIndex += 1;
      }

      zoneRowCount += 1;
      globalRowIndex += 1;
    }

    zoneResults.push({
      id: region.id,
      label: region.label,
      direction: region.direction,
      pattern: region.pattern,
      start: region.start,
      dirX: basis.dirX,
      dirY: basis.dirY,
      normalX: basis.normalX,
      normalY: basis.normalY,
      minUMm: bounds.minU,
      maxUMm: bounds.maxU,
      minVMm: bounds.minV,
      maxVMm: bounds.maxV,
      rowCount: zoneRowCount,
      buttJointAxisPositionsMm: [...new Set(zoneButtAxes.map((value) => Math.round(value * 1000) / 1000))].sort((a, b) => a - b),
    });
  }

  const hasButtJoints = buttJoints.length > 0;
  const stockBoards = optimizeCuts(requiredPieces, stockLengthsMm);
  const totalRequiredMm = requiredPieces.reduce((sum, piece) => sum + piece.lengthMm, 0);
  const purchasedMm = stockBoards.reduce((sum, board) => sum + board.stockLengthMm, 0);
  const wasteMm = Math.max(0, purchasedMm - totalRequiredMm);
  const purchasedAreaM2 = (purchasedMm / 1000) * (input.board.widthMm / 1000);

  return {
    rowCount: globalRowIndex,
    requiredPieces,
    zones: zoneResults,
    boardSegments,
    buttJoints,
    totalRequiredLinearM: totalRequiredMm / 1000,
    stockBoards,
    purchasedLinearM: purchasedMm / 1000,
    wasteLinearM: wasteMm / 1000,
    wastePercent: purchasedMm > 0 ? (wasteMm / purchasedMm) * 100 : 0,
    purchasedAreaM2,
    hasButtJoints,
  };
}
