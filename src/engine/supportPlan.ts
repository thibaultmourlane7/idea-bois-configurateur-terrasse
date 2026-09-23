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
import { getDeckBoundingSizeM, getEffectiveBoundarySegmentsM } from './geometry';
import { intervalsForRegionAtV, worldPointFromUV, type LayingBasis } from './layingGeometry';

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

function axisPositionsWithMandatoryJoints(
  minAxisMm: number,
  maxAxisMm: number,
  maxSpacingMm: number,
  jointsMm: number[],
  doubleButtJoints: boolean,
): Array<{ axisPositionMm: number; multiplicity: 1 | 2; buttJointSupport: boolean }> {
  const mandatory = uniqueSorted([
    minAxisMm,
    ...jointsMm.filter((value) => value > minAxisMm + 0.001 && value < maxAxisMm - 0.001),
    maxAxisMm,
  ]);
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

function fieldJoistSegments(input: ProjectInput, layout: LayoutResult): {
  segments: PlannedJoistSegment[];
  buttJointAxisPositionsMm: number[];
} {
  const rule = getCommercialConstructionRule(input);
  if (!rule) return { segments: [], buttJointAxisPositionsMm: [] };

  const segments: PlannedJoistSegment[] = [];
  const allButtAxes: number[] = [];
  let id = 1;

  for (const zoneLayout of layout.zones) {
    const explicitZone = zoneLayout.id === 'main'
      ? undefined
      : (input.layingZones ?? []).find((zone) => zone.id === zoneLayout.id);
    const excludedZones = zoneLayout.id === 'main' ? (input.layingZones ?? []) : [];
    const buttAxes = zoneLayout.buttJointAxisPositionsMm;
    allButtAxes.push(...buttAxes);

    const axes = axisPositionsWithMandatoryJoints(
      zoneLayout.minUMm,
      zoneLayout.maxUMm,
      rule.joistSpacingMm,
      buttAxes,
      Boolean(input.doubleJoistsAtButtJoints),
    );

    const joistBasis: LayingBasis = {
      dirX: zoneLayout.normalX,
      dirY: zoneLayout.normalY,
      normalX: zoneLayout.dirX,
      normalY: zoneLayout.dirY,
    };

    for (const axis of axes) {
      const queryAxisMm = axis.axisPositionMm <= zoneLayout.minUMm + 0.0001
        ? Math.min(zoneLayout.maxUMm, zoneLayout.minUMm + 1)
        : axis.axisPositionMm >= zoneLayout.maxUMm - 0.0001
          ? Math.max(zoneLayout.minUMm, zoneLayout.maxUMm - 1)
          : axis.axisPositionMm;
      const fixedTransverseMm = queryAxisMm;
      const intervals = intervalsForRegionAtV(
        input,
        joistBasis,
        fixedTransverseMm,
        0,
        explicitZone,
        excludedZones,
      );

      for (const [startMm, endMm] of intervals) {
        const lengthMm = endMm - startMm;
        if (lengthMm <= 1) continue;
        const a = {
          xM: (axis.axisPositionMm * zoneLayout.dirX + startMm * zoneLayout.normalX) / 1000,
          yM: (axis.axisPositionMm * zoneLayout.dirY + startMm * zoneLayout.normalY) / 1000,
        };
        const b = {
          xM: (axis.axisPositionMm * zoneLayout.dirX + endMm * zoneLayout.normalX) / 1000,
          yM: (axis.axisPositionMm * zoneLayout.dirY + endMm * zoneLayout.normalY) / 1000,
        };
        segments.push({
          id: `CJ${id++}`,
          axisPositionMm: axis.axisPositionMm,
          x1M: a.xM,
          y1M: a.yM,
          x2M: b.xM,
          y2M: b.yM,
          lengthMm,
          multiplicity: axis.multiplicity,
          buttJointSupport: axis.buttJointSupport,
          role: axis.buttJointSupport ? 'butt-joint' : 'field',
          zoneId: zoneLayout.id,
        });
      }
    }
  }

  return { segments, buttJointAxisPositionsMm: uniqueSorted(allButtAxes) };
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

function zoneBoundaryJoistSegments(input: ProjectInput, existingSegments: PlannedJoistSegment[]): PlannedJoistSegment[] {
  const out: PlannedJoistSegment[] = [];
  let id = 1;
  for (const zone of input.layingZones ?? []) {
    for (let i = 0; i < zone.points.length; i += 1) {
      const a = zone.points[i];
      const b = zone.points[(i + 1) % zone.points.length];
      const lengthM = Math.hypot(b.xM - a.xM, b.yM - a.yM);
      if (lengthM <= GEOMETRY_EPS_M) continue;
      const candidate: PlannedJoistSegment = {
        id: `ZB${id++}`,
        axisPositionMm: -1,
        x1M: a.xM,
        y1M: a.yM,
        x2M: b.xM,
        y2M: b.yM,
        lengthMm: lengthM * 1000,
        multiplicity: 1,
        buttJointSupport: false,
        role: 'zone-boundary',
        zoneId: zone.id,
      };
      if ([...existingSegments, ...out].some((existing) => collinearAndCovered(candidate, existing))) continue;
      out.push(candidate);
    }
  }
  return out;
}

function plannedJoistSegments(input: ProjectInput, layout: LayoutResult | undefined): {
  segments: PlannedJoistSegment[];
  buttJointAxisPositionsMm: number[];
  pendingCurvedPerimeter: boolean;
} {
  if (!layout) {
    return { segments: [], buttJointAxisPositionsMm: [], pendingCurvedPerimeter: false };
  }
  const field = fieldJoistSegments(input, layout);
  const perimeter = perimeterJoistSegments(input, field.segments);
  const zoneBoundaries = zoneBoundaryJoistSegments(input, [...field.segments, ...perimeter.segments]);
  return {
    segments: [...field.segments, ...perimeter.segments, ...zoneBoundaries],
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
      buttJointAxisCount: 0,
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
      buttJointAxisCount: 0,
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
      buttJointAxisCount: 0,
      supportPoints: [],
      plotGroups: [],
      unsupportedPointCount: 0,
      sourceLabel: rule.sourceLabel,
      sourceUrl: rule.sourceUrl,
      note: 'Calepinage des lames indisponible : les axes de raccord ne peuvent pas être validés. Le plan structurel précis reste à confirmer.',
    };
  }

  const { segments, buttJointAxisPositionsMm, pendingCurvedPerimeter } = plannedJoistSegments(input, layout);
  const buttJointAxisCount = layout.zones.reduce((sum, zone) => sum + zone.buttJointAxisPositionsMm.length, 0);
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
  const zoneBoundaryCount = segments.filter((segment) => segment.role === 'zone-boundary').length;

  return {
    status: unsupportedPointCount > 0 || pendingCurvedPerimeter ? 'partial' : 'exact',
    joistSpacingMm: rule.joistSpacingMm,
    plotSpacingMm: rule.plotSpacingMm,
    joistSegments: segments,
    joistLinearM,
    doubleJoistLinearM,
    joistStockBoards,
    buttJointAxisPositionsMm,
    buttJointAxisCount,
    supportPoints,
    plotGroups,
    unsupportedPointCount,
    minRequiredPlotHeightMm: heights.length ? Math.min(...heights) : undefined,
    maxRequiredPlotHeightMm: heights.length ? Math.max(...heights) : undefined,
    sourceLabel: rule.sourceLabel,
    sourceUrl: rule.sourceUrl,
    pendingCurvedPerimeter,
    note: `${perimeterCount} segment(s) de lambourde périphérique droite calculé(s). ${zoneBoundaryCount ? `${zoneBoundaryCount} segment(s) de séparation entre zones ajoutés. ` : ''}${pendingCurvedPerimeter ? 'Contour courbe détecté : la solution de lambourde périphérique sur arc reste à confirmer et n’est pas comptée. ' : ''}${buttJointAxisCount
      ? input.doubleJoistsAtButtJoints
        ? 'Les axes de jonction de lames sont repérés et l’option double lambourdage est activée.'
        : 'Les axes de jonction de lames sont repérés. Le double lambourdage est désactivé : une seule lambourde est comptée sur chaque axe.'
      : 'Aucun axe de jonction longitudinal de lame n’est détecté avec le calepinage courant.'}`,
  };
}