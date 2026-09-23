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
  BoardSpec,
  CutOptimizationResult,
} from '../domain/types';
import { optimizeCutsDetailed } from './cuts';
import { boardForZone } from '../catalog/compatibility';
import { stairExclusionZones, stairRequiredPieces } from './stairs';
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
  board: BoardSpec;
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
    excludedZones: [...zones, ...stairExclusionZones(input, 'main')],
    board: input.board,
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
      excludedZones: stairExclusionZones(input, zone.id),
      board: boardForZone(input.board, zone.boardId),
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

  const requiredPieces: RequiredPiece[] = [];
  const boardSegments: LayoutBoardSegment[] = [];
  const buttJoints: LayoutButtJoint[] = [];
  const zoneResults: LayoutZoneResult[] = [];
  let globalRowIndex = 0;

  for (const region of regions(input)) {
    if (region.board.gapMm == null || !Number.isFinite(region.board.gapMm) || region.board.gapMm < 0) {
      throw new Error(`SA-TERR-GAP-001: jeu entre lames non validé pour ${region.board.label}.`);
    }
    const pitchMm = region.board.widthMm + region.board.gapMm;
    const stockLengthsMm = region.board.availableLengthsMm?.length
      ? region.board.availableLengthsMm
      : [region.board.lengthMm];
    const maxStockLengthMm = Math.max(...stockLengthsMm);
    const basis = resolveLayingBasis(input, region.direction, region.start, region.zone, region.startEdgeIndex);
    const bounds = zoneProjectedBounds(input, basis, region.zone);
    const zoneButtAxes: number[] = [];
    let zoneRowCount = 0;

    for (
      let centerMm = bounds.minV + region.board.widthMm / 2;
      centerMm <= bounds.maxV + 0.001;
      centerMm += pitchMm
    ) {
      const intervals = intervalsForRegionAtV(
        input,
        basis,
        centerMm,
        region.board.widthMm / 2,
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
            boardId: region.board.id,
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
          requiredPieces.push({ id, rowIndex: globalRowIndex, lengthMm: segment.lengthMm, boardId: region.board.id, zoneId: region.id });
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
      boardId: region.board.id,
      boardLabel: region.board.label,
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

  const stairPieces = stairRequiredPieces(input).map((piece, index) => ({
    ...piece,
    rowIndex: globalRowIndex + index,
  }));
  requiredPieces.push(...stairPieces);

  const hasButtJoints = buttJoints.length > 0;
  const productIds = [...new Set(requiredPieces.map((piece) => piece.boardId ?? input.board.id))];
  const productSummaries = productIds.map((boardId) => {
    const board = boardForZone(input.board, boardId);
    const pieces = requiredPieces.filter((piece) => (piece.boardId ?? input.board.id) === boardId);
    const stockLengthsMm = board.availableLengthsMm?.length ? board.availableLengthsMm : [board.lengthMm];
    const cutOptimization = optimizeCutsDetailed(pieces, stockLengthsMm);
    const totalRequiredMm = pieces.reduce((sum, piece) => sum + piece.lengthMm, 0);
    const purchasedMm = cutOptimization.boards.reduce((sum, stock) => sum + stock.stockLengthMm, 0);
    const wasteMm = Math.max(0, purchasedMm - totalRequiredMm);
    return {
      boardId,
      boardLabel: board.label,
      zoneIds: [...new Set(pieces.map((piece) => piece.zoneId ?? 'main'))],
      requiredPieces: pieces,
      stockBoards: cutOptimization.boards,
      cutOptimization,
      totalRequiredLinearM: totalRequiredMm / 1000,
      purchasedLinearM: purchasedMm / 1000,
      wasteLinearM: wasteMm / 1000,
      wastePercent: purchasedMm > 0 ? (wasteMm / purchasedMm) * 100 : 0,
      purchasedAreaM2: (purchasedMm / 1000) * (board.widthMm / 1000),
    };
  });

  const namespaceOptimization = (summary: typeof productSummaries[number], index: number): CutOptimizationResult => {
    if (productSummaries.length === 1) return summary.cutOptimization;
    const prefix = `P${index + 1}-`;
    const idMap = new Map<string, string>();
    for (const stock of summary.cutOptimization.boards) idMap.set(stock.id, prefix + stock.id);
    for (const offcut of summary.cutOptimization.offcuts) idMap.set(offcut.id, prefix + offcut.id);
    for (const stock of summary.cutOptimization.boards) for (const cut of stock.cuts) idMap.set(cut.id, prefix + cut.id);
    return {
      ...summary.cutOptimization,
      boards: summary.cutOptimization.boards.map((stock) => ({
        ...stock,
        id: idMap.get(stock.id) ?? stock.id,
        finalOffcutId: stock.finalOffcutId ? idMap.get(stock.finalOffcutId) : undefined,
        cuts: stock.cuts.map((cut) => ({
          ...cut,
          id: idMap.get(cut.id) ?? cut.id,
          sourceId: idMap.get(cut.sourceId) ?? cut.sourceId,
          resultingOffcutId: cut.resultingOffcutId ? idMap.get(cut.resultingOffcutId) : undefined,
        })),
      })),
      offcuts: summary.cutOptimization.offcuts.map((offcut) => ({
        ...offcut,
        id: idMap.get(offcut.id) ?? offcut.id,
        stockBoardId: idMap.get(offcut.stockBoardId) ?? offcut.stockBoardId,
        createdByCutId: idMap.get(offcut.createdByCutId) ?? offcut.createdByCutId,
        reusedByCutId: offcut.reusedByCutId ? idMap.get(offcut.reusedByCutId) : undefined,
      })),
    };
  };

  const namespaced = productSummaries.map(namespaceOptimization);
  const stockBoards = namespaced.flatMap((item) => item.boards);
  const totalRequiredMm = productSummaries.reduce((sum, item) => sum + item.totalRequiredLinearM * 1000, 0);
  const purchasedMm = productSummaries.reduce((sum, item) => sum + item.purchasedLinearM * 1000, 0);
  const wasteMm = productSummaries.reduce((sum, item) => sum + item.wasteLinearM * 1000, 0);
  const purchasedAreaM2 = productSummaries.reduce((sum, item) => sum + item.purchasedAreaM2, 0);
  const cutOptimization: CutOptimizationResult = {
    boards: stockBoards,
    offcuts: namespaced.flatMap((item) => item.offcuts),
    totalStockMm: namespaced.reduce((sum, item) => sum + item.totalStockMm, 0),
    totalRequiredMm: namespaced.reduce((sum, item) => sum + item.totalRequiredMm, 0),
    finalRemainingMm: namespaced.reduce((sum, item) => sum + item.finalRemainingMm, 0),
    reusedOffcutCount: namespaced.reduce((sum, item) => sum + item.reusedOffcutCount, 0),
    rules: namespaced[0]?.rules ?? {
      status: 'pending-manufacturer-validation',
      note: 'Règles de réemploi à confirmer.',
    },
  };

  return {
    rowCount: globalRowIndex,
    requiredPieces,
    zones: zoneResults,
    boardSegments,
    buttJoints,
    totalRequiredLinearM: totalRequiredMm / 1000,
    productSummaries,
    stockBoards,
    cutOptimization,
    purchasedLinearM: purchasedMm / 1000,
    wasteLinearM: wasteMm / 1000,
    wastePercent: purchasedMm > 0 ? (wasteMm / purchasedMm) * 100 : 0,
    purchasedAreaM2,
    hasButtJoints,
  };
}
