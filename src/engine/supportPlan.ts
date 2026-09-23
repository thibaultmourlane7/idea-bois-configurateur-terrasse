import type {
  LayoutResult,
  PlannedJoistSegment,
  ProjectInput,
  RequiredPiece,
  SupportPlanPoint,
  SupportPlanResult,
  SupportPlanGroup,
} from '../domain/types';
import { PLOT_OPTIONS, type PlotMaterial } from '../catalog/materials';
import { optimizeCuts } from './cuts';
import { getCommercialConstructionRule } from './constructionRules';
import { getDeckBoundingSizeM, getDeckIntervalsAtMm, getEffectiveBoundarySegmentsM } from './geometry';

export const SUPPORT_PLAN_TAG = 'SA-TERR-SUPPORT-PLAN-016';
export const SUPPORT_PLAN_SOURCE_URL = 'https://www.idea-bois.com/art-plot-lambourde-terrasse-r-glable-40-60-mm-jouplast-2182.htm';
export const SUPPORT_PLAN_SOURCE_LABEL = 'IDEA Bois / JOUPLAST — plots bois : espacement 70 cm, lambourdes bois naturel 50 cm selon produit';

const GEOMETRY_EPS_M = 0.001;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values.map((value) => Math.round(value * 1000) / 1000))].sort((a, b) => a - b);
}

function choosePlot(heightMm: number): PlotMaterial | undefined {
  const candidates = PLOT_OPTIONS
    .filter((item) => heightMm >= item.minHeightMm - 0.001 && heightMm <= item.maxHeightMm + 0.001)
    .sort((a, b) => {
      const aExactConsumption = a.consumptionPerM2 != null ? 1 : 0;
      const bExactConsumption = b.consumptionPerM2 != null ? 1 : 0;
      return bExactConsumption - aExactConsumption
        || (a.maxHeightMm - a.minHeightMm) - (b.maxHeightMm - b.minHeightMm)
        || a.unitPriceTtc - b.unitPriceTtc;
    });
  return candidates[0];
}

function supportSurfaceDeltaMm(input: ProjectInput, xM: number, yM: number): number {
  const profile = input.supportLevelProfile;
  if (!profile || profile.mode === 'flat') return 0;

  const bounds = getDeckBoundingSizeM(input);
  const tx = Math.min(1, Math.max(0, xM / Math.max(0.001, bounds.lengthM)));
  const ty = Math.min(1, Math.max(0, yM / Math.max(0.001, bounds.widthM)));

  const q00 = 0;
  const q10 = profile.topRightDeltaMm - profile.topLeftDeltaMm;
  const q11 = profile.bottomRightDeltaMm - profile.topLeftDeltaMm;
  const q01 = profile.bottomLeftDeltaMm - profile.topLeftDeltaMm;
  const top = q00 * (1 - tx) + q10 * tx;
  const bottom = q01 * (1 - tx) + q11 * tx;
  return top * (1 - ty) + bottom * ty;
}

function targetFinishedDeltaMm(input: ProjectInput, xM: number, yM: number): number {
  const profile = input.supportLevelProfile;
  if (!profile) return 0;
  return xM * profile.targetSlopeXPercent * 10 + yM * profile.targetSlopeYPercent * 10;
}

function boardButtJointAxisPositionsMm(input: ProjectInput, layout: LayoutResult | undefined): number[] {
  if (!layout?.hasButtJoints) return [];
  if (layout.buttJoints?.length) {
    return uniqueSorted(layout.buttJoints.map((joint) => joint.axisPositionMm));
  }

  // Compatibilité avec un LayoutResult ancien : reconstitution déterministe à partir de la longueur commerciale max.
  const stockLengths = input.board.availableLengthsMm?.length
    ? input.board.availableLengthsMm
    : [input.board.lengthMm];
  const maxStockLengthMm = Math.max(...stockLengths);
  if (!Number.isFinite(maxStockLengthMm) || maxStockLengthMm <= 0) return [];

  const bounds = getDeckBoundingSizeM(input);
  const transverseMm = (input.orientation === 'length' ? bounds.widthM : bounds.lengthM) * 1000;
  const pitchMm = input.board.widthMm + (input.board.gapMm ?? 0);
  const joints: number[] = [];

  for (let centerMm = input.board.widthMm / 2; centerMm <= transverseMm + 0.001; centerMm += pitchMm) {
    const intervals = getDeckIntervalsAtMm(input, centerMm, input.orientation, input.board.widthMm / 2);
    for (const [startMm, endMm] of intervals) {
      const lengthMm = endMm - startMm;
      if (lengthMm <= maxStockLengthMm + 0.001) continue;
      for (let jointMm = startMm + maxStockLengthMm; jointMm < endMm - 0.001; jointMm += maxStockLengthMm) {
        joints.push(jointMm);
      }
    }
  }

  return uniqueSorted(joints);
}

function axisPositionsWithMandatoryJoints(
  axisLengthMm: number,
  maxSpacingMm: number,
  jointsMm: number[],
  doubleButtJoints: boolean,
): Array<{ axisPositionMm: number; multiplicity: 1 | 2; buttJointSupport: boolean }> {
  const mandatory = uniqueSorted([0, ...jointsMm.filter((value) => value > 0 && value < axisLengthMm), axisLengthMm]);
  const positions: number[] = [];

  for (let i = 0; i < mandatory.length - 1; i += 1) {
    const start = mandatory[i];
    const end = mandatory[i + 1];
    const intervalCount = Math.max(1, Math.ceil((end - start) / maxSpacingMm));
    for (let n = 0; n <= intervalCount; n += 1) {
      positions.push(start + ((end - start) * n) / intervalCount);
    }
  }

  return uniqueSorted(positions).map((axisPositionMm) => {
    const isJoint = jointsMm.some((joint) => Math.abs(joint - axisPositionMm) <= 0.5);
    return {
      axisPositionMm,
      multiplicity: isJoint && doubleButtJoints ? 2 : 1,
      buttJointSupport: isJoint,
    };
  });
}

function fieldJoistSegments(input: ProjectInput, layout: LayoutResult | undefined): {
  segments: PlannedJoistSegment[];
  buttJointAxisPositionsMm: number[];
} {
  const rule = getCommercialConstructionRule(input);
  if (!rule) return { segments: [], buttJointAxisPositionsMm: [] };

  const bounds = getDeckBoundingSizeM(input);
  const axisLengthMm = (input.orientation === 'length' ? bounds.lengthM : bounds.widthM) * 1000;
  const joistOrientation = input.orientation === 'length' ? 'width' : 'length';
  const buttJointAxisPositionsMm = boardButtJointAxisPositionsMm(input, layout);
  const axisPositions = axisPositionsWithMandatoryJoints(
    axisLengthMm,
    rule.joistSpacingMm,
    buttJointAxisPositionsMm,
    Boolean(input.doubleJoistsAtButtJoints),
  );

  const segments: PlannedJoistSegment[] = [];
  let id = 1;

  for (const axis of axisPositions) {
    const queryPositionMm = axis.axisPositionMm >= axisLengthMm - 0.0001
      ? Math.max(0, axisLengthMm - 1)
      : axis.axisPositionMm;
    const intervals = getDeckIntervalsAtMm(input, queryPositionMm, joistOrientation, 0);

    for (const [startMm, endMm] of intervals) {
      const lengthMm = endMm - startMm;
      if (lengthMm <= 1) continue;

      if (input.orientation === 'length') {
        segments.push({
          id: `CJ${id++}`,
          axisPositionMm: axis.axisPositionMm,
          x1M: axis.axisPositionMm / 1000,
          y1M: startMm / 1000,
          x2M: axis.axisPositionMm / 1000,
          y2M: endMm / 1000,
          lengthMm,
          multiplicity: axis.multiplicity,
          buttJointSupport: axis.buttJointSupport,
          role: axis.buttJointSupport ? 'butt-joint' : 'field',
        });
      } else {
        segments.push({
          id: `CJ${id++}`,
          axisPositionMm: axis.axisPositionMm,
          x1M: startMm / 1000,
          y1M: axis.axisPositionMm / 1000,
          x2M: endMm / 1000,
          y2M: axis.axisPositionMm / 1000,
          lengthMm,
          multiplicity: axis.multiplicity,
          buttJointSupport: axis.buttJointSupport,
          role: axis.buttJointSupport ? 'butt-joint' : 'field',
        });
      }
    }
  }

  return { segments, buttJointAxisPositionsMm };
}

function collinearAndCovered(candidate: PlannedJoistSegment, existing: PlannedJoistSegment): boolean {
  const cdx = candidate.x2M - candidate.x1M;
  const cdy = candidate.y2M - candidate.y1M;
  const edx = existing.x2M - existing.x1M;
  const edy = existing.y2M - existing.y1M;
  const crossDirection = cdx * edy - cdy * edx;
  if (Math.abs(crossDirection) > GEOMETRY_EPS_M) return false;

  const crossOffset = (candidate.x1M - existing.x1M) * edy - (candidate.y1M - existing.y1M) * edx;
  if (Math.abs(crossOffset) > GEOMETRY_EPS_M) return false;

  const existingLengthSq = edx * edx + edy * edy;
  if (existingLengthSq <= GEOMETRY_EPS_M ** 2) return false;
  const t1 = ((candidate.x1M - existing.x1M) * edx + (candidate.y1M - existing.y1M) * edy) / existingLengthSq;
  const t2 = ((candidate.x2M - existing.x1M) * edx + (candidate.y2M - existing.y1M) * edy) / existingLengthSq;
  return Math.min(t1, t2) >= -0.002 && Math.max(t1, t2) <= 1.002;
}

function perimeterJoistSegments(input: ProjectInput, fieldSegments: PlannedJoistSegment[]): { segments: PlannedJoistSegment[]; pendingCurved: boolean } {
  const boundary = getEffectiveBoundarySegmentsM(input);
  const out: PlannedJoistSegment[] = [];
  let id = 1;
  let pendingCurved = false;

  for (const segment of boundary) {
    if (segment.curved) {
      pendingCurved = true;
      continue;
    }
    const lengthM = Math.hypot(segment.x2M - segment.x1M, segment.y2M - segment.y1M);
    if (lengthM <= GEOMETRY_EPS_M) continue;
    const candidate: PlannedJoistSegment = {
      id: `PJ${id}`,
      axisPositionMm: -1,
      x1M: segment.x1M,
      y1M: segment.y1M,
      x2M: segment.x2M,
      y2M: segment.y2M,
      lengthMm: lengthM * 1000,
      multiplicity: 1,
      buttJointSupport: false,
      role: 'perimeter',
    };
    // Les deux lignes extrêmes du réseau principal peuvent déjà couvrir une partie du contour.
    if (fieldSegments.some((existing) => collinearAndCovered(candidate, existing))) continue;
    out.push(candidate);
    id += 1;
  }

  return { segments: out, pendingCurved };
}

function plannedJoistSegments(input: ProjectInput, layout: LayoutResult | undefined): {
  segments: PlannedJoistSegment[];
  buttJointAxisPositionsMm: number[];
  pendingCurvedPerimeter: boolean;
} {
  const field = fieldJoistSegments(input, layout);
  const perimeter = perimeterJoistSegments(input, field.segments);
  return {
    segments: [...field.segments, ...perimeter.segments],
    buttJointAxisPositionsMm: field.buttJointAxisPositionsMm,
    pendingCurvedPerimeter: perimeter.pendingCurved,
  };
}

function joistRequiredPieces(segments: PlannedJoistSegment[]): RequiredPiece[] {
  const pieces: RequiredPiece[] = [];
  let rowIndex = 0;

  for (const segment of segments) {
    for (let copy = 0; copy < segment.multiplicity; copy += 1) {
      pieces.push({
        id: `${segment.id}-${copy + 1}`,
        rowIndex,
        lengthMm: segment.lengthMm,
      });
      rowIndex += 1;
    }
  }
  return pieces;
}

function pointsForSegment(
  input: ProjectInput,
  segment: PlannedJoistSegment,
  startIndex: number,
  joistHeightMm: number,
  plotSpacingMm: number,
  plotCatalogueValidated: boolean,
): SupportPlanPoint[] {
  const lengthM = Math.hypot(segment.x2M - segment.x1M, segment.y2M - segment.y1M);
  const intervalCount = Math.max(1, Math.ceil((lengthM * 1000) / plotSpacingMm));
  const points: SupportPlanPoint[] = [];

  for (let i = 0; i <= intervalCount; i += 1) {
    const t = i / intervalCount;
    const xM = segment.x1M + (segment.x2M - segment.x1M) * t;
    const yM = segment.y1M + (segment.y2M - segment.y1M) * t;
    const surfaceDeltaMm = supportSurfaceDeltaMm(input, xM, yM);
    const finishedDeltaMm = targetFinishedDeltaMm(input, xM, yM);
    const requiredPlotHeightMm = input.heightCm * 10
      + finishedDeltaMm
      - surfaceDeltaMm
      - input.board.thicknessMm
      - joistHeightMm;
    const plot = plotCatalogueValidated ? choosePlot(requiredPlotHeightMm) : undefined;

    points.push({
      id: `SP${startIndex + i}`,
      xM,
      yM,
      multiplicity: segment.multiplicity,
      surfaceDeltaMm,
      targetFinishedDeltaMm: finishedDeltaMm,
      requiredPlotHeightMm,
      plotMaterialId: plot?.id,
      plotLabel: plot?.label,
      productRef: plot?.productRef,
      unitPriceTtc: plot?.unitPriceTtc,
      status: plot ? 'exact' : 'unsupported',
    });
  }

  return points;
}

function groupPlots(points: SupportPlanPoint[]): SupportPlanGroup[] {
  const byMaterial = new Map<string, { plot: PlotMaterial; quantity: number }>();

  for (const point of points) {
    if (point.status !== 'exact' || !point.plotMaterialId) continue;
    const plot = PLOT_OPTIONS.find((item) => item.id === point.plotMaterialId);
    if (!plot) continue;

    const current = byMaterial.get(plot.id);
    if (current) current.quantity += point.multiplicity;
    else byMaterial.set(plot.id, { plot, quantity: point.multiplicity });
  }

  return [...byMaterial.values()]
    .map(({ plot, quantity }) => ({
      materialId: plot.id,
      label: plot.label,
      productRef: plot.productRef,
      quantity,
      unitPriceTtc: plot.unitPriceTtc,
      totalTtc: round2(quantity * plot.unitPriceTtc),
      minHeightMm: plot.minHeightMm,
      maxHeightMm: plot.maxHeightMm,
      sourceUrl: plot.sourceUrl,
    }))
    .sort((a, b) => a.minHeightMm - b.minHeightMm || a.label.localeCompare(b.label));
}

export function computeSupportPlan(input: ProjectInput, layout?: LayoutResult): SupportPlanResult {
  if (input.supportSystem !== 'adjustable-pedestals') {
    return {
      status: 'unavailable',
      joistSegments: [],
      joistLinearM: 0,
      doubleJoistLinearM: 0,
      joistStockBoards: [],
      buttJointAxisPositionsMm: [],
      supportPoints: [],
      plotGroups: [],
      unsupportedPointCount: 0,
      note: 'Le plan de plots V0.16 est calculé uniquement lorsque le système « plots réglables » est sélectionné.',
    };
  }

  const rule = getCommercialConstructionRule(input);
  if (!rule || rule.status !== 'validated' || rule.joistSpacingMm <= 0 || rule.plotSpacingMm <= 0 || !rule.joistStockLengthsMm.length) {
    return {
      status: 'unavailable',
      joistSegments: [],
      joistLinearM: 0,
      doubleJoistLinearM: 0,
      joistStockBoards: [],
      buttJointAxisPositionsMm: [],
      supportPoints: [],
      plotGroups: [],
      unsupportedPointCount: 0,
      sourceLabel: rule?.sourceLabel,
      sourceUrl: rule?.sourceUrl,
      note: rule?.sourceNote ?? 'Aucune règle de structure commerciale validée pour cette lame.',
    };
  }

  if (!layout) {
    return {
      status: 'unavailable',
      joistSegments: [],
      joistLinearM: 0,
      doubleJoistLinearM: 0,
      joistStockBoards: [],
      buttJointAxisPositionsMm: [],
      supportPoints: [],
      plotGroups: [],
      unsupportedPointCount: 0,
      sourceLabel: rule.sourceLabel,
      sourceUrl: rule.sourceUrl,
      note: 'Calepinage des lames indisponible : les axes de raccord ne peuvent pas être validés. Le plan structurel précis reste à confirmer.',
    };
  }

  const { segments, buttJointAxisPositionsMm, pendingCurvedPerimeter } = plannedJoistSegments(input, layout);
  const pieces = joistRequiredPieces(segments);
  const joistStockBoards = optimizeCuts(pieces, rule.joistStockLengthsMm);
  const joistLinearM = segments.reduce((sum, segment) => sum + segment.lengthMm * segment.multiplicity, 0) / 1000;
  const doubleJoistLinearM = input.doubleJoistsAtButtJoints
    ? segments
        .filter((segment) => segment.buttJointSupport)
        .reduce((sum, segment) => sum + segment.lengthMm, 0) / 1000
    : 0;

  const supportPoints: SupportPlanPoint[] = [];
  let nextId = 1;
  for (const segment of segments) {
    const points = pointsForSegment(input, segment, nextId, rule.joistHeightMm, rule.plotSpacingMm, rule.plotCatalogueValidated);
    supportPoints.push(...points);
    nextId += points.length;
  }

  const unsupportedPointCount = supportPoints
    .filter((point) => point.status === 'unsupported')
    .reduce((sum, point) => sum + point.multiplicity, 0);
  const plotGroups = groupPlots(supportPoints);
  const heights = supportPoints.map((point) => point.requiredPlotHeightMm);
  const perimeterCount = segments.filter((segment) => segment.role === 'perimeter').length;

  return {
    status: unsupportedPointCount > 0 || pendingCurvedPerimeter ? 'partial' : 'exact',
    joistSpacingMm: rule.joistSpacingMm,
    plotSpacingMm: rule.plotSpacingMm,
    joistSegments: segments,
    joistLinearM,
    doubleJoistLinearM,
    joistStockBoards,
    buttJointAxisPositionsMm,
    supportPoints,
    plotGroups,
    unsupportedPointCount,
    minRequiredPlotHeightMm: heights.length ? Math.min(...heights) : undefined,
    maxRequiredPlotHeightMm: heights.length ? Math.max(...heights) : undefined,
    sourceLabel: rule.sourceLabel,
    sourceUrl: rule.sourceUrl,
    pendingCurvedPerimeter,
    note: `${perimeterCount} segment(s) de lambourde périphérique droite calculé(s). ${pendingCurvedPerimeter ? 'Contour courbe détecté : la solution de lambourde périphérique sur arc reste à confirmer et n’est pas comptée. ' : ''}${buttJointAxisPositionsMm.length
      ? input.doubleJoistsAtButtJoints
        ? 'Les axes de jonction de lames sont repérés et l’option double lambourdage est activée.'
        : 'Les axes de jonction de lames sont repérés. Le double lambourdage est désactivé : une seule lambourde est comptée sur chaque axe.'
      : 'Aucun axe de jonction longitudinal de lame n’est détecté avec le calepinage courant.'}`,
  };
}